import time
from pathlib import Path

from python_brain.runtime.background import (
    BackgroundTaskManager,
    DurableTaskDispatcher,
)


def test_restart_recovery_then_async_dispatch(tmp_path):
    db_path = str(tmp_path / "restart_async.db")

    # Keep execution inside AURA's configured workspace security boundary.
    workspace_root = Path(__file__).resolve().parents[1] / "aura_workspace"
    workspace_root.mkdir(parents=True, exist_ok=True)

    manager_before = BackgroundTaskManager(db_path=db_path)

    task_id = manager_before.create_durable_task(
        user_id="restart-test-user",
        title="Restart recovery test",
        task_type="terminal_command",
        payload={
            "command": "printf 'AURA_RECOVERED_OK\\n'",
            "cwd": str(workspace_root),
        },
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

    dispatcher = DurableTaskDispatcher(
        manager=manager_after,
        brain=None,
    )

    started_at = time.monotonic()
    returned_id = dispatcher.dispatch_task_async(task_id)
    elapsed = time.monotonic() - started_at

    assert returned_id == task_id
    assert elapsed < 0.20

    deadline = time.monotonic() + 5.0

    while time.monotonic() < deadline:
        task = manager_after.get_task(task_id)

        if task and task["status"] in {"COMPLETED", "FAILED"}:
            break

        time.sleep(0.01)

    final_task = manager_after.get_task(task_id)

    assert final_task is not None
    assert final_task["status"] == "COMPLETED"
    assert final_task["progress"] == 100
    assert final_task["result"]["success"] is True
    assert "AURA_RECOVERED_OK" in final_task["result"].get("stdout", "")
