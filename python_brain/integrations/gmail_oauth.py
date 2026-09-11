"""
Dedicated Gmail OAuth authorization flow.

This is intentionally separate from AURA's login OAuth.

Login scopes:
    openid email profile

Gmail scopes are granted only when the user explicitly connects Gmail.
"""

from __future__ import annotations

import hashlib
import os
import secrets
import time
from dataclasses import dataclass
from typing import Dict, Optional
from urllib.parse import urlencode

import requests


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


@dataclass
class GmailOAuthState:
    state: str
    user_id: str
    created_at: float
    scopes: tuple[str, ...]


class GmailOAuthService:
    DEFAULT_SCOPES = (
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/gmail.modify",
    )

    STATE_TTL_SECONDS = 600

    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

        self.callback_url = (
            os.getenv("GMAIL_CALLBACK_URL")
            or os.getenv("APP_URL", "").rstrip("/")
            + "/api/integrations/gmail/callback"
        )

        self._states: Dict[str, GmailOAuthState] = {}

    @property
    def configured(self) -> bool:
        return bool(
            self.client_id
            and self.client_secret
            and self.callback_url
        )

    def create_authorization_url(
        self,
        user_id: str,
        scopes: Optional[tuple[str, ...]] = None,
    ) -> str:
        if not self.configured:
            raise RuntimeError("GMAIL_OAUTH_NOT_CONFIGURED")

        state = secrets.token_urlsafe(32)
        selected_scopes = scopes or self.DEFAULT_SCOPES

        self._states[state] = GmailOAuthState(
            state=state,
            user_id=user_id,
            created_at=time.time(),
            scopes=tuple(selected_scopes),
        )

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.callback_url,
            "response_type": "code",
            "scope": " ".join(selected_scopes),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }

        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    def consume_state(self, state: str) -> GmailOAuthState:
        if not state:
            raise ValueError("missing OAuth state")

        record = self._states.pop(state, None)

        if not record:
            raise ValueError("invalid or replayed OAuth state")

        if time.time() - record.created_at > self.STATE_TTL_SECONDS:
            raise ValueError("expired OAuth state")

        return record

    def exchange_code(self, code: str) -> dict:
        if not self.configured:
            raise RuntimeError("GMAIL_OAUTH_NOT_CONFIGURED")

        if not code:
            raise ValueError("missing authorization code")

        response = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.callback_url,
            },
            timeout=20,
        )

        if not response.ok:
            raise RuntimeError(
                f"Google token exchange failed: HTTP {response.status_code}"
            )

        payload = response.json()

        if not payload.get("access_token"):
            raise RuntimeError("Google token response missing access_token")

        return payload

    @staticmethod
    def hash_state(state: str) -> str:
        return hashlib.sha256(
            state.encode("utf-8")
        ).hexdigest()
