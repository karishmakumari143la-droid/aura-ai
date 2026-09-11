import json
import subprocess
import sys
import textwrap


def test_recovered_task_executes_after_real_process_restart(tmp_path):
    db_path = tmp_path / "process_restart_execution.db"

    create_script = textwrap.dedent(
        """
        import sys
        sys.path.insert(0, "/workspaces/aura-ai")

        from python_brain.runtime.background import BackgroundTaskManager

        manager = BackgroundTaskManager(db_path=sys.argv[1])

        task_id = manager.create_durable_task(
            user_id="restart-user",
            title="Recovered execution task",
            task_type="terminal_command",
            payload={"command": "printf recovered-ok"},
        )

        manager.update_task(
            task_id,
            status="RUNNING",
            progress=50,
            new_log="Task was running before process interruption.",
        )

        print(task_id)
        """
    )

    result = subprocess.run(
        [sys.executable, "-c", create_script, str(db_path)],
        capture_output=True,
        text=True,
        check=True,
    )

    task_id = result.stdout.strip()
    assert task_id

    execute_script = textwrap.dedent(
        """
        import json
        import sys

        sys.path.insert(0, "/workspaces/aura-ai")

        from python_brain.runtime.background import (
            BackgroundTaskManager,
            DurableTaskDispatcher,
        )
        from python_brain.brain import AuraBrain

        manager = BackgroundTaskManager(db_path=sys.argv[1])

        recovered = manager.recover_interrupted_tasks()

        aura_brain = AuraBrain()

        dispatcher = DurableTaskDispatcher(
            manager,
            brain=aura_brain,
        )

        dispatched = dispatcher.dispatch_task(sys.argv[2])

        task = manager.get_task(sys.argv[2])

        print(json.dumps({
            "recovered": recovered,
            "dispatched": dispatched,
            "status": task["status"],
            "result": task["result"],
        }))
        """
    )

    result = subprocess.run(
        [
            sys.executable,
            "-c",
            execute_script,
            str(db_path),
            task_id,
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    data = json.loads(result.stdout)

    assert task_id in data["recovered"]
    assert data["dispatched"] is True
    assert data["status"] == "COMPLETED"

    result_data = data["result"]
    assert isinstance(result_data, dict)
    assert result_data.get("success") is True
    assert "recovered-ok" in result_data.get("stdout", "")
