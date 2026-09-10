"""
AURA AI — Real Terminal Tool
Executes verified bash commands with safety policies, timeouts, and output capture.
"""

import subprocess
import time
import os
from typing import Dict, Any, Optional
from ..security.policy import SecurityPolicy

class TerminalTool:
    def __init__(self, workspace_root: Optional[str] = None):
        self.workspace_root = os.path.abspath(workspace_root or os.getcwd())

    def execute_command(self, command: str, cwd: Optional[str] = None, timeout: int = 30) -> Dict[str, Any]:
        start = time.time()

        # Security policy validation
        valid, sec_err = SecurityPolicy.validate_command(command)
        if not valid:
            return {
                "success": False,
                "error": sec_err,
                "exit_code": 126,
                "command": command,
                "duration_ms": 0
            }

        # Resolve work directory safely
        work_dir = self.workspace_root
        if cwd:
            v, resolved_cwd = SecurityPolicy.validate_path(self.workspace_root, cwd)
            if not v:
                return {"success": False, "error": resolved_cwd, "exit_code": 1, "duration_ms": 0}
            work_dir = resolved_cwd

        cmd_to_run = command.strip()
        if cmd_to_run.endswith("&"):
            cmd_to_run = f"nohup {cmd_to_run[:-1].strip()} >/dev/null 2>&1 &"

        try:
            proc = subprocess.run(
                cmd_to_run,
                shell=True,
                cwd=work_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            duration_ms = int((time.time() - start) * 1000)

            # Redact secrets before returning
            clean_stdout = SecurityPolicy.redact_secrets(proc.stdout)
            clean_stderr = SecurityPolicy.redact_secrets(proc.stderr)

            return {
                "success": (proc.returncode == 0),
                "exit_code": proc.returncode,
                "stdout": clean_stdout,
                "stderr": clean_stderr,
                "command": command,
                "cwd": os.path.relpath(work_dir, self.workspace_root),
                "duration_ms": duration_ms
            }
        except subprocess.TimeoutExpired:
            duration_ms = int((time.time() - start) * 1000)
            return {
                "success": False,
                "error": f"Command timed out after {timeout} seconds.",
                "exit_code": 124,
                "duration_ms": duration_ms
            }
        except Exception as e:
            duration_ms = int((time.time() - start) * 1000)
            return {
                "success": False,
                "error": str(e),
                "exit_code": 1,
                "duration_ms": duration_ms
            }
