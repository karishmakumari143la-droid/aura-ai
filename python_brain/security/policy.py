"""
AURA AI — Security Policy Engine
Validates safety rules, dangerous command blacklists, path traversal defense, and secret redaction.
"""

import re
import os
from typing import Tuple, Optional

# Blacklist of destructive commands that could brick the host OS
DESTRUCTIVE_COMMAND_PATTERNS = [
    r"\brm\s+-[a-zA-Z]*r[a-zA-Z]*\s+/(?:\s|$|\*|etc|boot|sys)",
    r"\brm\s+-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*\s+/(?:\s|$|\*|etc|boot|sys)",
    r"\bmkfs(\.[a-z0-9]+)?\b",
    r"\bdd\s+if=.*of=/dev/[a-z0-9]+\b",
    r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:",
    r"\bshutdown\b",
    r"\breboot\b",
    r"\binit\s+0\b",
    r"\bchmod\s+-R\s+777\s+/(?:\s|$|\*)",
    r"\bchown\s+-R\s+.*\s+/(?:\s|$|\*)",
]

SECRET_REDACTION_PATTERNS = [
    (r"(?i)(api[_-]?key|secret|password|token|bearer)\s*[:=]\s*['\"]?([A-Za-z0-9_\-\.]{12,})['\"]?", r"\1: [REDACTED]"),
    (r"(?i)ghp_[A-Za-z0-9]{36}", "[GITHUB_TOKEN_REDACTED]"),
    (r"(?i)sk-[A-Za-z0-9]{32,}", "[API_KEY_REDACTED]"),
    (r"(?i)AIza[0-9A-Za-z-_]{35}", "[GOOGLE_KEY_REDACTED]"),
]

SENSITIVE_MEMORY_PATTERNS = [
    r"(?i)\bpassword\b\s*(?:is|=|:)\s*\S+",
    r"(?i)\b(?:api[_-]?key|access[_-]?token|access token|auth[_-]?token|auth token|bearer)\b\s*(?:is|=|:)\s*\S+",
    r"(?i)\b(?:secret|credential|private[_-]?key)\b\s*(?:is|=|:)\s*\S+",
    r"(?i)\b(?:ghp_|sk-|AIza)[A-Za-z0-9_\-\.]+",
]

class SecurityPolicy:
    @staticmethod
    def validate_command(command: str) -> Tuple[bool, Optional[str]]:
        cmd_clean = command.strip().lower()
        for pattern in DESTRUCTIVE_COMMAND_PATTERNS:
            if re.search(pattern, cmd_clean):
                return False, f"Security Violation: Command matches high-risk destructive blacklist ({pattern})."
        return True, None

    @staticmethod
    def validate_background_command(command: str) -> Tuple[bool, Optional[str]]:
        """
        Validate a command specifically for unattended/background execution.

        Background execution is intentionally stricter than foreground
        terminal execution because the user may no longer be present to
        observe or approve chained shell operations.
        """
        if not isinstance(command, str) or not command.strip():
            return False, "Background command must be a non-empty string."

        cmd = command.strip()

        # Background tasks must remain a single bounded command.
        # Do not allow shell chaining, pipelines, redirection, or command
        # substitution in unattended execution.
        forbidden_patterns = [
            (r"&&", "command chaining (&&)"),
            (r"\|\|", "command fallback chaining (||)"),
            (r";", "command separator (;)"),
            (r"\|", "pipeline (|)"),
            (r"[<>]", "shell redirection"),
            (r"\$\(", "command substitution ($())"),
            (r"`", "command substitution (backticks)"),
        ]

        for pattern, description in forbidden_patterns:
            if re.search(pattern, cmd):
                return (
                    False,
                    f"Background execution blocked: {description} is not allowed.",
                )

        # Reuse the existing destructive-command policy as a second layer.
        valid, error = SecurityPolicy.validate_command(cmd)
        if not valid:
            return False, error

        return True, None

    @staticmethod
    def contains_sensitive_memory(text: str) -> bool:
        """Return True when text appears to contain a secret credential."""
        if not isinstance(text, str) or not text.strip():
            return False

        return any(re.search(pattern, text) for pattern in SENSITIVE_MEMORY_PATTERNS)

    @staticmethod
    def redact_secrets(text: str) -> str:
        if not text:
            return ""
        result = text
        for pattern, replacement in SECRET_REDACTION_PATTERNS:
            result = re.sub(pattern, replacement, result)
        return result

    @staticmethod
    def validate_path(workspace_root: str, target_path: str) -> Tuple[bool, str]:
        root = os.path.abspath(workspace_root)
        resolved = os.path.abspath(os.path.join(root, target_path))
        if not resolved.startswith(root):
            return False, f"Access Denied: Path '{target_path}' traverses outside workspace root."
        return True, resolved
