import time
import threading

from python_brain.runtime.background import (
    BackgroundTaskManager,
    DurableTaskDispatcher,
)


class FakeTerminal:
    def __init__(self):
        self.started = threading.Event()
        self.finished = threading.Event()

    def execute_command(self, command, cwd=None):
        self.started.set()
        time.sleep(0.25)
        self.finished.set()
        return {
            "success": True,
            "command": command,
        }


class FakeBrain:
    def __init__(self):
        self.terminal = FakeTerminal()


def test_durable_dispatch_runs_asynchronously(tmp_path):
    manager = BackgroundTaskManager(
        db_path=str(tmp_path / "async.db")
    )
    brain = FakeBrain()
    dispatcher = DurableTaskDispatcher(
        manager=manager,
        brain=brain,
    )

    task_id = manager.create_durable_task(
        user_id="async-test-user",
        title="Async terminal test",
        task_type="terminal_command",
        payload={"command": "echo async-test"},
    )

    started_at = time.monotonic()

    returned_id = dispatcher.dispatch_task_async(task_id)

    elapsed = time.monotonic() - started_at

    assert returned_id == task_id
    assert elapsed < 0.20

    assert brain.terminal.started.wait(timeout=1.0)

    task = manager.get_task(task_id)
    assert task is not None
    assert task["status"] in {"RUNNING", "COMPLETED"}

    assert brain.terminal.finished.wait(timeout=2.0)

    deadline = time.monotonic() + 2.0
    while time.monotonic() < deadline:
        task = manager.get_task(task_id)
        if task and task["status"] == "COMPLETED":
            break
        time.sleep(0.01)

    task = manager.get_task(task_id)
    assert task is not None
    assert task["status"] == "COMPLETED"
    assert task["progress"] == 100
    assert task["result"]["success"] is True
