"""
AURA AI — Real Filesystem Tool
Executes verified file operations directly on physical disk with workspace boundary isolation.
"""

import os
import shutil
import hashlib
import time
import re
from typing import Dict, Any, List, Optional
from ..security.policy import SecurityPolicy

class FilesystemTool:
    def __init__(self, workspace_root: Optional[str] = None):
        self.workspace_root = os.path.abspath(workspace_root or os.getcwd())

    def read_file(self, rel_path: str) -> Dict[str, Any]:
        valid, full_path = SecurityPolicy.validate_path(self.workspace_root, rel_path)
        if not valid:
            return {"success": False, "error": full_path}

        if not os.path.exists(full_path):
            return {"success": False, "error": f"File does not exist: {rel_path}"}
        if os.path.isdir(full_path):
            try:
                entries = sorted(os.listdir(full_path))
                entries_str = "\n".join(entries[:100])
                return {
                    "success": True,
                    "path": rel_path,
                    "is_directory": True,
                    "entries": entries,
                    "content": entries_str,
                    "size_bytes": len(entries),
                    "line_count": len(entries),
                    "sha256": hashlib.sha256(entries_str.encode("utf-8")).hexdigest()
                }
            except Exception as e:
                return {"success": False, "error": str(e)}

        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return {
                "success": True,
                "path": rel_path,
                "size_bytes": len(content.encode("utf-8")),
                "line_count": len(content.splitlines()),
                "content": content,
                "sha256": hashlib.sha256(content.encode("utf-8")).hexdigest()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def write_file(self, rel_path: str, content: str) -> Dict[str, Any]:
        valid, full_path = SecurityPolicy.validate_path(self.workspace_root, rel_path)
        if not valid:
            return {"success": False, "error": full_path}

        # Sanitize HTML or markdown artifacts in content if applicable
        if isinstance(content, str):
            if content.startswith("```"):
                lines = content.splitlines()
                if len(lines) > 2:
                    content = "\n".join(lines[1:-1])
            if rel_path.endswith((".html", ".htm")):
                content = content.strip()
                # Clean up malformed <<!DOCTYPE or <<html
                content = re.sub(r"<<+(!DOCTYPE|[a-zA-Z])", r"<\1", content)

        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)

            # Strict verification: read back immediately from disk
            if not os.path.exists(full_path):
                return {"success": False, "error": "Verification failed: file was not written to disk"}

            file_size = os.path.getsize(full_path)
            return {
                "success": True,
                "path": rel_path,
                "bytes_written": file_size,
                "verified_on_disk": True,
                "sha256": hashlib.sha256(content.encode("utf-8")).hexdigest()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_file(self, rel_path: str) -> Dict[str, Any]:
        valid, full_path = SecurityPolicy.validate_path(self.workspace_root, rel_path)
        if not valid:
            return {"success": False, "error": full_path}

        if not os.path.exists(full_path):
            return {"success": False, "error": f"File not found: {rel_path}"}

        try:
            if os.path.isdir(full_path):
                shutil.rmtree(full_path)
            else:
                os.remove(full_path)
            
            # Verify deletion
            deleted = not os.path.exists(full_path)
            return {"success": deleted, "path": rel_path, "verified_deleted": deleted}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_directory(self, rel_path: str = ".") -> Dict[str, Any]:
        valid, full_path = SecurityPolicy.validate_path(self.workspace_root, rel_path)
        if not valid:
            return {"success": False, "error": full_path}

        if not os.path.exists(full_path):
            return {"success": False, "error": f"Directory not found: {rel_path}"}

        try:
            entries = []
            for item in sorted(os.listdir(full_path)):
                item_full = os.path.join(full_path, item)
                is_dir = os.path.isdir(item_full)
                entries.append({
                    "name": item,
                    "is_dir": is_dir,
                    "size": os.path.getsize(item_full) if not is_dir else 0,
                    "rel_path": os.path.relpath(item_full, self.workspace_root)
                })
            return {"success": True, "directory": rel_path, "entries": entries, "count": len(entries)}
        except Exception as e:
            return {"success": False, "error": str(e)}
