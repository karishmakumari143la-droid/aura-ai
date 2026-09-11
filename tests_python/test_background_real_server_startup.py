import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path


def _free_port():
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def test_real_fastapi_startup_recovers_and_dispatches(tmp_path):
    db_path = tmp_path / "server_startup.db"
    port = _free_port()

    create_script = r"""
import sys
sys.path.insert(0, "/workspaces/aura-ai")

from python_brain.runtime.background import BackgroundTaskManager

manager = BackgroundTaskManager(db_path=sys.argv[1])

task_id = manager.create_durable_task(
    user_id="server-startup-user",
    title="Server startup recovery task",
    task_type="terminal_command",
    payload={"command": "printf server-startup-ok"},
)

manager.update_task(
    task_id,
    status="RUNNING",
    progress=50,
    new_log="Task interrupted before server restart.",
)

print(task_id)
"""

    result = subprocess.run(
        [sys.executable, "-c", create_script, str(db_path)],
        capture_output=True,
        text=True,
        check=True,
    )

    task_id = result.stdout.strip()
    assert task_id

    server_env = os.environ.copy()
    server_env["AURA_TASK_DB_PATH"] = str(db_path)

    server_script = r"""
import os
import sys

sys.path.insert(0, "/workspaces/aura-ai")

import uvicorn

from python_brain import main

main.task_manager.db_path = os.environ["AURA_TASK_DB_PATH"]
main.durable_dispatcher.manager = main.task_manager

uvicorn.run(
    main.app,
    host="127.0.0.1",
    port=int(os.environ["AURA_TEST_PORT"]),
    log_level="warning",
)
"""

    server_env["AURA_TEST_PORT"] = str(port)

    process = subprocess.Popen(
        [
            sys.executable,
            "-c",
            server_script,
        ],
        env=server_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        deadline = time.time() + 10

        while time.time() < deadline:
            try:
                with socket.create_connection(
                    ("127.0.0.1", port),
                    timeout=0.5,
                ):
                    break
            except OSError:
                if process.poll() is not None:
                    stdout, stderr = process.communicate(timeout=2)
                    raise AssertionError(
                        "FastAPI server exited before becoming ready.\n"
                        f"STDOUT:\n{stdout}\nSTDERR:\n{stderr}"
                    )
                time.sleep(0.1)
        else:
            raise AssertionError("FastAPI server did not become ready.")

        deadline = time.time() + 10

        final_task = None

        while time.time() < deadline:
            inspect_script = r"""
import json
import sys

sys.path.insert(0, "/workspaces/aura-ai")

from python_brain.runtime.background import BackgroundTaskManager

manager = BackgroundTaskManager(db_path=sys.argv[1])
task = manager.get_task(sys.argv[2])

print(json.dumps({
    "status": task["status"] if task else None,
    "result": task["result"] if task else None,
}))
"""

            result = subprocess.run(
                [
                    sys.executable,
                    "-c",
                    inspect_script,
                    str(db_path),
                    task_id,
                ],
                capture_output=True,
                text=True,
                check=True,
            )

            final_task = json.loads(result.stdout)

            if final_task["status"] == "COMPLETED":
                break

            time.sleep(0.1)

        assert final_task is not None
        assert final_task["status"] == "COMPLETED"

        result_data = final_task["result"]
        assert isinstance(result_data, dict)
        assert result_data.get("success") is True
        assert "server-startup-ok" in result_data.get("stdout", "")

    finally:
        process.terminate()

        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
