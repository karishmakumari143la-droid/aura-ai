"""
AURA AI — Real Verification Engine
Verifies physical outcomes on disk, processes, networks, and repositories.
Never returns fake success.
"""

import os
import urllib.request
import subprocess
from typing import Dict, Any, Optional

class Verifier:
    @staticmethod
    def verify_file_exists(file_path: str, min_bytes: int = 1) -> Dict[str, Any]:
        exists = os.path.exists(file_path)
        if not exists:
            return {"verified": False, "error": f"File does not exist: {file_path}"}
        size = os.path.getsize(file_path)
        if size < min_bytes:
            return {"verified": False, "error": f"File size {size}B is below minimum {min_bytes}B"}
        return {"verified": True, "path": file_path, "size_bytes": size}

    @staticmethod
    def verify_process_output(exit_code: int, expected_code: int = 0) -> Dict[str, Any]:
        matches = (exit_code == expected_code)
        return {
            "verified": matches,
            "exit_code": exit_code,
            "expected": expected_code,
            "error": None if matches else f"Command exited with non-zero status: {exit_code}"
        }

    @staticmethod
    def verify_http_endpoint(url: str, timeout_sec: float = 3.0) -> Dict[str, Any]:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AURA-Verifier/1.0"})
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                is_ok = (200 <= resp.status < 400)
                return {
                    "verified": is_ok,
                    "status_code": resp.status,
                    "url": url,
                    "error": None if is_ok else f"HTTP status error: {resp.status}"
                }
        except Exception as e:
            return {"verified": False, "url": url, "error": str(e)}

    @staticmethod
    def verify_git_commit_exists(commit_hash: str, workspace_root: Optional[str] = None) -> Dict[str, Any]:
        try:
            res = subprocess.run(
                ["git", "cat-file", "-t", commit_hash],
                cwd=workspace_root or os.getcwd(),
                capture_output=True,
                text=True
            )
            is_valid = (res.returncode == 0 and res.stdout.strip() == "commit")
            return {
                "verified": is_valid,
                "commit": commit_hash,
                "error": None if is_valid else "Commit hash not found in Git repository"
            }
        except Exception as e:
            return {"verified": False, "commit": commit_hash, "error": str(e)}
