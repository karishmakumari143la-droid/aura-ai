"""
AURA AI — Automated End-to-End Computer Control Verification Suite
Tests the complete Computer Use Loop:
UNDERSTAND → PLAN → PERMISSION → EXECUTE → OBSERVE → VERIFY → AUDIT

Verifies:
1. Real Playwright Headless Browser Navigation & DOM Extraction
2. Multi-step Interaction with Before/After State Verification
3. Real Screenshot Byte & Dimension Integrity
4. Genuine Screen Vision Analysis & Element Detection
5. Permission Matrix Boundaries (ALLOW, ASK, DENY)
6. Desktop Companion Architecture & Security Sandbox
"""

import os
import sys
import json
import time
import unittest

# Ensure repo root is in python path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from python_brain.brain import AuraBrain
from python_brain.tools.browser import BrowserTool
from python_brain.tools.screen_vision import ScreenVisionTool
from python_brain.tools.app_launcher import AppLauncherTool
from companion.aura_companion import AuraCompanion
from python_brain.security.permissions import PermissionManager, PermissionKey, PermissionState

class TestAuraComputerControlE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workspace = REPO_ROOT
        cls.brain = AuraBrain(workspace_root=cls.workspace)
        cls.companion = AuraCompanion(workspace_root=cls.workspace)
        cls.perm_mgr = PermissionManager()

        # Create a real test HTML page for authentic browser verification
        cls.test_dir = os.path.join(cls.workspace, "created_sites", "active_project")
        os.makedirs(cls.test_dir, exist_ok=True)
        cls.test_html_path = os.path.join(cls.test_dir, "index.html")

        html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AURA Verified Landing Page</title>
    <style>
        body { font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc; }
        .card { background: #1e293b; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto; }
        h1 { color: #38bdf8; margin-top: 0; }
        button { background: #0284c7; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; }
        button:hover { background: #0369a1; }
        .badge { display: none; margin-top: 15px; padding: 10px; background: #059669; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="card">
        <h1 id="title">AURA Autonomous Intelligence</h1>
        <p id="desc">Next-generation computer control and agentic execution system.</p>
        <button id="primary-cta" class="cta" onclick="document.getElementById('result-badge').style.display='block'; document.getElementById('primary-cta').innerText='Action Verified!';">
            Launch Autonomous Action
        </button>
        <div id="result-badge" class="badge">Success: CTA Interaction Completed</div>
    </div>
</body>
</html>"""
        with open(cls.test_html_path, "w", encoding="utf-8") as f:
            f.write(html_content)

    def test_01_runtime_diagnostics_truthful_reporting(self):
        """Validates that status reflects actual runtime without fake claims."""
        status = self.brain.get_system_status()
        capabilities = status["capabilities"]

        self.assertIn("playwright_browser", capabilities)
        self.assertIn("screen_capture_vision", capabilities)
        self.assertIn("desktop_companion", capabilities)

        # Both must be genuine WORKING based on real launch
        self.assertEqual(capabilities["playwright_browser"], "WORKING")
        self.assertEqual(capabilities["screen_capture_vision"], "WORKING")
        self.assertEqual(capabilities["desktop_companion"], "WORKING")

    def test_02_real_browser_navigation_and_inspection(self):
        """Verifies real Playwright navigation, title extraction, and screenshot byte integrity."""
        screenshot_out = os.path.join(self.workspace, "data", "test_e2e_nav.png")
        res = BrowserTool.navigate_and_inspect(self.test_html_path, screenshot_path=screenshot_out)

        self.assertTrue(res["success"], f"Browser navigation failed: {res.get('error')}")
        self.assertEqual(res["title"], "AURA Verified Landing Page")
        self.assertGreaterEqual(len(res["interactive_elements"]), 1)

        # Verify screenshot file exists and has real image dimensions > 0
        self.assertTrue(os.path.exists(screenshot_out))
        self.assertGreater(os.path.getsize(screenshot_out), 1000)
        self.assertEqual(res["screenshot_width"], 1280)
        self.assertEqual(res["screenshot_height"], 800)

    def test_03_real_browser_e2e_interaction_flow_with_evidence(self):
        """Verifies multi-step interaction: before-state → click → after-state verification."""
        screenshot_out = os.path.join(self.workspace, "data", "test_e2e_click.png")
        actions = [
            {"action": "click", "selector": "#primary-cta"}
        ]
        verify = {
            "selector": "#result-badge",
            "expected_text": "CTA Interaction Completed"
        }

        res = BrowserTool.execute_e2e_flow(
            target_url=self.test_html_path,
            actions=actions,
            verify_condition=verify,
            screenshot_path=screenshot_out
        )

        self.assertTrue(res["success"], f"Browser E2E flow failed: {res.get('error')}")
        self.assertEqual(res["total_actions"], 1)
        self.assertEqual(len(res["evidence"]), 1)

        evidence = res["evidence"][0]
        self.assertEqual(evidence["action"], "click")
        self.assertEqual(evidence["target"], "#primary-cta")
        self.assertTrue(evidence["operation"]["success"])
        self.assertTrue(res["verification"]["passed"])
        self.assertIn("CTA Interaction Completed", res["verification"]["actual"])

    def test_04_screen_vision_capture_and_grounded_understanding(self):
        """Verifies ScreenVision pipeline: Capture → Pixels → Analysis → Structured elements."""
        res = ScreenVisionTool.capture_and_understand(
            target=self.test_html_path,
            user_prompt="Detect all interactive buttons and containers",
            confirmed=True
        )

        self.assertTrue(res["success"], f"Screen vision failed: {res.get('error')}")
        self.assertEqual(res["status"], "ANALYZED")
        self.assertGreater(len(res["elements"]), 0)

        first_el = res["elements"][0]
        self.assertIn("type", first_el)
        self.assertIn("bbox", first_el)
        self.assertGreaterEqual(res["confidence"], 0.70)

    def test_05_permission_boundary_enforcement(self):
        """Verifies ALLOW / ASK / DENY states and blocks unauthorized operations."""
        # 1. Test DENY blocks cleanly
        self.perm_mgr.set_permission("test_user_perm", PermissionKey.SCREEN_CAPTURE.value, "deny")
        allowed, msg, state = self.perm_mgr.check_permission("test_user_perm", PermissionKey.SCREEN_CAPTURE.value, interactive_confirm=True)
        self.assertFalse(allowed)
        self.assertEqual(state, "deny")

        # 2. Test ASK without confirmation is blocked
        self.perm_mgr.set_permission("test_user_perm", PermissionKey.TERMINAL_EXECUTION.value, "ask")
        allowed, msg, state = self.perm_mgr.check_permission("test_user_perm", PermissionKey.TERMINAL_EXECUTION.value, interactive_confirm=False)
        self.assertFalse(allowed)
        self.assertEqual(state, "ask")

        # 3. Test ASK with confirmation is granted
        allowed, msg, state = self.perm_mgr.check_permission("test_user_perm", PermissionKey.TERMINAL_EXECUTION.value, interactive_confirm=True)
        self.assertTrue(allowed)

    def test_06_desktop_companion_full_capabilities(self):
        """Verifies Desktop Companion bridge execution of system operations."""
        # Clipboard
        cw = self.companion.clipboard_write("AURA_TEST_TOKEN_XYZ", confirmed=True)
        self.assertTrue(cw.success)
        cr = self.companion.clipboard_read(confirmed=True)
        self.assertTrue(cr.success)
        self.assertEqual(cr.data.get("clipboard_content"), "AURA_TEST_TOKEN_XYZ")

        # App launch with observation
        app_res = self.companion.app_launch("git", confirmed=True)
        self.assertTrue(app_res.success)
        self.assertEqual(app_res.status, "LAUNCHED_AND_OBSERVED")
        self.assertTrue(app_res.data.get("verified"))

        # Terminal execution
        term_res = self.companion.terminal_execute("echo 'COMPANION_ALIVE'", confirmed=True)
        self.assertTrue(term_res.success)
        self.assertIn("COMPANION_ALIVE", term_res.data.get("stdout"))

    def test_07_full_brain_computer_use_loop(self):
        """
        Executes the exact scenario requested by user:
        'Open local landing page in browser, click primary CTA, take screenshot, inspect new state, and report findings.'
        """
        prompt = "Open local landing page in browser, click primary CTA, take screenshot, inspect new state, and report findings."
        turn_result = self.brain.process_turn(
            prompt=prompt,
            user_id="test_admin",
            interactive_confirm=True
        )

        self.assertTrue(turn_result["success"])
        self.assertEqual(turn_result["intent"], "ACTION_REQUEST")
        self.assertTrue(turn_result["execution_performed"])
        self.assertGreaterEqual(len(turn_result["executed_steps"]), 1)

        # Check executed step results
        step_tools = [s.get("tool") for s in turn_result["executed_steps"]]
        self.assertTrue(any("browser" in t or "screen" in t for t in step_tools))

if __name__ == "__main__":
    unittest.main(verbosity=2)
