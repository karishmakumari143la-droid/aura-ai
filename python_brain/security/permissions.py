"""
AURA AI — Security Permissions Engine
Enforces strict ALLOW / ASK / DENY policy across all sensitive system operations.
"""

from enum import Enum
from typing import Dict, Tuple, Optional
import os
import json
import sqlite3

class PermissionState(str, Enum):
    ALLOW = "allow"
    ASK = "ask"
    DENY = "deny"

class PermissionKey(str, Enum):
    FILES_READ = "FILES_READ"
    FILES_WRITE = "FILES_WRITE"
    FILES_DELETE = "FILES_DELETE"
    TERMINAL_EXECUTION = "TERMINAL_EXECUTION"
    BROWSER_CONTROL = "BROWSER_CONTROL"
    APP_LAUNCH = "APP_LAUNCH"
    SCREEN_CAPTURE = "SCREEN_CAPTURE"
    SCREEN_ANALYSIS = "SCREEN_ANALYSIS"
    CLIPBOARD = "CLIPBOARD"
    CLIPBOARD_READ = "CLIPBOARD_READ"
    CLIPBOARD_WRITE = "CLIPBOARD_WRITE"
    GIT_ACCESS = "GIT_ACCESS"

DEFAULT_PERMISSIONS: Dict[str, PermissionState] = {
    PermissionKey.FILES_READ.value: PermissionState.ALLOW,
    PermissionKey.FILES_WRITE.value: PermissionState.ALLOW,
    PermissionKey.FILES_DELETE.value: PermissionState.ASK,
    PermissionKey.TERMINAL_EXECUTION.value: PermissionState.ASK,
    PermissionKey.BROWSER_CONTROL.value: PermissionState.ALLOW,
    PermissionKey.APP_LAUNCH.value: PermissionState.ASK,
    PermissionKey.SCREEN_CAPTURE.value: PermissionState.ALLOW,
    PermissionKey.SCREEN_ANALYSIS.value: PermissionState.ALLOW,
    PermissionKey.CLIPBOARD.value: PermissionState.ASK,
    PermissionKey.CLIPBOARD_READ.value: PermissionState.ASK,
    PermissionKey.CLIPBOARD_WRITE.value: PermissionState.ALLOW,
    PermissionKey.GIT_ACCESS.value: PermissionState.ALLOW,
}

class PermissionManager:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.path.join(os.getcwd(), "data", "aura_permissions.db")
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_permissions (
                    user_id TEXT NOT NULL,
                    perm_key TEXT NOT NULL,
                    state TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, perm_key)
                )
            """)
            conn.commit()

    def get_permissions(self, user_id: str = "default_user") -> Dict[str, str]:
        perms = {k: v.value for k, v in DEFAULT_PERMISSIONS.items()}
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT perm_key, state FROM user_permissions WHERE user_id = ?", (user_id,))
                for row in cursor.fetchall():
                    perms[row[0]] = row[1]
        except Exception:
            pass
        return perms

    get_user_permissions = get_permissions

    def set_permission(self, user_id: str, perm_key: str, state: str) -> bool:
        if state not in [PermissionState.ALLOW.value, PermissionState.ASK.value, PermissionState.DENY.value]:
            raise ValueError(f"Invalid state: {state}. Must be allow, ask, or deny.")
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO user_permissions (user_id, perm_key, state, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, perm_key) DO UPDATE SET state = excluded.state, updated_at = CURRENT_TIMESTAMP
            """, (user_id, perm_key, state))
            conn.commit()
        return True

    def check_permission(self, user_id: str, perm_key: str, interactive_confirm: bool = False) -> Tuple[bool, str, str]:
        perms = self.get_permissions(user_id)
        current_state = perms.get(perm_key, PermissionState.ASK.value)

        if current_state == PermissionState.DENY.value:
            return False, f"Permission {perm_key} is strictly DENIED by security policy.", current_state

        if current_state == PermissionState.ALLOW.value:
            return True, "Operation granted by security policy.", current_state

        # State is ASK
        if interactive_confirm:
            return True, f"Operation granted with interactive user confirmation ({perm_key}).", current_state
        return False, f"Action requires explicit user confirmation (state: ASK for {perm_key}).", current_state
