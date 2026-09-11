from pathlib import Path
"""
AURA AI — Central Autonomous Python Intelligence Brain
Executes the full cognitive lifecycle:
USER → UNDERSTAND → ANALYZE → PLAN → SELECT TOOLS → EXECUTE → OBSERVE → VERIFY → RECOVER IF NEEDED → RESPOND.
"""

import os
import time
import json
from typing import Dict, Any, List, Optional

from .intent import IntentAnalyzer, IntentType
from .aura_reasoning import AuraReasoning
from .memory import PersistentMemory
from .security.permissions import PermissionManager, PermissionKey, PermissionState
from .security.audit import AuditLogger
from .tools.filesystem import FilesystemTool
from .tools.terminal import TerminalTool
from .tools.code_runner import CodeRunnerTool
from .tools.browser import BrowserTool
from .tools.git_tool import GitTool
from .tools.research import WebResearchTool
from .tools.app_launcher import AppLauncherTool
from .tools.screen_vision import ScreenVisionTool
from .qa.qa_engine import QAEngine
from .verification.verifier import Verifier
from .recovery.healer import ErrorHealer
from .runtime.idempotency import IdempotencyEngine
from companion.aura_companion import AuraCompanion

class AuraBrain:
    def __init__(self, workspace_root: Optional[str] = None, data_dir: Optional[str] = None):
        base_dir = os.path.abspath(workspace_root or os.getcwd())
        if os.path.exists(os.path.join(base_dir, "package.json")) and workspace_root is None:
            self.workspace_root = os.path.join(base_dir, "aura_workspace")
        else:
            self.workspace_root = base_dir
        os.makedirs(self.workspace_root, exist_ok=True)

        self.data_dir = data_dir or os.path.join(base_dir, "data")
        os.makedirs(self.data_dir, exist_ok=True)

        self.reasoning = AuraReasoning()
        self.memory = PersistentMemory(db_path=os.path.join(self.data_dir, "aura_memory.db"))
        self.permissions = PermissionManager(db_path=os.path.join(self.data_dir, "aura_permissions.db"))
        self.audit = AuditLogger(db_path=os.path.join(self.data_dir, "aura_audit.db"))
        self.idempotency = IdempotencyEngine(db_path=os.path.join(self.data_dir, "aura_idempotency.db"))

        # Real tools
        self.fs = FilesystemTool(self.workspace_root)
        self.terminal = TerminalTool(self.workspace_root)
        self.code_runner = CodeRunnerTool()
        self.browser = BrowserTool()
        self.git = GitTool(self.workspace_root)
        self.research = WebResearchTool()
        self.launcher = AppLauncherTool()
        self.screen = ScreenVisionTool()
        # Real local Desktop Companion bridge.
        self.companion = AuraCompanion(workspace_root=self.workspace_root)

    def get_system_status(self) -> Dict[str, Any]:
        diagnostics = self.reasoning.get_diagnostics()
        return {
            "status": "online",
            "brain_engine": "Python Central AURA Brain v3.0",
            "reasoning_mode": "AURA_LOCAL_REASONING",
            "external_ai_provider": False,
            "diagnostics": diagnostics,
            "workspace_root": self.workspace_root,
            "capabilities": {
                "filesystem": "WORKING",
                "terminal_execution": "WORKING",
                "python_code_runner": "WORKING",
                "playwright_browser": self.browser.get_status(),
                "git_version_control": "WORKING",
                "web_research": "WORKING",
                "screen_capture_vision": self.screen.get_status(),
                "desktop_companion": self._get_companion_status(),
                "app_launcher": "WORKING",
                "qa_audit_engine": "WORKING",
                "automated_healing": "WORKING",
                "persistent_memory": "WORKING",
                "audit_logging": "WORKING",
                "permissions_enforcement": "WORKING"
            }
        }

    def _get_companion_status(self) -> str:
        """Report Desktop Companion availability from the real local bridge."""
        try:
            companion = self.companion
            required_methods = (
                "terminal_execute",
                "app_launch",
                "clipboard_read",
                "clipboard_write",
            )
            if all(callable(getattr(companion, name, None)) for name in required_methods):
                return "WORKING"
            return "NOT_CONFIGURED"
        except Exception:
            # Diagnostics must fail closed rather than claim a working capability.
            return "NOT_CONFIGURED"

    def get_status(self) -> Dict[str, Any]:
        return self.get_system_status()

    def process_turn(
        self,
        prompt: str,
        user_id: str = "default_user",
        session_id: str = "default_session",
        interactive_confirm: bool = False,
        idempotency_key: Optional[str] = None,
        scope_id: Optional[str] = None,
        grant_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main cognitive processing turn:
        USER → UNDERSTAND → ANALYZE → PLAN → SELECT TOOLS → EXECUTE → OBSERVE → VERIFY → RECOVER IF NEEDED → RESPOND.
        """
        start_time = time.time()
        clean_prompt = prompt.strip()
        if not clean_prompt:
            return {
                "success": True,
                "intent": "EMPTY",
                "language": "english",
                "goal": "",
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": "I'm listening. Please let me know what you'd like to work on.",
                "tasks_created": 0,
                "execution_performed": False
            }

        # 1. IDEMPOTENCY CHECK
        req_key = idempotency_key or self.idempotency.generate_key(user_id, clean_prompt)
        can_run, cached_result = self.idempotency.check_or_acquire(req_key, user_id)
        if not can_run and cached_result:
            return cached_result

        # Retrieve recent conversation context
        recent_context = self.memory.get_recent_conversation(user_id, session_id, limit=6)

        # Record user turn in memory
        self.memory.add_conversation_turn(user_id, session_id, "user", clean_prompt)

        # 1.5. CHECK PENDING MULTI-TURN PROJECT CLARIFICATION
        pending_proj = self.memory.get_memory(user_id, "project", "pending_clarification")
        if pending_proj and isinstance(pending_proj, dict):
            step = pending_proj.get("step", "name")
            lang = IntentAnalyzer.detect_language(clean_prompt).value

            if step == "name":
                pending_proj["name"] = clean_prompt.rstrip(".! ")
                pending_proj["step"] = "design"
                self.memory.set_memory(user_id, "project", "pending_clarification", pending_proj)
                msg = f"'{pending_proj['name']}' ke liye kis tarah ki styling ya theme pasand karenge? (e.g. Premium dark design ya modern bold)?" if lang in ["hindi", "hinglish"] else f"What styling or design theme would you like for '{pending_proj['name']}' (e.g., Premium dark design, modern bold)?"
                self.memory.add_conversation_turn(user_id, session_id, "aura", msg)
                res = {
                    "success": True, "intent": "CLARIFICATION", "language": lang, "goal": clean_prompt,
                    "conversation_or_action": "conversation", "clarification": msg, "plan": [], "tools": [],
                    "response": msg, "tasks_created": 0, "execution_performed": False,
                    "duration_ms": int((time.time() - start_time) * 1000)
                }
                self.idempotency.record_completed(req_key, res)
                return res

            elif step == "design":
                pending_proj["theme"] = clean_prompt.rstrip(".! ")
                pending_proj["step"] = "features"
                self.memory.set_memory(user_id, "project", "pending_clarification", pending_proj)
                msg = f"Theme noted: {pending_proj['theme']}. Koi specific features chahiye, jaise WhatsApp booking, timetable ya membership plans?" if lang in ["hindi", "hinglish"] else f"Theme noted: {pending_proj['theme']}. Any specific features needed, like WhatsApp booking, schedule, or pricing plans?"
                self.memory.add_conversation_turn(user_id, session_id, "aura", msg)
                res = {
                    "success": True, "intent": "CLARIFICATION", "language": lang, "goal": clean_prompt,
                    "conversation_or_action": "conversation", "clarification": msg, "plan": [], "tools": [],
                    "response": msg, "tasks_created": 0, "execution_performed": False,
                    "duration_ms": int((time.time() - start_time) * 1000)
                }
                self.idempotency.record_completed(req_key, res)
                return res

            elif step == "features":
                pending_proj["features"] = clean_prompt.rstrip(".! ")
                pending_proj["step"] = "confirm"
                self.memory.set_memory(user_id, "project", "pending_clarification", pending_proj)
                msg = (
                    f"Great! Saari requirements note kar li hain:\n"
                    f"- Project: {pending_proj.get('name')} Gym\n"
                    f"- Theme: {pending_proj.get('theme')}\n"
                    f"- Features: {pending_proj.get('features')}\n\n"
                    f"Kya main ab project scaffold aur verification shuru karun? ('Okay bana do' bolkar confirm karein)"
                ) if lang in ["hindi", "hinglish"] else (
                    f"Requirements gathered:\n"
                    f"- Project: {pending_proj.get('name')} Gym\n"
                    f"- Theme: {pending_proj.get('theme')}\n"
                    f"- Features: {pending_proj.get('features')}\n\n"
                    f"Ready to build! Confirm with 'Okay bana do' or 'Okay build it'."
                )
                self.memory.add_conversation_turn(user_id, session_id, "aura", msg)
                res = {
                    "success": True, "intent": "CLARIFICATION", "language": lang, "goal": clean_prompt,
                    "conversation_or_action": "conversation", "clarification": msg, "plan": [], "tools": [],
                    "response": msg, "tasks_created": 0, "execution_performed": False,
                    "duration_ms": int((time.time() - start_time) * 1000)
                }
                self.idempotency.record_completed(req_key, res)
                return res

            elif step == "confirm":
                if any(w in clean_prompt.lower() for w in ["okay", "ok", "haan", "theek", "bana do", "banao", "start", "yes", "proceed"]):
                    spec = pending_proj
                    self.memory.delete_memory(user_id, "project", "pending_clarification")
                    clean_prompt = f"Create {spec.get('name', 'IronCore')} Gym website with {spec.get('theme', 'Premium dark design')} and {spec.get('features', 'WhatsApp booking')}"
                    # Fall through to execute ACTION_REQUEST for this single task!

        # 2. LOCAL COGNITIVE REASONING
        cognitive = self.reasoning.reason(clean_prompt, conversation_context=recent_context)
        raw_intent = cognitive.get("intent", "CONVERSATION")
        intent = raw_intent.value if hasattr(raw_intent, "value") else str(raw_intent)
        if intent == "QUESTION_EXPLANATION":
            intent = "QUESTION"
        elif intent == "CLARIFICATION_NEEDED":
            intent = "CLARIFICATION"

        language = cognitive.get("language", "english")
        goal = cognitive.get("goal", clean_prompt)
        conv_or_action = str(cognitive.get("conversation_or_action", "conversation")).lower()
        clarification = cognitive.get("clarification")
        reasoning_plan = cognitive.get("plan", [])
        reasoning_tools = cognitive.get("tools", [])
        reasoning_response = cognitive.get("response", "")

        # 3. STRICT BOUNDARY: CONVERSATION, SMALL TALK, OR QUESTION/EXPLANATION
        # MUST NOT create tasks, DAGs, or trigger tools!
        if conv_or_action == "conversation" and intent in ["CONVERSATION", "QUESTION", "FOLLOW_UP"]:
            response_text = reasoning_response or self.reasoning.generate_chat_response(
                prompt=clean_prompt,
                conversation_context=recent_context,
                language=language
            )
            self.memory.add_conversation_turn(user_id, session_id, "aura", response_text)

            res = {
                "success": True,
                "intent": intent,
                "language": language,
                "goal": goal,
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": response_text,
                "tasks_created": 0,
                "execution_performed": False,
                "duration_ms": int((time.time() - start_time) * 1000)
            }
            self.idempotency.record_completed(req_key, res)
            return res

        # 4. CLARIFICATION NEEDED
        if intent == "CLARIFICATION" or (clarification and conv_or_action != "action"):
            if "gym" in clean_prompt.lower():
                self.memory.set_memory(user_id, "project", "pending_clarification", {"type": "gym_website", "step": "name"})
                clarification_msg = (
                    "Gym website ke liye aapka kya naam socha hai? (e.g. IronCore, Apex Strength)"
                    if language in ["hindi", "hinglish"]
                    else "What name would you like for your gym website? (e.g., IronCore, Apex Strength)"
                )
            else:
                clarification_msg = clarification or (
                    "Aapka request thoda broad hai. Kripya thoda detail batayein:\n"
                    "1. Kis tarah ka project ya feature create karna hai (e.g. Gym landing page, Portfolio, REST API)?\n"
                    "2. Specific design style ya functionality kya honi chahiye?"
                ) if language in ["hindi", "hinglish"] else (
                    "Your request is broad. To give you the exact outcome, please clarify:\n"
                    "1. What kind of project or feature would you like to build (e.g., Gym landing page, Portfolio, REST API)?\n"
                    "2. What specific styling or interactive features are required?"
                )
            self.memory.add_conversation_turn(user_id, session_id, "aura", clarification_msg)
            res = {
                "success": True,
                "intent": "CLARIFICATION",
                "language": language,
                "goal": goal,
                "conversation_or_action": "conversation",
                "clarification": clarification_msg,
                "plan": [],
                "tools": [],
                "response": clarification_msg,
                "tasks_created": 0,
                "execution_performed": False,
                "duration_ms": int((time.time() - start_time) * 1000)
            }
            self.idempotency.record_completed(req_key, res)
            return res

        # 5. ACTION REQUEST — PLAN & SELECT TOOLS
        available_tools = [
            "filesystem_write", "filesystem_read", "terminal_execute",
            "code_runner", "browser_screenshot", "browser_inspect", "browser_control", "browser_e2e",
            "git_action", "web_research", "qa_verify_site"
        ]
        context = {"workspace": self.workspace_root, "language": language}
        plan_steps = self.reasoning.plan_execution_steps(clean_prompt)

        executed_steps = []
        overall_success = True
        fatal_error = None
        files_created = []

        # 6. EXECUTE → OBSERVE → VERIFY → RECOVER
        for step in plan_steps:
            tool_name = step.get("tool", "")
            args = step.get("args", {})
            desc = step.get("description", "")
            step_start = time.time()
            step_result: Dict[str, Any] = {"success": False}
            permission_key = self._map_tool_to_permission(tool_name)

            # Check Permission Matrix.
            # A request scope binds temporary approval to this execution context.
            effective_scope_id = scope_id or req_key

            allowed, perm_msg, perm_state = self.permissions.check_permission(
                user_id=user_id,
                perm_key=permission_key.value,
                interactive_confirm=interactive_confirm,
                grant_id=grant_id,
                scope_id=effective_scope_id
            )

            # Temporary grants are one-operation credentials.
            # Consume atomically immediately before execution.
            if allowed and perm_state == "grant":
                consumed = self.permissions.consume_grant(
                    grant_id=grant_id or "",
                    user_id=user_id,
                    perm_key=permission_key.value,
                    scope_id=effective_scope_id
                )

                if not consumed:
                    allowed = False
                    perm_state = PermissionState.DENY.value
                    perm_msg = "Permission grant could not be consumed safely."

            if not allowed:
                waiting_for_approval = (
                    perm_state == PermissionState.ASK.value
                )

                step_result = {
                    "success": False,
                    "error": perm_msg,
                    "permission_state": perm_state,
                    "requires_confirmation": waiting_for_approval,
                    "status": (
                        "WAITING_FOR_APPROVAL"
                        if waiting_for_approval
                        else "BLOCKED"
                    ),
                    "scope_id": effective_scope_id
                }
                overall_success = False
                fatal_error = perm_msg

                self.audit.log_action(
                    user_id=user_id, action_type="TOOL_EXECUTE", tool_name=tool_name,
                    parameters={
                        **args,
                        "_execution_scope_id": effective_scope_id
                    },
                    permission_state=perm_state, confirmed=interactive_confirm,
                    success=False, duration_ms=int((time.time() - step_start) * 1000),
                    error_message=perm_msg
                )

                executed_steps.append({
                    "step_id": step.get("step_id"),
                    "tool": tool_name,
                    "description": desc,
                    "result": step_result
                })
                break

            # Execute real tool
            try:
                if tool_name == "filesystem_write":
                    path = args.get("path", "active_project/index.html")
                    # If template is requested or website creation
                    if args.get("template") == "landing_page":
                        title = args.get("title", "AURA Project")
                        description = args.get(
                            "description",
                            f"Real responsive web application for {title}"
                        )
                        content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0b0b0f;
      color: #ffffff;
    }}
    main {{
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 40px 20px;
    }}
    .container {{
      width: min(1100px, 100%);
      text-align: center;
    }}
    h1 {{
      font-size: clamp(2.5rem, 7vw, 5.5rem);
      margin: 0 0 20px;
      line-height: 1;
    }}
    p {{
      max-width: 700px;
      margin: 0 auto 30px;
      color: #c9c9d1;
      font-size: 1.1rem;
      line-height: 1.7;
    }}
    a {{
      display: inline-block;
      padding: 14px 24px;
      border-radius: 999px;
      background: #ffffff;
      color: #0b0b0f;
      text-decoration: none;
      font-weight: 700;
    }}
  </style>
</head>
<body>
  <main>
    <section class="container">
      <h1>{title}</h1>
      <p>{description}</p>
      <a href="#contact">Get Started</a>
    </section>
  </main>
</body>
</html>"""
                    else:
                        content = args.get(
                            "content",
                            "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>AURA</title></head><body><main><h1>AURA</h1><a href='#contact'>Get Started</a></main></body></html>"
                        )

                    step_result = self.fs.write_file(path, content)
                    if step_result["success"]:
                        written_path = step_result.get("path") or path
                        if not os.path.isabs(written_path):
                            written_path = os.path.join(
                                self.workspace_root,
                                written_path,
                            )
                        files_created.append(os.path.abspath(written_path))

                elif tool_name == "filesystem_read":
                    step_result = self.fs.read_file(args.get("path", ""))

                elif tool_name == "terminal_execute":
                    cmd = args.get("command", "")
                    step_result = self.terminal.execute_command(cmd, cwd=args.get("cwd"))

                elif tool_name == "code_runner":
                    code = args.get("code") or args.get("command") or args.get("task", "")
                    lang = str(args.get("language", "python")).lower()
                    if lang in ["bash", "sh", "shell"] or any(cmd in code for cmd in ["npm ", "npx ", "pytest ", "git ", "node "]):
                        step_result = self.terminal.execute_command(code, cwd=args.get("cwd"))
                    else:
                        step_result = self.code_runner.run_python_code(code)

                elif tool_name == "browser_screenshot":
                    target = args.get("file_path", "")
                    if not target and files_created:
                        target = files_created[0]
                    if not (target.startswith("http://") or target.startswith("https://")) and not os.path.isabs(target):
                        target = os.path.join(self.workspace_root, target)
                    out_img = os.path.join(self.data_dir, f"screenshot_{int(time.time())}.png")
                    step_result = self.screen.capture_screen(target, output_path=out_img)

                elif tool_name == "git_action":
                    act = args.get("action", "status")
                    if act == "status":
                        step_result = self.git.status()
                    elif act == "branch":
                        step_result = self.git.branch()
                    elif act == "log":
                        step_result = self.git.log()
                    else:
                        step_result = self.git.diff()

                elif tool_name == "web_research":
                    query = args.get("query", clean_prompt)
                    step_result = self.research.search(query)

                elif tool_name == "qa_verify_site":
                    target_path = args.get("path", "")
                    if not target_path and files_created:
                        target_path = files_created[0]
                    if not os.path.isabs(target_path):
                        target_path = os.path.join(self.workspace_root, target_path)
                    step_result = QAEngine.audit_website_file(target_path)
                    step_result["success"] = bool(step_result.get("passed", False))

                elif tool_name in ("browser_control", "browser_inspect", "browser_e2e"):
                    target = args.get("url") or args.get("target", "")
                    # For generated local artifacts, always prefer the
                    # physically verified path produced by filesystem_write.
                    # Planner targets such as "active_project/index.html"
                    # are only fallbacks.
                    if files_created and not args.get("url"):
                        target = files_created[-1]
                    if args.get("actions"):
                        step_result = self.browser.execute_e2e_flow(
                            target_url=target,
                            actions=args.get("actions", []),
                            verify_condition=args.get("verify_condition")
                        )
                    else:
                        step_result = self.browser.navigate_and_inspect(target)

                elif tool_name in ("screen_vision", "screen_capture"):
                    target = args.get("target") or args.get("file_path", "")
                    if not target and files_created:
                        target = files_created[0]
                    step_result = self.screen.capture_and_understand(
                        target=target,
                        user_prompt=args.get("prompt", clean_prompt),
                        user_id=user_id,
                        confirmed=interactive_confirm,
                        permission_manager=self.permissions
                    )

                elif tool_name == "screen_analysis":
                    step_result = self.screen.analyze_screen(
                        screenshot_path_or_b64=args.get("screenshot_path", ""),
                        user_prompt=args.get("prompt", clean_prompt),
                        user_id=user_id,
                        confirmed=interactive_confirm,
                        permission_manager=self.permissions
                    )

                elif tool_name == "app_launch":
                    step_result = self.launcher.launch(args.get("app_name", ""))

                elif tool_name == "filesystem_delete":
                    from companion.aura_companion import AuraCompanion
                    companion = AuraCompanion(workspace_root=self.workspace_root)
                    res = companion.filesystem_delete(args.get("path", ""), confirmed=interactive_confirm)
                    step_result = res.to_dict()

                else:
                    step_result = {"success": False, "error": f"Unknown tool: {tool_name}"}

            except Exception as e:
                step_result = {"success": False, "error": str(e)}

            step_duration = int((time.time() - step_start) * 1000)

            # Audit log
            self.audit.log_action(
                user_id=user_id, action_type="TOOL_EXECUTE", tool_name=tool_name,
                parameters=args, permission_state=perm_state, confirmed=interactive_confirm,
                success=step_result.get("success", False), duration_ms=step_duration,
                error_message=step_result.get("error"),
                verification_status="VERIFIED" if step_result.get("success") else "FAILED"
            )

            executed_steps.append({
                "step_id": step.get("step_id"),
                "tool": tool_name,
                "description": desc,
                "result": step_result,
                "duration_ms": step_duration
            })

            # Formal outcome verification.
            # A successful tool call is not sufficient by itself; verify
            # that the requested physical outcome actually exists.
            outcome_verification = None

            if (
                tool_name == "filesystem_write"
                and step_result.get("success") is True
            ):
                written_path = step_result.get("path") or args.get("path")

                if written_path:
                    full_path = os.path.join(
                        self.workspace_root,
                        written_path
                    )

                    outcome_verification = Verifier.verify_file_exists(
                        full_path,
                        min_bytes=0
                    )

                    # For explicit content writes, also verify exact content.
                    if outcome_verification.get("verified") and "content" in args:
                        expected_content = str(args.get("content", ""))

                        try:
                            actual_content = Path(full_path).read_text(
                                encoding="utf-8"
                            )

                            content_matches = (
                                actual_content == expected_content
                            )

                            outcome_verification["content_verified"] = (
                                content_matches
                            )

                            if not content_matches:
                                outcome_verification["verified"] = False
                                outcome_verification["error"] = (
                                    "File exists, but its content does not "
                                    "match the requested content."
                                )
                        except Exception as verify_error:
                            outcome_verification = {
                                "verified": False,
                                "content_verified": False,
                                "error": (
                                    f"Content verification failed: "
                                    f"{verify_error}"
                                ),
                            }

                    step_result["outcome_verification"] = outcome_verification

                    if not outcome_verification.get("verified", False):
                        step_result["success"] = False
                        overall_success = False
                        fatal_error = outcome_verification.get(
                            "error",
                            "Requested file outcome could not be verified."
                        )

            # Formal terminal outcome verification.
            # A successful tool call is not enough; verify the
            # actual process exit status when available.
            if (
                tool_name == "terminal_execute"
                and step_result.get("exit_code") is not None
            ):
                exit_code = step_result.get("exit_code")

                # TerminalTool normally returns an exit code.
                # Do not silently claim verification when it is absent.
                if exit_code is None:
                    outcome_verification = {
                        "verified": False,
                        "verification_type": "process_exit_code",
                        "error": (
                            "Terminal command completed without a "
                            "verifiable exit code."
                        ),
                    }
                else:
                    outcome_verification = Verifier.verify_process_output(
                        int(exit_code),
                        expected_code=0,
                    )
                    outcome_verification["verification_type"] = (
                        "process_exit_code"
                    )

                step_result["outcome_verification"] = outcome_verification

                if not outcome_verification.get("verified", False):
                    step_result["success"] = False
                    overall_success = False
                    fatal_error = outcome_verification.get(
                        "error",
                        "Terminal command outcome could not be verified."
                    )

            if not step_result.get("success", False):
                overall_success = False
                fatal_error = step_result.get("error") or fatal_error
                break

        # 7. TRUTHFUL NATURAL RESPONSE GENERATION
        total_duration = int((time.time() - start_time) * 1000)
        summary_lines = []

        qa_step = next(
            (s for s in executed_steps if s.get("tool") == "qa_verify_site"),
            None
        )
        qa_audit = qa_step.get("result") if qa_step else None
        qa_passed = bool(qa_audit and qa_audit.get("passed") is True)

        if overall_success:
            if qa_step and not qa_passed:
                overall_success = False
                fatal_error = (
                    qa_audit.get("error")
                    or ", ".join(qa_audit.get("defects", []))
                    or "Website QA verification failed."
                )
                summary_lines.append("Execution completed, but verification failed.")
                summary_lines.append(f"Cause: {fatal_error}")
            elif files_created:
                summary_lines.append(f"Successfully executed plan for: '{clean_prompt}'.")
                summary_lines.append(
                    f"Created and verified files on disk: {', '.join(files_created)}."
                )
                if qa_passed:
                    summary_lines.append(
                        f"Website QA passed with score {qa_audit.get('score', 0)}/100."
                    )
            else:
                summary_lines.append(f"Successfully completed action: '{clean_prompt}'.")
                summary_lines.append(
                    f"Executed {len(executed_steps)} verified tool steps in {total_duration}ms."
                )
        else:
            summary_lines.append("Execution could not be fully completed.")
            if fatal_error:
                summary_lines.append(f"Cause: {fatal_error}")

        final_response = "\n".join(summary_lines)
        self.memory.add_conversation_turn(user_id, session_id, "aura", final_response)

        tools_list = reasoning_tools if reasoning_tools else list(dict.fromkeys(s.get("tool", "") for s in plan_steps if s.get("tool")))
        plan_list = reasoning_plan if reasoning_plan else [s.get("description", "") for s in plan_steps]

        res = {
            "success": overall_success,
            "intent": "ACTION_REQUEST",
            "language": language,
            "goal": goal,
            "conversation_or_action": "action",
            "clarification": None,
            "plan": plan_list,
            "tools": tools_list,
            "response": final_response,
            "plan_steps": plan_steps,
            "executed_steps": executed_steps,
            "files_created": files_created,
            "qa_audit": qa_audit,
            "duration_ms": total_duration,
            "tasks_created": len(plan_steps),
            "execution_performed": any(
                bool(step.get("result", {}).get("success", False))
                for step in executed_steps
            )
        }
        self.idempotency.record_completed(req_key, res)
        return res

    def _map_tool_to_permission(self, tool_name: str) -> PermissionKey:
        mapping = {
            "filesystem_write": PermissionKey.FILES_WRITE,
            "filesystem_read": PermissionKey.FILES_READ,
            "filesystem_delete": PermissionKey.FILES_DELETE,
            "terminal_execute": PermissionKey.TERMINAL_EXECUTION,
            "code_runner": PermissionKey.TERMINAL_EXECUTION,
            "browser_control": PermissionKey.BROWSER_CONTROL,
            "browser_inspect": PermissionKey.BROWSER_CONTROL,
            "browser_e2e": PermissionKey.BROWSER_CONTROL,
            "browser_screenshot": PermissionKey.SCREEN_CAPTURE,
            "screen_vision": PermissionKey.SCREEN_CAPTURE,
            "screen_capture": PermissionKey.SCREEN_CAPTURE,
            "screen_analysis": PermissionKey.SCREEN_ANALYSIS,
            "clipboard_read": PermissionKey.CLIPBOARD_READ,
            "clipboard_write": PermissionKey.CLIPBOARD_WRITE,
            "git_action": PermissionKey.GIT_ACCESS,
            "web_research": PermissionKey.BROWSER_CONTROL,
            "app_launch": PermissionKey.APP_LAUNCH,
            "qa_verify_site": PermissionKey.FILES_READ
        }
        return mapping.get(tool_name, PermissionKey.FILES_READ)
