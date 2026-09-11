import unittest

from python_brain.integrations.core import (
    IntegrationContext,
    IntegrationManager,
    IntegrationStatus,
)
from python_brain.integrations.gmail import GmailAdapter


class FakeResponse:

    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code
        self.ok = 200 <= status_code < 300

    def json(self):
        return self._data


class FakeHTTP:

    def __init__(self):
        self.calls = []

    def request(
        self,
        method,
        url,
        headers,
        params=None,
        json=None,
        timeout=30,
    ):
        self.calls.append({
            "method": method,
            "url": url,
            "headers": headers,
            "params": params,
            "json": json,
            "timeout": timeout,
        })

        if url.endswith("/profile"):
            return FakeResponse({
                "emailAddress": "test@example.com",
                "messagesTotal": 10,
            })

        if url.endswith("/messages"):
            return FakeResponse({
                "messages": [
                    {"id": "m1", "threadId": "t1"}
                ],
                "resultSizeEstimate": 1,
            })

        if url.endswith("/messages/send"):
            return FakeResponse({
                "id": "sent-1",
                "threadId": "thread-1",
            })

        if url.endswith("/drafts"):
            return FakeResponse({
                "id": "draft-1",
            })

        if "/trash" in url:
            return FakeResponse({
                "id": "trash-1",
            })

        return FakeResponse({
            "id": "generic-1",
        })


class TestGmailAdapter(unittest.TestCase):

    def test_without_token_provider_is_not_configured(self):
        adapter = GmailAdapter()

        self.assertEqual(
            adapter.status("user-1"),
            IntegrationStatus.NOT_CONFIGURED,
        )

    def test_without_token_is_disconnected(self):
        adapter = GmailAdapter(
            token_provider=lambda user_id: None
        )

        self.assertEqual(
            adapter.status("user-1"),
            IntegrationStatus.DISCONNECTED,
        )

    def test_with_token_is_connected(self):
        adapter = GmailAdapter(
            token_provider=lambda user_id: "TEST_TOKEN"
        )

        self.assertEqual(
            adapter.status("user-1"),
            IntegrationStatus.CONNECTED,
        )

    def test_profile_uses_real_gmail_endpoint(self):
        http = FakeHTTP()

        adapter = GmailAdapter(
            token_provider=lambda user_id: "TEST_TOKEN",
            http_session=http,
        )

        manager = IntegrationManager()
        manager.register(adapter)

        result = manager.execute(
            integration_id="gmail",
            action="profile",
            arguments={},
            context=IntegrationContext(
                user_id="user-1"
            ),
        )

        self.assertTrue(result.success)
        self.assertEqual(
            result.data["emailAddress"],
            "test@example.com",
        )

        call = http.calls[-1]

        self.assertEqual(
            call["method"],
            "GET",
        )

        self.assertTrue(
            call["url"].endswith(
                "/users/me/profile"
            )
        )

        self.assertEqual(
            call["headers"]["Authorization"],
            "Bearer TEST_TOKEN",
        )

    def test_message_search_passes_query(self):
        http = FakeHTTP()

        adapter = GmailAdapter(
            token_provider=lambda user_id: "TEST_TOKEN",
            http_session=http,
        )

        result = adapter.execute(
            action="list_messages",
            arguments={
                "q": "is:unread",
                "max_results": 5,
            },
            context=IntegrationContext(
                user_id="user-1"
            ),
        )

        self.assertTrue(result.success)

        call = http.calls[-1]

        self.assertEqual(
            call["params"]["q"],
            "is:unread",
        )

        self.assertEqual(
            call["params"]["maxResults"],
            5,
        )

    def test_send_message_uses_gmail_send_endpoint(self):
        http = FakeHTTP()

        adapter = GmailAdapter(
            token_provider=lambda user_id: "TEST_TOKEN",
            http_session=http,
        )

        result = adapter.execute(
            action="send_message",
            arguments={
                "raw": "BASE64URL_MESSAGE",
            },
            context=IntegrationContext(
                user_id="user-1"
            ),
        )

        self.assertTrue(result.success)

        call = http.calls[-1]

        self.assertEqual(
            call["method"],
            "POST",
        )

        self.assertTrue(
            call["url"].endswith(
                "/users/me/messages/send"
            )
        )

        self.assertEqual(
            call["json"]["raw"],
            "BASE64URL_MESSAGE",
        )

    def test_trash_requires_confirmation(self):
        adapter = GmailAdapter(
            token_provider=lambda user_id: "TEST_TOKEN"
        )

        manager = IntegrationManager()
        manager.register(adapter)

        with self.assertRaises(Exception):
            manager.execute(
                integration_id="gmail",
                action="trash_message",
                arguments={
                    "message_id": "m1"
                },
                context=IntegrationContext(
                    user_id="user-1",
                    confirmed=False,
                ),
            )

    def test_trash_executes_after_confirmation(self):
        http = FakeHTTP()

        adapter = GmailAdapter(
            token_provider=lambda user_id: "TEST_TOKEN",
            http_session=http,
        )

        manager = IntegrationManager()
        manager.register(adapter)

        result = manager.execute(
            integration_id="gmail",
            action="trash_message",
            arguments={
                "message_id": "m1"
            },
            context=IntegrationContext(
                user_id="user-1",
                confirmed=True,
            ),
        )

        self.assertTrue(result.success)

        self.assertTrue(
            http.calls[-1]["url"].endswith(
                "/users/me/messages/m1/trash"
            )
        )


if __name__ == "__main__":
    unittest.main()
