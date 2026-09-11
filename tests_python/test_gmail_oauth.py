import os
import tempfile
import unittest
from unittest.mock import patch

from python_brain.integrations.gmail_oauth import GmailOAuthService
from python_brain.integrations.gmail_token_store import GmailTokenStore


class TestGmailOAuth(unittest.TestCase):

    def test_authorization_url_uses_gmail_scopes(self):
        with patch.dict(
            os.environ,
            {
                "GOOGLE_CLIENT_ID": "client",
                "GOOGLE_CLIENT_SECRET": "secret",
                "GMAIL_CALLBACK_URL": "https://example.test/api/integrations/gmail/callback",
            },
            clear=False,
        ):
            service = GmailOAuthService()
            url = service.create_authorization_url("user-1")

            self.assertIn("gmail.readonly", url)
            self.assertIn("gmail.compose", url)
            self.assertIn("gmail.modify", url)
            self.assertIn("access_type=offline", url)
            self.assertIn("prompt=consent", url)

    def test_state_is_single_use(self):
        with patch.dict(
            os.environ,
            {
                "GOOGLE_CLIENT_ID": "client",
                "GOOGLE_CLIENT_SECRET": "secret",
                "GMAIL_CALLBACK_URL": "https://example.test/callback",
            },
            clear=False,
        ):
            service = GmailOAuthService()
            url = service.create_authorization_url("user-1")

            state = url.split("state=", 1)[1]
            state = state.split("&", 1)[0]

            record = service.consume_state(state)

            self.assertEqual(record.user_id, "user-1")

            with self.assertRaises(ValueError):
                service.consume_state(state)

    def test_missing_config_is_rejected(self):
        with patch.dict(
            os.environ,
            {
                "GOOGLE_CLIENT_ID": "",
                "GOOGLE_CLIENT_SECRET": "",
                "GMAIL_CALLBACK_URL": "",
            },
            clear=False,
        ):
            service = GmailOAuthService()

            self.assertFalse(service.configured)

            with self.assertRaises(RuntimeError):
                service.create_authorization_url("user-1")

    def test_token_store_encrypts_and_round_trips(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "tokens.db")

            store = GmailTokenStore(
                db_path=path,
                encryption_key="test-encryption-key",
            )

            store.save_token(
                user_id="user-1",
                access_token="ACCESS_SECRET",
                refresh_token="REFRESH_SECRET",
                expires_at=123456,
                scope="gmail.readonly",
            )

            loaded = store.get_token("user-1")

            self.assertEqual(
                loaded["access_token"],
                "ACCESS_SECRET",
            )
            self.assertEqual(
                loaded["refresh_token"],
                "REFRESH_SECRET",
            )

            with open(path, "rb") as fh:
                raw = fh.read()

            self.assertNotIn(
                b"ACCESS_SECRET",
                raw,
            )
            self.assertNotIn(
                b"REFRESH_SECRET",
                raw,
            )

    def test_token_delete(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "tokens.db")

            store = GmailTokenStore(
                db_path=path,
                encryption_key="test-encryption-key",
            )

            store.save_token(
                user_id="user-1",
                access_token="secret",
            )

            self.assertTrue(store.has_token("user-1"))
            self.assertTrue(store.delete_token("user-1"))
            self.assertFalse(store.has_token("user-1"))
            self.assertFalse(store.delete_token("user-1"))


if __name__ == "__main__":
    unittest.main()
