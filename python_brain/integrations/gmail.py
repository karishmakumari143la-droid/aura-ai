"""
AURA AI — Native Gmail Integration

Real Gmail API adapter.

Important:
- No fake connected state.
- No credentials are hard-coded.
- Access tokens are supplied by AURA's credential layer.
- HTTP transport is injectable for deterministic tests.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Callable
import requests

from .core import (
    IntegrationActionError,
    IntegrationCapability,
    IntegrationContext,
    IntegrationResult,
    IntegrationStatus,
)


GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


class GmailAdapter:

    integration_id = "gmail"
    display_name = "Gmail"

    def __init__(
        self,
        token_provider: Optional[Callable[[str], Optional[str]]] = None,
        http_session=None,
    ):
        self.token_provider = token_provider
        self.http = http_session or requests.Session()

    def status(self, user_id: str) -> IntegrationStatus:
        if not self.token_provider:
            return IntegrationStatus.NOT_CONFIGURED

        try:
            token = self.token_provider(user_id)
        except Exception:
            return IntegrationStatus.ERROR

        if not token:
            return IntegrationStatus.DISCONNECTED

        return IntegrationStatus.CONNECTED

    def capabilities(self) -> List[IntegrationCapability]:
        return [
            IntegrationCapability(
                name="profile",
                description="Read the authenticated Gmail profile.",
            ),
            IntegrationCapability(
                name="list_messages",
                description="Search/list Gmail messages.",
            ),
            IntegrationCapability(
                name="read_message",
                description="Read a Gmail message.",
            ),
            IntegrationCapability(
                name="read_thread",
                description="Read a Gmail thread.",
            ),
            IntegrationCapability(
                name="send_message",
                description="Send a Gmail message.",
            ),
            IntegrationCapability(
                name="create_draft",
                description="Create a Gmail draft.",
            ),
            IntegrationCapability(
                name="trash_message",
                description="Move a Gmail message to trash.",
                destructive=True,
                requires_confirmation=True,
            ),
        ]

    def execute(
        self,
        action: str,
        arguments: Dict[str, Any],
        context: IntegrationContext,
    ) -> IntegrationResult:

        token = self._get_token(context.user_id)

        if not token:
            return IntegrationResult(
                success=False,
                integration=self.integration_id,
                action=action,
                error="GMAIL_AUTHORIZATION_REQUIRED",
            )

        if action == "profile":
            data = self._request(
                "GET",
                f"{GMAIL_API_BASE}/profile",
                token,
            )

        elif action == "list_messages":
            data = self._list_messages(
                token,
                arguments,
            )

        elif action == "read_message":
            message_id = self._required(
                arguments,
                "message_id",
            )

            data = self._request(
                "GET",
                f"{GMAIL_API_BASE}/messages/{message_id}",
                token,
                params={
                    "format": arguments.get(
                        "format",
                        "full",
                    )
                },
            )

        elif action == "read_thread":
            thread_id = self._required(
                arguments,
                "thread_id",
            )

            data = self._request(
                "GET",
                f"{GMAIL_API_BASE}/threads/{thread_id}",
                token,
                params={
                    "format": arguments.get(
                        "format",
                        "full",
                    )
                },
            )

        elif action == "send_message":
            data = self._send_message(
                token,
                arguments,
            )

        elif action == "create_draft":
            data = self._create_draft(
                token,
                arguments,
            )

        elif action == "trash_message":
            message_id = self._required(
                arguments,
                "message_id",
            )

            data = self._request(
                "POST",
                f"{GMAIL_API_BASE}/messages/{message_id}/trash",
                token,
            )

        else:
            raise IntegrationActionError(
                f"Unsupported Gmail action: {action}"
            )

        return IntegrationResult(
            success=True,
            integration=self.integration_id,
            action=action,
            data=data,
        )

    def disconnect(self, user_id: str) -> None:
        # Credential deletion belongs to AURA's credential store.
        # The adapter never stores provider credentials itself.
        return None

    def _get_token(self, user_id: str) -> Optional[str]:
        if not self.token_provider:
            return None

        token = self.token_provider(user_id)

        if not token:
            return None

        return token

    @staticmethod
    def _required(
        arguments: Dict[str, Any],
        key: str,
    ) -> str:
        value = arguments.get(key)

        if not isinstance(value, str) or not value.strip():
            raise IntegrationActionError(
                f"Gmail action requires '{key}'."
            )

        return value.strip()

    def _headers(self, token: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    def _request(
        self,
        method: str,
        url: str,
        token: str,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
    ):
        response = self.http.request(
            method=method,
            url=url,
            headers=self._headers(token),
            params=params,
            json=json_body,
            timeout=30,
        )

        if not response.ok:
            raise IntegrationActionError(
                f"Gmail API request failed: "
                f"HTTP {response.status_code}"
            )

        return response.json()

    def _list_messages(
        self,
        token: str,
        arguments: Dict[str, Any],
    ):
        params = {}

        if arguments.get("q"):
            params["q"] = arguments["q"]

        if arguments.get("label_ids"):
            params["labelIds"] = arguments["label_ids"]

        if arguments.get("max_results") is not None:
            params["maxResults"] = int(
                arguments["max_results"]
            )

        if arguments.get("page_token"):
            params["pageToken"] = arguments["page_token"]

        return self._request(
            "GET",
            f"{GMAIL_API_BASE}/messages",
            token,
            params=params,
        )

    def _send_message(
        self,
        token: str,
        arguments: Dict[str, Any],
    ):
        raw_message = arguments.get("raw")

        if not isinstance(raw_message, str) or not raw_message:
            raise IntegrationActionError(
                "send_message requires a base64url 'raw' message."
            )

        return self._request(
            "POST",
            f"{GMAIL_API_BASE}/messages/send",
            token,
            json_body={
                "raw": raw_message,
            },
        )

    def _create_draft(
        self,
        token: str,
        arguments: Dict[str, Any],
    ):
        raw_message = arguments.get("raw")

        if not isinstance(raw_message, str) or not raw_message:
            raise IntegrationActionError(
                "create_draft requires a base64url 'raw' message."
            )

        return self._request(
            "POST",
            f"{GMAIL_API_BASE}/drafts",
            token,
            json_body={
                "message": {
                    "raw": raw_message,
                }
            },
        )
