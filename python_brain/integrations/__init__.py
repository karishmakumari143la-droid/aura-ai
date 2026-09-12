from .core import (
    IntegrationActionError,
    IntegrationCapability,
    IntegrationContext,
    IntegrationManager,
    IntegrationPermissionError,
    IntegrationRegistry,
    IntegrationResult,
    IntegrationStatus,
    NativeIntegrationAdapter,
)

__all__ = [
    "IntegrationActionError",
    "IntegrationCapability",
    "IntegrationContext",
    "IntegrationManager",
    "IntegrationPermissionError",
    "IntegrationRegistry",
    "IntegrationResult",
    "IntegrationStatus",
    "NativeIntegrationAdapter",
]


from .communication import (
    CommunicationAdapter,
    CommunicationChannel,
    CommunicationMessage,
    CommunicationRegistry,
    MessageDirection,
    MessageStatus,
    Contact,
    SendMessageRequest,
    SendMessageResult,
)

__all__ += [
    "CommunicationAdapter",
    "CommunicationChannel",
    "CommunicationMessage",
    "CommunicationRegistry",
    "MessageDirection",
    "MessageStatus",
    "Contact",
    "SendMessageRequest",
    "SendMessageResult",
]
