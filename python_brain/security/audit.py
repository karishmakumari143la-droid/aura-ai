"""
AURA AI — Persistent Audit Engine
Maintains an immutable record of all tool invocations, permissions checks, and verification results.
"""

import sqlite3
import os
import json
import time
from typing import Dict, Any, List, Optional

class AuditLogger:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.path.join(os.getcwd(), "data", "aura_audit.db")
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    iso_time TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    tool_name TEXT NOT NULL,
                    parameters TEXT,
                    permission_state TEXT,
                    confirmed INTEGER DEFAULT 0,
                    success INTEGER NOT NULL,
                    duration_ms INTEGER DEFAULT 0,
                    error_message TEXT,
                    verification_status TEXT
                )
            """)
            conn.commit()

    def log_action(
        self,
        user_id: str,
        action_type: str,
        tool_name: str,
        parameters: Any,
        permission_state: str,
        confirmed: bool,
        success: bool,
        duration_ms: int,
        error_message: Optional[str] = None,
        verification_status: Optional[str] = None
    ) -> int:
        now = time.time()
        iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
        param_str = json.dumps(parameters) if not isinstance(parameters, str) else parameters
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO audit_logs (
                    timestamp, iso_time, user_id, action_type, tool_name, parameters,
                    permission_state, confirmed, success, duration_ms, error_message, verification_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now, iso, user_id, action_type, tool_name, param_str,
                permission_state, 1 if confirmed else 0, 1 if success else 0,
                duration_ms, error_message, verification_status
            ))
            conn.commit()
            return cursor.lastrowid

    def get_recent_logs(self, user_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            if user_id:
                cursor.execute("SELECT * FROM audit_logs WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit))
            else:
                cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
