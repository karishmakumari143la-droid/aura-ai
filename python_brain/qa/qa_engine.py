"""
AURA AI — Automated Quality Assurance Engine
Performs deterministic inspection of generated websites, code, and interfaces.
"""

import os
import re
import ast
from typing import Dict, Any, List

class QAEngine:
    @staticmethod
    def audit_website_file(file_path: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            return {
                "passed": False,
                "score": 0,
                "error": f"File does not exist: {file_path}",
                "defects": ["File not found on disk"]
            }

        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        # If this is an SPA root mounting an external module, inspect root component as well
        is_spa_mount = bool(re.search(r'id=["\']root["\']|id=["\']app["\']', content, re.IGNORECASE)) and bool(re.search(r'<script[^>]+type=["\']module["\']', content, re.IGNORECASE))
        if is_spa_mount:
            dir_path = os.path.dirname(file_path)
            jsx_candidates = [
                os.path.join(dir_path, "src", "App.jsx"),
                os.path.join(dir_path, "src", "App.tsx"),
                os.path.join(dir_path, "src", "App.js"),
                os.path.join(dir_path, "App.jsx")
            ]
            for cand in jsx_candidates:
                if os.path.exists(cand):
                    try:
                        with open(cand, "r", encoding="utf-8", errors="replace") as f_jsx:
                            content += "\n" + f_jsx.read()
                    except Exception:
                        pass
                    break

        score = 100
        defects = []
        checks = {}

        # 1. DOCTYPE check
        has_doctype = bool(re.search(r"<!DOCTYPE\s+html>", content, re.IGNORECASE))
        checks["doctype"] = has_doctype
        if not has_doctype:
            score -= 15
            defects.append("Missing standard <!DOCTYPE html> declaration")

        # 2. Viewport meta check
        has_viewport = bool(re.search(r'<meta[^>]+name=["\']viewport["\'][^>]*>', content, re.IGNORECASE))
        checks["viewport"] = has_viewport
        if not has_viewport:
            score -= 20
            defects.append("Missing mobile responsive viewport meta tag")

        # 3. Title check
        title_match = re.search(r"<title>(.*?)</title>", content, re.IGNORECASE)
        has_title = bool(title_match and len(title_match.group(1).strip()) > 0)
        checks["title"] = has_title
        if not has_title:
            score -= 10
            defects.append("Missing or empty <title> tag")

        # 4. Heading hierarchy
        has_h1 = bool(re.search(r"<h1[^>]*>.*?</h1>", content, re.IGNORECASE | re.DOTALL))
        checks["heading_h1"] = has_h1
        if not has_h1:
            score -= 15
            defects.append("Missing primary <h1> heading element")

        # 5. Interactive call to action (button or link)
        has_cta = bool(re.search(r"<(button|a)[^>]*>.*?</(button|a)>", content, re.IGNORECASE | re.DOTALL))
        checks["cta_elements"] = has_cta
        if not has_cta:
            score -= 15
            defects.append("No call-to-action buttons or clickable interactive links found")

        # 6. Styling check
        has_style = bool(
            re.search(r'<link[^>]+rel=["\']stylesheet["\']', content, re.IGNORECASE) or
            re.search(r"<style", content, re.IGNORECASE) or
            "tailwindcss" in content or
            "cdn.jsdelivr" in content
        )
        checks["styling"] = has_style
        if not has_style:
            score -= 15
            defects.append("No stylesheet, CSS framework, or Tailwind CDN integrated")

        score = max(0, min(100, score))
        return {
            "passed": (score >= 80 and len(defects) == 0),
            "score": score,
            "checks": checks,
            "defects": defects,
            "file_path": file_path,
            "size_bytes": len(content)
        }

    @staticmethod
    def audit_python_code(code_str: str) -> Dict[str, Any]:
        try:
            tree = ast.parse(code_str)
            functions = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
            classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
            return {
                "passed": True,
                "score": 100,
                "syntax_valid": True,
                "functions": functions,
                "classes": classes,
                "defects": []
            }
        except SyntaxError as e:
            return {
                "passed": False,
                "score": 0,
                "syntax_valid": False,
                "defects": [f"SyntaxError at line {e.lineno}: {e.msg}"]
            }
