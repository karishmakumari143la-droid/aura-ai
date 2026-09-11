from python_brain import main


class FakeTaskManager:
    def __init__(self):
        self.calls = []

    def recover_interrupted_tasks(self):
        self.calls.append("recover")
        return ["recovered-task-1"]

    
class FakeDispatcher:
    def __init__(self):
        self.calls = []

    def dispatch_queued_tasks(self, limit=10):
        self.calls.append(("dispatch", limit))
        return ["queued-task-1"]


def test_startup_recovers_then_dispatches(monkeypatch):
    manager = FakeTaskManager()
    dispatcher = FakeDispatcher()

    monkeypatch.setattr(main, "task_manager", manager)
    monkeypatch.setattr(main, "durable_dispatcher", dispatcher)

    main.recover_and_dispatch_durable_tasks()

    assert manager.calls == ["recover"]
    assert dispatcher.calls == [("dispatch", 10)]
