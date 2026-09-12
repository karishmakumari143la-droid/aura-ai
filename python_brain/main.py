"""
AURA AI — Central Python FastAPI Server
Exposes all brain orchestration, tools, voice, permissions, audit, and WebSocket events.
"""

import os
import sys
import hashlib
import hmac
import json
from typing import Dict, Any, List, Optional
from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
    HTTPException,
    Query,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .brain import AuraBrain
from .security.permissions import PermissionKey, PermissionState
from .voice.service import VoiceService
from .runtime.background import BackgroundTaskManager, DurableTaskDispatcher, RecurringWorkScheduler
from .ws.events import event_dispatcher
from .integrations.communication import CommunicationRegistry
from .integrations.core import (
    IntegrationManager,
    IntegrationPermissionError,
)
from .integrations.whatsapp import WhatsAppAdapter
from .integrations.communication_token_store import CommunicationCredentialStore

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
# COMMUNICATION INTEGRATIONS
# ============================================================

communication_registry = CommunicationRegistry()

communication_integration_manager = IntegrationManager(
    registry=communication_registry,
    permission_checker=brain.permissions,
    audit_logger=brain.audit,
)

communication_credential_store = CommunicationCredentialStore(
    db_path=os.path.join(
        AURA_DATA_DIR,
        "aura_communication_credentials.db",
    )
)

whatsapp_adapter = WhatsAppAdapter(
    credential_store=communication_credential_store,
    provider="whatsapp_business",
)

communication_registry.register(whatsapp_adapter)

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


class WhatsAppSendRequest(BaseModel):
    user_id: str = "default_user"
    address: str
    content: str
    name: Optional[str] = None
    confirmed: bool = False
    scope_id: Optional[str] = None
    grant_id: Optional[str] = None


class WhatsAppConfigureRequest(BaseModel):
    user_id: str = "default_user"
    access_token: str
    phone_number_id: str
    api_version: str
    base_url: Optional[str] = "https://graph.facebook.com"
    confirmed: bool = False
    grant_id: Optional[str] = None
    scope_id: Optional[str] = None


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

