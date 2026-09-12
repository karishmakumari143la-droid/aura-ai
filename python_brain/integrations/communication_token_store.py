"""
AURA AI — Secure Communication Credential Store

Stores provider credentials encrypted at rest.
No provider secret or access token is hard-coded.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import sqlite3
from pathlib import Path
from typing import Any, Dict, Optional


class CommunicationCredentialStore:
    def __init__(
        self,
        db_path: str = "data/aura_communication_credentials.db",
        encryption_key: Optional[str] = None,
    ):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        key_source = encryption_key or os.getenv("ENCRYPTION_KEY")
        self._key = self._derive_key(key_source)

        self._init_db()

    @staticmethod
    def _derive_key(value: Optional[str]) -> bytes:
        if not value:
            raise RuntimeError(
                "ENCRYPTION_KEY is required for communication credential storage"
            )

        return hashlib.sha256(value.encode("utf-8")).digest()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS communication_credentials (
                    user_id TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    encrypted_credentials TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, channel, provider)
                )
                """
            )
            conn.commit()

    def _encrypt(self, payload: Dict[str, Any]) -> str:
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        except ImportError as exc:
            raise RuntimeError(
                "cryptography package is required for communication credential encryption"
            ) from exc

        nonce = secrets.token_bytes(12)
        aes = AESGCM(self._key)

        plaintext = json.dumps(
            payload,
            separators=(",", ":"),
        ).encode("utf-8")

        ciphertext = aes.encrypt(nonce, plaintext, None)

        return base64.urlsafe_b64encode(
            nonce + ciphertext
        ).decode("ascii")

    def _decrypt(self, value: str) -> Dict[str, Any]:
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        except ImportError as exc:
            raise RuntimeError(
                "cryptography package is required for communication credential encryption"
            ) from exc

        raw = base64.urlsafe_b64decode(value.encode("ascii"))

        nonce = raw[:12]
        ciphertext = raw[12:]

        aes = AESGCM(self._key)
        plaintext = aes.decrypt(nonce, ciphertext, None)

        return json.loads(plaintext.decode("utf-8"))

    def save(
        self,
        user_id: str,
        channel: str,
        provider: str,
        credentials: Dict[str, Any],
    ) -> None:
        if not user_id:
            raise ValueError("user_id is required")

        if not channel:
            raise ValueError("channel is required")

        if not provider:
            raise ValueError("provider is required")

        if not isinstance(credentials, dict) or not credentials:
            raise ValueError("credentials must be a non-empty object")

        encrypted = self._encrypt(credentials)

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO communication_credentials(
                    user_id,
                    channel,
                    provider,
                    encrypted_credentials,
                    updated_at
                )
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, channel, provider)
                DO UPDATE SET
                    encrypted_credentials=excluded.encrypted_credentials,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (
                    user_id,
                    channel,
                    provider,
                    encrypted,
                ),
            )
            conn.commit()

    def get(
        self,
        user_id: str,
        channel: str,
        provider: str,
    ) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                """
                SELECT encrypted_credentials
                FROM communication_credentials
                WHERE user_id = ?
                  AND channel = ?
                  AND provider = ?
                """,
                (
                    user_id,
                    channel,
                    provider,
                ),
            ).fetchone()

        if not row:
            return None

        return self._decrypt(row[0])

    def delete(
        self,
        user_id: str,
        channel: str,
        provider: str,
    ) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """
                DELETE FROM communication_credentials
                WHERE user_id = ?
                  AND channel = ?
                  AND provider = ?
                """,
                (
                    user_id,
                    channel,
                    provider,
                ),
            )
            conn.commit()

            return cursor.rowcount > 0

    def find_user_by_phone_number_id(
        self,
        channel: str,
        provider: str,
        phone_number_id: str,
    ) -> Optional[str]:
        """Resolve the owning AURA user without exposing decrypted credentials."""
        phone_number_id = str(phone_number_id or "").strip()

        if not phone_number_id:
            return None

        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                """
                SELECT user_id, encrypted_credentials
                FROM communication_credentials
                WHERE channel = ?
                  AND provider = ?
                """,
                (channel, provider),
            ).fetchall()

        for user_id, encrypted_credentials in rows:
            try:
                credentials = self._decrypt(encrypted_credentials)
            except Exception:
                continue

            stored_phone_number_id = str(
                credentials.get("phone_number_id", "")
            ).strip()

            if stored_phone_number_id == phone_number_id:
                return str(user_id)

        return None

    def has(
        self,
        user_id: str,
        channel: str,
        provider: str,
    ) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                """
                SELECT 1
                FROM communication_credentials
                WHERE user_id = ?
                  AND channel = ?
                  AND provider = ?
                LIMIT 1
                """,
                (
                    user_id,
                    channel,
                    provider,
                ),
            ).fetchone()

        return row is not None
