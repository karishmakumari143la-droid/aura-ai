"""
AURA AI — Native Communication Core

Provider-independent communication contract.

AURA owns:
- contacts
- conversations
- messages
- delivery state
- permissions
- audit metadata

Providers/adapters own only the actual transport.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class CommunicationChannel(str, Enum):
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    VOICE = "voice"


class MessageDirection(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class MessageStatus(str, Enum):
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    RECEIVED = "received"


@dataclass(frozen=True)
class Contact:
    contact_id: str
    user_id: str
    name: Optional[str]
    address: str
    channel: CommunicationChannel
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CommunicationMessage:
    message_id: str
    user_id: str
    contact_id: str
    channel: CommunicationChannel
    direction: MessageDirection
    content: str
    status: MessageStatus
    provider_message_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SendMessageRequest:
    user_id: str
    contact: Contact
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SendMessageResult:
    success: bool
    channel: CommunicationChannel
    status: MessageStatus
    message_id: Optional[str] = None
    provider_message_id: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class CommunicationAdapter:
    """
    Provider adapter contract.

    Implementations must never pretend a message was sent when the
    underlying provider is not actually connected or configured.
    """

    channel: CommunicationChannel
    display_name: str

    def status(self, user_id: str) -> str:
        raise NotImplementedError

    def send(self, request: SendMessageRequest) -> SendMessageResult:
        raise NotImplementedError

    def disconnect(self, user_id: str) -> None:
        raise NotImplementedError


class CommunicationRegistry:
    def __init__(self):
        self._adapters: Dict[CommunicationChannel, CommunicationAdapter] = {}

    def register(self, adapter: CommunicationAdapter) -> None:
        if adapter.channel in self._adapters:
            raise ValueError(
                f"Communication adapter already registered: {adapter.channel.value}"
            )

        self._adapters[adapter.channel] = adapter

    def get(self, channel: CommunicationChannel) -> CommunicationAdapter:
        if channel not in self._adapters:
            raise KeyError(
                f"Communication channel not registered: {channel.value}"
            )

        return self._adapters[channel]

    def list_channels(self) -> List[str]:
        return sorted(channel.value for channel in self._adapters)

    def describe(self) -> List[Dict[str, Any]]:
        return [
            {
                "channel": channel.value,
                "display_name": self._adapters[channel].display_name,
            }
            for channel in sorted(
                self._adapters,
                key=lambda item: item.value,
            )
        ]
