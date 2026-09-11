import time

from python_brain.runtime.background import (
    BackgroundTaskManager,
    DurableTaskDispatcher,
)


class FakeTerminal:
    def execute_command(self, command, cwd=None):
        return {
            "success": True,
            "command": command,
            "recovered_execution": True,
        }


class FakeBrain:
    def __init__(self):
        self.terminal = FakeTerminal()


def test_restart_recovery_then_async_dispatch(tmp_path):
    db_path = str(tmp_path / "restart_async.db")

    # Runtime before interruption.
    manager_before = BackgroundTaskManager(db_path=db_path)

    task_id = manager_before.create_durable_task(
        user_id="restart-test-user",
        title="Restart recovery test",
        task_type="terminal_command",
        payload={"command": "echo recovered"},
    )

    manager_before.update_task(
        task_id,
        status="RUNNING",
        progress=40,
        new_log="Simulated task running before interruption.",
    )

    before = manager_before.get_task(task_id)
    assert before is not None
    assert before["status"] == "RUNNING"

    # Simulated process restart: create a fresh manager instance
    # pointing at the same persistent SQLite database.
    manager_after = BackgroundTaskManager(db_path=db_path)

    recovered = manager_after.recover_interrupted_tasks()

    assert task_id in recovered

    recovered_task = manager_after.get_task(task_id)
    assert recovered_task is not None
    assert recovered_task["status"] == "QUEUED"

    recovery_logs = recovered_task["logs"]
    assert any(
        isinstance(entry, dict)
        and entry.get("type") == "runtime_recovery"
        for entry in recovery_logs
    )

    # Fresh dispatcher represents the restarted runtime.
    dispatcher = DurableTaskDispatcher(
        manager=manager_after,
        brain=FakeBrain(),
    )

    dispatcher.dispatch_task_async(task_id)

    # Wait for the restarted worker to finish.
    deadline = time.monotonic() + 2.0

    while time.monotonic() < deadline:
        task = manager_after.get_task(task_id)

        if task and task["status"] == "COMPLETED":
            break

        time.sleep(0.01)

    final_task = manager_after.get_task(task_id)

    assert final_task is not None
    assert final_task["status"] == "COMPLETED"
    assert final_task["progress"] == 100
    assert final_task["result"]["success"] is True
    assert final_task["result"]["recovered_execution"] is True
