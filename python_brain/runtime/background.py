"""
AURA AI — Background Task Execution Runtime

Provides:
- SQLite-persistent task state
- durable allowlisted task payloads
- restart recovery
- idempotent recovery
- backward-compatible in-process workers
"""

import sqlite3
import os
import json
import time
import threading
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import uuid
from typing import Dict, Any, Optional, Callable


class BackgroundTaskManager:

    ALLOWED_DURABLE_TASK_TYPES = frozenset({
        "terminal_command",
        "aura_turn",
    })

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.path.join(
            os.getcwd(),
            "data",
            "aura_tasks.db",
        )

        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS background_tasks (
                    task_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL,
                    progress INTEGER DEFAULT 0,
                    logs TEXT DEFAULT '[]',
                    result TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                )
            """)

            columns = {
                row[1]
                for row in conn.execute(
                    "PRAGMA table_info(background_tasks)"
                ).fetchall()
            }

            if "task_type" not in columns:
                conn.execute(
                    "ALTER TABLE background_tasks "
                    "ADD COLUMN task_type TEXT"
                )

            if "payload" not in columns:
                conn.execute(
                    "ALTER TABLE background_tasks "
                    "ADD COLUMN payload TEXT"
                )

            conn.commit()

    def create_task(self, user_id: str, title: str) -> str:
        task_id = str(uuid.uuid4())
        now = time.time()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO background_tasks (
                    task_id,
                    user_id,
                    title,
                    status,
                    progress,
                    logs,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, 'QUEUED', 0, '[]', ?, ?)
            """, (
                task_id,
                user_id,
                title,
                now,
                now,
            ))

            conn.commit()

        return task_id

    def create_durable_task(
        self,
        user_id: str,
        title: str,
        task_type: str,
        payload: Dict[str, Any],
    ) -> str:
        """
        Create a restart-safe task.

        Only explicitly allowlisted task types may be persisted.
        Arbitrary Python code/functions are never serialized.
        """

        if task_type not in self.ALLOWED_DURABLE_TASK_TYPES:
            raise ValueError(
                f"Unsupported durable task type: {task_type}"
            )

        if not isinstance(payload, dict):
            raise ValueError(
                "Durable task payload must be an object."
            )

        if task_type == "terminal_command":
            command = payload.get("command")

            if not isinstance(command, str) or not command.strip():
                raise ValueError(
                    "terminal_command requires a non-empty command."
                )

            cwd = payload.get("cwd")

            if cwd is not None and not isinstance(cwd, str):
                raise ValueError(
                    "terminal_command cwd must be a string."
                )

        elif task_type == "aura_turn":
            prompt = payload.get("prompt")

            if not isinstance(prompt, str) or not prompt.strip():
                raise ValueError(
                    "aura_turn requires a non-empty prompt."
                )

            payload_user_id = payload.get("user_id", user_id)
            payload_session_id = payload.get(
                "session_id",
                "background",
            )

            if not isinstance(payload_user_id, str) or not payload_user_id.strip():
                raise ValueError(
                    "aura_turn user_id must be a non-empty string."
                )

            if not isinstance(payload_session_id, str) or not payload_session_id.strip():
                raise ValueError(
                    "aura_turn session_id must be a non-empty string."
                )

        try:
            payload_json = json.dumps(
                payload,
                ensure_ascii=False,
                separators=(",", ":"),
            )
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Durable task payload is not JSON serializable: {exc}"
            ) from exc

        task_id = str(uuid.uuid4())
        now = time.time()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO background_tasks (
                    task_id,
                    user_id,
                    title,
                    status,
                    progress,
                    logs,
                    result,
                    created_at,
                    updated_at,
                    task_type,
                    payload
                )
                VALUES (
                    ?, ?, ?, 'QUEUED', 0, '[]', NULL,
                    ?, ?, ?, ?
                )
            """, (
                task_id,
                user_id,
                title,
                now,
                now,
                task_type,
                payload_json,
            ))

            conn.commit()

        return task_id

    def update_task(
        self,
        task_id: str,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        new_log: Optional[str] = None,
        result: Optional[Any] = None,
    ):
        now = time.time()

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT status, progress, logs
                FROM background_tasks
                WHERE task_id = ?
            """, (task_id,))

            row = cursor.fetchone()

            if not row:
                return

            curr_status, curr_prog, logs_str = row

            try:
                logs_list = json.loads(logs_str or "[]")
            except Exception:
                logs_list = []

            if new_log:
                logs_list.append({
                    "time": now,
                    "message": new_log,
                })

            final_status = (
                status if status is not None else curr_status
            )

            final_prog = (
                progress if progress is not None else curr_prog
            )

            res_str = (
                json.dumps(result, ensure_ascii=False)
                if result is not None
                else None
            )

            conn.execute("""
                UPDATE background_tasks
                SET
                    status = ?,
                    progress = ?,
                    logs = ?,
                    result = COALESCE(?, result),
                    updated_at = ?
                WHERE task_id = ?
            """, (
                final_status,
                final_prog,
                json.dumps(logs_list, ensure_ascii=False),
                res_str,
                now,
                task_id,
            ))

            conn.commit()

    def get_task(
        self,
        task_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            cursor = conn.cursor()

            if user_id is None:
                cursor.execute("""
                    SELECT *
                    FROM background_tasks
                    WHERE task_id = ?
                """, (task_id,))
            else:
                cursor.execute("""
                    SELECT *
                    FROM background_tasks
                    WHERE task_id = ?
                      AND user_id = ?
                """, (task_id, user_id))

            row = cursor.fetchone()

            if not row:
                return None

            res = dict(row)

            try:
                res["logs"] = json.loads(
                    res.get("logs") or "[]"
                )
            except Exception:
                pass

            if res.get("result") is not None:
                try:
                    res["result"] = json.loads(
                        res["result"]
                    )
                except Exception:
                    pass

            if res.get("payload") is not None:
                try:
                    res["payload"] = json.loads(
                        res["payload"]
                    )
                except Exception:
                    pass

            return res

    def recover_interrupted_tasks(self):
        """
        Recover tasks after a runtime/process interruption.

        A task is surfaced only once using a persistent recovery marker.

        RUNNING -> QUEUED
        QUEUED -> remains QUEUED
        COMPLETED/FAILED -> untouched
        """

        recovered = []
        now = time.time()

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            rows = conn.execute("""
                SELECT task_id, status, logs
                FROM background_tasks
                WHERE status IN ('QUEUED', 'RUNNING')
                ORDER BY created_at ASC
            """).fetchall()

            for row in rows:
                task_id = row["task_id"]
                status = row["status"]

                try:
                    logs = json.loads(
                        row["logs"] or "[]"
                    )
                except Exception:
                    logs = []

                already_recovered = any(
                    isinstance(entry, dict)
                    and entry.get("type") == "runtime_recovery"
                    for entry in logs
                )

                if already_recovered:
                    continue

                if status == "RUNNING":
                    message = (
                        "Task re-queued after runtime interruption."
                    )
                else:
                    message = (
                        "Queued task recovered by runtime."
                    )

                logs.append({
                    "time": now,
                    "type": "runtime_recovery",
                    "message": message,
                })

                conn.execute("""
                    UPDATE background_tasks
                    SET
                        status = 'QUEUED',
                        logs = ?,
                        updated_at = ?
                    WHERE task_id = ?
                      AND status IN ('QUEUED', 'RUNNING')
                """, (
                    json.dumps(
                        logs,
                        ensure_ascii=False,
                    ),
                    now,
                    task_id,
                ))

                recovered.append(task_id)

            conn.commit()

        return recovered

    def launch_in_background(
        self,
        user_id: str,
        title: str,
        worker_fn: Callable[[str], Any],
    ) -> str:

        task_id = self.create_task(
            user_id,
            title,
        )

        def runner():

            self.update_task(
                task_id,
                status="RUNNING",
                progress=10,
                new_log=(
                    f"Task '{title}' started in background."
                ),
            )

            try:
                out = worker_fn(task_id)

                self.update_task(
                    task_id,
                    status="COMPLETED",
                    progress=100,
                    new_log="Task completed successfully.",
                    result=out,
                )

            except Exception as e:

                self.update_task(
                    task_id,
                    status="FAILED",
                    progress=100,
                    new_log=f"Task error: {str(e)}",
                    result={"error": str(e)},
                )

        thread = threading.Thread(
            target=runner,
            daemon=True,
        )

        thread.start()

        return task_id


class RecurringWorkScheduler:
    """
    Persistent local scheduler for AURA recurring work.

    Scheduling metadata lives in SQLite. Actual execution is delegated to
    the existing durable aura_turn worker, so scheduled work remains
    restart-safe and independent from the API/UI process.
    """

    ALLOWED_FREQUENCIES = frozenset({
        "hourly",
        "daily",
        "weekly",
    })

    def __init__(
        self,
        task_manager: BackgroundTaskManager,
        dispatcher: "DurableTaskDispatcher",
        poll_seconds: int = 15,
    ):
        self.task_manager = task_manager
        self.dispatcher = dispatcher
        self.poll_seconds = max(5, int(poll_seconds))
        self.db_path = task_manager.db_path
        self._stop_event = threading.Event()
        self._thread = None
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS recurring_jobs (
                    job_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    frequency TEXT NOT NULL,
                    timezone TEXT NOT NULL DEFAULT 'UTC',
                    next_run_at REAL NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    last_run_at REAL,
                    last_task_id TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                )
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_recurring_jobs_due
                ON recurring_jobs(enabled, next_run_at)
            """)

            conn.commit()

    @staticmethod
    def _next_timestamp(
        current_timestamp: float,
        frequency: str,
        timezone: str = "UTC",
    ) -> float:
        if frequency not in RecurringWorkScheduler.ALLOWED_FREQUENCIES:
            raise ValueError(
                f"Unsupported recurring frequency: {frequency}"
            )

        timezone_name = str(timezone or "UTC").strip() or "UTC"

        try:
            tz = ZoneInfo(timezone_name)
        except Exception as exc:
            raise ValueError(
                f"Invalid recurring job timezone: {timezone_name}"
            ) from exc

        current_local = datetime.fromtimestamp(
            current_timestamp,
            tz=tz,
        )

        if frequency == "hourly":
            next_local = current_local + timedelta(hours=1)
        elif frequency == "daily":
            next_local = current_local + timedelta(days=1)
        else:
            next_local = current_local + timedelta(weeks=1)

        return next_local.timestamp()

    def create_job(
        self,
        user_id: str,
        title: str,
        prompt: str,
        frequency: str,
        timezone: str = "UTC",
        next_run_at: Optional[float] = None,
    ) -> str:
        if not isinstance(user_id, str) or not user_id.strip():
            raise ValueError("Recurring job user_id is required.")

        if not isinstance(title, str) or not title.strip():
            raise ValueError("Recurring job title is required.")

        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("Recurring job prompt is required.")

        frequency = str(frequency).lower().strip()
        if frequency not in self.ALLOWED_FREQUENCIES:
            raise ValueError(
                f"Unsupported recurring frequency: {frequency}"
            )

        if not isinstance(timezone, str) or not timezone.strip():
            timezone = "UTC"

        now = time.time()
        scheduled_at = (
            float(next_run_at)
            if next_run_at is not None
            else self._next_timestamp(now, frequency)
        )

        job_id = str(uuid.uuid4())

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO recurring_jobs (
                    job_id,
                    user_id,
                    title,
                    prompt,
                    frequency,
                    timezone,
                    next_run_at,
                    enabled,
                    last_run_at,
                    last_task_id,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, ?, ?)
            """, (
                job_id,
                user_id,
                title.strip(),
                prompt.strip(),
                frequency,
                timezone.strip(),
                scheduled_at,
                now,
                now,
            ))
            conn.commit()

        return job_id

    def list_jobs(self, user_id: Optional[str] = None):
        query = """
            SELECT
                job_id,
                user_id,
                title,
                prompt,
                frequency,
                timezone,
                next_run_at,
                enabled,
                last_run_at,
                last_task_id,
                created_at,
                updated_at
            FROM recurring_jobs
        """
        params = []

        if user_id is not None:
            query += " WHERE user_id = ?"
            params.append(user_id)

        query += " ORDER BY created_at DESC"

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(query, params).fetchall()

        return [dict(row) for row in rows]

    def set_enabled(self, job_id: str, enabled: bool) -> bool:
        now = time.time()

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                UPDATE recurring_jobs
                SET enabled = ?, updated_at = ?
                WHERE job_id = ?
            """, (
                1 if enabled else 0,
                now,
                job_id,
            ))
            conn.commit()
            return cursor.rowcount == 1

    def delete_job(self, job_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "DELETE FROM recurring_jobs WHERE job_id = ?",
                (job_id,),
            )
            conn.commit()
            return cursor.rowcount == 1

    def _claim_due_job(self):
        """
        Atomically claim one due job by advancing next_run_at.

        This prevents two scheduler iterations/processes from creating
        duplicate executions for the same scheduled occurrence.
        """
        now = time.time()

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            row = conn.execute("""
                SELECT *
                FROM recurring_jobs
                WHERE enabled = 1
                  AND next_run_at <= ?
                ORDER BY next_run_at ASC
                LIMIT 1
            """, (now,)).fetchone()

            if not row:
                return None

            job = dict(row)

            next_run = self._next_timestamp(
                float(job["next_run_at"]),
                job["frequency"],
                job["timezone"],
            )

            cursor = conn.execute("""
                UPDATE recurring_jobs
                SET
                    next_run_at = ?,
                    last_run_at = ?,
                    updated_at = ?
                WHERE job_id = ?
                  AND enabled = 1
                  AND next_run_at = ?
            """, (
                next_run,
                now,
                now,
                job["job_id"],
                job["next_run_at"],
            ))

            conn.commit()

            if cursor.rowcount != 1:
                return None

            return job

    def run_due_once(self) -> Optional[Dict[str, Any]]:
        job = self._claim_due_job()

        if not job:
            return None

        task_id = self.task_manager.create_durable_task(
            user_id=job["user_id"],
            title=f"[Recurring] {job['title']}",
            task_type="aura_turn",
            payload={
                "prompt": job["prompt"],
                "user_id": job["user_id"],
                "session_id": f"recurring:{job['job_id']}",
                "interactive_confirm": False,
            },
        )

        self.dispatcher.dispatch_task_async(task_id)

        now = time.time()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE recurring_jobs
                SET
                    last_task_id = ?,
                    updated_at = ?
                WHERE job_id = ?
            """, (
                task_id,
                now,
                job["job_id"],
            ))
            conn.commit()

        return {
            "job_id": job["job_id"],
            "task_id": task_id,
            "title": job["title"],
            "frequency": job["frequency"],
            "next_run_at": job["next_run_at"],
        }

    def run_forever(self):
        while not self._stop_event.is_set():
            try:
                while True:
                    result = self.run_due_once()
                    if result is None:
                        break

                    print(
                        "[AURA] Recurring work dispatched: "
                        f"job={result['job_id']} "
                        f"task={result['task_id']}"
                    )

            except Exception as exc:
                print(
                    f"[AURA] Recurring scheduler error: {exc}"
                )

            self._stop_event.wait(self.poll_seconds)

    def start(self):
        if self._thread and self._thread.is_alive():
            return

        self._stop_event.clear()

        self._thread = threading.Thread(
            target=self.run_forever,
            name="aura-recurring-scheduler",
            daemon=True,
        )
        self._thread.start()

    def stop(self):
        self._stop_event.set()

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

        self._thread = None


