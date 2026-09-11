import threading
import time

from python_brain.runtime.background import (
    BackgroundTaskManager,
    DurableTaskDispatcher,
)


def test_concurrent_dispatch_executes_task_only_once(tmp_path, monkeypatch):
    db_path = tmp_path / "concurrency.db"

    manager = BackgroundTaskManager(db_path=str(db_path))
    task_id = manager.create_durable_task(
        user_id="test-user",
        title="Concurrent terminal task",
        task_type="terminal_command",
        payload={"command": "echo concurrent-ok"},
    )

    dispatcher = DurableTaskDispatcher(manager)

    execution_count = {"value": 0}
    execution_lock = threading.Lock()

    class FakeTerminal:
        def execute_command(self, command, cwd=None):
            with execution_lock:
                execution_count["value"] += 1
            time.sleep(0.05)
            return {
                "success": True,
                "stdout": "concurrent-ok",
                "stderr": "",
                "returncode": 0,
            }

    dispatcher.brain = type(
        "FakeBrain",
        (),
        {"terminal": FakeTerminal()},
    )()

    results = []

    def dispatch():
        results.append(dispatcher.dispatch_task(task_id))

    threads = [
        threading.Thread(target=dispatch),
        threading.Thread(target=dispatch),
    ]

    for thread in threads:
        thread.start()

    for thread in threads:
        thread.join()

    task = manager.get_task(task_id)

    assert execution_count["value"] == 1
    assert task["status"] == "COMPLETED"
    assert len(results) == 2
    assert sorted(results) == [False, True]
