"""
AURA AI — Local LLM Output Validation

The local model may suggest understanding metadata only.
This module validates and normalizes that output before AURA uses it.
It never grants tool execution authority to the model.
"""

from typing import Any, Dict, List


ALLOWED_INTENTS = {
    "CONVERSATION",
    "QUESTION",
    "CLARIFICATION",
    "ACTION_REQUEST",
}


def normalize_llm_result(
    result: Any,
    allowed_tools: List[str],
) -> Dict[str, Any]:
    """Return a safe, predictable AURA reasoning structure."""
    if not isinstance(result, dict):
        return {
            "intent": "CLARIFICATION",
            "goal": "",
            "clarification_needed": True,
            "tools": [],
            "steps": [],
        }

    intent = str(result.get("intent", "")).strip().upper()
    if intent not in ALLOWED_INTENTS:
        intent = "CLARIFICATION"

    goal = str(result.get("goal", "")).strip()

    clarification_needed = bool(
        result.get("clarification_needed", False)
    )

    raw_tools = result.get("tools", [])
    if not isinstance(raw_tools, list):
        raw_tools = []

    tools = [
        str(tool).strip()
        for tool in raw_tools
        if str(tool).strip() in allowed_tools
    ]

    raw_steps = result.get("steps", [])
    if not isinstance(raw_steps, list):
        raw_steps = []

    steps = [
        str(step).strip()
        for step in raw_steps
        if str(step).strip()
    ]

    return {
        "intent": intent,
        "goal": goal,
        "clarification_needed": clarification_needed,
        "tools": list(dict.fromkeys(tools)),
        "steps": steps,
    }
