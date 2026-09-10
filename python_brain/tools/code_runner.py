"""
AURA AI — Python & Code Execution Engine
Runs isolated Python code, checks AST/syntax validity, and captures exact stdout/stderr.
"""

import ast
import subprocess
import tempfile
import os
import time
from typing import Dict, Any, Optional

class CodeRunnerTool:
    @staticmethod
    def check_syntax(code: str) -> Dict[str, Any]:
        try:
            ast.parse(code)
            return {"valid": True, "error": None}
        except SyntaxError as e:
            return {
                "valid": False,
                "error": f"SyntaxError at line {e.lineno}, offset {e.offset}: {e.msg}",
                "lineno": e.lineno,
                "offset": e.offset
            }

    @staticmethod
    def run_python_code(code: str, timeout: int = 20) -> Dict[str, Any]:
        start = time.time()
        syntax = CodeRunnerTool.check_syntax(code)
        if not syntax["valid"]:
            return {
                "success": False,
                "error": syntax["error"],
                "syntax_valid": False,
                "duration_ms": int((time.time() - start) * 1000)
            }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tf:
            tf.write(code)
            temp_path = tf.name

        try:
            proc = subprocess.run(
                ["python3", temp_path],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            duration_ms = int((time.time() - start) * 1000)
            return {
                "success": (proc.returncode == 0),
                "exit_code": proc.returncode,
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "duration_ms": duration_ms,
                "syntax_valid": True
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": f"Execution timed out after {timeout} seconds.",
                "duration_ms": int((time.time() - start) * 1000),
                "syntax_valid": True
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "duration_ms": int((time.time() - start) * 1000),
                "syntax_valid": True
            }
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
