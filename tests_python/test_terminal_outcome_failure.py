from python_brain.brain import AuraBrain


def test_terminal_failure_is_not_reported_as_success():
    brain = AuraBrain()

    result = brain.process_turn(
        prompt="Run the command false",
        user_id="terminal-regression-failure-user",
        session_id="terminal-regression-failure-session",
        interactive_confirm=True,
    )

    assert result["success"] is False

    failed_steps = [
        step
        for step in result.get("executed_steps", [])
        if step.get("tool") == "terminal_execute"
    ]

    assert failed_steps

    step_result = failed_steps[0]["result"]

    assert step_result["command"] == "false"
    assert step_result["exit_code"] != 0
    assert step_result["success"] is False

    verification = step_result.get("outcome_verification")

    assert verification is not None
    assert verification["verified"] is False
    assert verification["verification_type"] == "process_exit_code"
