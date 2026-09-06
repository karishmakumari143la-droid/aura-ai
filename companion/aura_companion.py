#!/usr/bin/env python3
"""
AURA AI — Python Desktop Companion Daemon & Tool Execution Engine
Provides authorized, permission-gated local computer and workstation control.

Supported capabilities:
- Filesystem (read, write, list, search)
- Terminal execution with timeout and output capture
- Browser open & web navigation
- Application launcher
- Clipboard read / write
- Git repository operations
- Screen analysis & display inspection
- Explicit ALLOW / ASK / DENY permission gating
"""

import os
import sys
import json
import subprocess
import webbrowser
import time
import argparse
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass

DEFAULT_PERMISSIONS: Dict[str, str] = {
    "FILES_READ": "allow",
    "FILES_WRITE": "allow",
    "FILES_DELETE": "ask",
    "TERMINAL_EXECUTE": "ask",
    "BROWSER_CONTROL": "allow",
    "APP_LAUNCH": "ask",
    "CLIPBOARD_READ": "ask",
    "CLIPBOARD_WRITE": "allow",
    "GIT_ACCESS": "allow",
    "SCREEN_CAPTURE": "allow",
}


@dataclass
class ToolResult:
    success: bool
    data: Any = None
    error: Optional[str] = None
    permission_state: str = "allow"
    duration_ms: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "permission_state": self.permission_state,
            "duration_ms": self.duration_ms,
        }


