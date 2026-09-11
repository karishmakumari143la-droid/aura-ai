import os
import tempfile
import time
import unittest

from python_brain.runtime.background import BackgroundTaskManager


class TestBackgroundRecovery(unittest.TestCase):

    def test_stale_running_task_can_be_recovered(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "tasks.db")
            manager = BackgroundTaskManager(db_path=db)

            task_id = manager.create_task("user-1", "Recover me")
            manager.update_task(
                task_id,
                status="RUNNING",
                progress=35,
                new_log="Worker interrupted."
            )

            recovered = manager.recover_interrupted_tasks()

            self.assertIn(task_id, recovered)

            task = manager.get_task(task_id)
            self.assertIsNotNone(task)
            self.assertEqual(task["status"], "QUEUED")
            self.assertEqual(task["progress"], 35)

    def test_completed_task_is_not_recovered(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "tasks.db")
            manager = BackgroundTaskManager(db_path=db)

            task_id = manager.create_task("user-1", "Already done")
            manager.update_task(
                task_id,
                status="COMPLETED",
                progress=100,
                result={"ok": True}
            )

            recovered = manager.recover_interrupted_tasks()

            self.assertNotIn(task_id, recovered)

            task = manager.get_task(task_id)
            self.assertEqual(task["status"], "COMPLETED")

    def test_queued_task_is_recoverable(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "tasks.db")
            manager = BackgroundTaskManager(db_path=db)

            task_id = manager.create_task("user-1", "Queued task")

            recovered = manager.recover_interrupted_tasks()

            self.assertIn(task_id, recovered)

            task = manager.get_task(task_id)
            self.assertEqual(task["status"], "QUEUED")

    def test_recovery_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "tasks.db")
            manager = BackgroundTaskManager(db_path=db)

            task_id = manager.create_task("user-1", "Recover once")
            manager.update_task(task_id, status="RUNNING")

            first = manager.recover_interrupted_tasks()
            second = manager.recover_interrupted_tasks()

            self.assertIn(task_id, first)
            self.assertNotIn(task_id, second)


if __name__ == "__main__":
    unittest.main()
