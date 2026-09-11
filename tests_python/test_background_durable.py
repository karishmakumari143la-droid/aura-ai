import os
import tempfile
import time
import unittest

from python_brain.runtime.background import BackgroundTaskManager


class TestBackgroundDurableTasks(unittest.TestCase):

    def test_terminal_payload_is_persisted(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "tasks.db")
            manager = BackgroundTaskManager(db_path=db)

            task_id = manager.create_durable_task(
                user_id="user-1",
                title="Durable command",
                task_type="terminal_command",
                payload={
                    "command": "echo hello",
                    "cwd": ".",
                },
            )

            task = manager.get_task(task_id)

            self.assertEqual(task["status"], "QUEUED")
            self.assertEqual(task["task_type"], "terminal_command")
            self.assertEqual(
                task["payload"],
                {"command": "echo hello", "cwd": "."},
            )

    def test_durable_task_survives_manager_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "tasks.db")

            manager1 = BackgroundTaskManager(db_path=db)

            task_id = manager1.create_durable_task(
                user_id="user-1",
                title="Restart me",
                task_type="terminal_command",
                payload={"command": "echo restart"},
            )

            manager2 = BackgroundTaskManager(db_path=db)
            task = manager2.get_task(task_id)

            self.assertIsNotNone(task)
            self.assertEqual(task["task_type"], "terminal_command")
            self.assertEqual(
                task["payload"]["command"],
                "echo restart",
            )

    def test_unknown_task_type_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "tasks.db")
            manager = BackgroundTaskManager(db_path=db)

            with self.assertRaises(ValueError):
                manager.create_durable_task(
                    user_id="user-1",
                    title="Invalid",
                    task_type="arbitrary_python",
                    payload={"code": "print('bad')"},
                )


if __name__ == "__main__":
    unittest.main()
