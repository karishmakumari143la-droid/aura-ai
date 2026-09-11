"""
AURA AI — Comprehensive Python Brain Verification Test Suite
Tests real execution, security policies, intent separation, and self-healing.
"""

import os
import sys
import unittest
import tempfile
import shutil

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from python_brain.intent import IntentAnalyzer, IntentType, DetectedLanguage
from python_brain.security.permissions import PermissionManager, PermissionKey, PermissionState
from python_brain.security.policy import SecurityPolicy
from python_brain.security.audit import AuditLogger
from python_brain.memory import PersistentMemory
from python_brain.tools.filesystem import FilesystemTool
from python_brain.tools.terminal import TerminalTool
from python_brain.tools.code_runner import CodeRunnerTool
from python_brain.qa.qa_engine import QAEngine
from python_brain.recovery.healer import ErrorHealer
from python_brain.runtime.idempotency import IdempotencyEngine
from python_brain.brain import AuraBrain
from python_brain.aura_reasoning import AuraReasoning

class TestAuraBrain(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="aura_test_")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    # 1. INTENT SEPARATION TESTS
    def test_greeting_intent_does_not_require_execution(self):
        prompts = [
            ("Hello there!", IntentType.CONVERSATION),
            ("Namaste AURA kaise ho?", IntentType.CONVERSATION),
            ("kya chal raha hai", IntentType.CONVERSATION),
            ("Good morning", IntentType.CONVERSATION),
            ("who are you?", IntentType.CONVERSATION),
            ("shukriya", IntentType.CONVERSATION),
        ]
        for text, expected in prompts:
            res = IntentAnalyzer.analyze_intent(text)
            self.assertEqual(res["intent"], expected, f"Failed for: {text}")
            self.assertFalse(res["requires_execution"], f"Greetings must not require execution: {text}")

    def test_question_intent_does_not_require_execution(self):
        questions = [
            "What is Python and why is it used?",
            "Explain how REST API works",
            "kya hota hai Docker?",
            "How does React work?",
        ]
        for q in questions:
            res = IntentAnalyzer.analyze_intent(q)
            self.assertEqual(res["intent"], IntentType.QUESTION_EXPLANATION, f"Failed for: {q}")
            self.assertFalse(res["requires_execution"], f"Questions must not create tasks: {q}")

    def test_action_intent_requires_execution(self):
        actions = [
            "create a gym website with dark theme",
            "run tests on this repository",
            "make a portfolio website with contact form",
            "git status and show modified files",
        ]
        for act in actions:
            res = IntentAnalyzer.analyze_intent(act)
            self.assertEqual(res["intent"], IntentType.ACTION_REQUEST, f"Failed for: {act}")
            self.assertTrue(res["requires_execution"], f"Actions must trigger execution: {act}")

    # 2. SECURITY POLICY TESTS
    def test_security_blacklist_blocks_destructive_commands(self):
        blocked_commands = [
            "rm -rf /",
            "rm -rf /etc",
            ":(){ :|:& };:",
            "mkfs.ext4 /dev/sda1",
            "dd if=/dev/zero of=/dev/sda",
        ]
        for cmd in blocked_commands:
            valid, err = SecurityPolicy.validate_command(cmd)
            self.assertFalse(valid, f"Command should have been blocked: {cmd}")
            self.assertIn("Security Violation", err)

    def test_secret_redaction(self):
        raw = "My api_key='sk-1234567890abcdef1234567890abcdef' and token: ghp_1234567890abcdefghijklmnopqrstuv"
        clean = SecurityPolicy.redact_secrets(raw)
        self.assertNotIn("sk-1234567890abcdef", clean)
        self.assertNotIn("ghp_1234567890", clean)

    # 3. PERMISSIONS ENGINE TESTS
    def test_permission_matrix_enforcement(self):
        db_path = os.path.join(self.test_dir, "perm.db")
        pm = PermissionManager(db_path=db_path)
        user = "test_user"

        # Check default state
        perms = pm.get_permissions(user)
        self.assertIn(PermissionKey.FILES_WRITE.value, perms)

        # Update to DENY
        pm.set_permission(user, PermissionKey.TERMINAL_EXECUTION.value, PermissionState.DENY.value)
        allowed, msg, state = pm.check_permission(user, PermissionKey.TERMINAL_EXECUTION.value)
        self.assertFalse(allowed)
        self.assertEqual(state, "deny")

        # Update to ASK and verify confirmation behavior
        pm.set_permission(user, PermissionKey.TERMINAL_EXECUTION.value, PermissionState.ASK.value)
        allowed_without_conf, _, _ = pm.check_permission(user, PermissionKey.TERMINAL_EXECUTION.value, interactive_confirm=False)
        self.assertFalse(allowed_without_conf)
        allowed_with_conf, _, _ = pm.check_permission(user, PermissionKey.TERMINAL_EXECUTION.value, interactive_confirm=True)
        self.assertTrue(allowed_with_conf)

    # 4. FILESYSTEM & VERIFICATION TESTS
    def test_filesystem_read_write_verify(self):
        fs = FilesystemTool(self.test_dir)
        test_file = "sub/test.txt"
        test_content = "Real content verified on physical disk."

        # Write file
        w_res = fs.write_file(test_file, test_content)
        self.assertTrue(w_res["success"])
        self.assertTrue(w_res["verified_on_disk"])

        # Read back
        r_res = fs.read_file(test_file)
        self.assertTrue(r_res["success"])
        self.assertEqual(r_res["content"], test_content)
        self.assertEqual(r_res["sha256"], w_res["sha256"])

    # 5. TERMINAL EXECUTION TESTS
    def test_terminal_real_execution(self):
        term = TerminalTool(self.test_dir)
        res = term.execute_command("echo 'AURA PYTHON REAL EXECUTION'")
        self.assertTrue(res["success"])
        self.assertEqual(res["exit_code"], 0)
        self.assertIn("AURA PYTHON REAL EXECUTION", res["stdout"])

    # 6. CODE RUNNER TESTS
    def test_code_runner_syntax_and_execution(self):
        runner = CodeRunnerTool()
        # Syntax error detection
        bad_code = "def broken(:"
        syntax = runner.check_syntax(bad_code)
        self.assertFalse(syntax["valid"])

        # Real Python execution
        good_code = "print(sum([10, 20, 30]))"
        run_res = runner.run_python_code(good_code)
        self.assertTrue(run_res["success"])
        self.assertEqual(run_res["stdout"].strip(), "60")

    # 7. QA ENGINE & SELF-HEALING TESTS
    def test_qa_and_self_healing(self):
        sample_file = os.path.join(self.test_dir, "bad_site.html")
        # Defective HTML missing DOCTYPE, viewport, title, Tailwind, CTA
        with open(sample_file, "w") as f:
            f.write("<div>Just a plain div with no metadata</div>")

        audit = QAEngine.audit_website_file(sample_file)
        self.assertFalse(audit["passed"])
        self.assertGreater(len(audit["defects"]), 0)

        # Apply healing
        healing = ErrorHealer.auto_fix_and_reverify(sample_file, audit["defects"], QAEngine.audit_website_file)
        self.assertTrue(healing["recovered"], "Healing should resolve defects")

        # Verify healed file
        healed_audit = QAEngine.audit_website_file(sample_file)
        self.assertTrue(healed_audit["passed"])
        self.assertGreaterEqual(healed_audit["score"], 80)

    # 8. FULL COGNITIVE TURN INTEGRATION TEST
    def test_cognitive_turn_greetings_vs_actions(self):
        brain = AuraBrain(workspace_root=self.test_dir)

        # A: Conversation turn
        chat_turn = brain.process_turn("Namaste AURA kaise ho?", user_id="tester")
        self.assertTrue(chat_turn["success"])
        self.assertEqual(chat_turn["intent"], "CONVERSATION")
        self.assertEqual(chat_turn["tasks_created"], 0)
        self.assertFalse(chat_turn["execution_performed"])
        self.assertIn("response", chat_turn)

        # B: Action turn
        action_turn = brain.process_turn("create a portfolio website", user_id="tester", interactive_confirm=True)
        self.assertTrue(action_turn["success"])
        self.assertEqual(action_turn["intent"], "ACTION_REQUEST")
        self.assertGreater(action_turn["tasks_created"], 0)
        self.assertTrue(action_turn["execution_performed"])
        self.assertGreater(len(action_turn["files_created"]), 0)

    # 9. AURA LOCAL REASONING ENGINE TESTS (A through E)

    def test_a_local_reasoning_initialization(self):
        """A. Local reasoning engine initializes without external providers."""
        reasoner = AuraReasoning()
        self.assertEqual(reasoner.engine, "AURA_LOCAL_REASONING")
        self.assertEqual(reasoner.version, "1.0.0")
        self.assertTrue(hasattr(reasoner, "reason"))
        self.assertTrue(hasattr(reasoner, "get_diagnostics"))

        diagnostics = reasoner.get_diagnostics()
        self.assertEqual(diagnostics["engine"], "AURA_LOCAL_REASONING")
        self.assertFalse(diagnostics["external_provider"])
        self.assertFalse(diagnostics["api_key_required"])

    def test_b_local_conversation_reasoning(self):
        """B. Local reasoning handles conversation without an API."""
        reasoner = AuraReasoning()
        result = reasoner.reason("Hello AURA, kaise ho?")

        self.assertEqual(result["intent"], "CONVERSATION")
        self.assertEqual(result["conversation_or_action"], "conversation")
        self.assertEqual(result["plan"], [])
        self.assertEqual(result["tools"], [])
        self.assertIn("response", result)

    def test_c_local_question_reasoning(self):
        """C. Local reasoning handles explanatory questions."""
        reasoner = AuraReasoning()
        result = reasoner.reason("What is Python?")

        self.assertEqual(result["intent"], "QUESTION")
        self.assertEqual(result["conversation_or_action"], "conversation")
        self.assertEqual(result["plan"], [])
        self.assertEqual(result["tools"], [])
        self.assertIn("response", result)

    def test_d_local_action_reasoning(self):
        """D. Local reasoning creates deterministic plans for real work."""
        reasoner = AuraReasoning()
        result = reasoner.reason("create a gym website with dark theme")

        self.assertEqual(result["intent"], "ACTION_REQUEST")
        self.assertEqual(result["conversation_or_action"], "action")
        self.assertGreater(len(result["plan"]), 0)
        self.assertIn("filesystem_write", result["tools"])
        self.assertIn("qa_verify_site", result["tools"])

    def test_e_local_reasoning_schema(self):
        """E. Local reasoning returns the complete cognitive schema."""
        reasoner = AuraReasoning()
        result = reasoner.reason("create a portfolio website")

        required_fields = [
            "intent",
            "language",
            "goal",
            "conversation_or_action",
            "clarification",
            "plan",
            "tools",
            "response",
        ]

        for field in required_fields:
            self.assertIn(field, result, f"Missing reasoning field: {field}")

        self.assertIn(
            result["intent"],
            ["CONVERSATION", "QUESTION", "ACTION_REQUEST", "CLARIFICATION"],
        )
        self.assertIn(
            result["language"],
            ["english", "hindi", "hinglish"],
        )
        self.assertIn(
            result["conversation_or_action"],
            ["conversation", "action"],
        )

    def test_f_greeting_distinction(self):
        """F. Greeting: Hello AURA, kaise ho? -> CONVERSATION, 0 tasks, 0 tools"""
        brain = AuraBrain(workspace_root=self.test_dir)
        turn = brain.process_turn("Hello AURA, kaise ho?", user_id="tester")
        self.assertTrue(turn["success"])
        self.assertEqual(turn["intent"], "CONVERSATION")
        self.assertEqual(turn["conversation_or_action"], "conversation")
        self.assertEqual(turn["tasks_created"], 0)
        self.assertFalse(turn["execution_performed"])
        self.assertEqual(turn["plan"], [])
        self.assertEqual(turn["tools"], [])

    def test_g_question_distinction(self):
        """G. Question: What is SEO? -> QUESTION, 0 tasks, 0 tools"""
        brain = AuraBrain(workspace_root=self.test_dir)
        turn = brain.process_turn("What is SEO?", user_id="tester")
        self.assertTrue(turn["success"])
        self.assertEqual(turn["intent"], "QUESTION")
        self.assertEqual(turn["conversation_or_action"], "conversation")
        self.assertEqual(turn["tasks_created"], 0)
        self.assertFalse(turn["execution_performed"])
        self.assertEqual(turn["plan"], [])
        self.assertEqual(turn["tools"], [])
        self.assertIn("response", turn)
        self.assertGreater(len(turn["response"]), 20)

    def test_h_hindi_language(self):
        """H. Hindi conversation: Namaste AURA, Hindi mein baat karo."""
        brain = AuraBrain(workspace_root=self.test_dir)
        turn = brain.process_turn("Namaste AURA, Hindi mein baat karo.", user_id="tester")
        self.assertTrue(turn["success"])
        self.assertEqual(turn["intent"], "CONVERSATION")
        self.assertEqual(turn["conversation_or_action"], "conversation")
        self.assertEqual(turn["tasks_created"], 0)
        self.assertFalse(turn["execution_performed"])

    def test_i_hinglish_language(self):
        """I. Hinglish conversation: Kya haal hai AURA, sab theek?"""
        brain = AuraBrain(workspace_root=self.test_dir)
        turn = brain.process_turn("Kya haal hai AURA, sab theek?", user_id="tester")
        self.assertTrue(turn["success"])
        self.assertEqual(turn["intent"], "CONVERSATION")
        self.assertEqual(turn["conversation_or_action"], "conversation")
        self.assertEqual(turn["tasks_created"], 0)
        self.assertFalse(turn["execution_performed"])

    def test_j_action_request_distinction(self):
        """J. Action request: Meri website ka SEO improve karo. -> ACTION_REQUEST, creates plan"""
        brain = AuraBrain(workspace_root=self.test_dir)
        turn = brain.process_turn("Meri website ka SEO improve karo.", user_id="tester", interactive_confirm=True)
        self.assertTrue(turn["success"])
        self.assertEqual(turn["intent"], "ACTION_REQUEST")
        self.assertEqual(turn["conversation_or_action"], "action")
        self.assertGreater(turn["tasks_created"], 0)
        self.assertTrue(turn["execution_performed"])

    def test_k_action_execution_only_when_permitted(self):
        """K. Action must execute ONLY when permissions allow"""
        db_path = os.path.join(self.test_dir, "perm_test.db")
        pm = PermissionManager(db_path=db_path)
        pm.set_permission("perm_tester", PermissionKey.TERMINAL_EXECUTION.value, PermissionState.DENY.value)

        brain = AuraBrain(workspace_root=self.test_dir)
        brain.permissions = pm

        turn = brain.process_turn("run terminal command ls -la", user_id="perm_tester", interactive_confirm=False)
        # Should be stopped by permission gate
        self.assertEqual(turn["intent"], "ACTION_REQUEST")
        if turn.get("executed_steps"):
            failed_step = turn["executed_steps"][-1]
            self.assertFalse(failed_step["result"].get("success", True))

    def test_l_conversation_creates_zero_tasks(self):
        """L. Conversation must create ZERO tasks and ZERO executions"""
        brain = AuraBrain(workspace_root=self.test_dir)
        queries = ["hi", "hello there", "shukriya", "who made you?", "tell me a joke"]
        for q in queries:
            turn = brain.process_turn(q, user_id="tester")
            self.assertEqual(turn["tasks_created"], 0, f"Query '{q}' created tasks!")
            self.assertFalse(turn["execution_performed"], f"Query '{q}' executed tools!")
            self.assertEqual(turn["plan"], [])
            self.assertEqual(turn["tools"], [])

if __name__ == "__main__":
    unittest.main()
