"""
Secure Gmail OAuth token storage.

Tokens are encrypted at rest with AES-256-GCM.
The encryption key must come from the environment.

No OAuth client secret or access token is hard-coded.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import sqlite3
from pathlib import Path
from typing import Optional


class GmailTokenStore:
    def __init__(
        self,
        db_path: str = "data/aura_gmail_tokens.db",
        encryption_key: Optional[str] = None,
    ):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        self._key_source = encryption_key or os.getenv("ENCRYPTION_KEY")
        self._key = self._derive_key(self._key_source)

        self._init_db()

    @staticmethod
    def _derive_key(value: Optional[str]) -> bytes:
        if not value:
            raise RuntimeError(
                "ENCRYPTION_KEY is required for Gmail token storage"
            )

        return hashlib.sha256(value.encode("utf-8")).digest()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS gmail_tokens (
                    user_id TEXT PRIMARY KEY,
                    encrypted_token TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.commit()

    def _encrypt(self, payload: dict) -> str:
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        except ImportError as exc:
            raise RuntimeError(
                "cryptography package is required for Gmail token encryption"
            ) from exc

        nonce = secrets.token_bytes(12)
        aes = AESGCM(self._key)
        plaintext = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        ciphertext = aes.encrypt(nonce, plaintext, None)

        return base64.urlsafe_b64encode(
            nonce + ciphertext
        ).decode("ascii")

    def _decrypt(self, value: str) -> dict:
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        except ImportError as exc:
            raise RuntimeError(
                "cryptography package is required for Gmail token encryption"
            ) from exc

        raw = base64.urlsafe_b64decode(value.encode("ascii"))
        nonce = raw[:12]
        ciphertext = raw[12:]

        aes = AESGCM(self._key)
        plaintext = aes.decrypt(nonce, ciphertext, None)

        return json.loads(plaintext.decode("utf-8"))

    def save_token(
        self,
        user_id: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        expires_at: Optional[int] = None,
        scope: Optional[str] = None,
    ) -> None:
        if not user_id:
            raise ValueError("user_id is required")

        if not access_token:
            raise ValueError("access_token is required")

        payload = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at,
            "scope": scope,
        }

        encrypted = self._encrypt(payload)

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO gmail_tokens(user_id, encrypted_token, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    encrypted_token=excluded.encrypted_token,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (user_id, encrypted),
            )
            conn.commit()

    def get_token(self, user_id: str) -> Optional[dict]:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                """
                SELECT encrypted_token
                FROM gmail_tokens
                WHERE user_id = ?
                """,
                (user_id,),
            ).fetchone()

        if not row:
            return None

        return self._decrypt(row[0])

    def delete_token(self, user_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """
                DELETE FROM gmail_tokens
                WHERE user_id = ?
                """,
                (user_id,),
            )
            conn.commit()
            return cursor.rowcount > 0

    def has_token(self, user_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                """
                SELECT 1
                FROM gmail_tokens
                WHERE user_id = ?
                LIMIT 1
                """,
                (user_id,),
            ).fetchone()

        return row is not None
