import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from python_brain.brain import AuraBrain


class TestAuraNaturalActionE2E(unittest.TestCase):

    def test_natural_language_creates_real_file_and_verifies(self):
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Path(tmp) / "workspace"
            data = Path(tmp) / "data"

            brain = AuraBrain(
                workspace_root=str(workspace),
                data_dir=str(data),
            )

            # Explicit permission only for this isolated test scope.
            user_id = "e2e-user"
            scope_id = "e2e-natural-action"

            brain.permissions.set_permission(
                user_id=user_id,
                perm_key="FILES_WRITE",
                state="allow",
            )

            result = brain.process_turn(
                prompt="Create a test file called hello-aura.txt and write Hello AURA into it",
                user_id=user_id,
                session_id="e2e-session",
                interactive_confirm=True,
                idempotency_key="e2e-natural-action-001",
                scope_id=scope_id,
            )

            print("\n===== AURA NATURAL ACTION RESULT =====")
            print(result)

            self.assertTrue(result["success"], result)
            self.assertEqual(result["intent"], "ACTION_REQUEST")
            self.assertEqual(result["conversation_or_action"], "action")
            self.assertTrue(result["execution_performed"])
            self.assertGreaterEqual(len(result["executed_steps"]), 1)

            # Find the actual created file(s) rather than assuming a path.
            files = list(workspace.rglob("hello-aura.txt"))

            self.assertEqual(
                len(files),
                1,
                f"Expected exactly one hello-aura.txt, found: {files}",
            )

            content = files[0].read_text(encoding="utf-8")
            self.assertEqual(content, "Hello AURA")

            print(f"REAL FILE: {files[0]}")
            print(f"CONTENT: {content!r}")


if __name__ == "__main__":
    unittest.main()
