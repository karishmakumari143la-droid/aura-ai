"""
AURA AI — Idempotency Engine
Guarantees that duplicate requests, page refreshes, reconnections, polling,
or interim voice transcripts cannot trigger duplicate executions.
"""

import sqlite3
import os
import hashlib
import time
from typing import Dict, Any, Optional, Tuple

class IdempotencyEngine:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.path.join(os.getcwd(), "data", "aura_idempotency.db")
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS idempotency_records (
                    idempotency_key TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    status TEXT NOT NULL,  -- 'PROCESSING', 'COMPLETED', 'FAILED'
                    created_at REAL NOT NULL,
                    completed_at REAL,
                    response_json TEXT
                )
            """)
            conn.commit()

    @staticmethod
    def generate_key(user_id: str, prompt_or_payload: str) -> str:
        raw = f"{user_id}::{prompt_or_payload.strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def check_or_acquire(self, key: str, user_id: str, ttl_seconds: int = 300) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Returns (can_execute, existing_result).
        If already completed, returns (False, existing_result).
        If currently processing and not timed out, returns (False, None).
        If new or expired, acquires lock and returns (True, None).
        """
        now = time.time()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT status, created_at, response_json FROM idempotency_records WHERE idempotency_key = ?", (key,))
            row = cursor.fetchone()
            if row:
                status, created_at, resp_json = row
                if status == "COMPLETED" and resp_json:
                    import json
                    return False, json.loads(resp_json)
                if status == "PROCESSING" and (now - created_at) < ttl_seconds:
                    # Still running; don't re-execute
                    return False, {"status": "ALREADY_PROCESSING", "key": key}

            # Acquire or reset record
            conn.execute("""
                INSERT INTO idempotency_records (idempotency_key, user_id, status, created_at)
                VALUES (?, ?, 'PROCESSING', ?)
                ON CONFLICT(idempotency_key) DO UPDATE SET
                    status = 'PROCESSING',
                    created_at = excluded.created_at,
                    response_json = NULL
            """, (key, user_id, now))
            conn.commit()
            return True, None

    def record_completed(self, key: str, response_data: Dict[str, Any]):
        import json
        now = time.time()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE idempotency_records
                SET status = 'COMPLETED', completed_at = ?, response_json = ?
                WHERE idempotency_key = ?
            """, (now, json.dumps(response_data), key))
            conn.commit()
