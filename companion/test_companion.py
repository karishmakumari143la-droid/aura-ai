import unittest
import os
import sys
import tempfile
import json
import shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from companion.aura_companion import AuraCompanion, DEFAULT_PERMISSIONS
except ImportError:
    from aura_companion import AuraCompanion, DEFAULT_PERMISSIONS


class TestAuraCompanion(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.companion = AuraCompanion(workspace_root=self.test_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_permission_matrix(self):
        # ALLOW should pass automatically
        self.companion.set_permission("FILES_READ", "allow")
        allowed, _ = self.companion.check_permission("FILES_READ")
        self.assertTrue(allowed)

        # DENY should block immediately
        self.companion.set_permission("FILES_READ", "deny")
        allowed, msg = self.companion.check_permission("FILES_READ")
        self.assertFalse(allowed)
        self.assertIn("DENIED", msg)

        # ASK should block unless confirmed
        self.companion.set_permission("TERMINAL_EXECUTE", "ask")
        allowed_unconf, _ = self.companion.check_permission("TERMINAL_EXECUTE", interactive_confirm=False)
        self.assertFalse(allowed_unconf)
        allowed_conf, _ = self.companion.check_permission("TERMINAL_EXECUTE", interactive_confirm=True)
        self.assertTrue(allowed_conf)

    def test_filesystem_write_and_read(self):
        # Test writing file
        write_res = self.companion.filesystem_write("hello.txt", "Hello AURA AI")
        self.assertTrue(write_res.success)
        self.assertGreater(write_res.data["bytes_written"], 0)

        # Test reading file
        read_res = self.companion.filesystem_read("hello.txt")
        self.assertTrue(read_res.success)
        self.assertEqual(read_res.data["content"], "Hello AURA AI")

        # Test listing directory
        list_res = self.companion.filesystem_list(".")
        self.assertTrue(list_res.success)
        names = [e["name"] for e in list_res.data["entries"]]
        self.assertIn("hello.txt", names)

    def test_filesystem_traversal_guard(self):
        # Should block paths traversing outside workspace root
        res = self.companion.filesystem_read("../../etc/passwd")
        self.assertFalse(res.success)
        self.assertIn("outside workspace", res.error)

    def test_terminal_execution_with_confirmation(self):
        # Should require confirmation when state is 'ask'
        unconfirmed = self.companion.terminal_execute("echo test_ok", confirmed=False)
        self.assertFalse(unconfirmed.success)
        self.assertEqual(unconfirmed.permission_state, "ask")

        # Should execute when confirmed
        confirmed = self.companion.terminal_execute("echo test_ok", confirmed=True)
        self.assertTrue(confirmed.success)
        self.assertIn("test_ok", confirmed.data["stdout"])

    def test_terminal_destructive_blacklist(self):
        # Blacklisted commands must be rejected even if confirmed
        res = self.companion.terminal_execute("rm -rf /", confirmed=True)
        self.assertFalse(res.success)
        self.assertIn("destructive", res.error)

    def test_dispatcher(self):
        dispatch_res = self.companion.dispatch(
            "filesystem_write",
            {"path": "dispatch_test.json", "content": json.dumps({"test": 123})},
            confirmed=True
        )
        self.assertTrue(dispatch_res.success)

        read_res = self.companion.dispatch(
            "filesystem_read",
            {"path": "dispatch_test.json"},
            confirmed=True
        )
        self.assertTrue(read_res.success)
        self.assertIn("123", read_res.data["content"])


if __name__ == "__main__":
    unittest.main()
