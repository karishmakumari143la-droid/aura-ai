"""
AURA AI — Application Launcher Tool with Lifecycle Observation
Provides authorized workstation application execution within a strict whitelist.
Observes process launch, status, PID, and verification details.
Never simulates application launch.
"""

import subprocess
import sys
import time
from typing import Dict, Any, Optional

AUTHORIZED_APPS = {
    "code": "code",
    "vscode": "code",
    "terminal": "bash" if sys.platform.startswith("linux") else "open -a Terminal",
    "git": "git --version",
    "python": "python3 --version",
    "node": "node --version"
}

class AppLauncherTool:
    @staticmethod
    def launch(app_name: str, args: Optional[str] = None) -> Dict[str, Any]:
        start = time.time()
        normalized = app_name.lower().strip()
        cmd_base = AUTHORIZED_APPS.get(normalized)

        if not cmd_base:
            return {
                "success": False,
                "status": "UNAUTHORIZED_APP",
                "error": f"Application '{app_name}' is not authorized in companion whitelist. Allowed: {list(AUTHORIZED_APPS.keys())}",
                "duration_ms": int((time.time() - start) * 1000)
            }

        cmd = f"{cmd_base} {args}" if args else cmd_base

        try:
            proc = subprocess.Popen(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            # Brief observation pause
            time.sleep(0.1)
            poll_code = proc.poll()
            is_running = (poll_code is None)

            stdout_out = ""
            stderr_out = ""
            if not is_running:
                out, err = proc.communicate(timeout=1)
                stdout_out = out.strip()
                stderr_out = err.strip()

            observation = {
                "app": app_name,
                "command": cmd,
                "pid": proc.pid,
                "process_running": is_running,
                "exit_code": poll_code,
                "observed_stdout": stdout_out,
                "observed_stderr": stderr_out,
                "verified": bool(is_running or poll_code == 0)
            }

            return {
                "success": True,
                "status": "LAUNCHED_AND_OBSERVED",
                "observation": observation,
                "pid": proc.pid,
                "duration_ms": int((time.time() - start) * 1000)
            }
        except Exception as e:
            return {
                "success": False,
                "status": "LAUNCH_FAILED",
                "error": str(e),
                "duration_ms": int((time.time() - start) * 1000)
            }
