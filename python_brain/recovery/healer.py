"""
AURA AI — Error Recovery & Self-Healing Engine
Diagnoses failures, applies targeted corrections, and verifies recovery.
Max 3 attempts to prevent infinite loops.
"""

import os
import re
from typing import Dict, Any, Callable, Optional

class ErrorHealer:
    @staticmethod
    def heal_website_html(content: str, defects: list) -> str:
        healed = content
        # Clean up accidental double brackets
        healed = re.sub(r"<<+(!DOCTYPE|[a-zA-Z])", r"<\1", healed)

        # Scaffolding: if no <html> or <body>, wrap whole body
        if not re.search(r"<body[^>]*>", healed, re.I):
            healed = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AURA Verified Web Application</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900 min-h-screen p-8">
  <h1 class="text-3xl font-bold tracking-tight text-gray-900 mb-4">AURA Generated Project</h1>
  {healed}
  <div class="mt-6">
    <a href="#action" class="inline-flex px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Get Started</a>
  </div>
</body>
</html>"""
            return healed

        # Fix 1: Missing doctype
        if any("DOCTYPE" in d for d in defects) and not re.search(r"<!DOCTYPE\s+html>", healed, re.I):
            healed = "<!DOCTYPE html>\n" + healed

        # Fix 2: Missing viewport
        if any("viewport" in d for d in defects) and not re.search(r'<meta[^>]+name=["\']viewport["\']', healed, re.I):
            viewport_tag = '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
            if "<head>" in healed:
                healed = healed.replace("<head>", f"<head>\n{viewport_tag}", 1)
            else:
                healed = f"<head>\n{viewport_tag}</head>\n" + healed

        # Fix 3: Missing title
        if any("title" in d for d in defects) and not re.search(r"<title>.*?</title>", healed, re.I):
            title_tag = "  <title>AURA Verified Web Application</title>\n"
            if "<head>" in healed:
                healed = healed.replace("<head>", f"<head>\n{title_tag}", 1)

        # Fix 4: Missing styles / Tailwind
        if any("stylesheet" in d or "Tailwind" in d for d in defects):
            tailwind_script = '  <script src="https://cdn.tailwindcss.com"></script>\n'
            if "<head>" in healed:
                healed = healed.replace("</head>", f"{tailwind_script}</head>", 1)

        # Fix 5: Missing H1
        if any("h1" in d for d in defects) and not re.search(r"<h1[^>]*>", healed, re.I):
            h1_tag = '<h1 class="text-3xl font-bold tracking-tight text-gray-900 mb-4">AURA Generated Project</h1>\n'
            if "<body>" in healed:
                healed = healed.replace("<body>", f"<body>\n  {h1_tag}", 1)

        # Fix 6: Missing CTA
        if any("call-to-action" in d or "interactive" in d for d in defects) and not re.search(r"<(button|a)[^>]*>", healed, re.I):
            cta = '<div class="mt-6"><a href="#action" class="inline-flex px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Get Started</a></div>\n'
            if "</body>" in healed:
                healed = healed.replace("</body>", f"  {cta}</body>", 1)

        return healed

    @staticmethod
    def auto_fix_and_reverify(
        file_path: str,
        defects: list,
        reverify_fn: Callable[[str], Dict[str, Any]],
        max_attempts: int = 3
    ) -> Dict[str, Any]:
        for attempt in range(1, max_attempts + 1):
            if not os.path.exists(file_path):
                return {"recovered": False, "attempts": attempt, "error": f"File {file_path} not found"}

            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            healed_content = ErrorHealer.heal_website_html(content, defects)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(healed_content)

            # Re-verify
            audit = reverify_fn(file_path)
            if audit.get("passed"):
                return {
                    "recovered": True,
                    "attempts": attempt,
                    "final_score": audit.get("score"),
                    "defects_resolved": defects
                }
            defects = audit.get("defects", [])

        return {"recovered": False, "attempts": max_attempts, "remaining_defects": defects}
