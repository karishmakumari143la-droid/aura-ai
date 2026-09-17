"""
AURA AI — Local Reasoning Engine

No external LLM/API/provider dependency.
Handles:
- intent understanding
- language detection
- conversation
- clarification
- deterministic action planning
- tool selection
"""

import re
from typing import Any, Dict, List

from .local_llm import LocalLLM


class AuraReasoning:

    ALLOWED_TOOLS = [
        "filesystem_write",
        "filesystem_read",
        "terminal_execute",
        "code_runner",
        "browser_screenshot",
        "browser_inspect",
        "browser_control",
        "browser_e2e",
        "git_action",
        "web_research",
        "qa_verify_site",
    ]

    def __init__(self):
        self.engine = "AURA_LOCAL_REASONING"
        self.version = "1.0.0"
        self.local_llm = LocalLLM()

    @staticmethod
    def detect_language(text: str) -> str:
        text = text.lower()

        hindi_words = [
            "hai", "hain", "mujhe", "mera", "meri", "mere",
            "kya", "kaise", "banao", "bana", "karna",
            "karo", "chahiye", "aap", "tum", "yeh", "yah",
            "website", "mein", "me", "se", "ke", "ki"
        ]

        devanagari = bool(re.search(r"[\u0900-\u097F]", text))

        if devanagari:
            return "hindi"

        hindi_count = sum(
            1 for word in hindi_words
            if re.search(r"\b" + re.escape(word) + r"\b", text)
        )

        # Mixed Latin-script Hindi should be Hinglish even when
        # the phrase contains only one strong Hindi marker.
        hinglish_phrases = [
            "kaise ho", "kya hai", "kya kar", "kya karo",
            "batao", "meri", "mera", "mujhe", "aapko",
            "kar do", "bana do", "bata do", "theek hai",
            "haan", "nahi", "nahin", "chahiye"
        ]

        if hindi_count >= 2 or any(phrase in text for phrase in hinglish_phrases):
            return "hinglish"

        return "english"

    def reason(
        self,
        prompt: str,
        conversation_context: List[Dict[str, Any]] | None = None,
    ) -> Dict[str, Any]:

        text = prompt.strip()
        low = text.lower()
        language = self.detect_language(text)

        # -----------------------------
        # CONVERSATION
        # -----------------------------

        greetings = [
            "hello",
            "hi",
            "hey",
            "namaste",
            "good morning",
            "good evening",
            "good afternoon",
            "kaise ho",
            "how are you",
            "kya haal",
        ]

        if any(x in low for x in greetings) and not self._contains_action(low):
            return {
                "intent": "CONVERSATION",
                "language": language,
                "goal": "Conversation",
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": self._conversation_reply(low, language),
            }

        # Language preference is conversational, never an executable action.
        language_preferences = [
            "hindi mein baat karo",
            "hindi me baat karo",
            "english mein baat karo",
            "english me baat karo",
            "hinglish mein baat karo",
            "hinglish me baat karo",
            "हिंदी में बात करो",
            "हिंदी में बात करें",
        ]

        if any(x in low or x in text for x in language_preferences):
            requested_language = (
                "hindi"
                if "hindi" in low or "हिंदी" in text
                else "hinglish"
                if "hinglish" in low
                else "english"
            )
            response = {
                "hindi": "Bilkul. Ab main aapse Hindi mein baat karungi.",
                "hinglish": "Bilkul. Ab main aapse natural Hinglish mein baat karungi.",
                "english": "Sure. I’ll continue speaking with you in English.",
            }[requested_language]

            return {
                "intent": "CONVERSATION",
                "language": requested_language,
                "goal": "Language preference",
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": response,
            }

        # Gratitude / acknowledgement is conversational, never a task.
        gratitude = [
            "shukriya",
            "dhanyavaad",
            "thanks",
            "thank you",
            "thankyou",
            "thx",
            "bahut accha",
            "bahut acha",
            "great",
            "perfect",
            "okay thanks",
            "ok thanks",
        ]

        if any(x == low.strip(" .!?") or x in low for x in gratitude):
            return {
                "intent": "CONVERSATION",
                "language": language,
                "goal": "Acknowledgement",
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": self._conversation_reply(low, language),
            }

        # -----------------------------
        # QUESTIONS
        # -----------------------------

        question_starts = [
            "what is",
            "what are",
            "why is",
            "why are",
            "how does",
            "how do",
            "how should",
            "what should",
            "explain",
            "define",
            "who made you",
            "who created you",
            "who built you",
            "who are you",
            "tell me about yourself",
            "tell me a joke",
            "joke sunao",
            "joke batao",
            "make me laugh",
            "kya hai",
            "kya hota hai",
            "kyun",
            "kaise kaam",
            "kaise ho",
            "aap kaise ho",
            "tum kaise ho",
            "aap kaise hain",
            "tum kaise hain",
            "कैसे हो",
            "आप कैसे हो",
            "तुम कैसे हो",
            "आप कैसे हैं",
            "तुम कैसे हैं",
        ]

        question_phrases = [
            "i want to understand",
            "i'd like to understand",
            "i would like to understand",
            "i want to know",
            "i'd like to know",
            "i would like to know",
            "can you explain",
            "could you explain",
            "can you tell me",
            "could you tell me",
            "help me understand",
            "tum kya kya kar sakti ho",
            "aap kya kya kar sakte ho",
            "aap kya kya kar sakti ho",
            "tum kya kar sakte ho",
            "mujhe samjhao",
            "mujhe samjha do",
            "simple language mein samjhao",
            "simple language me samjhao",
            "simple mein samjhao",
            "simple me samjhao",
            "usme kya hai",
            "isme kya hai",
            "mein kya hai",
        ]

        contextual_question = bool(
            re.search(
                r"\b(jo|jis|jisme|usme|isme|is file|us file|file)\b.*\b(kya|kaise|kyun|kab|kahan|kaun)\b",
                low,
            )
        )

        past_reference_question = bool(
            re.search(
                r"\b(jo|jis|kal jo|pehle jo|abhi jo)\b.*\b(banaya|banayi|banaye|likha|likhi|kiya|ki)\b.*\b(kya|kaise|kyun|kab|kahan|kaun)\b",
                low,
            )
        )

        action_detected = self._contains_action(low)
        informational_context = contextual_question or past_reference_question

        if (
            (
                any(x in low for x in question_starts)
                or any(x in low for x in question_phrases)
                or informational_context
            )
            and (not action_detected or informational_context)
        ):
            return {
                "intent": "QUESTION",
                "language": language,
                "goal": text,
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": self._question_reply(text, language),
            }

        # -----------------------------
        # AMBIGUOUS REQUEST
        # -----------------------------

        vague = [
            "do something",
            "kuch karo",
            "kuch banao",
            "something karo",
            "help me",
            "help karo",
        ]

        if any(x in low for x in vague) and not self._contains_action(low):
            msg = (
                "Aap kya karwana chahte hain? Project, website, coding, research ya koi specific task bataiye."
                if language in ("hindi", "hinglish")
                else
                "What would you like me to work on? Tell me the project, website, coding task, research, or specific action."
            )

            return {
                "intent": "CLARIFICATION",
                "language": language,
                "goal": text,
                "conversation_or_action": "conversation",
                "clarification": msg,
                "plan": [],
                "tools": [],
                "response": msg,
            }

        # -----------------------------
        # DECLARATIVE CONVERSATION
        # -----------------------------
        # A plain statement about the user, their preferences, or general
        # conversation is not an executable request. Explicit memory commands
        # are handled separately by brain.py before reaching this point.
        declarative_markers = [
            "i like ",
            "i really like ",
            "i prefer ",
            "i love ",
            "i hate ",
            "i want ",
            "i usually ",
            "i always ",
            "i never ",
            "i am ",
            "i'm ",
            "my favorite ",
            "my favourite ",
            "mujhe pasand ",
            "mujhe acha lagta",
            "mujhe achha lagta",
            "mujhe pasand hai",
            "mujhe nahi pasand",
        ]

        if any(marker in low for marker in declarative_markers):
            return {
                "intent": "CONVERSATION",
                "language": language,
                "goal": text,
                "conversation_or_action": "conversation",
                "clarification": None,
                "plan": [],
                "tools": [],
                "response": self._conversation_reply(low, language),
            }

        # -----------------------------
        # WEBSITE REQUEST WITHOUT CONFIRMATION
        # -----------------------------
        # A vague website request starts a clarification flow. The actual
        # build must wait for the user's explicit confirmation/action request.
        website_request = any(
            phrase in low
            for phrase in [
                "website banani hai",
                "website banana hai",
                "website banaani hai",
                "website bnani hai",
                "website bnana hai",
                "website chahiye",
            ]
        )
        confirmation_or_action = any(
            phrase in low
            for phrase in [
                "okay bana do",
                "ok bana do",
                "haan bana do",
                "yes bana do",
                "bana do",
                "create it",
                "build it",
                "make it",
            ]
        )

        if website_request and not confirmation_or_action:
            msg = (
                "Bilkul. Website banane ke liye pehle naam, styling/design aur required features bataiye."
                if language in ("hindi", "hinglish")
                else
                "Sure. Before I build it, please provide the website name, design/style, and required features."
            )

            return {
                "intent": "CLARIFICATION",
                "language": language,
                "goal": text,
                "conversation_or_action": "conversation",
                "clarification": msg,
                "plan": [],
                "tools": [],
                "response": msg,
            }

        # -----------------------------
        # LOCAL LLM SEMANTIC FALLBACK
        # -----------------------------
        # Deterministic rules remain authoritative for clear requests.
        # The local model is consulted only when those rules reach the
        # generic action fallback. It may classify intent, but it has no
        # authority to select tools, create plans, or execute anything.
        llm_result = self._llm_understand(
            text,
            conversation_context=conversation_context,
        )

        if isinstance(llm_result, dict):
            llm_intent = str(llm_result.get("intent", "")).strip().upper()
            llm_goal = str(llm_result.get("goal", "")).strip() or text
            llm_clarification = bool(llm_result.get("clarification_needed", False))

            if llm_intent == "QUESTION":
                return {
                    "intent": "QUESTION",
                    "language": language,
                    "goal": llm_goal,
                    "conversation_or_action": "conversation",
                    "clarification": None,
                    "plan": [],
                    "tools": [],
                    "response": self._question_reply(
                        text,
                        language,
                        conversation_context=conversation_context,
                    ),
                }

            if llm_intent == "CONVERSATION":
                return {
                    "intent": "CONVERSATION",
                    "language": language,
                    "goal": llm_goal,
                    "conversation_or_action": "conversation",
                    "clarification": None,
                    "plan": [],
                    "tools": [],
                    "response": self._conversation_reply(text, language),
                }

            if llm_intent == "CLARIFICATION" or llm_clarification:
                msg = (
                    "Aapka request thoda broad hai. Thoda aur detail bataiye."
                    if language in ("hindi", "hinglish")
                    else "Your request needs a little more detail before I can act on it."
                )
                return {
                    "intent": "CLARIFICATION",
                    "language": language,
                    "goal": llm_goal,
                    "conversation_or_action": "conversation",
                    "clarification": msg,
                    "plan": [],
                    "tools": [],
                    "response": msg,
                }

        # -----------------------------
        # ACTION
        # -----------------------------

        plan = self.plan_execution_steps(text)

        return {
            "intent": "ACTION_REQUEST",
            "language": language,
            "goal": text,
            "conversation_or_action": "action",
            "clarification": None,
            "plan": [x["description"] for x in plan],
            "tools": list(dict.fromkeys(x["tool"] for x in plan)),
            "background_requested": self._is_background_request(text),
            "response": self._action_reply(text, language, len(plan)),
        }

    def _llm_understand(
        self,
        prompt: str,
        conversation_context: List[Dict[str, Any]] | None = None,
    ) -> Dict[str, Any] | None:
        """Use the local model only for semantic understanding.

        The model has no execution authority. Tool selection and execution
        remain controlled by AURA's deterministic planner and permission layer.
        """
        context_lines = []
        for item in (conversation_context or [])[-6:]:
            role = str(item.get("role", "")).strip()
            content = str(item.get("content", "")).strip()
            if role and content:
                context_lines.append(f"{role}: {content}")

        context = "\n".join(context_lines)
        system_prompt = (
            "You are AURA's local language-understanding layer. "
            "Understand the user's natural Hindi, Hinglish, or English. "
            "Do not execute anything. Do not invent tools. Do not create an execution plan. "
            "Return ONLY valid JSON with exactly these keys: intent, goal, clarification_needed. "
            "intent must be one of CONVERSATION, QUESTION, CLARIFICATION, ACTION_REQUEST. "
            "goal must preserve the user's actual requested outcome. "
            "clarification_needed must be true only when essential information is missing."
        )

        user_prompt = (
            f"Conversation context:\n{context}\n\n"
            f"User request:\n{prompt}"
        )

        return self.local_llm.structured_chat(
            system_prompt,
            user_prompt,
            temperature=0.1,
        )

    @staticmethod
    def _is_background_request(text: str) -> bool:
        """
        Detect explicit user intent for background execution.

        Conservative: requires explicit background language and a
        background-execution verb/context. It does not grant permission.
        """
        import re

        low = " ".join(text.strip().lower().split())

        explicit_phrases = [
            "run this in background",
            "run it in background",
            "run in background",
            "background mein chalao",
            "background me chalao",
            "background mein run karo",
            "background me run karo",
            "background mein execute karo",
            "background me execute karo",
            "background mein execute kar do",
            "background me execute kar do",
            "background task",
            "background job",
            "background mein",
            "background me",
            "in the background",
            "continue in background",
            "continue in the background",
            "keep running after i close",
            "keep running after I close",
            "while I am away",
            "while i'm away",
        ]

        if any(phrase in low for phrase in explicit_phrases):
            return True

        # Natural Hinglish: "background mein terminal command ... chalao"
        # / "background me command ... run karo"
        has_background = bool(re.search(r"\\bbackground\\s+(?:mein|me)\\b", low))
        has_execution_verb = bool(
            re.search(
                r"\\b(?:chalao|chala|chalana|run|execute|start|start\\s+kar(?:o|na)?|"
                r"run\\s+kar(?:o|na)?|execute\\s+kar(?:o|na)?)\\b",
                low,
            )
        )

        return has_background and has_execution_verb


    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "engine": self.engine,
            "version": self.version,
            "external_provider": False,
            "api_key_required": False,
            "status": "WORKING",
        }

    @staticmethod
    def _extract_website_title(goal: str) -> str:
        low = goal.lower()

        if "gym" in low:
            return "Gym Website"
        if "restaurant" in low:
            return "Restaurant Website"
        if "salon" in low:
            return "Salon Website"
        if "real estate" in low or "property" in low:
            return "Real Estate Website"
        if "portfolio" in low:
            return "Portfolio Website"

        return "AURA Website"


    def plan_execution_steps(self, goal: str) -> List[Dict[str, Any]]:
        low = goal.lower()
        steps: List[Dict[str, Any]] = []

        # Browser / URL
        if (
            "http://" in low
            or "https://" in low
            or "open website" in low
            or "open webpage" in low
            or "inspect page" in low
            or "inspect website" in low
            or "browser" in low
            or "navigate" in low
            or "visit website" in low
        ):
            match = re.search(r"https?://[^\s]+", goal)

            if match:
                url = match.group(0).rstrip(".,!?)]}")

                steps.append({
                    "step_id": 1,
                    "tool": "browser_inspect",
                    "description": "Open the target URL and inspect the page",
                    "args": {"url": url},
                    "verification": "Verify that the page loaded and DOM inspection succeeded",
                })

                return steps

        # Standalone website QA / recovery
        # Must run before generic file/website rules so requests such as
        # "QA verify this file and automatically fix/re-verify defects"
        # invoke the real QA + recovery execution path.
        is_qa_request = any(
            phrase in low
            for phrase in [
                "qa verify",
                "qa karo",
                "qa kar",
                "quality check",
                "quality audit",
                "website audit",
                "audit website",
                "audit this website",
                "verify the website",
                "verify website",
                "verify this website",
                "check website",
                "check this website",
                "defects",
                "auto fix",
                "automatically fix",
                "fix karke re-verify",
                "fix and re-verify",
                "re-verify",
                "reverify",
            ]
        )

        if is_qa_request:
            file_match = re.search(
                r"([A-Za-z0-9_./-]+\.html?)\b",
                goal,
                re.IGNORECASE,
            )
            target_path = file_match.group(1) if file_match else ""

            steps.append({
                "step_id": 1,
                "tool": "qa_verify_site",
                "description": (
                    "Run automated website QA and recover detected defects "
                    "when automatic recovery is requested"
                ),
                "args": {
                    "path": target_path,
                },
                "verification": (
                    "Verify the website passes QA after automatic recovery "
                    "and re-verification"
                ),
            })

            return steps

        # File creation / write
        # Must run before generic code/file inspection rules.
        file_action = re.search(
            r"(?:create|make|write|save|banao|bana)\s+"
            r"(?:a\s+|an\s+|the\s+)?"
            r"(?:test\s+|new\s+)?"
            r"file\s+(?:called|named)?\s*"
            r"([A-Za-z0-9_./-]+)",
            goal,
            re.IGNORECASE,
        )

        if file_action:
            file_path = file_action.group(1).strip()

            content_match = re.search(
                r"(?:write|with|containing)\s+(.+?)"
                r"(?=\s+(?:into|in|to)\s+(?:it|the\s+file|that\s+file)\b|$)",
                goal,
                re.IGNORECASE,
            )

            content = (
                content_match.group(1).strip().strip('"').strip("'")
                if content_match
                else ""
            )

            steps.append({
                "step_id": 1,
                "tool": "filesystem_write",
                "description": f"Create or update file {file_path}",
                "args": {
                    "path": file_path,
                    "content": content,
                },
                "verification": (
                    "Verify that the requested file exists "
                    "with the requested content"
                ),
            })

            steps.append({
                "step_id": 2,
                "tool": "filesystem_read",
                "description": f"Verify the contents of {file_path}",
                "args": {
                    "path": file_path,
                },
                "verification": (
                    "Verify the file exists and its contents "
                    "match the requested content"
                ),
            })

            return steps

        # Website / web app
        if any(x in low for x in [
            "website",
            "web app",
            "landing page",
            "portfolio",
            "gym",
            "restaurant",
            "salon",
            "real estate",
        ]):

            steps.append({
                "step_id": 1,
                "tool": "filesystem_write",
                "description": "Create or update the website files",
                "args": {
                    "path": "created_sites/active_project/index.html",
                    "template": "landing_page",
                    "title": self._extract_website_title(goal),
                    "description": f"Responsive website created by AURA AI for: {goal}"
                },
                "verification": "Verify required project files exist",
            })

            steps.append({
                "step_id": 2,
                "tool": "qa_verify_site",
                "description": "Run automated website QA",
                "args": {},
                "verification": "Verify HTML, assets and required interactions",
            })

            steps.append({
                "step_id": 3,
                "tool": "browser_e2e",
                "description": "Open the generated website in a real browser and verify it renders",
                "args": {
                    "target": "active_project/index.html",
                    "actions": [],
                    "verify_condition": {
                        "type": "title_non_empty"
                    }
                },
                "verification": "Verify the generated website opens successfully in Playwright and has a non-empty page title",
            })

            return steps

        # Terminal / shell command
        if (
            "run terminal command" in low
            or "run the terminal command" in low
            or "run a terminal command" in low
            or "run command" in low
            or "run the command" in low
            or "run a command" in low
            or "execute terminal command" in low
            or "execute the terminal command" in low
            or "execute a terminal command" in low
            or "execute command" in low
            or "execute the command" in low
            or "execute a command" in low
            or low.startswith("terminal ")
            or low.startswith("run ")

            # Explicit Hindi/Hinglish background terminal commands.
            or low.startswith("background mein chalao:")
            or low.startswith("background me chalao:")
            or low.startswith("background mein chalao ")
            or low.startswith("background me chalao ")
            or low.startswith("background mein run karo:")
            or low.startswith("background me run karo:")
            or low.startswith("background mein run karo ")
            or low.startswith("background me run karo ")
            or low.startswith("background mein kar do:")
            or low.startswith("background me kar do:")
            or low.startswith("background mein kar do ")
            or low.startswith("background me kar do ")
        ):
            command = goal.strip()

            prefixes = [
                # Explicit background execution phrases must be stripped
                # before the generic "run" prefix. Otherwise:
                # "Run this in background: npm test"
                # becomes "this in background: npm test".
                "run this in background:",
                "run it in background:",
                "run in background:",
                "run this in background",
                "run it in background",
                "run in background",
                "background mein chalao:",
                "background me chalao:",
                "background mein chalao",
                "background me chalao",
                "background mein run karo:",
                "background me run karo:",
                "background mein run karo",
                "background me run karo",
                "background mein kar do:",
                "background me kar do:",
                "background mein kar do",
                "background me kar do",

                "run terminal command",
                "execute terminal command",
                "run the terminal command",
                "execute the terminal command",
                "run a terminal command",
                "execute a terminal command",
                "run command",
                "execute command",
                "run the command",
                "execute the command",
                "run a command",
                "execute a command",
                "terminal command",
                "terminal",
                "run",
            ]

            for prefix in prefixes:
                if command.lower().startswith(prefix):
                    command = command[len(prefix):].strip()
                    break

            if command:
                steps.append({
                    "step_id": 1,
                    "tool": "terminal_execute",
                    "description": "Execute the requested terminal command",
                    "args": {"command": command},
                    "verification": "Verify the terminal command completed successfully",
                })
            else:
                steps.append({
                    "step_id": 1,
                    "tool": "terminal_execute",
                    "description": "Execute the requested terminal command",
                    "args": {"command": ""},
                    "verification": "Verify the terminal command completed successfully",
                })

            return steps

        # Natural background terminal execution
        # Examples:
        # "background mein terminal command printf TEST chalao"
        # "background me command printf TEST run karo"
        if self._is_background_request(low):
            command = ""

            prefixes = [
                "background mein terminal command",
                "background me terminal command",
                "background mein command",
                "background me command",
            ]

            for prefix in prefixes:
                if low.startswith(prefix):
                    command = goal[len(prefix):].strip()
                    break

            if command:
                command = re.sub(
                    r"\s+aur\s+complete\s+hone\s+tak\s+continue\s+karo.*$",
                    "",
                    command,
                    flags=re.IGNORECASE,
                ).strip()

                command = re.sub(
                    r"\s+(?:chalao|chala|run\s+karo|execute\s+karo|kar\s+do)\s*$",
                    "",
                    command,
                    flags=re.IGNORECASE,
                ).strip()

            if command:
                steps.append({
                    "step_id": 1,
                    "tool": "terminal_execute",
                    "description": "Execute the requested terminal command in the background",
                    "args": {"command": command},
                    "verification": "Verify the background terminal command completed successfully",
                })
                return steps
        # Code
        if any(x in low for x in [
            "code",
            "coding",
            "function",
            "bug",
            "error",
            "fix",
            "implement",
            "api",
        ]):

            steps.append({
                "step_id": 1,
                "tool": "filesystem_read",
                "description": "Inspect the relevant project files",
                "args": {},
                "verification": "Verify relevant source files were found",
            })

            steps.append({
                "step_id": 2,
                "tool": "code_runner",
                "description": "Implement and validate the requested code changes",
                "args": {},
                "verification": "Verify the code executes without the reported error",
            })

            return steps

        # Git
        if any(x in low for x in [
            "git",
            "commit",
            "push",
            "repository",
            "github",
        ]):

            steps.append({
                "step_id": 1,
                "tool": "git_action",
                "description": "Inspect and perform the requested Git operation",
                "args": {},
                "verification": "Verify Git working tree and operation result",
            })

            return steps

        # Research
        if any(x in low for x in [
            "research",
            "search",
            "find information",
            "look up",
            "latest",
        ]):

            steps.append({
                "step_id": 1,
                "tool": "web_research",
                "description": "Research the requested information",
                "args": {},
                "verification": "Verify sources and summarize findings",
            })

            return steps

        # Generic action
        steps.append({
            "step_id": 1,
            "tool": "filesystem_read",
            "description": "Inspect the current workspace before taking action",
            "args": {},
            "verification": "Verify workspace state",
        })

        return steps


    def _contains_action(self, text: str) -> bool:
        action_words = [
            "create",
            "build",
            "make",
            "develop",
            "fix",
            "change",
            "update",
            "edit",
            "delete",
            "open",
            "inspect",
            "visit",
            "navigate",
            "run",
            "execute",
            "deploy",
            "banao",
            "bana do",
            "bana",
            "karo",
            "improve",
            "update karo",
            "fix karo",
        ]

        return any(x in text for x in action_words)

    def _conversation_reply(self, text: str, language: str) -> str:
        if language == "hindi":
            return "Namaste! Main AURA AI hoon. Main aapki baat samajhne aur kaam ko step-by-step complete karne ke liye ready hoon."

        if language == "hinglish":
            return "Hello! Main AURA AI hoon. Main theek hoon aur ready hoon — batao, aaj kis project ya kaam par kaam karna hai?"

        return "Hello! I’m AURA AI. I’m ready to understand what you need and help you get it done."

    def _question_reply(
        self,
        prompt: str,
        language: str,
        conversation_context=None,
    ) -> str:
        low = prompt.lower()

        # Use explicitly saved memory when the question is about how AURA
        # should respond or behave. Do not inject unrelated memories into
        # ordinary factual questions.
        memory_texts = []
        for item in (conversation_context or []):
            if item.get("role") != "memory":
                continue
            content = str(item.get("content", "")).strip()
            if content:
                memory_texts.append(content)

        if any(phrase in low for phrase in [
            "how should you respond",
            "how should you answer",
            "how do you respond to me",
            "what should you respond",
            "what should your responses",
            "how should you talk to me",
        ]) and memory_texts:
            preference_text = "; ".join(memory_texts[:5])
            if language in ("hindi", "hinglish"):
                return f"Main aapki saved preference follow karunga: {preference_text}."
            return f"I’ll follow your saved preference: {preference_text}."

        if "seo" in low:
            if language in ("hindi", "hinglish"):
                return "SEO ka matlab Search Engine Optimization hai. Iska goal website ko search engines mein better visibility aur organic traffic dilana hai. Ismein content, technical SEO, page speed, structure aur authority jaise factors important hote hain."

            return "SEO (Search Engine Optimization) is the process of improving a website so search engines can understand it better and users can discover it through organic search."

        if language in ("hindi", "hinglish"):
            return "Main is question ko samajh raha hoon. Aap agar topic bata dein to main usse clearly explain kar sakta hoon."

        return "I can explain that clearly. Tell me the specific topic or concept you want to understand."

    def _action_reply(self, prompt: str, language: str, count: int) -> str:
        if language in ("hindi", "hinglish"):
            return f"Samajh gaya. Main is kaam ke liye {count} execution step{'s' if count != 1 else ''} prepare kar raha hoon. Execution ke baad result verify kiya jayega."

        return f"Understood. I prepared {count} execution step{'s' if count != 1 else ''}. The result will be verified after execution."