class DurableTaskDispatcher:
    """
    Restart-safe dispatcher for allowlisted durable tasks.

    The dispatcher reconstructs work only from persisted task_type + payload.
    It never deserializes arbitrary Python code.
    """

    def __init__(self, manager: BackgroundTaskManager, brain=None):
        self.manager = manager
        self.brain = brain
        self._dispatch_lock = threading.Lock()

    def dispatch_task(self, task_id: str) -> bool:
        # Only one dispatcher execution may claim work at a time
        # inside this runtime process.
        with self._dispatch_lock:
            return self._dispatch_task_locked(task_id)

    def dispatch_task_async(self, task_id: str) -> str:
        """
        Dispatch a persisted allowlisted task in an independent process.

        The worker receives only the durable task ID plus the exact
        SQLite database path. Execution details are reconstructed from
        the persisted allowlisted task payload.
        """
        import subprocess
        import sys

        task = self.manager.get_task(task_id)

        if not task:
            return task_id

        if task.get("status") != "QUEUED":
            return task_id

        env = os.environ.copy()

        # Pass the exact database used by this manager.
        # Never assume the filename is aura_tasks.db.
        manager_db_path = getattr(self.manager, "db_path", None)

        if manager_db_path:
            manager_db_path = os.path.abspath(str(manager_db_path))
            env["AURA_TASK_DB_PATH"] = manager_db_path
            env["AURA_DATA_DIR"] = os.path.dirname(manager_db_path)

        # Normal production runtime supplies its authoritative
        # workspace root through AuraBrain.
        if self.brain is not None:
            data_dir = getattr(self.brain, "data_dir", None)
            workspace_root = getattr(self.brain, "workspace_root", None)

            if data_dir:
                env["AURA_DATA_DIR"] = str(data_dir)

            if workspace_root:
                env["AURA_WORKSPACE_ROOT"] = str(workspace_root)

        # Isolated dispatcher instances may not have a Brain.
        # In that case, derive the worker workspace from the already
        # persisted terminal cwd. The terminal security policy still
        # validates that path before execution.
        elif task.get("task_type") == "terminal_command":
            payload = task.get("payload")

            if isinstance(payload, dict):
                payload_cwd = payload.get("cwd")

                if isinstance(payload_cwd, str) and payload_cwd.strip():
                    env["AURA_WORKSPACE_ROOT"] = os.path.abspath(
                        payload_cwd
                    )

        worker_log_dir = env.get("AURA_DATA_DIR") or os.getcwd()
        os.makedirs(worker_log_dir, exist_ok=True)

        worker_log_path = os.path.join(
            worker_log_dir,
            f"aura_worker_{task_id}.log",
        )

        worker_log = open(
            worker_log_path,
            "a",
            encoding="utf-8",
        )

        env["PYTHONUNBUFFERED"] = "1"

        process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "python_brain.runtime.background_worker",
                task_id,
            ],
            cwd=os.getcwd(),
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=worker_log,
            stderr=subprocess.STDOUT,
            start_new_session=True,
            close_fds=True,
        )

        worker_log.write(
            f"[AURA] Worker spawned pid={process.pid} "
            f"task_id={task_id}\n"
        )
        worker_log.flush()
        worker_log.close()

        return task_id

    def _dispatch_task_locked(self, task_id: str) -> bool:
        task = self.manager.get_task(task_id)

        if not task:
            return False

        if task.get("status") != "QUEUED":
            return False

        task_type = task.get("task_type")
        payload = task.get("payload")

        if task_type not in self.manager.ALLOWED_DURABLE_TASK_TYPES:
            self.manager.update_task(
                task_id,
                status="FAILED",
                progress=100,
                new_log=(
                    f"Unsupported durable task type: {task_type}"
                ),
                result={
                    "success": False,
                    "error": "UNSUPPORTED_TASK_TYPE",
                },
            )
            return False

        if not isinstance(payload, dict):
            self.manager.update_task(
                task_id,
                status="FAILED",
                progress=100,
                new_log="Durable task payload is invalid.",
                result={
                    "success": False,
                    "error": "INVALID_PAYLOAD",
                },
            )
            return False

        self.manager.update_task(
            task_id,
            status="RUNNING",
            progress=10,
            new_log="Durable task dispatcher started.",
        )

        try:
            if task_type == "terminal_command":
                result = self._execute_terminal(payload)

            elif task_type == "aura_turn":
                result = self._execute_aura_turn(payload)

            else:
                raise ValueError(
                    f"Unsupported durable task type: {task_type}"
                )

            success = bool(
                isinstance(result, dict)
                and result.get("success") is True
            )

            if success:
                self.manager.update_task(
                    task_id,
                    status="COMPLETED",
                    progress=100,
                    new_log=(
                        "Durable task executed and verified."
                    ),
                    result=result,
                )
                return True

            self.manager.update_task(
                task_id,
                status="FAILED",
                progress=100,
                new_log="Durable task execution failed.",
                result=result,
            )
            return False

        except Exception as exc:
            self.manager.update_task(
                task_id,
                status="FAILED",
                progress=100,
                new_log=f"Durable dispatcher error: {exc}",
                result={
                    "success": False,
                    "error": str(exc),
                },
            )
            return False

    def _execute_aura_turn(self, payload: Dict[str, Any]):
        if self.brain is None:
            raise RuntimeError(
                "AURA brain execution backend is not configured."
            )

        prompt = payload.get("prompt")
        user_id = payload.get("user_id", "default_user")
        session_id = payload.get("session_id", "background")
        interactive_confirm = bool(
            payload.get("interactive_confirm", False)
        )
        scope_id = payload.get("scope_id")
        grant_id = payload.get("grant_id")

        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError(
                "aura_turn requires a non-empty prompt."
            )

        if not isinstance(user_id, str) or not user_id.strip():
            raise ValueError(
                "aura_turn user_id must be a non-empty string."
            )

        if not isinstance(session_id, str) or not session_id.strip():
            raise ValueError(
                "aura_turn session_id must be a non-empty string."
            )

        result = self.brain.process_turn(
            prompt=prompt,
            user_id=user_id,
            session_id=session_id,
            interactive_confirm=interactive_confirm,
            scope_id=scope_id,
            grant_id=grant_id,
        )

        if not isinstance(result, dict):
            return {
                "success": False,
                "error": "AURA_TURN_INVALID_RESULT",
            }

        return result

    def _execute_terminal(self, payload: Dict[str, Any]):
        command = payload.get("command")
        cwd = payload.get("cwd")

        if not isinstance(command, str) or not command.strip():
            raise ValueError(
                "terminal_command requires a non-empty command."
            )

        if self.brain is None:
            raise RuntimeError(
                "Terminal execution backend is not configured."
            )

        terminal = getattr(self.brain, "terminal", None)

        if terminal is None:
            raise RuntimeError(
                "Terminal tool is not available."
            )

        return terminal.execute_command(
            command=command,
            cwd=cwd,
        )

    def dispatch_queued_tasks(self, limit: int = 10):
        dispatched = []

        with sqlite3.connect(self.manager.db_path) as conn:
            rows = conn.execute("""
                SELECT task_id
                FROM background_tasks
                WHERE status = 'QUEUED'
                  AND task_type IS NOT NULL
                ORDER BY created_at ASC
                LIMIT ?
            """, (limit,)).fetchall()

        for (task_id,) in rows:
            if self.dispatch_task(task_id):
                dispatched.append(task_id)

        return dispatched
