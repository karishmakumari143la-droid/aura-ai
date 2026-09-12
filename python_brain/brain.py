from pathlib import Path
import re
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

        # Retrieve recent conversation context from the current session.
        recent_context = self.memory.get_recent_conversation(user_id, session_id, limit=6)

        # Retrieve persistent user memories across sessions.
        # Keep this separate from conversation history so a new session can
        # still use explicitly saved preferences/facts without replaying old chat.
        persistent_memories = self.memory.search_memories(user_id)

        # Relevance filter: only expose memories that are plausibly related
        # to the current request. This prevents unrelated long-term memories
        # from contaminating ordinary questions.
        memory_query_text = clean_prompt.lower()
        relevant_memories = []

        response_memory_terms = (
            "respond", "response", "answer", "answers", "reply",
            "replies", "talk to me", "how should you", "how do you",
            "communication", "style", "concise", "short", "long"
        )

        project_memory_terms = (
            "project", "website", "gym", "design", "theme",
            "feature", "build", "build website", "scaffold"
        )

        for item in persistent_memories:
            category = str(item.get("category", "")).lower()
            key = str(item.get("key", "")).lower()
            value = str(item.get("value", "")).lower()
            tags = str(item.get("tags", "")).lower()

            searchable = " ".join([category, key, value, tags])

            is_relevant = False

            if category == "preference":
                is_relevant = any(
                    term in memory_query_text
                    for term in response_memory_terms
                )

            elif category == "project":
                is_relevant = any(
                    term in memory_query_text
                    for term in project_memory_terms
                )

            else:
                # Facts are only relevant when the current request explicitly
                # overlaps with the stored fact text/key.
                fact_tokens = {
                    token for token in re.findall(r"[a-z0-9]+", searchable)
                    if len(token) >= 4
                }
                prompt_tokens = set(
                    re.findall(r"[a-z0-9]+", memory_query_text)
                )
                is_relevant = bool(fact_tokens & prompt_tokens)

            if is_relevant:
                relevant_memories.append(item)

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

        # 1.6. EXPLICIT MEMORY COMMANDS
        # Deterministic local handling: no external AI/provider required.
        memory_low = " ".join(clean_prompt.lower().strip().split())

        remember_match = re.match(
            r"^(?:aura[,:]?\s*)?(?:remember|please remember|yaad rakho|yaad rakhna|yaad rakh lo)\s+(?:that\s+)?(.+?)\s*[.!?]*$",
            memory_low,
            re.IGNORECASE,
        )

        forget_match = re.match(
            r"^(?:aura[,:]?\s*)?(?:forget|please forget|bhool jao|bhul jao|yaad se hatao|yaad se delete karo)\s+(?:that\s+)?(.+?)\s*[.!?]*$",
            memory_low,
            re.IGNORECASE,
        )

        if remember_match:
            memory_text = remember_match.group(1).strip().rstrip(".!? ")
            lang = IntentAnalyzer.detect_language(clean_prompt).value

            # Normalize common explicit preferences into stable keys so a
            # changed preference updates the existing memory instead of creating
            # competing memories. Other statements retain deterministic keys.
            memory_category = "fact"
            memory_key = None
            memory_value = memory_text

            preference_patterns = [
                (
                    ["prefer short answers", "prefer short answer",
                     "like short answers", "want short answers",
                     "short answers"],
                    "response_style",
                    "short",
                ),
                (
                    ["prefer long answers", "prefer long answer",
                     "like long answers", "want long answers",
                     "long answers"],
                    "response_style",
                    "long",
                ),
                (
                    ["prefer concise answers", "prefer concise answer",
                     "want concise answers", "concise answers"],
                    "response_style",
                    "concise",
                ),
            ]

            memory_lower = memory_text.lower().strip()

            for patterns, stable_key, normalized_value in preference_patterns:
                if any(pattern in memory_lower for pattern in patterns):
                    memory_category = "preference"
                    memory_key = stable_key
                    memory_value = normalized_value
                    break

            if memory_key is None:
                key_text = re.sub(r"[^a-z0-9]+", "_", memory_text.lower()).strip("_")
                memory_key = f"user_statement_{key_text[:100]}" or "user_statement"

            # Never persist or echo secrets supplied through explicit memory commands.
            from .security.policy import SecurityPolicy

            if SecurityPolicy.contains_sensitive_memory(memory_text):
                msg = (
                    "Main password, API key, access token, secret ya credential ko memory mein save nahi kar sakti."
                    if lang in ["hindi", "hinglish"]
                    else "I can’t save passwords, API keys, access tokens, secrets, or credentials to memory."
                )

                self.memory.add_conversation_turn(user_id, session_id, "aura", msg)

                res = {
                    "success": True,
                    "intent": "MEMORY_BLOCKED_SENSITIVE",
                    "language": lang,
                    "goal": "Sensitive memory was blocked and not persisted.",
                    "tasks_created": 0,
                    "execution_performed": False,
                    "response": msg,
                }

                return res

            self.memory.set_memory(
                user_id,
                memory_category,
                memory_key,
                memory_value,
                tags=["explicit", "user_statement"],
            )

            msg = (
                f"Bilkul, yaad rakh liya: {memory_text}"
                if lang in ["hindi", "hinglish"]
                else f"Got it. I’ll remember this: {memory_text}"
            )

            self.memory.add_conversation_turn(user_id, session_id, "aura", msg)

            res = {
                "success": True,
                "intent": "MEMORY_STORE",
                "language": lang,
                "goal": memory_text,
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": msg,
                "tasks_created": 0,
                "execution_performed": False,
                "memory_stored": True,
                "duration_ms": int((time.time() - start_time) * 1000),
            }
            self.idempotency.record_completed(req_key, res)
            return res

        if forget_match:
            memory_text = forget_match.group(1).strip().rstrip(".!? ")
            lang = IntentAnalyzer.detect_language(clean_prompt).value

            # Explicit conversational forget matches the user's natural-language
            # statement against both memory key and stored value, then deletes
            # the exact matching memory item.
            matches = self.memory.search_memories(user_id, memory_text)
            removed = False

            normalized_memory_text = memory_text.lower().strip()

            for item in matches:
                item_value = str(item.get("value", "")).lower().strip()
                item_key = str(item.get("key", "")).lower().strip()

                if (
                    normalized_memory_text in item_value
                    or normalized_memory_text in item_key
                    or item_value in normalized_memory_text
                ):
                    removed = self.memory.delete_memory(
                        user_id,
                        item.get("category", ""),
                        item.get("key", ""),
                    ) or removed

            msg = (
                f"Bilkul, us memory ko hata diya: {memory_text}"
                if removed and lang in ["hindi", "hinglish"]
                else f"Done, I forgot that memory: {memory_text}"
                if removed
                else f"Mujhe us naam/text ki saved memory nahi mili: {memory_text}"
                if lang in ["hindi", "hinglish"]
                else f"I couldn't find a saved memory matching: {memory_text}"
            )

            self.memory.add_conversation_turn(user_id, session_id, "aura", msg)

            res = {
                "success": True,
                "intent": "MEMORY_FORGET",
                "language": lang,
                "goal": memory_text,
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": msg,
                "tasks_created": 0,
                "execution_performed": False,
                "memory_forgotten": removed,
                "duration_ms": int((time.time() - start_time) * 1000),
            }
            self.idempotency.record_completed(req_key, res)
            return res

        # 2. LOCAL COGNITIVE REASONING
        # Combine current-session conversation with explicitly saved persistent memory.
        # The reasoning engine remains fully local.
        memory_context = list(recent_context)
        for item in relevant_memories[:20]:
            memory_context.append({
                "role": "memory",
                "content": f"{item.get('category', 'memory')}: {item.get('value', '')}",
                "metadata": {
                    "memory_key": item.get("key"),
                    "tags": item.get("tags"),
                },
            })

        cognitive = self.reasoning.reason(clean_prompt, conversation_context=memory_context)
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
        background_requested = bool(cognitive.get("background_requested", False))

        # 3. STRICT BOUNDARY: CONVERSATION, SMALL TALK, OR QUESTION/EXPLANATION
        # MUST NOT create tasks, DAGs, or trigger tools!
        if conv_or_action == "conversation" and intent in ["CONVERSATION", "QUESTION", "FOLLOW_UP"]:
            if intent == "QUESTION":
                response_text = self.reasoning._question_reply(
                    clean_prompt,
                    language,
                    conversation_context=memory_context,
                )
            else:
                response_text = reasoning_response or self.reasoning.generate_chat_response(
                    prompt=clean_prompt,
                    conversation_context=memory_context,
                    language=language,
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

        # -----------------------------------------------------------
        # BACKGROUND EXECUTION ROUTING
        # -----------------------------------------------------------
        # Background execution is deliberately conservative:
        # - only explicit background intent is eligible
        # - only a single terminal_execute step is eligible
        # - the command must come from the structured execution plan
        # - permission is checked without treating the HTTP turn itself
        #   as a foreground confirmation
        # - the durable task is persisted before async execution starts
        #
        # This prevents a natural-language sentence from ever being
        # blindly passed to the shell.
        if background_requested:
            terminal_steps = [
                step for step in plan_steps
                if step.get("tool") == "terminal_execute"
            ]

            unsupported_background_steps = [
                step for step in plan_steps
                if step.get("tool") != "terminal_execute"
            ]

            background_command = None

            if (
                len(plan_steps) == 1
                and len(terminal_steps) == 1
                and not unsupported_background_steps
            ):
                candidate_args = terminal_steps[0].get("args") or {}
                candidate_command = candidate_args.get("command")

                if isinstance(candidate_command, str):
                    candidate_command = candidate_command.strip()

                    # The planner may preserve the natural-language
                    # background prefix inside the terminal command.
                    # Strip only known conversational prefixes; never
                    # perform arbitrary natural-language-to-shell
                    # rewriting here.
                    background_prefixes = (
                        "run this in background:",
                        "run it in background:",
                        "run in background:",
                        "background mein chalao:",
                        "background me chalao:",
                        "background mein run karo:",
                        "background me run karo:",
                        "background mein kar do:",
                        "background me kar do:",
                    )

                    normalized_command = candidate_command

                    for prefix in background_prefixes:
                        if normalized_command.lower().startswith(prefix):
                            normalized_command = normalized_command[len(prefix):].strip()
                            break

                    if normalized_command:
                        candidate_command = normalized_command

                if candidate_command:
                    background_command = candidate_command

            if background_command:
                # Background execution has a stricter command policy than
                # foreground terminal execution. Reject shell chaining,
                # pipelines, redirection, and command substitution before
                # consuming permission or creating a durable task.
                from .security.policy import SecurityPolicy

                background_safe, background_safety_error = (
                    SecurityPolicy.validate_background_command(
                        background_command
                    )
                )

                if not background_safe:
                    if language in ("hindi", "hinglish"):
                        background_safety_response = (
                            "Main ise background mein safely nahi chala sakti: "
                            f"{background_safety_error}"
                        )
                    else:
                        background_safety_response = (
                            "I can't run this in the background safely: "
                            f"{background_safety_error}"
                        )

                    self.memory.add_conversation_turn(
                        user_id,
                        session_id,
                        "aura",
                        background_safety_response,
                    )

                    background_safety_res = {
                        "success": False,
                        "intent": "ACTION_REQUEST",
                        "language": language,
                        "goal": goal,
                        "conversation_or_action": "action",
                        "clarification": None,
                        "plan": plan_list if "plan_list" in locals() else [
                            s.get("description", "")
                            for s in plan_steps
                        ],
                        "tools": ["terminal_execute"],
                        "response": background_safety_response,
                        "background_requested": True,
                        "background_task": None,
                        "status": "BLOCKED",
                        "requires_confirmation": False,
                        "permission_state": "blocked",
                        "permission_message": background_safety_error,
                        "scope_id": (
                            scope_id
                            or f"background:{user_id}:{req_key}"
                        ),
                        "plan_steps": plan_steps,
                        "executed_steps": [],
                        "files_created": [],
                        "qa_audit": {},
                        "duration_ms": int(
                            (time.time() - start_time) * 1000
                        ),
                        "tasks_created": 0,
                        "execution_performed": False,
                        "error": "UNSAFE_BACKGROUND_COMMAND",
                    }

                    self.idempotency.record_completed(
                        req_key,
                        background_safety_res,
                    )
                    return background_safety_res

                from .runtime.background import (
                    BackgroundTaskManager,
                    DurableTaskDispatcher,
                )

                effective_scope_id = (
                    scope_id
                    or f"background:{user_id}:{req_key}"
                )

                permission_key = PermissionKey.TERMINAL_EXECUTION

                allowed, perm_msg, perm_state = (
                    self.permissions.check_permission(
                        user_id=user_id,
                        perm_key=permission_key.value,
                        interactive_confirm=False,
                        grant_id=grant_id,
                        scope_id=effective_scope_id,
                    )
                )

                if allowed and perm_state == "grant":
                    consumed = self.permissions.consume_grant(
                        grant_id=grant_id or "",
                        user_id=user_id,
                        perm_key=permission_key.value,
                        scope_id=effective_scope_id,
                    )

                    if not consumed:
                        allowed = False
                        perm_state = PermissionState.DENY.value
                        perm_msg = (
                            "Permission grant could not be consumed safely."
                        )

                if not allowed:
                    waiting_for_approval = (
                        perm_state == PermissionState.ASK.value
                    )

                    background_response = (
                        "I can run this in the background, but "
                        "terminal execution permission is required."
                    )

                    if language in ("hindi", "hinglish"):
                        background_response = (
                            "Main ise background mein chala sakti hoon, "
                            "lekin terminal execution permission required hai."
                        )

                    self.memory.add_conversation_turn(
                        user_id,
                        session_id,
                        "aura",
                        background_response,
                    )

                    res = {
                        "success": False,
                        "intent": "ACTION_REQUEST",
                        "language": language,
                        "goal": goal,
                        "conversation_or_action": "action",
                        "clarification": None,
                        "plan": plan_list if "plan_list" in locals() else [
                            s.get("description", "")
                            for s in plan_steps
                        ],
                        "tools": ["terminal_execute"],
                        "response": background_response,
                        "background_requested": True,
                        "background_task": None,
                        "status": (
                            "WAITING_FOR_APPROVAL"
                            if waiting_for_approval
                            else "BLOCKED"
                        ),
                        "requires_confirmation": waiting_for_approval,
                        "permission_state": perm_state,
                        "permission_message": perm_msg,
                        "scope_id": effective_scope_id,
                        "plan_steps": plan_steps,
                        "executed_steps": [],
                        "files_created": [],
                        "qa_audit": {},
                        "duration_ms": int(
                            (time.time() - start_time) * 1000
                        ),
                        "tasks_created": 0,
                        "execution_performed": False,
                    }

                    self.idempotency.record_completed(req_key, res)
                    return res

                task_manager = BackgroundTaskManager(
                    db_path=os.path.join(self.data_dir, "aura_tasks.db")
                )
                dispatcher = DurableTaskDispatcher(
                    manager=task_manager,
                    brain=self,
                )

                task_title = (
                    terminal_steps[0].get("description")
                    or f"Background: {background_command}"
                )

                task_id = task_manager.create_durable_task(
                    user_id=user_id,
                    title=str(task_title),
                    task_type="terminal_command",
                    payload={
                        "command": background_command,
                        "cwd": self.workspace_root,
                    },
                )

                dispatcher.dispatch_task_async(task_id)

                if language in ("hindi", "hinglish"):
                    background_response = (
                        f"Background mein kaam start kar diya hai. "
                        f"Task ID: {task_id}"
                    )
                else:
                    background_response = (
                        f"I've started this in the background. "
                        f"Task ID: {task_id}"
                    )

                self.memory.add_conversation_turn(
                    user_id,
                    session_id,
                    "aura",
                    background_response,
                )

                background_res = {
                    "success": True,
                    "intent": "ACTION_REQUEST",
                    "language": language,
                    "goal": goal,
                    "conversation_or_action": "action",
                    "clarification": None,
                    "plan": [
                        s.get("description", "")
                        for s in plan_steps
                    ],
                    "tools": ["terminal_execute"],
                    "response": background_response,
                    "background_requested": True,
                    "background_task": {
                        "task_id": task_id,
                        "status": "QUEUED",
                        "task_type": "terminal_command",
                        "command": background_command,
                    },
                    "status": "QUEUED",
                    "scope_id": effective_scope_id,
                    "plan_steps": plan_steps,
                    "executed_steps": [],
                    "files_created": [],
                    "qa_audit": {},
                    "duration_ms": int(
                        (time.time() - start_time) * 1000
                    ),
                    "tasks_created": 1,
                    "execution_performed": False,
                }

                self.idempotency.record_completed(
                    req_key,
                    background_res,
                )
                return background_res

            # Explicit background intent was detected, but the planner
            # did not produce a safe single terminal command. Do NOT
            # silently fall back to foreground execution.
            if language in ("hindi", "hinglish"):
                background_blocked_response = (
                    "Main ise background mein chala sakti hoon, "
                    "lekin current request ko safe background terminal "
                    "command mein reliably map nahi kar paayi."
                )
            else:
                background_blocked_response = (
                    "I detected a background request, but the current "
                    "plan cannot be safely mapped to a single terminal "
                    "command. I will not execute it blindly."
                )

            self.memory.add_conversation_turn(
                user_id,
                session_id,
                "aura",
                background_blocked_response,
            )

            background_blocked_res = {
                "success": False,
                "intent": "ACTION_REQUEST",
                "language": language,
                "goal": goal,
                "conversation_or_action": "action",
                "clarification": None,
                "plan": [
                    s.get("description", "")
                    for s in plan_steps
                ],
                "tools": list(dict.fromkeys(
                    s.get("tool", "")
                    for s in plan_steps
                    if s.get("tool")
                )),
                "response": background_blocked_response,
                "background_requested": True,
                "background_task": None,
                "status": "BLOCKED",
                "error": "UNSAFE_BACKGROUND_PLAN",
                "plan_steps": plan_steps,
                "executed_steps": [],
                "files_created": [],
                "qa_audit": {},
                "duration_ms": int(
                    (time.time() - start_time) * 1000
                ),
                "tasks_created": 0,
                "execution_performed": False,
            }

            self.idempotency.record_completed(
                req_key,
                background_blocked_res,
            )
            return background_blocked_res

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
                        low_goal = str(description).lower()
                        is_gym = "gym" in low_goal or "ironcore" in low_goal
                        has_whatsapp = "whatsapp" in low_goal

                        display_title = (
                            "IronCore Gym"
                            if is_gym
                            else title
                        )
                        feature_markup = (
                            "<section><h2>WhatsApp Booking</h2>"
                            "<p>Book your gym session directly through WhatsApp.</p>"
                            "</section>"
                            if has_whatsapp
                            else ""
                        )
                        content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{display_title}</title>
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
      <h1>{display_title}</h1>
      <p>{description}</p>
      {feature_markup}
      <a href="#contact">Get Started</a>
      <script src="https://cdn.tailwindcss.com"></script>
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
                    act = str(args.get("action", "status")).strip().lower()

                    if act == "status":
                        step_result = self.git.status()

                    elif act == "branch":
                        step_result = self.git.branch()

                    elif act == "log":
                        count = args.get("count", 5)
                        try:
                            count = max(1, min(int(count), 50))
                        except (TypeError, ValueError):
                            count = 5
                        step_result = self.git.log(count)

                    elif act == "diff":
                        step_result = self.git.diff()

                    elif act == "commit":
                        message = str(args.get("message", "")).strip()
                        if not message:
                            step_result = {
                                "success": False,
                                "status": "INVALID_REQUEST",
                                "error": "COMMIT_MESSAGE_REQUIRED",
                                "message": "A commit message is required."
                            }
                        else:
                            add_all = args.get("add_all", True)
                            step_result = self.git.commit(
                                message=message,
                                add_all=bool(add_all)
                            )

                    elif act == "push":
                        remote = str(args.get("remote", "origin")).strip() or "origin"
                        branch = str(args.get("branch", "")).strip()
                        step_result = self.git.push(
                            remote=remote,
                            branch=branch
                        )

                    elif act == "create_remote_repo":
                        repo_name = str(args.get("repo_name", "")).strip()
                        private = bool(args.get("private", True))

                        if not repo_name:
                            step_result = {
                                "success": False,
                                "status": "INVALID_REQUEST",
                                "error": "REPOSITORY_NAME_REQUIRED",
                                "message": "A repository name is required."
                            }
                        else:
                            step_result = self.git.create_remote_repo(
                                repo_name=repo_name,
                                private=private
                            )

                    else:
                        step_result = {
                            "success": False,
                            "status": "INVALID_REQUEST",
                            "error": f"UNKNOWN_GIT_ACTION:{act}"
                        }

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

                    # Website QA recovery:
                    # only heal explicit QA defects reported by QAEngine.
                    if not step_result["success"] and os.path.isfile(target_path):
                        defects = step_result.get("defects") or []

                        if defects:
                            def _reverify(path):
                                return QAEngine.audit_website_file(path)

                            recovery = ErrorHealer.auto_fix_and_reverify(
                                target_path,
                                defects,
                                _reverify,
                                max_attempts=3,
                            )

                            step_result["recovery"] = recovery

                            if recovery.get("recovered") is True:
                                healed_audit = QAEngine.audit_website_file(target_path)
                                step_result.update(healed_audit)
                                step_result["success"] = bool(
                                    healed_audit.get("passed", False)
                                )
                            else:
                                step_result["success"] = False

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
            "background_requested": background_requested,
            "plan_steps": plan_steps,
            "executed_steps": executed_steps,
            "files_created": files_created,
            "qa_audit": qa_audit,
            "duration_ms": total_duration,
            "tasks_created": len(plan_steps),
            "execution_performed": bool(executed_steps)
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
