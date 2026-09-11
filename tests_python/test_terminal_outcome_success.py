from python_brain.brain import AuraBrain


def test_terminal_success_is_formally_verified():
    brain = AuraBrain()

    result = brain.process_turn(
        prompt="Run the command echo Hello AURA",
        user_id="terminal-regression-success-user",
        session_id="terminal-regression-success-session",
        interactive_confirm=True,
    )

    assert result["success"] is True

    steps = [
        step
        for step in result.get("executed_steps", [])
        if step.get("tool") == "terminal_execute"
    ]

    assert steps

    step_result = steps[0]["result"]

    assert step_result["command"] == "echo Hello AURA"
    assert step_result["exit_code"] == 0
    assert step_result["success"] is True

    verification = step_result.get("outcome_verification")

    assert verification is not None
    assert verification["verified"] is True
    assert verification["verification_type"] == "process_exit_code"
