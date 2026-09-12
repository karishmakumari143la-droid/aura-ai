import tempfile
import time
from pathlib import Path

from python_brain.runtime.background import (
    BackgroundTaskManager,
    RecurringWorkScheduler,
)


class FakeDispatcher:
    def __init__(self):
        self.dispatched = []

    def dispatch_task_async(self, task_id):
        self.dispatched.append(task_id)


def test_recurring_scheduler_create_list_toggle_delete():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "recurring.db"
        manager = BackgroundTaskManager(db_path=str(db_path))
        dispatcher = FakeDispatcher()

        scheduler = RecurringWorkScheduler(
            task_manager=manager,
            dispatcher=dispatcher,
        )

        job_id = scheduler.create_job(
            user_id="test-user",
            title="Daily Test",
            prompt="Run the daily test",
            frequency="daily",
            timezone="Asia/Kolkata",
            next_run_at=time.time() - 1,
        )

        jobs = scheduler.list_jobs("test-user")
        assert len(jobs) == 1
        assert jobs[0]["job_id"] == job_id
        assert jobs[0]["enabled"] == 1
        assert jobs[0]["timezone"] == "Asia/Kolkata"

        assert scheduler.set_enabled(job_id, False) is True
        assert scheduler.list_jobs("test-user")[0]["enabled"] == 0

        assert scheduler.set_enabled(job_id, True) is True
        assert scheduler.list_jobs("test-user")[0]["enabled"] == 1

        assert scheduler.delete_job(job_id) is True
        assert scheduler.list_jobs("test-user") == []


def test_recurring_scheduler_dispatches_due_aura_turn():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "recurring.db"
        manager = BackgroundTaskManager(db_path=str(db_path))
        dispatcher = FakeDispatcher()

        scheduler = RecurringWorkScheduler(
            task_manager=manager,
            dispatcher=dispatcher,
        )

        job_id = scheduler.create_job(
            user_id="test-user",
            title="Due Test",
            prompt="Do the scheduled work",
            frequency="hourly",
            timezone="Asia/Kolkata",
            next_run_at=time.time() - 1,
        )

        result = scheduler.run_due_once()

        assert result is not None
        assert result["job_id"] == job_id
        assert result["task_id"] in dispatcher.dispatched

        jobs = scheduler.list_jobs("test-user")
        assert jobs[0]["last_task_id"] == result["task_id"]
        assert jobs[0]["last_run_at"] is not None
        assert jobs[0]["next_run_at"] > time.time()

        task = manager.get_task(
            result["task_id"],
            user_id="test-user",
        )
        assert task is not None
        assert task["task_type"] == "aura_turn"


def test_recurring_scheduler_does_not_dispatch_paused_job():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "recurring.db"
        manager = BackgroundTaskManager(db_path=str(db_path))
        dispatcher = FakeDispatcher()

        scheduler = RecurringWorkScheduler(
            task_manager=manager,
            dispatcher=dispatcher,
        )

        job_id = scheduler.create_job(
            user_id="test-user",
            title="Paused Test",
            prompt="Should not run",
            frequency="hourly",
            next_run_at=time.time() - 1,
        )

        assert scheduler.set_enabled(job_id, False) is True
        assert scheduler.run_due_once() is None
        assert dispatcher.dispatched == []


if __name__ == "__main__":
    test_recurring_scheduler_create_list_toggle_delete()
    test_recurring_scheduler_dispatches_due_aura_turn()
    test_recurring_scheduler_does_not_dispatch_paused_job()
    print("RECURRING_SCHEDULER_TESTS: PASS")
