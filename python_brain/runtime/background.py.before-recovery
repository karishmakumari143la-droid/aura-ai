"""
AURA AI — Background Task Execution Runtime
Executes tasks independently of active browser tabs or client connections.
"""

import sqlite3
import os
import json
import time
import threading
import uuid
from typing import Dict, Any, Optional, Callable

class BackgroundTaskManager:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.path.join(os.getcwd(), "data", "aura_tasks.db")
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS background_tasks (
                    task_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL,  -- 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'
                    progress INTEGER DEFAULT 0,
                    logs TEXT DEFAULT '[]',
                    result TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                )
            """)
            conn.commit()

    def create_task(self, user_id: str, title: str) -> str:
        task_id = str(uuid.uuid4())
        now = time.time()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO background_tasks (task_id, user_id, title, status, progress, logs, created_at, updated_at)
                VALUES (?, ?, ?, 'QUEUED', 0, '[]', ?, ?)
            """, (task_id, user_id, title, now, now))
            conn.commit()
        return task_id

    def update_task(self, task_id: str, status: Optional[str] = None, progress: Optional[int] = None, new_log: Optional[str] = None, result: Optional[Any] = None):
        now = time.time()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT status, progress, logs FROM background_tasks WHERE task_id = ?", (task_id,))
            row = cursor.fetchone()
            if not row:
                return

            curr_status, curr_prog, logs_str = row
            try:
                logs_list = json.loads(logs_str)
            except Exception:
                logs_list = []

            if new_log:
                logs_list.append({"time": now, "message": new_log})

            final_status = status or curr_status
            final_prog = progress if progress is not None else curr_prog
            res_str = json.dumps(result) if result is not None else None

            conn.execute("""
                UPDATE background_tasks
                SET status = ?, progress = ?, logs = ?, result = COALESCE(?, result), updated_at = ?
                WHERE task_id = ?
            """, (final_status, final_prog, json.dumps(logs_list), res_str, now, task_id))
            conn.commit()

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM background_tasks WHERE task_id = ?", (task_id,))
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            try:
                res["logs"] = json.loads(res["logs"])
            except Exception:
                pass
            if res.get("result"):
                try:
                    res["result"] = json.loads(res["result"])
                except Exception:
                    pass
            return res

    def launch_in_background(self, user_id: str, title: str, worker_fn: Callable[[str], Any]) -> str:
        task_id = self.create_task(user_id, title)

        def runner():
            self.update_task(task_id, status="RUNNING", progress=10, new_log=f"Task '{title}' started in background.")
            try:
                out = worker_fn(task_id)
                self.update_task(task_id, status="COMPLETED", progress=100, new_log="Task completed successfully.", result=out)
            except Exception as e:
                self.update_task(task_id, status="FAILED", progress=100, new_log=f"Task error: {str(e)}", result={"error": str(e)})

        t = threading.Thread(target=runner, daemon=True)
        t.start()
        return task_id
