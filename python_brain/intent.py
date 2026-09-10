"""
AURA AI — Multilingual Intent Understanding Engine
Understands natural Hindi, English, and Hinglish.
Strictly ensures greetings, questions, and explanations NEVER trigger task execution.
"""

import re
from enum import Enum
from typing import Dict, Any, Optional

class IntentType(str, Enum):
    CONVERSATION = "CONVERSATION"            # Greetings, small talk, pleasantries
    QUESTION_EXPLANATION = "QUESTION_EXPLANATION" # Q&A, conceptual explanations, learning
    CLARIFICATION_NEEDED = "CLARIFICATION_NEEDED" # Vague action request requiring user input
    ACTION_REQUEST = "ACTION_REQUEST"        # Concrete execution of tools/projects

class DetectedLanguage(str, Enum):
    ENGLISH = "english"
    HINDI = "hindi"
    HINGLISH = "hinglish"

class IntentAnalyzer:
    @staticmethod
    def detect_language(text: str) -> DetectedLanguage:
        # Check Devanagari script
        if re.search(r"[\u0900-\u097F]", text):
            return DetectedLanguage.HINDI

        # Common Hinglish marker tokens
        hinglish_words = {
            "karo", "karna", "hai", "hain", "kya", "kyun", "kaise", "kab", "kahan", "kaun",
            "banao", "dikhao", "chal", "raha", "baat", "bolo", "achha", "theek", "shukriya",
            "dhanyawad", "namaste", "haan", "nahi", "mujhe", "apna", "meri", "mera", "ye",
            "woh", "isko", "usko", "website", "kardo", "chahiye"
        }
        tokens = set(re.findall(r"\b[a-zA-Z]+\b", text.lower()))
        matched = tokens.intersection(hinglish_words)
        if len(matched) >= 1:
            return DetectedLanguage.HINGLISH
        return DetectedLanguage.ENGLISH

    @classmethod
    def analyze_intent(cls, prompt: str) -> Dict[str, Any]:
        text = prompt.strip()
        low = text.lower()
        lang = cls.detect_language(text)

        # 1. Check for language switch requests
        if re.search(r"\b(hindi|english|hinglish)\b.*\b(baat|bolo|karo|talk|speak|switch)\b", low) or \
           re.search(r"\b(baat|bolo|talk|speak|switch)\b.*\b(hindi|english|hinglish)\b", low):
            return {
                "intent": IntentType.CONVERSATION,
                "language": lang,
                "requires_execution": False,
                "reason": "Language switch preference or conversational query"
            }

        # 2. Pure Greetings & Conversational Small Talk
        greeting_markers = [
            r"^(hi|hello|hey|greetings|namaste|pranam|kya haal|kaise ho|how are you|kya chal raha|good morning|good evening|good afternoon|good night|thank you|thanks|shukriya|dhanyawad)\b",
            r"\b(kaise ho|how are you|kya haal hai|kya chal raha hai)\b",
            r"^(hello|hi|hey)\s+(there|aura|everyone|friend|buddy)\b[!?.]*$",
            r"^(ok|okay|theek hai|achha|nice|cool|great|awesome)\b[!?.]*$"
        ]
        if any(re.search(p, low) for p in greeting_markers):
            # Verify it doesn't also have concrete code/task commands
            action_verbs = [r"\b(create|build|make|generate|write|run|test|execute|delete|git)\b", r"\b(banao|likho|run karo)\b"]
            if not any(re.search(v, low) for v in action_verbs):
                return {
                    "intent": IntentType.CONVERSATION,
                    "language": lang,
                    "requires_execution": False,
                    "reason": "Greeting or polite conversational exchange"
                }

        # Conversational questions about AURA's identity or state
        identity_patterns = [
            r"\b(who are you|tum kaun ho|aap kaun hain|what is your name|tera naam kya hai)\b",
            r"\b(how are you doing|kaise ho aap|sab theek|what are you doing|kya kar rahe ho)\b",
            r"\b(tell me a joke|koi joke sunao|chutkula sunao|motivate me)\b"
        ]
        if any(re.search(p, low) for p in identity_patterns):
            return {
                "intent": IntentType.CONVERSATION,
                "language": lang,
                "requires_execution": False,
                "reason": "Identity or conversational interaction"
            }

        # 3. Informational Questions & Explanations
        # Must not trigger task execution
        question_markers = [
            r"^(what|why|how|when|where|who|explain|tell me about|difference between)\b",
            r"^(kya|kyun|kaise|kab|kahan|kaun|samjhao|batao)\b",
            r"\b(what is|kya hota hai|how does .* work|kaise kaam karta hai)\b",
            r"\b(explain to me|mujhe samjhao|ideas for|suggest some)\b"
        ]
        # Does prompt end with question mark without explicit actionable imperative verbs?
        is_explicit_action = any(re.search(p, low) for p in [
            r"\b(create|build|make|generate|write|code|implement|fix|deploy|install|delete|remove|execute|run|test)\b",
            r"\b(banao|likho|run karo|test karo|kholo|save karo|commit karo|launch karo)\b"
        ])

        if not is_explicit_action:
            if any(re.search(p, low) for p in question_markers) or low.endswith("?"):
                return {
                    "intent": IntentType.QUESTION_EXPLANATION,
                    "language": lang,
                    "requires_execution": False,
                    "reason": "Conceptual question or educational explanation"
                }

        # 4. Underspecified Action Request requiring clarification
        vague_action_patterns = [
            r"^(create something|make an app|build a project|kuch banao|kuch karo|do something)$",
            r"^(make website|website banao|write code|code likho)$",
            r".*(gym website|website|landing page|portfolio|app).*(banani hai|chahiye|karni hai).*",
            r"^mujhe .* (banani hai|bana do|chahiye)$"
        ]
        if any(re.match(p, low) for p in vague_action_patterns):
            return {
                "intent": IntentType.CLARIFICATION_NEEDED,
                "language": lang,
                "requires_execution": False,
                "reason": "Request is too broad; needs user clarification on specific domain or features"
            }

        # 5. Real Action Request
        return {
            "intent": IntentType.ACTION_REQUEST,
            "language": lang,
            "requires_execution": True,
            "reason": "Concrete user work request requiring planning, tool execution, and verification"
        }
