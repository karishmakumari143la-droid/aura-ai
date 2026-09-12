"""
AURA AI — WhatsApp Communication Adapter

Provider-independent WhatsApp transport adapter.

Important:
- Never reports CONNECTED without real credentials.
- Never reports SENT without a real transport response.
- Credentials are read only from the secure communication credential store.
- No WhatsApp secrets are hard-coded.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import uuid
import requests

from .communication import (
    CommunicationAdapter,
    CommunicationChannel,
    CommunicationMessage,
    MessageDirection,
    MessageStatus,
    SendMessageRequest,
    SendMessageResult,
)
from .communication_token_store import CommunicationCredentialStore
from .core import IntegrationCapability, IntegrationContext, IntegrationResult, IntegrationStatus


class WhatsAppAdapter(CommunicationAdapter):
    channel = CommunicationChannel.WHATSAPP
    display_name = "WhatsApp"

    integration_id = "whatsapp"

    def __init__(
        self,
        credential_store: Optional[CommunicationCredentialStore] = None,
        provider: str = "whatsapp_business",
        http_session=None,
    ):
        self.credential_store = credential_store or CommunicationCredentialStore()
        self.provider = provider
        self.http = http_session or requests.Session()

    def status(self, user_id: str) -> str:
        if not user_id:
            return IntegrationStatus.NOT_CONFIGURED.value

        credentials = self.credential_store.get(
            user_id=user_id,
            channel=self.channel.value,
            provider=self.provider,
        )

        if not credentials:
            return IntegrationStatus.NOT_CONFIGURED.value

        if self.provider != "whatsapp_business":
            return IntegrationStatus.ERROR.value

        access_token = str(credentials.get("access_token", "")).strip()
        phone_number_id = str(credentials.get("phone_number_id", "")).strip()
        api_version = str(credentials.get("api_version", "")).strip()

        if not access_token or not phone_number_id or not api_version:
            return IntegrationStatus.ERROR.value

        base_url = str(
            credentials.get(
                "base_url",
                "https://graph.facebook.com",
            )
        ).strip().rstrip("/")

        try:
            response = self.http.get(
                f"{base_url}/{api_version}/{phone_number_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
                timeout=15,
            )
        except requests.RequestException:
            return IntegrationStatus.ERROR.value

        if 200 <= response.status_code < 300:
            return IntegrationStatus.CONNECTED.value

        return IntegrationStatus.ERROR.value

    def capabilities(self) -> List[IntegrationCapability]:
        return [
            IntegrationCapability(
                name="send_message",
                description="Send a WhatsApp message through the configured authorized transport.",
                destructive=False,
                requires_confirmation=False,
                permission_key="WHATSAPP_SEND",
            ),
            IntegrationCapability(
                name="connection_status",
                description="Check whether WhatsApp credentials are configured.",
                destructive=False,
                requires_confirmation=False,
            ),
            IntegrationCapability(
                name="disconnect",
                description="Remove the user's stored WhatsApp connection credentials.",
                destructive=False,
                requires_confirmation=True,
            ),
        ]

    def send(self, request: SendMessageRequest) -> SendMessageResult:
        if request.contact.channel != CommunicationChannel.WHATSAPP:
            return SendMessageResult(
                success=False,
                channel=CommunicationChannel.WHATSAPP,
                status=MessageStatus.FAILED,
                error="Contact channel is not WhatsApp.",
            )

        credentials = self.credential_store.get(
            user_id=request.user_id,
            channel=self.channel.value,
            provider=self.provider,
        )

        if not credentials:
            return SendMessageResult(
                success=False,
                channel=CommunicationChannel.WHATSAPP,
                status=MessageStatus.FAILED,
                error="WhatsApp is not configured for this user.",
                metadata={
                    "integration_status": IntegrationStatus.NOT_CONFIGURED.value,
                },
            )

        if self.provider != "whatsapp_business":
            return SendMessageResult(
                success=False,
                channel=CommunicationChannel.WHATSAPP,
                status=MessageStatus.FAILED,
                error=f"Unsupported WhatsApp provider: {self.provider}",
                metadata={
                    "integration_status": IntegrationStatus.ERROR.value,
                    "provider": self.provider,
                },
            )

        access_token = str(credentials.get("access_token", "")).strip()
        phone_number_id = str(credentials.get("phone_number_id", "")).strip()
        api_version = str(credentials.get("api_version", "")).strip()
        base_url = str(
            credentials.get(
                "base_url",
                "https://graph.facebook.com",
            )
        ).strip().rstrip("/")

        if not access_token:
            return self._configuration_error("Missing access_token.")

        if not phone_number_id:
            return self._configuration_error("Missing phone_number_id.")

        if not api_version:
            return self._configuration_error("Missing api_version.")

        url = (
            f"{base_url}/{api_version}/"
            f"{phone_number_id}/messages"
        )

        payload = {
            "messaging_product": "whatsapp",
            "to": request.contact.address,
            "type": "text",
            "text": {
                "body": request.content,
            },
        }

        try:
            response = self.http.post(
                url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=30,
            )
        except requests.RequestException as exc:
            return SendMessageResult(
                success=False,
                channel=CommunicationChannel.WHATSAPP,
                status=MessageStatus.FAILED,
                error=f"WhatsApp transport request failed: {exc}",
                metadata={
                    "integration_status": IntegrationStatus.ERROR.value,
                    "provider": self.provider,
                    "transport": "cloud_api",
                },
            )

        try:
            body = response.json()
        except ValueError:
            body = {}

        if not 200 <= response.status_code < 300:
            provider_error = body.get("error") or {}
            error_message = provider_error.get("message")

            if not error_message:
                error_message = (
                    f"WhatsApp Cloud API returned HTTP "
                    f"{response.status_code}."
                )

            return SendMessageResult(
                success=False,
                channel=CommunicationChannel.WHATSAPP,
                status=MessageStatus.FAILED,
                error=error_message,
                metadata={
                    "integration_status": IntegrationStatus.ERROR.value,
                    "provider": self.provider,
                    "transport": "cloud_api",
                    "http_status": response.status_code,
                    "provider_error_code": provider_error.get("code"),
                },
            )

        messages = body.get("messages") or []

        if not messages or not messages[0].get("id"):
            return SendMessageResult(
                success=False,
                channel=CommunicationChannel.WHATSAPP,
                status=MessageStatus.FAILED,
                error="WhatsApp Cloud API returned no message ID.",
                metadata={
                    "integration_status": IntegrationStatus.ERROR.value,
                    "provider": self.provider,
                    "transport": "cloud_api",
                    "http_status": response.status_code,
                },
            )

        provider_message_id = str(messages[0]["id"])

        return SendMessageResult(
            success=True,
            channel=CommunicationChannel.WHATSAPP,
            status=MessageStatus.SENT,
            message_id=str(uuid.uuid4()),
            provider_message_id=provider_message_id,
            metadata={
                "integration_status": IntegrationStatus.CONNECTED.value,
                "provider": self.provider,
                "transport": "cloud_api",
                "http_status": response.status_code,
            },
        )

    @staticmethod
    def _configuration_error(message: str) -> SendMessageResult:
        return SendMessageResult(
            success=False,
            channel=CommunicationChannel.WHATSAPP,
            status=MessageStatus.FAILED,
            error=f"WhatsApp configuration error: {message}",
            metadata={
                "integration_status": IntegrationStatus.ERROR.value,
                "provider": "whatsapp_business",
                "transport": "cloud_api",
            },
        )

    def disconnect(self, user_id: str) -> None:
        self.credential_store.delete(
            user_id=user_id,
            channel=self.channel.value,
            provider=self.provider,
        )

    def execute(
        self,
        action: str,
        arguments: Dict[str, Any],
        context: IntegrationContext,
    ) -> IntegrationResult:
        if action == "connection_status":
            return IntegrationResult(
                success=True,
                integration=self.integration_id,
                action=action,
                data={
                    "channel": self.channel.value,
                    "provider": self.provider,
                    "status": self.status(context.user_id),
                },
            )

        if action == "send_message":
            address = str(arguments.get("address", "")).strip()
            content = str(arguments.get("content", "")).strip()

            if not address:
                return IntegrationResult(
                    success=False,
                    integration=self.integration_id,
                    action=action,
                    error="WhatsApp recipient address is required.",
                )

            if not content:
                return IntegrationResult(
                    success=False,
                    integration=self.integration_id,
                    action=action,
                    error="Message content is required.",
                )

            contact = self._build_contact(
                user_id=context.user_id,
                address=address,
                name=arguments.get("name"),
                metadata=arguments.get("metadata") or {},
            )

            result = self.send(
                SendMessageRequest(
                    user_id=context.user_id,
                    contact=contact,
                    content=content,
                    metadata=arguments.get("metadata") or {},
                )
            )

            message = CommunicationMessage(
                message_id=result.message_id or str(uuid.uuid4()),
                user_id=context.user_id,
                contact_id=contact.contact_id,
                channel=self.channel,
                direction=MessageDirection.OUTBOUND,
                content=content,
                status=result.status,
                provider_message_id=result.provider_message_id,
                metadata=result.metadata,
            )

            return IntegrationResult(
                success=result.success,
                integration=self.integration_id,
                action=action,
                data={
                    "message": message,
                    "status": result.status.value,
                },
                error=result.error,
                metadata=result.metadata,
            )

        if action == "disconnect":
            self.disconnect(context.user_id)

            return IntegrationResult(
                success=True,
                integration=self.integration_id,
                action=action,
                data={
                    "status": IntegrationStatus.DISCONNECTED.value,
                },
            )

        return IntegrationResult(
            success=False,
            integration=self.integration_id,
            action=action,
            error=f"Unsupported WhatsApp action: {action}",
        )

    @staticmethod
    def _build_contact(
        user_id: str,
        address: str,
        name: Optional[str],
        metadata: Dict[str, Any],
    ):
        from .communication import Contact

        return Contact(
            contact_id=f"wa:{user_id}:{address}",
            user_id=user_id,
            name=name,
            address=address,
            channel=CommunicationChannel.WHATSAPP,
            metadata=metadata,
        )