@app.post("/api/brain/communication/whatsapp/configure")
def whatsapp_configure(req: WhatsAppConfigureRequest):
    user_id = req.user_id.strip()

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    scope_id = req.scope_id or f"whatsapp-configure:{user_id}"

    allowed, msg, state = brain.permissions.check_permission(
        user_id=user_id,
        perm_key=PermissionKey.WHATSAPP_CONFIGURE.value,
        interactive_confirm=req.confirmed,
        grant_id=req.grant_id,
        scope_id=scope_id,
    )

    if allowed and state == "grant":
        consumed = brain.permissions.consume_grant(
            grant_id=req.grant_id or "",
            user_id=user_id,
            perm_key=PermissionKey.WHATSAPP_CONFIGURE.value,
            scope_id=scope_id,
        )

        if not consumed:
            return {
                "success": False,
                "error": "Permission grant could not be consumed safely.",
                "permission_state": "deny",
                "status": "BLOCKED",
                "scope_id": scope_id,
            }

    if not allowed:
        waiting = state == "ask"
        raise HTTPException(
            status_code=409 if waiting else 403,
            detail={
                "code": "CONFIRMATION_REQUIRED" if waiting else "PERMISSION_DENIED",
                "message": msg,
                "permission_state": state,
                "requires_confirmation": waiting,
                "scope_id": scope_id,
            },
        )

    access_token = req.access_token.strip()
    phone_number_id = req.phone_number_id.strip()
    api_version = req.api_version.strip()
    base_url = (req.base_url or "").strip().rstrip("/")

    if not access_token:
        raise HTTPException(status_code=400, detail="access_token is required")

    if not phone_number_id:
        raise HTTPException(status_code=400, detail="phone_number_id is required")

    if not api_version:
        raise HTTPException(status_code=400, detail="api_version is required")

    if not base_url:
        raise HTTPException(status_code=400, detail="base_url is required")

    # Validate the credentials against the real WhatsApp Cloud API.
    # Never include the access token in audit parameters.
    audit_parameters = {
        "channel": "whatsapp",
        "provider": "whatsapp_business",
        "phone_number_id": phone_number_id,
        "api_version": api_version,
        "base_url": base_url,
        "_scope_id": scope_id,
    }

    try:
        response = whatsapp_adapter.http.get(
            f"{base_url}/{api_version}/{phone_number_id}",
            headers={
                "Authorization": f"Bearer {access_token}",
            },
            timeout=15,
        )
    except Exception:
        brain.audit.log_action(
            user_id=user_id,
            action_type="INTEGRATION_CONFIGURE",
            tool_name="whatsapp",
            parameters=audit_parameters,
            permission_state=PermissionState.ALLOW.value,
            confirmed=req.confirmed,
            success=False,
            duration_ms=0,
            error_message="WhatsApp Cloud API validation request failed.",
            verification_status="FAILED",
        )
        raise HTTPException(
            status_code=502,
            detail="WhatsApp Cloud API validation request failed.",
        )

    if not 200 <= response.status_code < 300:
        try:
            body = response.json()
        except ValueError:
            body = {}

        provider_error = body.get("error") or {}
        provider_message = provider_error.get("message")

        brain.audit.log_action(
            user_id=user_id,
            action_type="INTEGRATION_CONFIGURE",
            tool_name="whatsapp",
            parameters=audit_parameters,
            permission_state=PermissionState.ALLOW.value,
            confirmed=req.confirmed,
            success=False,
            duration_ms=0,
            error_message=provider_message
            or "WhatsApp Cloud API rejected the credentials.",
            verification_status="FAILED",
        )

        raise HTTPException(
            status_code=400,
            detail={
                "code": "WHATSAPP_VALIDATION_FAILED",
                "message": provider_message
                or "WhatsApp Cloud API rejected the credentials.",
            },
        )

    # Store only after real provider validation succeeds.
    communication_credential_store.save(
        user_id=user_id,
        channel="whatsapp",
        provider="whatsapp_business",
        credentials={
            "access_token": access_token,
            "phone_number_id": phone_number_id,
            "api_version": api_version,
            "base_url": base_url,
        },
    )

    brain.audit.log_action(
        user_id=user_id,
        action_type="INTEGRATION_CONFIGURE",
        tool_name="whatsapp",
        parameters=audit_parameters,
        permission_state=PermissionState.ALLOW.value,
        confirmed=req.confirmed,
        success=True,
        duration_ms=0,
        verification_status="VERIFIED",
    )

    return {
        "success": True,
        "channel": "whatsapp",
        "provider": "whatsapp_business",
        "status": whatsapp_adapter.status(req.user_id),
    }



# ============================================================
# WHATSAPP WEBHOOK
# ============================================================

def _whatsapp_webhook_verify_token() -> str:
    return os.environ.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "").strip()


def _whatsapp_app_secret() -> str:
    return os.environ.get("WHATSAPP_APP_SECRET", "").strip()


