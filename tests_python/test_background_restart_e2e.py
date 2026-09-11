import os
import sqlite3
import tempfile
import unittest

from python_brain.runtime.background import (
    BackgroundTaskManager,
    DurableTaskDispatcher,
)


class FakeTerminal:
    def execute_command(self, command, cwd=None):
        if command != "AURA_RESTART_E2E":
            raise AssertionError(
                f"Unexpected command: {command}"
            )

        return {
            "success": True,
            "exit_code": 0,
            "stdout": "restart-e2e-ok",
            "stderr": "",
            "command": command,
            "cwd": cwd,
        }


class FakeBrain:
    def __init__(self):
        self.terminal = FakeTerminal()


class TestBackgroundRestartE2E(unittest.TestCase):

    def test_queued_durable_task_executes_after_manager_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(
                tmp,
                "restart_e2e.db",
            )

            # Process/runtime #1:
            manager1 = BackgroundTaskManager(
                db_path=db_path
            )

            task_id = manager1.create_durable_task(
                user_id="restart-user",
                title="Restart durable command",
                task_type="terminal_command",
                payload={
                    "command": "AURA_RESTART_E2E",
                    "cwd": ".",
                },
            )

            task_before_restart = manager1.get_task(task_id)

            self.assertEqual(
                task_before_restart["status"],
                "QUEUED",
            )

            self.assertEqual(
                task_before_restart["task_type"],
                "terminal_command",
            )

            self.assertEqual(
                task_before_restart["payload"]["command"],
                "AURA_RESTART_E2E",
            )

            # Simulated process/runtime restart:
            del manager1

            manager2 = BackgroundTaskManager(
                db_path=db_path
            )

            task_after_restart = manager2.get_task(
                task_id
            )

            self.assertIsNotNone(
                task_after_restart
            )

            self.assertEqual(
                task_after_restart["status"],
                "QUEUED",
            )

            # Startup recovery must not lose the durable task.
            recovered = (
                manager2.recover_interrupted_tasks()
            )

            self.assertIn(
                task_id,
                recovered,
            )

            # Recovered task remains executable.
            self.assertEqual(
                manager2.get_task(task_id)["status"],
                "QUEUED",
            )

            # Startup dispatcher executes it.
            dispatcher = DurableTaskDispatcher(
                manager=manager2,
                brain=FakeBrain(),
            )

            dispatched = (
                dispatcher.dispatch_queued_tasks(
                    limit=10
                )
            )

            self.assertIn(
                task_id,
                dispatched,
            )

            final_task = manager2.get_task(
                task_id
            )

            self.assertEqual(
                final_task["status"],
                "COMPLETED",
            )

            self.assertEqual(
                final_task["progress"],
                100,
            )

            self.assertEqual(
                final_task["result"]["stdout"],
                "restart-e2e-ok",
            )

    def test_completed_durable_task_is_not_executed_again(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(
                tmp,
                "duplicate_e2e.db",
            )

            manager = BackgroundTaskManager(
                db_path=db_path
            )

            task_id = manager.create_durable_task(
                user_id="duplicate-user",
                title="Duplicate protection",
                task_type="terminal_command",
                payload={
                    "command": "AURA_RESTART_E2E",
                    "cwd": ".",
                },
            )

            dispatcher = DurableTaskDispatcher(
                manager=manager,
                brain=FakeBrain(),
            )

            first = dispatcher.dispatch_task(
                task_id
            )

            self.assertTrue(first)

            final = manager.get_task(task_id)

            self.assertEqual(
                final["status"],
                "COMPLETED",
            )

            # Second dispatch must not execute again.
            second = dispatcher.dispatch_task(
                task_id
            )

            self.assertFalse(second)

            final_again = manager.get_task(
                task_id
            )

            self.assertEqual(
                final_again["status"],
                "COMPLETED",
            )

    def test_unsupported_durable_task_cannot_execute(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(
                tmp,
                "unsupported_e2e.db",
            )

            manager = BackgroundTaskManager(
                db_path=db_path
            )

            task_id = manager.create_task(
                user_id="security-user",
                title="Unsupported task",
            )

            with sqlite3.connect(db_path) as conn:
                conn.execute("""
                    UPDATE background_tasks
                    SET
                        task_type = ?,
                        payload = ?
                    WHERE task_id = ?
                """, (
                    "arbitrary_python",
                    '{"code":"print(123)"}',
                    task_id,
                ))
                conn.commit()

            dispatcher = DurableTaskDispatcher(
                manager=manager,
                brain=FakeBrain(),
            )

            result = dispatcher.dispatch_task(
                task_id
            )

            self.assertFalse(result)

            final = manager.get_task(task_id)

            self.assertEqual(
                final["status"],
                "FAILED",
            )

            self.assertEqual(
                final["result"]["error"],
                "UNSUPPORTED_TASK_TYPE",
            )


if __name__ == "__main__":
    unittest.main()
