import tempfile
from pathlib import Path

from python_brain.brain import AuraBrain


def test_file_action_requires_actual_content_verification():
    with tempfile.TemporaryDirectory() as tmp:
        workspace = Path(tmp) / "workspace"
        data = Path(tmp) / "data"

        brain = AuraBrain(
            workspace_root=str(workspace),
            data_dir=str(data),
        )

        user_id = "verification-test-user"

        brain.permissions.set_permission(
            user_id=user_id,
            perm_key="FILES_WRITE",
            state="allow",
        )

        result = brain.process_turn(
            prompt="Create a test file called verified-aura.txt and write Verified AURA into it",
            user_id=user_id,
            session_id="verification-session",
            interactive_confirm=True,
            idempotency_key="verification-test-001",
            scope_id="verification-scope",
        )

        print("\n===== OUTCOME VERIFICATION RESULT =====")
        print(result)

        assert result["success"] is True
        assert result["execution_performed"] is True

        target = workspace / "verified-aura.txt"

        assert target.exists()
        assert target.read_text(encoding="utf-8") == "Verified AURA"

        # The action must explicitly report outcome verification.
        verification_steps = [
            step
            for step in result["executed_steps"]
            if step["tool"] == "filesystem_read"
        ]

        assert verification_steps, "No filesystem verification step executed"

        read_result = verification_steps[-1]["result"]

        assert read_result["success"] is True
        assert read_result["content"] == "Verified AURA"


def test_verifier_rejects_missing_file():
    from python_brain.verification.verifier import Verifier

    result = Verifier.verify_file_exists(
        "/tmp/aura-this-file-definitely-does-not-exist-12345.txt"
    )

    assert result["verified"] is False
    assert "does not exist" in result["error"]
