import os
import tempfile
import time
import unittest

from python_brain.runtime.background import BackgroundTaskManager


class TestBackgroundTaskRuntime(unittest.TestCase):

    def test_task_persists_across_manager_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(tmp, "tasks.db")

            manager1 = BackgroundTaskManager(db_path=db_path)
            task_id = manager1.create_task("user-1", "Persistent task")

            manager1.update_task(
                task_id,
                status="RUNNING",
                progress=40,
                new_log="Task is running."
            )

            manager2 = BackgroundTaskManager(db_path=db_path)
            task = manager2.get_task(task_id)

            self.assertIsNotNone(task)
            self.assertEqual(task["task_id"], task_id)
            self.assertEqual(task["user_id"], "user-1")
            self.assertEqual(task["status"], "RUNNING")
            self.assertEqual(task["progress"], 40)
            self.assertEqual(len(task["logs"]), 1)

    def test_background_worker_completes_and_persists_result(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(tmp, "tasks.db")
            manager = BackgroundTaskManager(db_path=db_path)

            def worker(task_id):
                manager.update_task(
                    task_id,
                    progress=60,
                    new_log="Worker produced result."
                )
                return {"ok": True, "value": 42}

            task_id = manager.launch_in_background(
                "user-1",
                "Test worker",
                worker
            )

            deadline = time.time() + 5
            task = None

            while time.time() < deadline:
                task = manager.get_task(task_id)
                if task and task["status"] == "COMPLETED":
                    break
                time.sleep(0.05)

            self.assertIsNotNone(task)
            self.assertEqual(task["status"], "COMPLETED")
            self.assertEqual(task["progress"], 100)
            self.assertEqual(task["result"], {"ok": True, "value": 42})

    def test_failed_worker_is_recorded(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(tmp, "tasks.db")
            manager = BackgroundTaskManager(db_path=db_path)

            def worker(_task_id):
                raise RuntimeError("intentional test failure")

            task_id = manager.launch_in_background(
                "user-1",
                "Failing worker",
                worker
            )

            deadline = time.time() + 5
            task = None

            while time.time() < deadline:
                task = manager.get_task(task_id)
                if task and task["status"] == "FAILED":
                    break
                time.sleep(0.05)

            self.assertIsNotNone(task)
            self.assertEqual(task["status"], "FAILED")
            self.assertEqual(task["progress"], 100)
            self.assertIn("intentional test failure", task["result"]["error"])


if __name__ == "__main__":
    unittest.main()