def _verify_whatsapp_signature(raw_body: bytes, signature: str) -> bool:
    """
    Verify Meta's X-Hub-Signature-256 header.

    Signature format:
        sha256=<hex digest>
    """
    app_secret = _whatsapp_app_secret()
    signature = str(signature or "").strip()

    if not app_secret or not signature.startswith("sha256="):
        return False

    expected = hmac.new(
        app_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    supplied = signature.split("=", 1)[1].strip()

    return hmac.compare_digest(expected, supplied)


def _extract_whatsapp_messages(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract inbound WhatsApp messages from a Meta webhook payload.

    Only text messages are returned for automatic conversational processing.
    """
    messages: List[Dict[str, Any]] = []

    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}

            for message in value.get("messages") or []:
                message_type = str(message.get("type", "")).strip().lower()

                if message_type != "text":
                    continue

                message_id = str(message.get("id", "")).strip()
                sender = str(message.get("from", "")).strip()
                text_body = str(
                    ((message.get("text") or {}).get("body")) or ""
                ).strip()

                metadata = value.get("metadata") or {}
                phone_number_id = str(
                    metadata.get("phone_number_id", "")
                ).strip()

                if not message_id or not sender or not text_body or not phone_number_id:
                    continue

                messages.append(
                    {
                        "message_id": message_id,
                        "sender": sender,
                        "content": text_body,
                        "phone_number_id": phone_number_id,
                    }
                )

    return messages


@app.get("/api/brain/communication/whatsapp/webhook")
def whatsapp_webhook_verify(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Meta webhook verification endpoint.
    """
    expected_token = _whatsapp_webhook_verify_token()

    if (
        hub_mode != "subscribe"
        or not expected_token
        or not hub_verify_token
        or not hmac.compare_digest(
            str(hub_verify_token),
            expected_token,
        )
    ):
        raise HTTPException(
            status_code=403,
            detail="WhatsApp webhook verification failed.",
        )

    if hub_challenge is None:
        raise HTTPException(
            status_code=400,
            detail="hub.challenge is required.",
        )

    return int(hub_challenge) if str(hub_challenge).isdigit() else str(hub_challenge)


@app.post("/api/brain/communication/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """
    Receive real inbound WhatsApp Cloud API events.

    Security:
    - requires configured WHATSAPP_APP_SECRET
    - verifies X-Hub-Signature-256
    - resolves the owning AURA user from phone_number_id
    - claims provider message ID before processing
    - stores inbound text in AURA persistent conversation memory
    - routes it through AURA local brain
    - sends the brain response only through the existing permission-checked
      WhatsApp integration manager
    """
    raw_body = await request.body()

    signature = request.headers.get("X-Hub-Signature-256", "")

    if not _verify_whatsapp_signature(raw_body, signature):
        raise HTTPException(
            status_code=403,
            detail="Invalid WhatsApp webhook signature.",
        )

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON webhook payload.",
        )

    if str(payload.get("object", "")).strip().lower() != "whatsapp_business_account":
        return {
            "success": True,
            "processed": 0,
            "ignored": True,
            "reason": "unsupported_webhook_object",
        }

    messages = _extract_whatsapp_messages(payload)

    processed = 0
    duplicates = 0
    ignored = 0
    replies_sent = 0
    reply_failures = 0
    results: List[Dict[str, Any]] = []

    from .integrations.communication import (
        CommunicationChannel,
        Contact,
    )
    from .integrations.core import IntegrationContext

    for inbound in messages:
        message_id = inbound["message_id"]
        sender = inbound["sender"]
        content = inbound["content"]
        phone_number_id = inbound["phone_number_id"]

        user_id = communication_credential_store.find_user_by_phone_number_id(
            channel=CommunicationChannel.WHATSAPP.value,
            provider=whatsapp_adapter.provider,
            phone_number_id=phone_number_id,
        )

        if not user_id:
            ignored += 1
            results.append(
                {
                    "message_id": message_id,
                    "status": "IGNORED",
                    "reason": "PHONE_NUMBER_NOT_CONFIGURED",
                }
            )
            continue

        # Provider retries must never create duplicate AURA turns.
        if not brain.memory.claim_webhook_event(
            event_id=message_id,
            source="whatsapp",
        ):
            duplicates += 1
            results.append(
                {
                    "message_id": message_id,
                    "status": "DUPLICATE",
                }
            )
            continue

        session_id = f"whatsapp:{sender}"

        brain.memory.add_conversation_turn(
            user_id=user_id,
            session_id=session_id,
            role="user",
            content=content,
            metadata={
                "channel": "whatsapp",
                "direction": "inbound",
                "provider": "whatsapp_business",
                "provider_message_id": message_id,
                "phone_number_id": phone_number_id,
                "sender": sender,
            },
        )

        try:
            brain_result = brain.process_turn(
                prompt=content,
                user_id=user_id,
                session_id=session_id,
                interactive_confirm=False,
                idempotency_key=f"whatsapp:{message_id}",
                scope_id=f"whatsapp:{user_id}:{sender}",
            )

            response_text = str(
                brain_result.get("response")
                or brain_result.get("clarification")
                or ""
            ).strip()

            if not response_text:
                processed += 1
                results.append(
                    {
                        "message_id": message_id,
                        "status": "PROCESSED_NO_REPLY",
                    }
                )
                continue

            send_result = communication_integration_manager.execute(
                integration_id="whatsapp",
                action="send_message",
                arguments={
                    "address": sender,
                    "content": response_text,
                },
                context=IntegrationContext(
                    user_id=user_id,
                    scope_id=f"whatsapp:{user_id}:{sender}:reply",
                    confirmed=False,
                ),
            )

            if send_result.success:
                replies_sent += 1
                brain.memory.add_conversation_turn(
                    user_id=user_id,
                    session_id=session_id,
                    role="aura",
                    content=response_text,
                    metadata={
                        "channel": "whatsapp",
                        "direction": "outbound",
                        "provider": "whatsapp_business",
                        "trigger_message_id": message_id,
                        "transport_status": (
                            send_result.data or {}
                        ).get("status"),
                    },
                )

                results.append(
                    {
                        "message_id": message_id,
                        "status": "REPLIED",
                        "reply_status": (
                            send_result.data or {}
                        ).get("status"),
                    }
                )
            else:
                reply_failures += 1
                results.append(
                    {
                        "message_id": message_id,
                        "status": "PROCESSED_REPLY_FAILED",
                        "error": send_result.error,
                    }
                )

            processed += 1

        except IntegrationPermissionError as exc:
            reply_failures += 1
            processed += 1
            results.append(
                {
                    "message_id": message_id,
                    "status": "PROCESSED_REPLY_BLOCKED",
                    "error": str(exc),
                }
            )

        except Exception as exc:
            reply_failures += 1
            processed += 1
            results.append(
                {
                    "message_id": message_id,
                    "status": "PROCESSING_FAILED",
                    "error": str(exc),
                }
            )

    return {
        "success": True,
        "processed": processed,
        "duplicates": duplicates,
        "ignored": ignored,
        "replies_sent": replies_sent,
        "reply_failures": reply_failures,
        "results": results,
    }


@app.get("/api/brain/communication/whatsapp/status")
def whatsapp_status(user_id: str = Query("default_user")):
    return {
        "success": True,
        "channel": "whatsapp",
        "provider": whatsapp_adapter.provider,
        "status": whatsapp_adapter.status(user_id),
    }


@app.post("/api/brain/communication/whatsapp/send")
def whatsapp_send(req: WhatsAppSendRequest):
    from .integrations.core import IntegrationContext

    try:
        result = communication_integration_manager.execute(
            integration_id="whatsapp",
            action="send_message",
            arguments={
                "address": req.address,
                "content": req.content,
                "name": req.name,
            },
            context=IntegrationContext(
                user_id=req.user_id,
                scope_id=req.scope_id,
                grant_id=req.grant_id,
                confirmed=req.confirmed,
            ),
        )

        return {
            "success": result.success,
            "integration": result.integration,
            "action": result.action,
            "data": result.data,
            "error": result.error,
            "metadata": result.metadata,
        }

    except IntegrationPermissionError as exc:
        message = str(exc)

        if "requires explicit confirmation" in message:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "CONFIRMATION_REQUIRED",
                    "message": message,
                },
            )

        if "DENIED" in message:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "PERMISSION_DENIED",
                    "message": message,
                },
            )

        raise HTTPException(
            status_code=403,
            detail={
                "code": "PERMISSION_DENIED",
                "message": message,
            },
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


@app.post("/api/brain/communication/whatsapp/disconnect")
def whatsapp_disconnect(
    user_id: str = Query("default_user"),
    confirmed: bool = Query(False),
):
    if not confirmed:
        raise HTTPException(
            status_code=409,
            detail="CONFIRMATION_REQUIRED",
        )

    try:
        result = communication_integration_manager.execute(
            integration_id="whatsapp",
            action="disconnect",
            arguments={},
            context=IntegrationContext(
                user_id=user_id,
                confirmed=True,
            ),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    return {
        "success": result.success,
        "channel": "whatsapp",
        "status": result.data.get("status") if result.data else None,
        "error": result.error,
        "metadata": result.metadata,
    }


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
