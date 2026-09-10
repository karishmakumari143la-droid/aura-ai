#!/usr/bin/env python3
"""
AURA AI — Python Desktop Companion Daemon & Tool Execution Engine
Provides authorized, permission-gated local computer and workstation control.

Supported capabilities:
- FILES_READ
- FILES_WRITE
- FILES_DELETE
- BROWSER_CONTROL
- TERMINAL_EXECUTION
- APP_LAUNCH
- SCREEN_CAPTURE
- SCREEN_ANALYSIS
- CLIPBOARD_READ
- CLIPBOARD_WRITE
- GIT_ACCESS

Every capability enforces strict ALLOW / ASK / DENY permissions,
captures execution evidence, and audits all workstation actions.
"""

import os
import sys
import json
import subprocess
import time
import argparse
import shutil
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass

DEFAULT_PERMISSIONS: Dict[str, str] = {
    "FILES_READ": "allow",
    "FILES_WRITE": "allow",
    "FILES_DELETE": "ask",
    "TERMINAL_EXECUTION": "ask",
    "BROWSER_CONTROL": "allow",
    "APP_LAUNCH": "ask",
    "SCREEN_CAPTURE": "allow",
    "SCREEN_ANALYSIS": "allow",
    "CLIPBOARD_READ": "ask",
    "CLIPBOARD_WRITE": "allow",
    "GIT_ACCESS": "allow",
}

# In-memory clipboard fallback if system clipboard daemon is unavailable
_COMPANION_CLIPBOARD_BUFFER: str = ""

@dataclass
class ToolResult:
    success: bool
    data: Any = None
    error: Optional[str] = None
    status: str = "COMPLETED"
    permission_state: str = "allow"
    duration_ms: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "status": self.status,
            "data": self.data,
            "error": self.error,
            "permission_state": self.permission_state,
            "duration_ms": self.duration_ms,
        }

