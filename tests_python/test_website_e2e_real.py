import os

from python_brain.brain import AuraBrain
from python_brain.qa.qa_engine import QAEngine


def test_real_website_creation_qa_and_browser_e2e(tmp_path):
    brain = AuraBrain(workspace_root=str(tmp_path))

    result = brain.process_turn(
        "create a portfolio website",
        user_id="website-e2e-user",
        session_id="website-e2e-session",
        interactive_confirm=True,
    )

    assert result["success"] is True
    assert result["intent"] == "ACTION_REQUEST"
    assert result["execution_performed"] is True
    assert result["files_created"], result

    # The natural website workflow must execute all required stages.
    assert result["tools"] == [
        "filesystem_write",
        "qa_verify_site",
        "browser_e2e",
    ]
    assert len(result["executed_steps"]) == 3

    assert result["executed_steps"][0]["result"]["success"] is True
    assert result["executed_steps"][1]["result"]["success"] is True
    assert result["executed_steps"][2]["result"]["success"] is True

    website_path = result["files_created"][0]
    if not os.path.isabs(website_path):
        website_path = os.path.join(str(tmp_path), website_path)
    assert os.path.exists(website_path), website_path

    # Physical/static QA must pass.
    qa = QAEngine.audit_website_file(website_path)
    assert qa["passed"] is True, qa
    assert qa["score"] >= 80, qa

    # The generated website must also be opened by the real browser
    # and inspected through Playwright.
    browser_result = brain.browser.execute_e2e_flow(
        target_url=website_path,
        actions=[],
        verify_condition={
            "type": "title_non_empty",
        },
    )

    assert browser_result["success"] is True, browser_result
