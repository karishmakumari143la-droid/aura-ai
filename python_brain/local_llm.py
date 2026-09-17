"""
AURA AI — Local LLM Client

Communicates only with the locally running Ollama service.
No cloud provider, API key, or external LLM dependency.
"""

import json
import re
import os
from typing import Any, Dict, List, Optional

import requests


class LocalLLM:
    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.base_url = (
            base_url
            or os.getenv("AURA_OLLAMA_URL", "http://localhost:11434")
        ).rstrip("/")

        self.model = (
            model
            or os.getenv("AURA_LOCAL_MODEL", "qwen2.5:3b")
        )

        self.timeout = float(
            timeout
            or os.getenv("AURA_LLM_TIMEOUT", "120")
        )

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
    ) -> Optional[str]:
        """Return a local model response, or None if unavailable."""
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                    },
                },
                timeout=self.timeout,
            )
            response.raise_for_status()

            payload: Dict[str, Any] = response.json()
            message = payload.get("message") or {}
            content = message.get("content")

            if isinstance(content, str) and content.strip():
                return content.strip()

        except (requests.RequestException, ValueError, TypeError):
            return None

        return None

    def is_available(self) -> bool:
        """Check whether the local Ollama service is reachable."""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=5,
            )
            return response.ok
        except requests.RequestException:
            return False

    def diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": "ollama_local",
            "base_url": self.base_url,
            "model": self.model,
            "available": self.is_available(),
            "external_provider": False,
            "api_key_required": False,
        }

    def structured_chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
    ) -> Optional[Dict[str, Any]]:
        """Ask the local model for a JSON object and safely parse it."""
        content = self.chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )

        if not content:
            return None

        try:
            parsed = json.loads(content)
        except (json.JSONDecodeError, TypeError):
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if not match:
                return None
            try:
                parsed = json.loads(match.group(0))
            except (json.JSONDecodeError, TypeError):
                return None

        return parsed if isinstance(parsed, dict) else None
