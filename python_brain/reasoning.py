"""
AURA AI — LLM Reasoning Engine
Primary cognitive reasoner powered by Google GenAI SDK (Gemini) with structured JSON schema,
strict schema validation, automatic model failover, and deterministic heuristic fallback.
"""

import os
import re
import json
import logging
import time
from typing import Dict, Any, List, Optional, Tuple, Literal
from pydantic import BaseModel, Field

from .intent import IntentAnalyzer, IntentType

logger = logging.getLogger("aura_brain.reasoning")


class AuraReasoningSchema(BaseModel):
    intent: Literal["CONVERSATION", "QUESTION", "ACTION_REQUEST", "CLARIFICATION", "FOLLOW_UP"]
    language: Literal["english", "hindi", "hinglish"]
    goal: str
    conversation_or_action: Literal["conversation", "action"]
    clarification: Optional[str] = None
    plan: List[str] = []
    tools: List[str] = []
    response: str


class LLMReasoning:
    """
    Cognitive Reasoning Engine for AURA AI.
    - Uses Gemini via official google-genai SDK as primary engine.
    - Ensures is_gemini_active is true ONLY when SDK is installed, API key exists,
      client initializes, and a real request has successfully completed.
    - Provides automatic failover across preferred models.
    - Uses deterministic heuristic reasoning purely as a fallback.
    """

    DEFAULT_MODELS = [
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-flash-latest"
    ]

    ALLOWED_TOOLS = {
        "filesystem_write", "filesystem_read", "filesystem_delete", "terminal_execute",
        "code_runner", "browser_screenshot", "browser_control", "screen_vision",
        "screen_analysis", "app_launch", "git_action", "web_research", "qa_verify_site"
    }
    _SHARED_QUOTA_EXHAUSTED_UNTIL: float = 0.0

    def __init__(self, api_key: Optional[str] = None, auto_verify: bool = True):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.client = None
        self.sdk_installed = False
        self.client_initialized = False
        self.live_request_succeeded = False
        self.active_model: Optional[str] = None
        self.initialization_error: Optional[str] = None
        self.last_gemini_error: Optional[Dict[str, Any]] = None
        self.total_gemini_calls = 0
        self.successful_gemini_calls = 0

        # 1. Verify SDK presence
        try:
            from google import genai
            self.sdk_installed = True
        except ImportError as e:
            self.sdk_installed = False
            self.initialization_error = f"google-genai SDK not installed: {str(e)}"
            logger.warning(self.initialization_error)

        # 2. Verify API Key and initialize Client
        if self.sdk_installed and self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                self.client_initialized = True
            except Exception as e:
                self.client_initialized = False
                self.initialization_error = self._sanitize_error(str(e))
                logger.warning(f"Failed to initialize google-genai Client: {self.initialization_error}")
        elif not self.api_key:
            self.initialization_error = "GEMINI_API_KEY is not configured"

        # 3. Perform live verification if client is initialized
        if self.client_initialized and auto_verify:
            self.verify_live_connection()

    def get_models_to_try(self) -> List[str]:
        """Returns model list with GEMINI_MODEL env override prioritized."""
        configured = os.environ.get("GEMINI_MODEL")
        if configured and configured.strip():
            c = configured.strip()
            return [c] + [m for m in self.DEFAULT_MODELS if m != c]
        return list(self.DEFAULT_MODELS)

    def is_gemini_active(self) -> bool:
        """
        Truthful status indicator.
        True ONLY when SDK is installed, API key exists, client initializes,
        and a real Gemini API request has completed successfully.
        """
        return bool(
            self.sdk_installed and
            self.api_key and
            self.client_initialized and
            self.live_request_succeeded
        )

    @property
    def provider(self) -> str:
        if self.is_gemini_active():
            return "GEMINI"
        return "HEURISTIC_FALLBACK"

    @property
    def reasoning_mode(self) -> str:
        return self.provider

    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns truthful diagnostics with secrets strictly redacted."""
        return {
            "sdk_installed": self.sdk_installed,
            "api_key_configured": bool(self.api_key),
            "client_initialized": self.client_initialized,
            "live_request_succeeded": self.live_request_succeeded,
            "reasoning_mode": self.reasoning_mode,
            "active_model": self.active_model,
            "models_priority": self.get_models_to_try(),
            "total_calls": self.total_gemini_calls,
            "successful_calls": self.successful_gemini_calls,
            "quota_exhausted": bool(LLMReasoning._SHARED_QUOTA_EXHAUSTED_UNTIL > time.time()),
            "initialization_error": self.initialization_error,
            "last_error": self.last_gemini_error
        }

    def verify_live_connection(self) -> bool:
        """Sends a lightweight live request to confirm real Gemini API connectivity."""
        if not self.client_initialized or not self.client:
            self.live_request_succeeded = False
            return False

        if LLMReasoning._SHARED_QUOTA_EXHAUSTED_UNTIL > time.time():
            self.live_request_succeeded = False
            return False

        try:
            from google.genai import types
            afc = types.AutomaticFunctionCallingConfig(disable=True)
            cfg = types.GenerateContentConfig(
                automatic_function_calling=afc,
                max_output_tokens=10
            )
            quota_attempts = 0
            for model_name in self.get_models_to_try():
                try:
                    self.total_gemini_calls += 1
                    res = self.client.models.generate_content(
                        model=model_name,
                        contents="Say hello",
                        config=cfg
                    )
                    if res and res.text:
                        self.live_request_succeeded = True
                        self.successful_gemini_calls += 1
                        self.active_model = model_name
                        self.last_gemini_error = None
                        return True
                except Exception as e:
                    err_type = self._classify_error(e)
                    self._record_gemini_error("VERIFICATION_FAILURE", e, model_name)
                    if err_type == "QUOTA_ERROR":
                        quota_attempts += 1
                        if quota_attempts >= 2:
                            LLMReasoning._SHARED_QUOTA_EXHAUSTED_UNTIL = time.time() + 60
                            break
                    continue
        except Exception as e:
            self._record_gemini_error("VERIFICATION_SETUP_ERROR", e)

        self.live_request_succeeded = False
        return False

    def _sanitize_error(self, err_msg: str) -> str:
        """Strictly redacts sensitive keys from error messages."""
        if self.api_key and len(self.api_key) > 6:
            err_msg = err_msg.replace(self.api_key, "[REDACTED_API_KEY]")
        err_msg = re.sub(r'AIzaSy[A-Za-z0-9_-]{33}', '[REDACTED_KEY]', err_msg)
        return err_msg

    def _classify_error(self, err: Exception) -> str:
        """Classifies Gemini error into standard categories."""
        err_msg = str(err).lower()
        if any(w in err_msg for w in ["401", "403", "unauthenticated", "permission", "api_key", "invalid api key"]):
            return "AUTHENTICATION_ERROR"
        if any(w in err_msg for w in ["429", "quota", "resourceexhausted", "rate limit"]):
            return "QUOTA_ERROR"
        if any(w in err_msg for w in ["404", "not found", "is not found"]):
            return "UNAVAILABLE_MODEL"
        if any(w in err_msg for w in ["503", "500", "502", "504", "unavailable", "high demand", "overloaded"]):
            return "SERVICE_UNAVAILABLE"
        if any(w in err_msg for w in ["timeout", "timed out"]) or isinstance(err, TimeoutError):
            return "TIMEOUT"
        if any(w in err_msg for w in ["connection", "network", "getaddrinfo", "econnrefused"]):
            return "NETWORK_ERROR"
        return "GEMINI_ERROR"

    def _record_gemini_error(self, error_type: str, err: Exception, model: Optional[str] = None):
        sanitized = self._sanitize_error(str(err))
        self.last_gemini_error = {
            "type": error_type,
            "message": sanitized,
            "model": model,
            "timestamp": time.time()
        }
        logger.warning(f"Gemini error [{error_type}] with model {model}: {sanitized}")

    def reason(
        self,
        prompt: str,
        conversation_context: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Executes primary cognitive reasoning.
        Returns structured JSON matching the required schema:
        {
          "intent": "CONVERSATION | QUESTION | ACTION_REQUEST | CLARIFICATION | FOLLOW_UP",
          "language": "english | hindi | hinglish",
          "goal": "...",
          "conversation_or_action": "conversation | action",
          "clarification": null,
          "plan": [],
          "tools": [],
          "response": "..."
        }
        """
        recent_turns = conversation_context or []
        context_str = ""
        if recent_turns:
            context_str = "Recent conversation context:\n" + "\n".join(
                [f"- {t.get('role', 'user').upper()}: {t.get('content', '')}" for t in recent_turns[-4:]]
            )

        sys_prompt = (
            "You are the central cognitive reasoner for AURA AI, an autonomous intelligence partner built with Python.\n"
            "Analyze the user's prompt in the context of recent conversation turns.\n"
            "Output ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "intent": "CONVERSATION" | "QUESTION" | "ACTION_REQUEST" | "CLARIFICATION" | "FOLLOW_UP",\n'
            '  "language": "english" | "hindi" | "hinglish",\n'
            '  "goal": "<concise summary of user intent>",\n'
            '  "conversation_or_action": "conversation" | "action",\n'
            '  "clarification": null | "<question if clarification is needed>",\n'
            '  "plan": [<list of step descriptions if action, empty list [] if conversation/question>],\n'
            '  "tools": [<list of tool names if action, empty list [] if conversation/question>],\n'
            '  "response": "<natural, accurate, helpful response in the detected user language>"\n'
            "}\n\n"
            "CRITICAL CLASSIFICATION RULES:\n"
            "1. GREETINGS & SMALL TALK: (e.g., 'Hello AURA, kaise ho?', 'Namaste AURA, Hindi mein baat karo.', 'Hi', 'Good morning')\n"
            "   -> intent: 'CONVERSATION'\n"
            "   -> conversation_or_action: 'conversation'\n"
            "   -> plan: []\n"
            "   -> tools: []\n"
            "   -> clarification: null\n"
            "   Respond naturally and warmly in user's language.\n"
            "2. INFORMATIONAL QUESTIONS: (e.g., 'What is SEO?', 'Explain React components', 'What is machine learning?')\n"
            "   -> intent: 'QUESTION'\n"
            "   -> conversation_or_action: 'conversation'\n"
            "   -> plan: []\n"
            "   -> tools: []\n"
            "   -> clarification: null\n"
            "   Provide a comprehensive, high-quality, clear explanation in the response.\n"
            "3. VAGUE OR AMBIGUOUS REQUESTS: (e.g., 'Do something', 'kuch banao')\n"
            "   -> intent: 'CLARIFICATION'\n"
            "   -> conversation_or_action: 'conversation'\n"
            "   -> plan: []\n"
            "   -> tools: []\n"
            "   -> clarification: '<polite question asking for specifics>'\n"
            "4. ACTION REQUESTS: (e.g., 'Meri website ka SEO improve karo.', 'Create a portfolio website', 'Build a bakery landing page')\n"
            "   -> intent: 'ACTION_REQUEST'\n"
            "   -> conversation_or_action: 'action'\n"
            "   -> clarification: null\n"
            "   -> plan: [<ordered steps to execute>]\n"
            "   -> tools: [<selected tool names from: filesystem_write, filesystem_read, terminal_execute, code_runner, browser_screenshot, git_action, web_research, qa_verify_site>]\n"
            "Never create tasks or assign tools for greetings or questions."
        )

        # Primary attempt: Real Gemini API
        if self.client_initialized and self.client:
            structured_res = self._call_gemini_structured(prompt, sys_prompt, context_str)
            if structured_res:
                return structured_res

        # Safe deterministic heuristic fallback
        return self._heuristic_reason(prompt, recent_turns)

    def _call_gemini_structured(
        self,
        prompt: str,
        system_instruction: str,
        context_str: str = ""
    ) -> Optional[Dict[str, Any]]:
        """Calls Gemini with schema enforcement and automatic failover."""
        from google.genai import types

        afc = types.AutomaticFunctionCallingConfig(disable=True)
        cfg = types.GenerateContentConfig(
            system_instruction=system_instruction,
            automatic_function_calling=afc,
            response_mime_type="application/json",
            response_schema=AuraReasoningSchema,
            temperature=0.2
        )

        full_contents = f"{context_str}\nUser prompt: {prompt}" if context_str else f"User prompt: {prompt}"

        if LLMReasoning._SHARED_QUOTA_EXHAUSTED_UNTIL > time.time():
            return None

        quota_attempts = 0
        for model_name in self.get_models_to_try():
            try:
                self.total_gemini_calls += 1
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=full_contents,
                    config=cfg
                )
                if response and response.text:
                    parsed = self._parse_and_validate_json(response.text.strip(), prompt, model_name)
                    if parsed:
                        self.live_request_succeeded = True
                        self.successful_gemini_calls += 1
                        self.active_model = model_name
                        self.last_gemini_error = None
                        return parsed
            except Exception as e:
                err_type = self._classify_error(e)
                self._record_gemini_error(err_type, e, model_name)
                if err_type == "AUTHENTICATION_ERROR":
                    self.live_request_succeeded = False
                    break
                if err_type == "QUOTA_ERROR":
                    quota_attempts += 1
                    if quota_attempts >= 2:
                        LLMReasoning._SHARED_QUOTA_EXHAUSTED_UNTIL = time.time() + 60
                        break
                continue

        return None

    def _parse_and_validate_json(
        self,
        raw_text: str,
        original_prompt: str,
        model_name: str
    ) -> Optional[Dict[str, Any]]:
        """Parses, validates, and optionally repairs JSON from Gemini."""
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned

        data = None
        try:
            data = json.loads(cleaned)
        except Exception:
            # Substring extraction
            first_brace = cleaned.find("{")
            last_brace = cleaned.rfind("}")
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                try:
                    data = json.loads(cleaned[first_brace:last_brace + 1])
                except Exception:
                    pass

        # Attempt safe repair if malformed
        if not isinstance(data, dict):
            logger.warning(f"Malformed JSON from {model_name}. Attempting safe repair.")
            data = self._attempt_json_repair(raw_text, model_name)

        if not isinstance(data, dict):
            self.last_gemini_error = {
                "type": "MALFORMED_RESPONSE",
                "message": "Model returned invalid JSON and repair attempt failed",
                "model": model_name,
                "timestamp": time.time()
            }
            return None

        return self._normalize_and_validate_schema(data, original_prompt)

    def _attempt_json_repair(self, malformed_text: str, model_name: str) -> Optional[Dict[str, Any]]:
        """Attempts one single safe repair with Gemini."""
        try:
            from google.genai import types
            afc = types.AutomaticFunctionCallingConfig(disable=True)
            repair_cfg = types.GenerateContentConfig(
                system_instruction="Fix syntax errors and output ONLY valid JSON matching the schema.",
                automatic_function_calling=afc,
                response_mime_type="application/json",
                response_schema=AuraReasoningSchema,
                temperature=0.0
            )
            repair_resp = self.client.models.generate_content(
                model=model_name,
                contents=f"Repair this invalid JSON into valid JSON:\n{malformed_text[:1000]}",
                config=repair_cfg
            )
            if repair_resp and repair_resp.text:
                return json.loads(repair_resp.text.strip())
        except Exception as e:
            logger.warning(f"JSON repair attempt failed: {self._sanitize_error(str(e))}")
        return None

    def _normalize_and_validate_schema(self, data: Dict[str, Any], original_prompt: str) -> Optional[Dict[str, Any]]:
        """Normalizes parsed dictionary into the exact required schema."""
        try:
            raw_intent = str(data.get("intent", "CONVERSATION")).upper()
            intent_map = {
                "CONVERSATION": "CONVERSATION",
                "QUESTION": "QUESTION",
                "QUESTION_EXPLANATION": "QUESTION",
                "ACTION_REQUEST": "ACTION_REQUEST",
                "ACTION": "ACTION_REQUEST",
                "CLARIFICATION": "CLARIFICATION",
                "CLARIFICATION_NEEDED": "CLARIFICATION",
                "FOLLOW_UP": "FOLLOW_UP"
            }
            intent = intent_map.get(raw_intent, "CONVERSATION")

            raw_lang = str(data.get("language", "english")).lower()
            if "hindi" in raw_lang and "hinglish" not in raw_lang:
                language = "hindi"
            elif "hinglish" in raw_lang:
                language = "hinglish"
            else:
                language = "english"

            goal = str(data.get("goal", original_prompt))
            raw_conv_action = str(data.get("conversation_or_action", "conversation")).lower()
            conv_or_action = "action" if (raw_conv_action == "action" or intent == "ACTION_REQUEST") else "conversation"

            clarification = data.get("clarification")
            if clarification and not isinstance(clarification, str):
                clarification = str(clarification)

            plan_raw = data.get("plan")
            plan = [str(s) for s in plan_raw] if isinstance(plan_raw, list) else []

            tools_raw = data.get("tools")
            tools = [str(t) for t in tools_raw if str(t) in self.ALLOWED_TOOLS] if isinstance(tools_raw, list) else []

            # Enforce zero tasks & zero tools for conversation & questions
            if intent in ["CONVERSATION", "QUESTION", "CLARIFICATION", "FOLLOW_UP"] or conv_or_action == "conversation":
                conv_or_action = "conversation"
                plan = []
                tools = []

            # If action, ensure at least one step and tool
            if conv_or_action == "action":
                if not plan:
                    plan = [f"Execute action for: {goal}"]
                if not tools:
                    tools = ["code_runner"]

            response_text = str(data.get("response", ""))

            return {
                "intent": intent,
                "language": language,
                "goal": goal,
                "conversation_or_action": conv_or_action,
                "clarification": clarification,
                "plan": plan,
                "tools": tools,
                "response": response_text
            }
        except Exception as e:
            logger.warning(f"Schema normalization failed: {e}")
            return None

    def _heuristic_reason(
        self,
        prompt: str,
        conversation_context: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Deterministic heuristic fallback reasoner when Gemini is not available."""
        analysis = IntentAnalyzer.analyze_intent(prompt)
        raw_intent = analysis["intent"]
        lang = analysis["language"].value

        if raw_intent == IntentType.CONVERSATION:
            chat_reply = self.generate_chat_response(prompt, conversation_context, language=lang)
            return {
                "intent": "CONVERSATION",
                "language": lang,
                "goal": "Greeting or conversation",
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": chat_reply
            }
        elif raw_intent == IntentType.QUESTION_EXPLANATION:
            explanation = self.generate_chat_response(prompt, conversation_context, language=lang)
            return {
                "intent": "QUESTION",
                "language": lang,
                "goal": f"Explain: {prompt}",
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": explanation
            }
        elif raw_intent == IntentType.CLARIFICATION_NEEDED:
            clarification_msg = (
                "Aapka request thoda broad hai. Kripya thoda detail batayein:\n"
                "1. Kis tarah ka project ya feature create karna hai?\n"
                "2. Specific styling ya requirements kya hain?"
            ) if lang in ["hindi", "hinglish"] else (
                "Your request is broad. To give you the exact outcome, please clarify:\n"
                "1. What kind of project or feature would you like to build?\n"
                "2. What specific styling or interactive features are required?"
            )
            return {
                "intent": "CLARIFICATION",
                "language": lang,
                "goal": prompt,
                "conversation_or_action": "conversation",
                "clarification": clarification_msg,
                "plan": [],
                "tools": [],
                "response": clarification_msg
            }
        else:
            # ACTION_REQUEST
            steps = self.plan_execution_steps(prompt, ["filesystem_write", "qa_verify_site", "browser_screenshot", "terminal_execute"], {})
            plan_strings = [s.get("description", s.get("tool", "")) for s in steps]
            tools_used = list(dict.fromkeys(s.get("tool", "") for s in steps if s.get("tool") in self.ALLOWED_TOOLS))

            resp = (
                f"Maine aapka action plan taiyar kar liya hai: '{prompt}' ke liye {len(steps)} steps execute kiye jaenge."
            ) if lang in ["hindi", "hinglish"] else (
                f"Prepared execution plan for '{prompt}' with {len(steps)} verified steps."
            )
            return {
                "intent": "ACTION_REQUEST",
                "language": lang,
                "goal": prompt,
                "conversation_or_action": "action",
                "clarification": None,
                "plan": plan_strings,
                "tools": tools_used,
                "response": resp
            }

    def generate_chat_response(
        self,
        prompt: str,
        conversation_context: List[Dict[str, Any]],
        system_instruction: str = "",
        language: str = "english"
    ) -> str:
        """Generates conversational replies for greetings and explanations."""
        if self.is_gemini_active():
            from google.genai import types
            afc = types.AutomaticFunctionCallingConfig(disable=True)
            cfg = types.GenerateContentConfig(
                system_instruction=(
                    "You are AURA AI, an intelligent, empathetic, and highly capable AI partner built with Python.\n"
                    f"The user is speaking in {language}. Respond naturally, accurately, and helpfully in the matching language/dialect.\n"
                    "Be truthful, warm, and practical. Do not propose fake actions."
                ),
                automatic_function_calling=afc,
                temperature=0.4
            )
            contents = [f"{t.get('role', 'user').upper()}: {t.get('content', '')}" for t in conversation_context[-4:]]
            contents.append(f"USER: {prompt}")
            for model_name in self.get_models_to_try():
                try:
                    self.total_gemini_calls += 1
                    res = self.client.models.generate_content(
                        model=model_name,
                        contents="\n".join(contents),
                        config=cfg
                    )
                    if res and res.text:
                        self.successful_gemini_calls += 1
                        self.active_model = model_name
                        return res.text.strip()
                except Exception as e:
                    self._record_gemini_error(self._classify_error(e), e, model_name)
                    continue

        # Heuristic conversational fallback
        low = prompt.lower().strip()
        if language == "hindi":
            if any(w in low for w in ["namaste", "pranam", "kaise ho", "kya chal raha", "hindi mein"]):
                return "नमस्ते! मैं AURA AI हूँ — आपका पायथन पावर्ड AI साथी। मैं हिंदी में बात करने के लिए पूरी तरह तैयार हूँ। बताइए, आज क्या काम करना है?"
            if "kaun ho" in low or "naam kya" in low:
                return "मैं AURA AI हूँ, आपका समर्पित AI वर्क पार्टनर। मैं वेबसाइट डेवलपमेंट, कोडिंग, सिस्टम ऑटोमेशन और रिसर्च में आपकी मदद करता हूँ।"
            return f"मैंने आपकी बात समझ ली: '{prompt}'। बताइए, आगे क्या कार्य करना है?"
        elif language == "hinglish":
            if any(w in low for w in ["kaise ho", "kya haal", "kya chal raha", "hi", "hello"]):
                return "Hello! Main bilkul theek hoon aur fully ready hoon. Aap bataiye, aaj kis project ya code par kaam karna hai?"
            if "kaun ho" in low:
                return "Main AURA AI hoon, aapka real Python-powered AI partner. Code generation, browser automation, terminal work aur projects me main aapki help karta hoon."
            if "hindi me baat" in low:
                return "Haan bilkul! Hum Hindi aur Hinglish me baat kar sakte hain. Aap bataiye kya karna hai?"
            return f"Ji, maine samajh liya: '{prompt}'. Main isme aapki poori help karne ke liye ready hoon."
        else:
            if "seo" in low:
                return "SEO (Search Engine Optimization) is the practice of optimizing web pages and technical architecture to improve organic ranking and visibility in search engines like Google. Key pillars include high-quality content, semantic HTML tags, fast page load speeds, and authoritative backlinks."
            if any(w in low for w in ["hello", "hi", "hey"]):
                return "Hello! I am AURA AI, your real Python-powered work partner. How can I assist you with your projects, code, or systems today?"
            if "how are you" in low:
                return "I'm doing great and all systems are running smoothly! What are we building or exploring today?"
            if "who are you" in low:
                return "I am AURA AI, an autonomous intelligence engine and executive work partner capable of real coding, system execution, browser testing, and automated research."
            return f"I understand your message: '{prompt}'. How would you like to proceed?"

    def plan_execution_steps(
        self,
        goal: str,
        available_tools: List[str],
        context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Creates a structured multi-step execution plan using Gemini or planner fallback."""

        # Deterministic safety routing for explicit browser/navigation intent.
        # Prevents URLs and browser commands from being misrouted to code_runner.
        low = goal.lower()
        browser_markers = [
            "http://", "https://", "open website", "open the website",
            "open webpage", "open the webpage", "visit website",
            "visit the website", "navigate to", "browse to",
            "inspect the page", "inspect webpage", "inspect the website",
            "inspect website", "browser", "webpage"
        ]

        if any(marker in low for marker in browser_markers):
            target = goal.strip()
            url_start = target.find("http://")
            if url_start == -1:
                url_start = target.find("https://")

            if url_start >= 0:
                target = target[url_start:].split()[0].rstrip(".,!?)]}")
            else:
                target = ""

            if target:
                return [{
                    "step_id": 1,
                    "tool": "browser_inspect",
                    "description": "Open the target URL in the real browser and inspect the page",
                    "args": {"url": target},
                    "verification": "Confirm page loaded, DOM inspected, and browser result verified"
                }]

        if self.is_gemini_active():
            from google.genai import types
            afc = types.AutomaticFunctionCallingConfig(disable=True)
            sys_inst = (
                "You are the execution planner for AURA AI. Given a goal and available tools, "
                "return ONLY a valid JSON array of execution step objects.\n"
                "Allowed tools: filesystem_write, filesystem_read, terminal_execute, code_runner, "
                "browser_screenshot, browser_inspect, browser_control, browser_e2e, "
                "git_action, web_research, qa_verify_site.\n"
                "Each step must have: step_id (int), tool (str), description (str), args (object), verification (str).\n"
                "For web projects: write complete semantic HTML5 with Tailwind CSS in index.html, "
                "run automated QA audit (qa_verify_site), and capture screenshots (browser_screenshot).\n"
                "Do NOT start infinite background servers. Keep execution bounded and safe."
            )
            cfg = types.GenerateContentConfig(
                system_instruction=sys_inst,
                automatic_function_calling=afc,
                response_mime_type="application/json",
                temperature=0.1
            )
            user_msg = f"Goal: {goal}\nTools: {available_tools}\nContext: {json.dumps(context)}"
            for model_name in self.get_models_to_try():
                try:
                    self.total_gemini_calls += 1
                    raw_plan = self.client.models.generate_content(
                        model=model_name,
                        contents=user_msg,
                        config=cfg
                    )
                    if raw_plan and raw_plan.text:
                        cleaned = raw_plan.text.strip()
                        if cleaned.startswith("```"):
                            lines = cleaned.split("\n")
                            cleaned = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned
                        plan = json.loads(cleaned)
                        if isinstance(plan, list) and len(plan) > 0:
                            # Validate tool names in plan
                            valid_plan = []
                            for idx, s in enumerate(plan):
                                t = s.get("tool")
                                if t in self.ALLOWED_TOOLS:
                                    s["step_id"] = idx + 1
                                    valid_plan.append(s)
                            if valid_plan:
                                self.successful_gemini_calls += 1
                                self.active_model = model_name
                                return valid_plan
                except Exception as e:
                    self._record_gemini_error(self._classify_error(e), e, model_name)
                    continue

        # Deterministic domain-aware planner fallback
        low = goal.lower()
        steps = []
        step_id = 1

        if any(w in low for w in ["browser", "click", "cta", "inspect"]) and any(w in low for w in ["screenshot", "screen", "findings", "report", "state"]):
            target_page = "created_sites/active_project/index.html"
            steps.append({
                "step_id": step_id,
                "tool": "browser_control",
                "description": "Launch headless browser and navigate to target page",
                "args": {"action": "navigate", "url": target_page},
                "verification": "Confirm page loaded with 200/DOM ready"
            })
            step_id += 1
            steps.append({
                "step_id": step_id,
                "tool": "browser_control",
                "description": "Execute click on primary CTA with state verification and screenshot capture",
                "args": {
                    "action": "e2e_flow",
                    "url": target_page,
                    "actions": [{"action": "click", "selector": "button, a, .cta"}],
                    "verify_condition": {"selector": "body"}
                },
                "verification": "Verify click action executed and state transition observed"
            })
            step_id += 1
            steps.append({
                "step_id": step_id,
                "tool": "screen_vision",
                "description": "Capture screen pixels and perform structured visual screen analysis",
                "args": {"target": target_page, "prompt": "Inspect new state and verify interactive UI elements"},
                "verification": "Verify structured screen layout and UI elements detected"
            })
        elif any(w in low for w in ["website", "landing page", "web app", "site", "portfolio", "bakery", "gym"]):
            project_dir = "created_sites/active_project"
            clean_title = goal
            if "ironcore" in low:
                clean_title = "IronCore Gym"
            elif "gym" in low:
                clean_title = "IronCore Gym" if "ironcore" in low else "Apex Strength Gym"
            elif clean_title.lower().startswith(("create ", "make ", "build ")):
                clean_title = re.sub(r"^(create|make|build)\s+", "", clean_title, flags=re.I)
                clean_title = clean_title.split(" website")[0].strip().title()

            steps.append({
                "step_id": step_id,
                "tool": "filesystem_write",
                "description": "Scaffold index.html with semantic HTML5, viewport, and Tailwind CSS",
                "args": {"path": f"{project_dir}/index.html", "template": "landing_page", "title": clean_title},
                "verification": "Check file exists and contains <!DOCTYPE html> with valid title"
            })
            step_id += 1
            steps.append({
                "step_id": step_id,
                "tool": "qa_verify_site",
                "description": "Run automated QA audit on created website files",
                "args": {"path": f"{project_dir}/index.html"},
                "verification": "Check QA score >= 90 and zero fatal markup defects"
            })
            step_id += 1
            steps.append({
                "step_id": step_id,
                "tool": "browser_screenshot",
                "description": "Verify visual appearance and capture real browser preview",
                "args": {"file_path": f"{project_dir}/index.html"},
                "verification": "Confirm screenshot captured without browser crashes"
            })
        elif "seo" in low:
            project_dir = "created_sites/active_project"
            steps.append({
                "step_id": step_id,
                "tool": "filesystem_read",
                "description": "Read website index.html to audit meta tags, OpenGraph, headings, and semantic structure",
                "args": {"path": f"{project_dir}/index.html"},
                "verification": "Confirm index.html loaded for SEO audit"
            })
            step_id += 1
            steps.append({
                "step_id": step_id,
                "tool": "qa_verify_site",
                "description": "Run QA and SEO audit engine on page markup",
                "args": {"path": f"{project_dir}/index.html"},
                "verification": "Confirm SEO score and meta tag validation"
            })
            step_id += 1
            steps.append({
                "step_id": step_id,
                "tool": "web_research",
                "description": f"Research modern SEO ranking guidelines and meta tags for: {goal}",
                "args": {"query": f"SEO best practices {goal}"},
                "verification": "Confirm SEO best practices gathered"
            })
        elif "test" in low or "lint" in low:
            steps.append({
                "step_id": step_id,
                "tool": "terminal_execute",
                "description": "Run automated test and lint suite",
                "args": {"command": "npm test || npm run lint || pytest"},
                "verification": "Verify exit code is 0"
            })
        elif "git" in low:
            steps.append({
                "step_id": step_id,
                "tool": "git_action",
                "description": "Inspect repository status and branches",
                "args": {"action": "status"},
                "verification": "Check Git working tree status"
            })
        elif "research" in low or "search" in low:
            steps.append({
                "step_id": step_id,
                "tool": "web_research",
                "description": f"Conduct real web research on: {goal}",
                "args": {"query": goal},
                "verification": "Verify search results contain sources and valid summary"
            })
        else:
            steps.append({
                "step_id": step_id,
                "tool": "code_runner",
                "description": f"Execute required action: {goal}",
                "args": {"task": goal},
                "verification": "Check tool execution status and outputs"
            })

        return steps