class AuraCompanion:
    def __init__(
        self,
        workspace_root: Optional[str] = None,
        permissions: Optional[Dict[str, str]] = None,
        audit_log_path: Optional[str] = None
    ):
        self.workspace_root = os.path.abspath(workspace_root or os.getcwd())
        self.permissions = dict(DEFAULT_PERMISSIONS)
        if permissions:
            self.permissions.update(permissions)
        self.audit_log_path = audit_log_path or os.path.join(self.workspace_root, "data", "companion_audit.jsonl")
        os.makedirs(os.path.dirname(self.audit_log_path), exist_ok=True)

    def check_permission(self, perm_key: str, interactive_confirm: bool = False) -> Tuple[bool, str, str]:
        # Handle synonyms
        key = perm_key
        if perm_key == "TERMINAL_EXECUTE":
            key = "TERMINAL_EXECUTION"
        elif perm_key == "CLIPBOARD":
            key = "CLIPBOARD_WRITE" if interactive_confirm else "CLIPBOARD_READ"

        state = self.permissions.get(key, "ask").lower()
        if state == "deny":
            return False, f"Capability {key} is blocked by security policy (DENY).", "deny"
        if state == "allow":
            return True, "Operation granted by security policy.", "allow"
        # state is 'ask'
        if interactive_confirm:
            return True, f"Operation authorized by interactive confirmation ({key}).", "ask"
        return False, f"Capability {key} requires explicit authorization (state: ASK).", "ask"

    def set_permission(self, perm_key: str, state: str) -> None:
        key = "TERMINAL_EXECUTION" if perm_key == "TERMINAL_EXECUTE" else perm_key
        if state.lower() in ("allow", "ask", "deny"):
            self.permissions[key] = state.lower()

    def _audit_log(self, tool: str, args: Dict[str, Any], result: ToolResult) -> None:
        entry = {
            "timestamp": time.time(),
            "tool": tool,
            "args": args,
            "success": result.success,
            "status": result.status,
            "permission_state": result.permission_state,
            "duration_ms": result.duration_ms,
            "error": result.error
        }
        try:
            with open(self.audit_log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception:
            pass

    # ==================== FILESYSTEM ====================
    def filesystem_read(self, rel_path: str, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg, state = self.check_permission("FILES_READ", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        full_path = os.path.abspath(os.path.join(self.workspace_root, rel_path))
        if not full_path.startswith(self.workspace_root):
            return ToolResult(success=False, status="ACCESS_DENIED", error="Access denied: Path traverses outside workspace root.")

        if not os.path.exists(full_path):
            return ToolResult(success=False, status="NOT_FOUND", error=f"File not found: {rel_path}")

        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return ToolResult(
                success=True,
                status="COMPLETED",
                data={"path": rel_path, "content": content, "size": len(content)},
                duration_ms=int((time.time() - start) * 1000)
            )
        except Exception as e:
            return ToolResult(success=False, status="READ_ERROR", error=str(e), duration_ms=int((time.time() - start) * 1000))

    def filesystem_write(self, rel_path: str, content: str, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg, state = self.check_permission("FILES_WRITE", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        full_path = os.path.abspath(os.path.join(self.workspace_root, rel_path))
        if not full_path.startswith(self.workspace_root):
            return ToolResult(success=False, status="ACCESS_DENIED", error="Access denied: Path traverses outside workspace root.")

        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
            return ToolResult(
                success=True,
                status="COMPLETED",
                data={"path": rel_path, "bytes_written": len(content.encode("utf-8"))},
                duration_ms=int((time.time() - start) * 1000)
            )
        except Exception as e:
            return ToolResult(success=False, status="WRITE_ERROR", error=str(e), duration_ms=int((time.time() - start) * 1000))

    def filesystem_delete(self, rel_path: str, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg, state = self.check_permission("FILES_DELETE", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        full_path = os.path.abspath(os.path.join(self.workspace_root, rel_path))
        if not full_path.startswith(self.workspace_root) or full_path == self.workspace_root:
            return ToolResult(success=False, status="ACCESS_DENIED", error="Access denied: Cannot delete workspace root or external paths.")

        if not os.path.exists(full_path):
            return ToolResult(success=False, status="NOT_FOUND", error=f"Target path does not exist: {rel_path}")

        try:
            if os.path.isdir(full_path):
                shutil.rmtree(full_path)
            else:
                os.remove(full_path)
            return ToolResult(
                success=True,
                status="COMPLETED",
                data={"path": rel_path, "deleted": True},
                duration_ms=int((time.time() - start) * 1000)
            )
        except Exception as e:
            return ToolResult(success=False, status="DELETE_ERROR", error=str(e), duration_ms=int((time.time() - start) * 1000))

    def filesystem_list(self, rel_path: str = ".", confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg, state = self.check_permission("FILES_READ", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        full_path = os.path.abspath(os.path.join(self.workspace_root, rel_path))
        if not os.path.exists(full_path):
            return ToolResult(success=False, status="NOT_FOUND", error=f"Directory not found: {rel_path}")

        try:
            entries = []
            for item in sorted(os.listdir(full_path)):
                item_full = os.path.join(full_path, item)
                entries.append({
                    "name": item,
                    "is_dir": os.path.isdir(item_full),
                    "size": os.path.getsize(item_full) if not os.path.isdir(item_full) else 0
                })
            return ToolResult(
                success=True,
                status="COMPLETED",
                data={"dir": rel_path, "entries": entries},
                duration_ms=int((time.time() - start) * 1000)
            )
        except Exception as e:
            return ToolResult(success=False, status="LIST_ERROR", error=str(e), duration_ms=int((time.time() - start) * 1000))

    # ==================== TERMINAL EXECUTION ====================
    def terminal_execute(self, command: str, cwd: Optional[str] = None, timeout: int = 15, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg, state = self.check_permission("TERMINAL_EXECUTION", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        # Destructive command safety guard
        low = command.lower()
        if any(bad in low for bad in ["rm -rf /", "mkfs", "dd if=", ":(){:|", "shutdown", "reboot"]):
            return ToolResult(
                success=False,
                status="SECURITY_BLOCKED",
                error="Security violation: Command matched dangerous destructive blacklist."
            )

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
                status="COMPLETED" if proc.returncode == 0 else "EXECUTION_FAILED",
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
            return ToolResult(
                success=False,
                status="TIMEOUT",
                error=f"Command timed out after {timeout} seconds.",
                duration_ms=int((time.time() - start) * 1000)
            )
        except Exception as e:
            return ToolResult(
                success=False,
                status="SYSTEM_ERROR",
                error=str(e),
                duration_ms=int((time.time() - start) * 1000)
            )

    # ==================== BROWSER CONTROL ====================
    def browser_control(self, action: str, params: Optional[Dict[str, Any]] = None, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg, state = self.check_permission("BROWSER_CONTROL", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        params = params or {}
        try:
            from python_brain.tools.browser import BrowserTool
            target = params.get("url") or params.get("target") or "about:blank"

            if action in ("navigate", "inspect", "open"):
                res = BrowserTool.navigate_and_inspect(target, screenshot_path=params.get("screenshot_path"))
                return ToolResult(
                    success=res.get("success", False),
                    status="COMPLETED" if res.get("success") else "FAILED",
                    data=res,
                    error=res.get("error"),
                    duration_ms=int((time.time() - start) * 1000)
                )
            elif action == "e2e_flow":
                res = BrowserTool.execute_e2e_flow(
                    target_url=target,
                    actions=params.get("actions", []),
                    verify_condition=params.get("verify_condition"),
                    screenshot_path=params.get("screenshot_path")
                )
                return ToolResult(
                    success=res.get("success", False),
                    status="COMPLETED" if res.get("success") else "FAILED",
                    data=res,
                    error=res.get("error"),
                    duration_ms=int((time.time() - start) * 1000)
                )
            else:
                return ToolResult(success=False, status="UNSUPPORTED_ACTION", error=f"Unsupported browser action: {action}")
        except Exception as e:
            return ToolResult(success=False, status="BROWSER_ERROR", error=str(e), duration_ms=int((time.time() - start) * 1000))

    # ==================== APPLICATION LAUNCH WITH OBSERVATION ====================
    def app_launch(self, app_name: str, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg, state = self.check_permission("APP_LAUNCH", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        allowed_apps = {
            "code": "code",
            "vscode": "code",
            "terminal": "bash" if sys.platform.startswith("linux") else "open -a Terminal",
            "git": "git --version",
            "python": "python3 --version",
            "node": "node --version"
        }
        cmd = allowed_apps.get(app_name.lower().strip())
        if not cmd:
            return ToolResult(
                success=False,
                status="UNAUTHORIZED_APP",
                error=f"Application '{app_name}' is not in the authorized companion whitelist. Allowed: {list(allowed_apps.keys())}"
            )

        try:
            # Launch with process handle to observe lifecycle
            proc = subprocess.Popen(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            # Brief observation window to verify process status
            time.sleep(0.15)
            poll_res = proc.poll()
            is_running = (poll_res is None)

            stdout_sample = ""
            stderr_sample = ""
            if not is_running:
                out, err = proc.communicate(timeout=1)
                stdout_sample = out.strip()
                stderr_sample = err.strip()

            observation = {
                "app": app_name,
                "command": cmd,
                "pid": proc.pid,
                "process_running": is_running,
                "exit_code": poll_res,
                "observed_stdout": stdout_sample,
                "observed_stderr": stderr_sample,
                "verified": (is_running or poll_res == 0)
            }

            return ToolResult(
                success=True,
                status="LAUNCHED_AND_OBSERVED",
                data=observation,
                duration_ms=int((time.time() - start) * 1000)
            )
        except Exception as e:
            return ToolResult(success=False, status="LAUNCH_FAILED", error=str(e), duration_ms=int((time.time() - start) * 1000))

    # ==================== SCREEN VISION & CAPTURE ====================
    def screen_capture(self, target: str, output_path: Optional[str] = None, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg, state = self.check_permission("SCREEN_CAPTURE", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        from python_brain.tools.screen_vision import ScreenVisionTool
        res = ScreenVisionTool.capture_screen(
            target=target,
            output_path=output_path,
            confirmed=confirmed
        )
        return ToolResult(
            success=res.get("success", False),
            status=res.get("status", "COMPLETED" if res.get("success") else "FAILED"),
            data=res,
            error=res.get("error"),
            duration_ms=int((time.time() - start) * 1000)
        )

    def screen_analysis(self, screenshot_path_or_b64: str, prompt: str = "Analyze screen", confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg, state = self.check_permission("SCREEN_ANALYSIS", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        from python_brain.tools.screen_vision import ScreenVisionTool
        res = ScreenVisionTool.analyze_screen(
            screenshot_path_or_b64=screenshot_path_or_b64,
            user_prompt=prompt,
            confirmed=confirmed
        )
        return ToolResult(
            success=res.get("success", False),
            status=res.get("status", "COMPLETED" if res.get("success") else "FAILED"),
            data=res,
            error=res.get("error"),
            duration_ms=int((time.time() - start) * 1000)
        )

    # ==================== CLIPBOARD OPERATIONS ====================
    def clipboard_read(self, confirmed: bool = False) -> ToolResult:
        global _COMPANION_CLIPBOARD_BUFFER
        start = time.time()
        allowed, msg, state = self.check_permission("CLIPBOARD_READ", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        text = _COMPANION_CLIPBOARD_BUFFER
        try:
            import pyperclip
            text = pyperclip.paste()
        except Exception:
            pass

        return ToolResult(
            success=True,
            status="COMPLETED",
            data={"clipboard_content": text, "length": len(text)},
            duration_ms=int((time.time() - start) * 1000)
        )

    def clipboard_write(self, text: str, confirmed: bool = False) -> ToolResult:
        global _COMPANION_CLIPBOARD_BUFFER
        start = time.time()
        allowed, msg, state = self.check_permission("CLIPBOARD_WRITE", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        _COMPANION_CLIPBOARD_BUFFER = text
        try:
            import pyperclip
            pyperclip.copy(text)
        except Exception:
            pass

        return ToolResult(
            success=True,
            status="COMPLETED",
            data={"bytes_written": len(text), "success": True},
            duration_ms=int((time.time() - start) * 1000)
        )

    # ==================== GIT INTEGRATION ====================
    def git_action(self, action: str, args: Optional[list] = None, confirmed: bool = False) -> ToolResult:
        start = time.time()
        allowed, msg, state = self.check_permission("GIT_ACCESS", confirmed)
        if not allowed:
            status = "BLOCKED_PERMISSION" if state == "deny" else "WAITING_FOR_AUTHORIZATION"
            return ToolResult(success=False, status=status, error=msg, permission_state=state)

        cmd_map = {
            "status": "git status --porcelain",
            "branch": "git branch --show-current",
            "log": "git log -n 5 --oneline",
            "diff": "git diff --stat"
        }
        cmd = cmd_map.get(action.lower())
        if not cmd:
            return ToolResult(success=False, status="UNSUPPORTED_ACTION", error=f"Unsupported Git action: {action}. Allowed: status, branch, log, diff")

        return self.terminal_execute(cmd, cwd=self.workspace_root, timeout=10, confirmed=True)

    # ==================== DISPATCHER ====================
    def dispatch(self, tool_name: str, args: Dict[str, Any], confirmed: bool = False) -> ToolResult:
        handlers = {
            "filesystem_read": lambda: self.filesystem_read(args.get("path", ""), confirmed),
            "filesystem_write": lambda: self.filesystem_write(args.get("path", ""), args.get("content", ""), confirmed),
            "filesystem_delete": lambda: self.filesystem_delete(args.get("path", ""), confirmed),
            "filesystem_list": lambda: self.filesystem_list(args.get("path", "."), confirmed),
            "terminal_execute": lambda: self.terminal_execute(args.get("command", ""), args.get("cwd"), args.get("timeout", 15), confirmed),
            "browser_control": lambda: self.browser_control(args.get("action", "navigate"), args, confirmed),
            "browser_open": lambda: self.browser_control("navigate", {"url": args.get("url")}, confirmed),
            "app_launch": lambda: self.app_launch(args.get("app_name", ""), confirmed),
            "screen_capture": lambda: self.screen_capture(args.get("target", ""), args.get("output_path"), confirmed),
            "screen_analysis": lambda: self.screen_analysis(args.get("screenshot_path", ""), args.get("prompt", "Analyze"), confirmed),
            "clipboard_read": lambda: self.clipboard_read(confirmed),
            "clipboard_write": lambda: self.clipboard_write(args.get("text", ""), confirmed),
            "git_action": lambda: self.git_action(args.get("action", ""), args.get("args"), confirmed),
        }
        handler = handlers.get(tool_name)
        if not handler:
            res = ToolResult(success=False, status="UNKNOWN_TOOL", error=f"Unknown companion capability: {tool_name}")
        else:
            res = handler()

        self._audit_log(tool_name, args, res)
        return res

def main():
    parser = argparse.ArgumentParser(description="AURA AI Python Desktop Companion")
    parser.add_argument("--exec", type=str, help="JSON execution payload: {'tool': ..., 'args': ...}")
    parser.add_argument("--b64", type=str, help="Base64 encoded JSON execution payload")
    parser.add_argument("--workspace", type=str, default=".", help="Workspace path")
    args = parser.parse_args()

    companion = AuraCompanion(workspace_root=args.workspace)
    payload_str = None
    if args.b64:
        import base64
        payload_str = base64.b64decode(args.b64).decode("utf-8")
    elif args.exec:
        payload_str = args.exec

    if payload_str:
        try:
            payload = json.loads(payload_str)
            tool = payload.get("tool", "")
            tool_args = payload.get("args", {})
            confirmed = payload.get("confirmed", False)
            res = companion.dispatch(tool, tool_args, confirmed)
            print(json.dumps(res.to_dict()))
        except Exception as e:
            print(json.dumps({"success": False, "status": "ERROR", "error": str(e)}))
    else:
        print(json.dumps({
            "status": "online",
            "service": "AURA AI Python Desktop Companion",
            "version": "3.0.0",
            "workspace": companion.workspace_root,
            "permissions": companion.permissions
        }))

if __name__ == "__main__":
    main()
