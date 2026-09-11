import json
import os
import sqlite3
import subprocess
import sys
import textwrap


def test_durable_task_survives_real_process_restart(tmp_path):
    db_path = tmp_path / "process_restart.db"

    create_script = textwrap.dedent(
        """
        import sys
        sys.path.insert(0, "/workspaces/aura-ai")

        from python_brain.runtime.background import BackgroundTaskManager

        manager = BackgroundTaskManager(db_path=sys.argv[1])

        task_id = manager.create_durable_task(
            user_id="restart-user",
            title="Process restart task",
            task_type="terminal_command",
            payload={"command": "echo restart-ok"},
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

    recover_script = textwrap.dedent(
        """
        import json
        import sys
        sys.path.insert(0, "/workspaces/aura-ai")

        from python_brain.runtime.background import BackgroundTaskManager

        manager = BackgroundTaskManager(db_path=sys.argv[1])
        recovered = manager.recover_interrupted_tasks()

        task = manager.get_task(sys.argv[2])

        print(json.dumps({
            "recovered": recovered,
            "status": task["status"],
            "logs": task["logs"],
        }))
        """
    )

    result = subprocess.run(
        [
            sys.executable,
            "-c",
            recover_script,
            str(db_path),
            task_id,
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    data = json.loads(result.stdout)

    assert task_id in data["recovered"]
    assert data["status"] == "QUEUED"

    assert any(
        isinstance(entry, dict)
        and entry.get("type") == "runtime_recovery"
        for entry in data["logs"]
    )

    verify_script = textwrap.dedent(
        """
        import json
        import sys
        sys.path.insert(0, "/workspaces/aura-ai")

        from python_brain.runtime.background import BackgroundTaskManager

        manager = BackgroundTaskManager(db_path=sys.argv[1])

        first = manager.recover_interrupted_tasks()
        task = manager.get_task(sys.argv[2])

        print(json.dumps({
            "second_recovery": first,
            "status": task["status"],
        }))
        """
    )

    result = subprocess.run(
        [
            sys.executable,
            "-c",
            verify_script,
            str(db_path),
            task_id,
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    data = json.loads(result.stdout)

    assert data["second_recovery"] == []
    assert data["status"] == "QUEUED"
