"""
AURA AI — Native Integration Core

Provider-independent integration foundation.

Integrations implement adapters.
AURA owns:
- lifecycle
- capabilities
- permissions
- credential references
- events
- actions
- errors
- audit metadata

No credentials or secrets are stored in adapter definitions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol
import time
import uuid


class IntegrationStatus(str, Enum):
    NOT_CONFIGURED = "NOT_CONFIGURED"
    DISCONNECTED = "DISCONNECTED"
    CONNECTED = "CONNECTED"
    ERROR = "ERROR"


class IntegrationActionError(RuntimeError):
    pass


class IntegrationPermissionError(IntegrationActionError):
    pass


@dataclass(frozen=True)
class IntegrationCapability:
    name: str
    description: str
    destructive: bool = False
    requires_confirmation: bool = False
    permission_key: Optional[str] = None


@dataclass
class IntegrationContext:
    user_id: str
    scope_id: Optional[str] = None
    grant_id: Optional[str] = None
    confirmed: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class IntegrationResult:
    success: bool
    integration: str
    action: str
    data: Any = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class IntegrationAdapter(Protocol):

    integration_id: str
    display_name: str

    def status(self, user_id: str) -> IntegrationStatus:
        ...

    def capabilities(self) -> List[IntegrationCapability]:
        ...

    def execute(
        self,
        action: str,
        arguments: Dict[str, Any],
        context: IntegrationContext,
    ) -> IntegrationResult:
        ...

    def disconnect(self, user_id: str) -> None:
        ...


class IntegrationRegistry:

    def __init__(self):
        self._adapters: Dict[str, IntegrationAdapter] = {}

    def register(self, adapter: IntegrationAdapter) -> None:
        integration_id = adapter.integration_id.strip().lower()

        if not integration_id:
            raise ValueError(
                "Integration id cannot be empty."
            )

        if integration_id in self._adapters:
            raise ValueError(
                f"Integration already registered: {integration_id}"
            )

        self._adapters[integration_id] = adapter

    def get(self, integration_id: str) -> IntegrationAdapter:
        key = integration_id.strip().lower()

        if key not in self._adapters:
            raise KeyError(
                f"Integration not registered: {integration_id}"
            )

        return self._adapters[key]

    def list_integrations(self) -> List[str]:
        return sorted(self._adapters.keys())

    def describe(self) -> List[Dict[str, Any]]:
        result = []

        for integration_id in self.list_integrations():
            adapter = self._adapters[integration_id]

            result.append({
                "integration_id": integration_id,
                "display_name": adapter.display_name,
                "status": "AVAILABLE",
                "capabilities": [
                    {
                        "name": capability.name,
                        "description": capability.description,
                        "destructive": capability.destructive,
                        "requires_confirmation": (
                            capability.requires_confirmation
                        ),
                    }
                    for capability in adapter.capabilities()
                ],
            })

        return result


class IntegrationManager:

    def __init__(
        self,
        registry: Optional[IntegrationRegistry] = None,
        permission_checker=None,
        audit_logger=None,
    ):
        self.registry = registry or IntegrationRegistry()
        self.permission_checker = permission_checker
        self.audit_logger = audit_logger

    def register(self, adapter: IntegrationAdapter) -> None:
        self.registry.register(adapter)

    def list_integrations(self) -> List[str]:
        return self.registry.list_integrations()

    def describe(self) -> List[Dict[str, Any]]:
        return self.registry.describe()

    def execute(
        self,
        integration_id: str,
        action: str,
        arguments: Optional[Dict[str, Any]],
        context: IntegrationContext,
    ) -> IntegrationResult:

        adapter = self.registry.get(integration_id)

        arguments = arguments or {}

        capability = next(
            (
                item
                for item in adapter.capabilities()
                if item.name == action
            ),
            None,
        )

        if capability is None:
            raise IntegrationActionError(
                f"Unsupported action '{action}' "
                f"for integration '{integration_id}'."
            )

        if self.permission_checker and capability.permission_key:
            allowed, reason, permission_state = (
                self.permission_checker.check_permission(
                    user_id=context.user_id,
                    perm_key=capability.permission_key,
                    interactive_confirm=context.confirmed,
                    grant_id=context.grant_id,
                    scope_id=context.scope_id,
                )
            )

            if not allowed:
                if self.audit_logger:
                    self.audit_logger.log_action(
                        user_id=context.user_id,
                        action_type="integration",
                        tool_name=f"{integration_id}.{action}",
                        parameters={
                            "permission_key": capability.permission_key,
                        },
                        permission_state=permission_state,
                        confirmed=context.confirmed,
                        success=False,
                        duration_ms=0,
                        error_message=reason,
                        verification_status=None,
                    )

                raise IntegrationPermissionError(reason)

            if (
                permission_state == "grant"
                and context.grant_id
            ):
                self.permission_checker.consume_grant(
                    grant_id=context.grant_id,
                    user_id=context.user_id,
                    perm_key=capability.permission_key,
                    scope_id=context.scope_id,
                )

        if (
            capability.requires_confirmation
            and not context.confirmed
        ):
            raise IntegrationPermissionError(
                f"Confirmation required for "
                f"{integration_id}.{action}."
            )

        started = time.time()

        try:
            result = adapter.execute(
                action=action,
                arguments=arguments,
                context=context,
            )

            result.metadata.setdefault(
                "duration_ms",
                round((time.time() - started) * 1000, 2),
            )

            result.metadata.setdefault(
                "execution_id",
                str(uuid.uuid4()),
            )

            if self.audit_logger:
                self.audit_logger.log_action(
                    user_id=context.user_id,
                    action_type="integration",
                    tool_name=f"{integration_id}.{action}",
                    parameters={
                        "execution_id": result.metadata["execution_id"],
                    },
                    permission_state="allow",
                    confirmed=context.confirmed,
                    success=result.success,
                    duration_ms=int(result.metadata["duration_ms"]),
                    error_message=result.error,
                    verification_status=None,
                )

            return result

        except Exception as exc:

            if self.audit_logger:
                self.audit_logger.log_action(
                    user_id=context.user_id,
                    action_type="integration",
                    tool_name=f"{integration_id}.{action}",
                    parameters={},
                    permission_state="error",
                    confirmed=context.confirmed,
                    success=False,
                    duration_ms=int((time.time() - started) * 1000),
                    error_message=str(exc),
                    verification_status=None,
                )

            raise


class NativeIntegrationAdapter:

    integration_id = "example"
    display_name = "Example Integration"

    def status(self, user_id: str) -> IntegrationStatus:
        return IntegrationStatus.NOT_CONFIGURED

    def capabilities(self) -> List[IntegrationCapability]:
        return []

    def execute(
        self,
        action: str,
        arguments: Dict[str, Any],
        context: IntegrationContext,
    ) -> IntegrationResult:
        raise IntegrationActionError(
            "Integration adapter is not configured."
        )

    def disconnect(self, user_id: str) -> None:
        return None
