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
        ]

        if any(x in low for x in question_starts) and not self._contains_action(low):
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
            "response": self._action_reply(text, language, len(plan)),
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
        ):
            command = goal.strip()

            prefixes = [
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

    def generate_chat_response(
        self,
        prompt: str,
        conversation_context: List[Dict[str, Any]] | None = None,
        language: str = "english",
    ) -> str:

        low = prompt.lower().strip()

        return self._conversation_reply(low, language)

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "engine": self.engine,
            "version": self.version,
            "external_provider": False,
            "api_key_required": False,
            "status": "WORKING",
        }

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
            return "Hello! Main AURA AI hoon. Main ready hoon — batao, aaj kis project ya kaam par kaam karna hai?"

        return "Hello! I’m AURA AI. I’m ready to understand what you need and help you get it done."

    def _question_reply(self, prompt: str, language: str) -> str:
        low = prompt.lower()

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
