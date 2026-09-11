import unittest

from python_brain.integrations.core import (
    IntegrationActionError,
    IntegrationCapability,
    IntegrationContext,
    IntegrationManager,
    IntegrationPermissionError,
    IntegrationRegistry,
    IntegrationResult,
    IntegrationStatus,
)


class FakeIntegration:

    integration_id = "fake"
    display_name = "AURA Test Integration"

    def __init__(self):
        self.executions = []

    def status(self, user_id):
        return IntegrationStatus.CONNECTED

    def capabilities(self):
        return [
            IntegrationCapability(
                name="read",
                description="Read data.",
            ),
            IntegrationCapability(
                name="delete",
                description="Delete data.",
                destructive=True,
                requires_confirmation=True,
            ),
        ]

    def execute(self, action, arguments, context):
        self.executions.append(
            (action, arguments, context.user_id)
        )

        return IntegrationResult(
            success=True,
            integration=self.integration_id,
            action=action,
            data=arguments,
        )

    def disconnect(self, user_id):
        return None


class TestIntegrationCore(unittest.TestCase):

    def test_registry_registers_and_lists_adapter(self):
        registry = IntegrationRegistry()
        adapter = FakeIntegration()

        registry.register(adapter)

        self.assertEqual(
            registry.list_integrations(),
            ["fake"],
        )

        description = registry.describe()[0]

        self.assertEqual(
            description["integration_id"],
            "fake",
        )

        self.assertEqual(
            len(description["capabilities"]),
            2,
        )

    def test_duplicate_registration_is_rejected(self):
        registry = IntegrationRegistry()

        registry.register(FakeIntegration())

        with self.assertRaises(ValueError):
            registry.register(FakeIntegration())

    def test_unknown_integration_is_rejected(self):
        manager = IntegrationManager()

        with self.assertRaises(KeyError):
            manager.execute(
                integration_id="unknown",
                action="read",
                arguments={},
                context=IntegrationContext(
                    user_id="test-user"
                ),
            )

    def test_unsupported_action_is_rejected(self):
        manager = IntegrationManager()
        manager.register(FakeIntegration())

        with self.assertRaises(IntegrationActionError):
            manager.execute(
                integration_id="fake",
                action="send",
                arguments={},
                context=IntegrationContext(
                    user_id="test-user"
                ),
            )

    def test_confirmation_is_required_for_destructive_action(self):
        manager = IntegrationManager()
        manager.register(FakeIntegration())

        with self.assertRaises(IntegrationPermissionError):
            manager.execute(
                integration_id="fake",
                action="delete",
                arguments={},
                context=IntegrationContext(
                    user_id="test-user",
                    confirmed=False,
                ),
            )

    def test_confirmed_action_executes(self):
        adapter = FakeIntegration()
        manager = IntegrationManager()
        manager.register(adapter)

        result = manager.execute(
            integration_id="fake",
            action="delete",
            arguments={"id": "123"},
            context=IntegrationContext(
                user_id="test-user",
                confirmed=True,
            ),
        )

        self.assertTrue(result.success)
        self.assertEqual(
            result.integration,
            "fake",
        )
        self.assertEqual(
            result.action,
            "delete",
        )
        self.assertEqual(
            result.data["id"],
            "123",
        )
        self.assertIn(
            "execution_id",
            result.metadata,
        )

    def test_adapter_status_is_real_state(self):
        adapter = FakeIntegration()

        self.assertEqual(
            adapter.status("test-user"),
            IntegrationStatus.CONNECTED,
        )


if __name__ == "__main__":
    unittest.main()
