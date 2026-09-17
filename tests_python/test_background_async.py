import os
import time
from pathlib import Path

from python_brain.runtime.background import (
    BackgroundTaskManager,
    DurableTaskDispatcher,
)


def test_durable_dispatch_runs_asynchronously(tmp_path):
    data_dir = tmp_path / "data"

    # Use a workspace inside the repository so AURA's existing
    # workspace security policy accepts the execution path.
    workspace_root = Path(__file__).resolve().parents[1] / "aura_workspace"
    workspace_root.mkdir(parents=True, exist_ok=True)

    manager = BackgroundTaskManager(
        db_path=str(data_dir / "async.db")
    )

    dispatcher = DurableTaskDispatcher(
        manager=manager,
        brain=None,
    )

    task_id = manager.create_durable_task(
        user_id="async-test-user",
        title="Async terminal test",
        task_type="terminal_command",
        payload={
            "command": "printf 'AURA_ASYNC_OK\\n'",
            "cwd": str(workspace_root),
        },
    )

    started_at = time.monotonic()

    returned_id = dispatcher.dispatch_task_async(task_id)

    elapsed = time.monotonic() - started_at

    assert returned_id == task_id
    assert elapsed < 0.20

    task = manager.get_task(task_id)
    assert task is not None
    assert task["status"] in {"QUEUED", "RUNNING", "COMPLETED"}

    deadline = time.monotonic() + 5.0

    while time.monotonic() < deadline:
        task = manager.get_task(task_id)

        if task and task["status"] in {"COMPLETED", "FAILED"}:
            break

        time.sleep(0.01)

    task = manager.get_task(task_id)

    assert task is not None
    assert task["status"] == "COMPLETED"
    assert task["progress"] == 100
    assert task["result"]["success"] is True
    assert "AURA_ASYNC_OK" in task["result"].get("stdout", "")
