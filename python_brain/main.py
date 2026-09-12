"""
AURA AI — Central Python FastAPI Server
Exposes all brain orchestration, tools, voice, permissions, audit, and WebSocket events.
"""

import os
import sys
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .brain import AuraBrain
from .security.permissions import PermissionKey
from .voice.service import VoiceService
from .runtime.background import BackgroundTaskManager, DurableTaskDispatcher, RecurringWorkScheduler
from .ws.events import event_dispatcher

app = FastAPI(
    title="AURA AI Central Intelligence Brain",
    description="Production-grade Python intelligence orchestration and execution layer",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# SHARED PERSISTENT RUNTIME CONFIGURATION
# ============================================================

AURA_DATA_DIR = os.path.abspath(
    os.environ.get(
        "AURA_DATA_DIR",
        os.path.join(os.getcwd(), "data"),
    )
)

AURA_WORKSPACE_ROOT = os.path.abspath(
    os.environ.get(
        "AURA_WORKSPACE_ROOT",
        os.path.join(os.getcwd(), "aura_workspace"),
    )
)

os.makedirs(AURA_DATA_DIR, exist_ok=True)
os.makedirs(AURA_WORKSPACE_ROOT, exist_ok=True)

brain = AuraBrain(
    workspace_root=AURA_WORKSPACE_ROOT,
    data_dir=AURA_DATA_DIR,
)

voice_service = VoiceService()

task_manager = BackgroundTaskManager(
    db_path=os.path.join(
        AURA_DATA_DIR,
        "aura_tasks.db",
    )
)

durable_dispatcher = DurableTaskDispatcher(
    manager=task_manager,
    brain=brain,
)

recurring_scheduler = RecurringWorkScheduler(
    task_manager=task_manager,
    dispatcher=durable_dispatcher,
)

# ============================================================
# DURABLE BACKGROUND RUNTIME
# ============================================================

@app.on_event("startup")
def recover_and_dispatch_durable_tasks():
    recovered = task_manager.recover_interrupted_tasks()

    dispatched = durable_dispatcher.dispatch_queued_tasks(
        limit=10
    )

    recurring_scheduler.start()

    print(
        "[AURA] Durable runtime startup: "
        f"recovered={len(recovered)} "
        f"dispatched={len(dispatched)} "
        "recurring_scheduler=RUNNING"
    )


# ============================================================
# RECURRING WORK API MODELS
# ============================================================

class RecurringJobCreateRequest(BaseModel):
    user_id: str = "default_user"
    title: str
    prompt: str
    frequency: str
    timezone: str = "UTC"
    next_run_at: Optional[float] = None


class RecurringJobToggleRequest(BaseModel):
    enabled: bool


# Request Models
class ChatRequest(BaseModel):
    prompt: str
    user_id: Optional[str] = "default_user"
    session_id: Optional[str] = "default_session"
    interactive_confirm: Optional[bool] = False
    idempotency_key: Optional[str] = None
    scope_id: Optional[str] = None
    grant_id: Optional[str] = None

class VoiceRequest(BaseModel):
    transcript: str
    user_id: Optional[str] = "default_user"
    scope_id: Optional[str] = None
    grant_id: Optional[str] = None

class PermissionUpdateRequest(BaseModel):
    user_id: str
    perm_key: str
    state: str  # 'allow', 'ask', 'deny'

class MemoryStoreRequest(BaseModel):
    user_id: str
    category: str
    key: str
    value: Any
    tags: Optional[List[str]] = None

class ToolExecuteRequest(BaseModel):
    tool: str
    args: Dict[str, Any]
    user_id: Optional[str] = "default_user"
    confirmed: Optional[bool] = False
    scope_id: Optional[str] = None
    grant_id: Optional[str] = None

class QARequest(BaseModel):
    file_path: str

class BackgroundTaskRequest(BaseModel):
    user_id: str
    title: str
    command: Optional[str] = None
    scope_id: Optional[str] = None
    grant_id: Optional[str] = None

# ==================== ENDPOINTS ====================

@app.get("/health")
def health_check():
    return brain.get_system_status()

@app.get("/api/brain/status")
def system_status():
    return brain.get_system_status()

@app.post("/api/brain/chat")
async def chat_turn(req: ChatRequest):
    res = brain.process_turn(
        prompt=req.prompt,
        user_id=req.user_id or "default_user",
        session_id=req.session_id or "default_session",
        interactive_confirm=req.interactive_confirm or False,
        idempotency_key=req.idempotency_key,
        scope_id=req.scope_id,
        grant_id=req.grant_id
    )
    # Broadcast event via WebSocket
    await event_dispatcher.broadcast("BRAIN_TURN_COMPLETED", {
        "intent": res.get("intent"),
        "tasks_created": res.get("tasks_created", 0),
        "duration_ms": res.get("duration_ms", 0),
        "success": res.get("success", True)
    })
    return res

@app.post("/api/brain/voice")
def handle_voice(req: VoiceRequest):
    voice_res = voice_service.process_voice_transcript(req.transcript)
    if voice_res.get("is_empty"):
        return {"voice": voice_res, "brain": None}

    # If speech is valid, run brain processing
    brain_res = brain.process_turn(
        prompt=voice_res["text"],
        user_id=req.user_id or "default_user",
        interactive_confirm=False,
        scope_id=req.scope_id,
        grant_id=req.grant_id
    )
    tts_payload = voice_service.prepare_tts_payload(
        text=brain_res.get("response", ""),
        language=voice_res.get("language")
    )
    return {
        "voice": voice_res,
        "brain": brain_res,
        "tts": tts_payload
    }

# ============================================================
# LOCAL PERSISTENT RECURRING WORK
# ============================================================

@app.get("/api/brain/recurring")
def list_recurring_jobs(user_id: str = Query("default_user")):
    return {
        "success": True,
        "jobs": recurring_scheduler.list_jobs(user_id),
    }


@app.post("/api/brain/recurring")
def create_recurring_job(req: RecurringJobCreateRequest):
    try:
        job_id = recurring_scheduler.create_job(
            user_id=req.user_id,
            title=req.title,
            prompt=req.prompt,
            frequency=req.frequency,
            timezone=req.timezone,
            next_run_at=req.next_run_at,
        )

        jobs = recurring_scheduler.list_jobs(req.user_id)
        job = next(
            (item for item in jobs if item["job_id"] == job_id),
            None,
        )

        return {
            "success": True,
            "job": job,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


@app.post("/api/brain/recurring/{job_id}/toggle")
def toggle_recurring_job(
    job_id: str,
    req: RecurringJobToggleRequest,
):
    updated = recurring_scheduler.set_enabled(
        job_id,
        req.enabled,
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="RECURRING_JOB_NOT_FOUND",
        )

    return {
        "success": True,
        "job_id": job_id,
        "enabled": req.enabled,
    }


@app.delete("/api/brain/recurring/{job_id}")
def delete_recurring_job(job_id: str):
    deleted = recurring_scheduler.delete_job(job_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="RECURRING_JOB_NOT_FOUND",
        )

    return {
        "success": True,
        "job_id": job_id,
        "deleted": True,
    }


@app.post("/api/brain/recurring/{job_id}/run")
def run_recurring_job_now(job_id: str):
    jobs = recurring_scheduler.list_jobs()

    job = next(
        (item for item in jobs if item["job_id"] == job_id),
        None,
    )

    if not job:
        raise HTTPException(
            status_code=404,
            detail="RECURRING_JOB_NOT_FOUND",
        )

    if not job["enabled"]:
        raise HTTPException(
            status_code=409,
            detail="RECURRING_JOB_DISABLED",
        )

    # Execute immediately using the same durable AURA path.
    task_id = task_manager.create_durable_task(
        user_id=job["user_id"],
        title=f"[Recurring Manual] {job['title']}",
        task_type="aura_turn",
        payload={
            "prompt": job["prompt"],
            "user_id": job["user_id"],
            "session_id": f"recurring:{job['job_id']}",
            "interactive_confirm": False,
        },
    )

    durable_dispatcher.dispatch_task_async(task_id)

    return {
        "success": True,
        "job_id": job_id,
        "task_id": task_id,
        "status": "QUEUED",
    }


@app.get("/api/brain/permissions")
def get_permissions(user_id: str = Query("default_user")):
    return {"user_id": user_id, "permissions": brain.permissions.get_permissions(user_id)}

@app.post("/api/brain/permissions")
def set_permission(req: PermissionUpdateRequest):
    try:
        brain.permissions.set_permission(req.user_id, req.perm_key, req.state)
        return {"success": True, "user_id": req.user_id, "perm_key": req.perm_key, "state": req.state}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/brain/audit")
def get_audit_logs(user_id: Optional[str] = None, limit: int = 50):
    return {"logs": brain.audit.get_recent_logs(user_id=user_id, limit=limit)}

@app.get("/api/brain/memory")
def get_memories(user_id: str = Query("default_user"), query: str = Query(""), category: Optional[str] = None):
    memories = brain.memory.search_memories(user_id=user_id, query=query, category=category)
    return {"user_id": user_id, "memories": memories}

@app.post("/api/brain/memory")
def store_memory(req: MemoryStoreRequest):
    brain.memory.set_memory(req.user_id, req.category, req.key, req.value, req.tags)
    return {"success": True, "stored": {"key": req.key, "category": req.category}}

@app.post("/api/brain/qa")
def run_qa(req: QARequest):
    from .qa.qa_engine import QAEngine
    return QAEngine.audit_website_file(req.file_path)

@app.post("/api/brain/execute")
def execute_tool(req: ToolExecuteRequest):
    user_id = req.user_id or "default_user"
    scope_id = req.scope_id or f"direct-execute:{user_id}"
    perm_key = brain._map_tool_to_permission(req.tool)

    allowed, msg, state = brain.permissions.check_permission(
        user_id=user_id,
        perm_key=perm_key.value,
        interactive_confirm=req.confirmed or False,
        grant_id=req.grant_id,
        scope_id=scope_id
    )

    if allowed and state == "grant":
        consumed = brain.permissions.consume_grant(
            grant_id=req.grant_id or "",
            user_id=user_id,
            perm_key=perm_key.value,
            scope_id=scope_id
        )
        if not consumed:
            return {
                "success": False,
                "error": "Permission grant could not be consumed safely.",
                "permission_state": "deny",
                "status": "BLOCKED",
                "scope_id": scope_id
            }

    if not allowed:
        waiting = state == "ask"
        return {
            "success": False,
            "error": msg,
            "permission_state": state,
            "requires_confirmation": waiting,
            "status": "WAITING_FOR_APPROVAL" if waiting else "BLOCKED",
            "scope_id": scope_id
        }

    if req.tool == "filesystem_read":
        return brain.fs.read_file(req.args.get("path", ""))

    elif req.tool == "filesystem_write":
        return brain.fs.write_file(
            req.args.get("path", ""),
            req.args.get("content", "")
        )

    elif req.tool == "terminal_execute":
        return brain.terminal.execute_command(
            req.args.get("command", ""),
            cwd=req.args.get("cwd")
        )

    elif req.tool == "code_runner":
        return brain.code_runner.run_python_code(
            req.args.get("code", "")
        )

    elif req.tool == "browser_inspect":
        return brain.browser.navigate_and_inspect(
            req.args.get("url", "")
        )

    elif req.tool == "git_action":
        act = str(req.args.get("action", "status")).strip().lower()

        if act == "status":
            return brain.git.status()

        if act == "branch":
            return brain.git.branch()

        if act == "log":
            try:
                count = max(1, min(int(req.args.get("count", 5)), 50))
            except (TypeError, ValueError):
                count = 5
            return brain.git.log(count)

        if act == "diff":
            return brain.git.diff()

        if act == "commit":
            message = str(req.args.get("message", "")).strip()
            if not message:
                return {
                    "success": False,
                    "status": "INVALID_REQUEST",
                    "error": "COMMIT_MESSAGE_REQUIRED"
                }
            return brain.git.commit(
                message=message,
                add_all=bool(req.args.get("add_all", True))
            )

        if act == "push":
            return brain.git.push(
                remote=str(req.args.get("remote", "origin")).strip() or "origin",
                branch=str(req.args.get("branch", "")).strip()
            )

        if act == "create_remote_repo":
            repo_name = str(req.args.get("repo_name", "")).strip()
            if not repo_name:
                return {
                    "success": False,
                    "status": "INVALID_REQUEST",
                    "error": "REPOSITORY_NAME_REQUIRED"
                }
            return brain.git.create_remote_repo(
                repo_name=repo_name,
                private=bool(req.args.get("private", True))
            )

        return {
            "success": False,
            "status": "INVALID_REQUEST",
            "error": f"UNKNOWN_GIT_ACTION:{act}"
        }

    elif req.tool == "web_research":
        return brain.research.search(
            req.args.get("query", "")
        )

    elif req.tool == "app_launch":
        return brain.launcher.launch(
            req.args.get("app_name", "")
        )

    elif req.tool == "screen_capture":
        return brain.screen.capture_screen(
            req.args.get("target", "")
        )

    return {
        "success": False,
        "error": f"Unsupported tool: {req.tool}"
    }

@app.post("/api/brain/background-task")
def launch_background_task(req: BackgroundTaskRequest):
    user_id = req.user_id or "default_user"
    scope_id = req.scope_id or f"background:{user_id}:{req.title}"

    if req.command:
        allowed, msg, state = brain.permissions.check_permission(
            user_id=user_id,
            perm_key=PermissionKey.TERMINAL_EXECUTION.value,
            interactive_confirm=False,
            grant_id=req.grant_id,
            scope_id=scope_id
        )

        if allowed and state == "grant":
            consumed = brain.permissions.consume_grant(
                grant_id=req.grant_id or "",
                user_id=user_id,
                perm_key=PermissionKey.TERMINAL_EXECUTION.value,
                scope_id=scope_id
            )
            if not consumed:
                return {
                    "success": False,
                    "error": "Permission grant could not be consumed safely.",
                    "permission_state": "deny",
                    "status": "BLOCKED",
                    "scope_id": scope_id
                }

        if not allowed:
            waiting = state == "ask"
            return {
                "success": False,
                "error": msg,
                "permission_state": state,
                "requires_confirmation": waiting,
                "status": "WAITING_FOR_APPROVAL" if waiting else "BLOCKED",
                "scope_id": scope_id
            }

    # Persist background work as an allowlisted durable task.
    # Never serialize arbitrary Python functions/code.
    if req.command:
        task_id = task_manager.create_durable_task(
            user_id=user_id,
            title=req.title,
            task_type="terminal_command",
            payload={
                "command": req.command,
            },
        )

        # Queue the durable task and return immediately.
        # Actual execution happens in the dispatcher worker thread.
        durable_dispatcher.dispatch_task_async(task_id)

        return {
            "success": True,
            "task_id": task_id,
            "status": "QUEUED",
            "scope_id": scope_id,
            "durable": True,
        }

    task_id = task_manager.create_task(
        user_id=user_id,
        title=req.title,
    )

    return {
        "success": True,
        "task_id": task_id,
        "status": "QUEUED",
        "scope_id": scope_id,
        "durable": False,
    }

@app.get("/api/brain/background-task/{task_id}")
def get_background_task(
    task_id: str,
    user_id: Optional[str] = "default_user",
):
    task = task_manager.get_task(task_id, user_id=user_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await event_dispatcher.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming ping / messages
            await websocket.send_text(f'{{"type": "PONG", "received": "{data}"}}')
    except WebSocketDisconnect:
        event_dispatcher.disconnect(websocket)

def run():
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == "__main__":
    run()