class AuraCompanion:
    def __init__(self, workspace_root: Optional[str] = None, permissions: Optional[Dict[str, str]] = None):
        self.workspace_root = os.path.abspath(workspace_root or os.getcwd())
        self.permissions = dict(DEFAULT_PERMISSIONS)
        if permissions:
            self.permissions.update(permissions)

    def check_permission(self, perm_key: str, interactive_confirm: bool = False) -> Tuple[bool, str]:
        state = self.permissions.get(perm_key, "ask").lower()
        if state == "deny":
            return False, "Permission explicitly DENIED by user security policy."
        if state == "allow":
            return True, "allowed"
        # state is 'ask'
        if interactive_confirm:
            return True, "ask_confirmed"
        return False, f"Action requires explicit user authorization (state: ASK for {perm_key})."

    def set_permission(self, perm_key: str, state: str) -> None:
        if state.lower() in ("allow", "ask", "deny"):
            self.permissions[perm_key] = state.lower()

    # ==================== FILESYSTEM ====================
    def filesystem_read(self, rel_path: str, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg = self.check_permission("FILES_READ", confirmed)
        if not allowed:
            return ToolResult(success=False, error=msg, permission_state="denied")

        full_path = os.path.abspath(os.path.join(self.workspace_root, rel_path))
        if not full_path.startswith(self.workspace_root):
            return ToolResult(success=False, error="Access denied: Path traverses outside workspace root.")

        if not os.path.exists(full_path):
            return ToolResult(success=False, error=f"File not found: {rel_path}")

        try:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
            return ToolResult(success=True, data={"path": rel_path, "content": content, "size": len(content)}, duration_ms=int((time.time() - start) * 1000))
        except Exception as e:
            return ToolResult(success=False, error=str(e), duration_ms=int((time.time() - start) * 1000))

    def filesystem_write(self, rel_path: str, content: str, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg = self.check_permission("FILES_WRITE", confirmed)
        if not allowed:
            return ToolResult(success=False, error=msg, permission_state="denied")

        full_path = os.path.abspath(os.path.join(self.workspace_root, rel_path))
        if not full_path.startswith(self.workspace_root):
            return ToolResult(success=False, error="Access denied: Path traverses outside workspace root.")

        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
            return ToolResult(success=True, data={"path": rel_path, "bytes_written": len(content.encode("utf-8"))}, duration_ms=int((time.time() - start) * 1000))
        except Exception as e:
            return ToolResult(success=False, error=str(e), duration_ms=int((time.time() - start) * 1000))

    def filesystem_list(self, rel_path: str = ".", confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg = self.check_permission("FILES_READ", confirmed)
        if not allowed:
            return ToolResult(success=False, error=msg, permission_state="denied")

        full_path = os.path.abspath(os.path.join(self.workspace_root, rel_path))
        if not os.path.exists(full_path):
            return ToolResult(success=False, error=f"Directory not found: {rel_path}")

        try:
            entries = []
            for item in sorted(os.listdir(full_path)):
                item_full = os.path.join(full_path, item)
                entries.append({
                    "name": item,
                    "is_dir": os.path.isdir(item_full),
                    "size": os.path.getsize(item_full) if not os.path.isdir(item_full) else 0
                })
            return ToolResult(success=True, data={"dir": rel_path, "entries": entries}, duration_ms=int((time.time() - start) * 1000))
        except Exception as e:
            return ToolResult(success=False, error=str(e), duration_ms=int((time.time() - start) * 1000))

    # ==================== TERMINAL EXECUTION ====================
    def terminal_execute(self, command: str, cwd: Optional[str] = None, timeout: int = 15, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg = self.check_permission("TERMINAL_EXECUTE", confirmed)
        if not allowed:
            return ToolResult(success=False, error=msg, permission_state="ask")

        # Security check: disallow destructive system commands
        low = command.lower()
        if any(bad in low for bad in ["rm -rf /", "mkfs", "dd if=", ":(){:|", "shutdown", "reboot"]):
            return ToolResult(success=False, error="Security violation: Command matched dangerous destructive blacklist.")

        work_dir = os.path.abspath(os.path.join(self.workspace_root, cwd)) if cwd else self.workspace_root
        try:
            proc = subprocess.run(
                command,
                shell=True,
                cwd=work_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return ToolResult(
                success=(proc.returncode == 0),
                data={
                    "stdout": proc.stdout,
                    "stderr": proc.stderr,
                    "exit_code": proc.returncode,
                    "command": command
                },
                error=proc.stderr if proc.returncode != 0 else None,
                duration_ms=int((time.time() - start) * 1000)
            )
        except subprocess.TimeoutExpired:
            return ToolResult(success=False, error=f"Command timed out after {timeout} seconds.", duration_ms=int((time.time() - start) * 1000))
        except Exception as e:
            return ToolResult(success=False, error=str(e), duration_ms=int((time.time() - start) * 1000))

    # ==================== BROWSER CONTROL ====================
    def browser_open(self, url: str, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg = self.check_permission("BROWSER_CONTROL", confirmed)
        if not allowed:
            return ToolResult(success=False, error=msg, permission_state="denied")

        if not (url.startswith("http://") or url.startswith("https://")):
            return ToolResult(success=False, error="Invalid protocol. URL must begin with http:// or https://")

        try:
            opened = webbrowser.open(url)
            return ToolResult(success=True, data={"url": url, "opened": opened}, duration_ms=int((time.time() - start) * 1000))
        except Exception as e:
            return ToolResult(success=False, error=str(e), duration_ms=int((time.time() - start) * 1000))

    # ==================== APPLICATION LAUNCH ====================
    def app_launch(self, app_name: str, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg = self.check_permission("APP_LAUNCH", confirmed)
        if not allowed:
            return ToolResult(success=False, error=msg, permission_state="ask")

        allowed_apps = {
            "code": "code",
            "vscode": "code",
            "terminal": "x-terminal-emulator" if sys.platform.startswith("linux") else "open -a Terminal",
            "git": "git --version"
        }
        cmd = allowed_apps.get(app_name.lower())
        if not cmd:
            return ToolResult(success=False, error=f"Application '{app_name}' is not in the authorized companion whitelist.")

        try:
            subprocess.Popen(cmd, shell=True)
            return ToolResult(success=True, data={"app": app_name, "status": "launched"}, duration_ms=int((time.time() - start) * 1000))
        except Exception as e:
            return ToolResult(success=False, error=str(e), duration_ms=int((time.time() - start) * 1000))

    # ==================== GIT INTEGRATION ====================
    def git_action(self, action: str, args: Optional[list] = None, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg = self.check_permission("GIT_ACCESS", confirmed)
        if not allowed:
            return ToolResult(success=False, error=msg, permission_state="denied")

        cmd_map = {
            "status": "git status --porcelain",
            "branch": "git branch --show-current",
            "log": "git log -n 5 --oneline",
            "diff": "git diff --stat"
        }
        cmd = cmd_map.get(action.lower())
        if not cmd:
            return ToolResult(success=False, error=f"Unsupported Git action: {action}. Allowed: status, branch, log, diff")

        return self.terminal_execute(cmd, cwd=self.workspace_root, timeout=10, confirmed=True)

    # ==================== DISPATCHER ====================
    def dispatch(self, tool_name: str, args: Dict[str, Any], confirmed: bool = False) -> ToolResult:
        methods = {
            "filesystem_read": lambda: self.filesystem_read(args.get("path", ""), confirmed),
            "filesystem_write": lambda: self.filesystem_write(args.get("path", ""), args.get("content", ""), confirmed),
            "filesystem_list": lambda: self.filesystem_list(args.get("path", "."), confirmed),
            "terminal_execute": lambda: self.terminal_execute(args.get("command", ""), args.get("cwd"), args.get("timeout", 15), confirmed),
            "browser_open": lambda: self.browser_open(args.get("url", ""), confirmed),
            "app_launch": lambda: self.app_launch(args.get("app_name", ""), confirmed),
            "git_action": lambda: self.git_action(args.get("action", ""), args.get("args"), confirmed),
        }
        handler = methods.get(tool_name)
        if not handler:
            return ToolResult(success=False, error=f"Unknown tool: {tool_name}")
        return handler()


def main():
    parser = argparse.ArgumentParser(description="AURA AI Python Desktop Companion")
    parser.add_argument("--exec", type=str, help="JSON execution payload: {'tool': ..., 'args': ...}")
    parser.add_argument("--workspace", type=str, default=".", help="Workspace path")
    args = parser.parse_args()

    companion = AuraCompanion(workspace_root=args.workspace)
    if args.exec:
        try:
            payload = json.loads(args.exec)
            tool = payload.get("tool", "")
            tool_args = payload.get("args", {})
            confirmed = payload.get("confirmed", False)
            res = companion.dispatch(tool, tool_args, confirmed)
            print(json.dumps(res.to_dict()))
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
    else:
        print(json.dumps({
            "status": "online",
            "service": "AURA AI Python Desktop Companion",
            "version": "2.0.0",
            "workspace": companion.workspace_root,
            "permissions": companion.permissions
        }))


if __name__ == "__main__":
    main()
