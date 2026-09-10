"""
AURA AI — Real Git & Version Control Tool
Inspects Git repositories, checks branches, status, logs, and stages commits.
"""

import subprocess
import os
import time
from typing import Dict, Any, Optional

class GitTool:
    def __init__(self, workspace_root: Optional[str] = None):
        self.workspace_root = os.path.abspath(workspace_root or os.getcwd())

    def _run_git(self, args: list) -> Dict[str, Any]:
        start = time.time()
        try:
            proc = subprocess.run(
                ["git"] + args,
                cwd=self.workspace_root,
                capture_output=True,
                text=True,
                timeout=15
            )
            return {
                "success": (proc.returncode == 0),
                "exit_code": proc.returncode,
                "stdout": proc.stdout.strip(),
                "stderr": proc.stderr.strip(),
                "duration_ms": int((time.time() - start) * 1000)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "duration_ms": int((time.time() - start) * 1000)
            }

    def status(self) -> Dict[str, Any]:
        res = self._run_git(["status", "--porcelain"])
        if not res["success"]:
            return res
        raw = res["stdout"]
        modified = []
        untracked = []
        for line in raw.splitlines():
            if line.startswith("??"):
                untracked.append(line[3:])
            else:
                modified.append(line[3:])
        return {
            "success": True,
            "clean": (len(raw) == 0),
            "modified": modified,
            "untracked": untracked,
            "raw": raw
        }

    def branch(self) -> Dict[str, Any]:
        return self._run_git(["branch", "--show-current"])

    def log(self, count: int = 5) -> Dict[str, Any]:
        return self._run_git(["log", f"-n{count}", "--oneline", "--decorate"])

    def diff(self) -> Dict[str, Any]:
        return self._run_git(["diff", "--stat"])

    def commit(self, message: str, add_all: bool = True) -> Dict[str, Any]:
        if add_all:
            add_res = self._run_git(["add", "."])
            if not add_res["success"]:
                return add_res
        return self._run_git(["commit", "-m", message])

    def push(self, remote: str = "origin", branch: str = "") -> Dict[str, Any]:
        gh_token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
        if not gh_token:
            # Check if remote has credentials configured
            remote_check = self._run_git(["remote", "get-url", remote])
            if not remote_check["success"] or "http" in remote_check["stdout"] and "@" not in remote_check["stdout"]:
                return {
                    "status": "NOT_CONFIGURED",
                    "success": False,
                    "error": "GITHUB_CREDENTIALS_NOT_CONFIGURED",
                    "message": "GitHub OAuth or Personal Access Token (GITHUB_TOKEN) is not configured for push operations."
                }
        args = ["push", remote]
        if branch:
            args.append(branch)
        return self._run_git(args)

    def create_remote_repo(self, repo_name: str, private: bool = True) -> Dict[str, Any]:
        gh_token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
        if not gh_token:
            return {
                "status": "NOT_CONFIGURED",
                "success": False,
                "error": "GITHUB_TOKEN_NOT_CONFIGURED",
                "message": "GitHub Personal Access Token (GITHUB_TOKEN) is not configured to create remote repositories."
            }
        import urllib.request
        import json
        url = "https://api.github.com/user/repos"
        headers = {
            "Authorization": f"token {gh_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AURA-AI-Brain"
        }
        data = json.dumps({"name": repo_name, "private": private}).encode("utf-8")
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                return {
                    "status": "WORKING",
                    "success": True,
                    "repo_url": result.get("html_url"),
                    "clone_url": result.get("clone_url")
                }
        except Exception as e:
            return {
                "status": "ERROR",
                "success": False,
                "error": str(e)
            }
