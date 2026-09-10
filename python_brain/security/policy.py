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

class SecurityPolicy:
    @staticmethod
    def validate_command(command: str) -> Tuple[bool, Optional[str]]:
        cmd_clean = command.strip().lower()
        for pattern in DESTRUCTIVE_COMMAND_PATTERNS:
            if re.search(pattern, cmd_clean):
                return False, f"Security Violation: Command matches high-risk destructive blacklist ({pattern})."
        return True, None

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
