import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("AURA_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("AURA_WORKSPACE_ROOT", str(tmp_path / "workspace"))

    import python_brain.main as main

    return TestClient(main.app)


def test_whatsapp_status_is_not_configured(client):
    response = client.get(
        "/api/brain/communication/whatsapp/status",
        params={"user_id": "test_whatsapp_user"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["channel"] == "whatsapp"
    assert data["status"] == "NOT_CONFIGURED"


def test_whatsapp_send_requires_permission_confirmation(client):
    response = client.post(
        "/api/brain/communication/whatsapp/send",
        json={
            "user_id": "test_whatsapp_user",
            "address": "919999999999",
            "content": "AURA WhatsApp permission test",
            "confirmed": False,
        },
    )

    assert response.status_code == 409

    data = response.json()

    assert data["detail"]["code"] == "CONFIRMATION_REQUIRED"


def test_whatsapp_disconnect_requires_confirmation(client):
    response = client.post(
        "/api/brain/communication/whatsapp/disconnect",
        params={"user_id": "test_whatsapp_user"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "CONFIRMATION_REQUIRED"


def test_whatsapp_cloud_api_transport_maps_success_response(tmp_path, monkeypatch):
    from python_brain.integrations.communication import (
        CommunicationChannel,
        Contact,
        SendMessageRequest,
    )
    from python_brain.integrations.communication_token_store import (
        CommunicationCredentialStore,
    )
    from python_brain.integrations.whatsapp import WhatsAppAdapter

    monkeypatch.setenv(
        "ENCRYPTION_KEY",
        "test-whatsapp-encryption-key-123456789",
    )

    store = CommunicationCredentialStore(
        db_path=str(tmp_path / "credentials.db"),
    )

    store.save(
        user_id="cloud_user",
        channel=CommunicationChannel.WHATSAPP.value,
        provider="whatsapp_business",
        credentials={
            "access_token": "test-access-token",
            "phone_number_id": "123456789",
            "api_version": "v23.0",
        },
    )

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "messages": [
                    {
                        "id": "wamid.TEST_MESSAGE_ID",
                    }
                ]
            }

    class FakeSession:
        def post(self, *args, **kwargs):
            return FakeResponse()

    adapter = WhatsAppAdapter(
        credential_store=store,
        provider="whatsapp_business",
        http_session=FakeSession(),
    )

    result = adapter.send(
        SendMessageRequest(
            user_id="cloud_user",
            contact=Contact(
                contact_id="wa:cloud_user:919999999999",
                user_id="cloud_user",
                name="Test User",
                address="919999999999",
                channel=CommunicationChannel.WHATSAPP,
            ),
            content="AURA Cloud API transport test",
        )
    )

    assert result.success is True
    assert result.status.value == "sent"
    assert result.provider_message_id == "wamid.TEST_MESSAGE_ID"


def test_whatsapp_cloud_api_transport_never_fakes_success_on_provider_error(
    tmp_path,
    monkeypatch,
):
    from python_brain.integrations.communication import (
        CommunicationChannel,
        Contact,
        SendMessageRequest,
    )
    from python_brain.integrations.communication_token_store import (
        CommunicationCredentialStore,
    )
    from python_brain.integrations.whatsapp import WhatsAppAdapter

    monkeypatch.setenv(
        "ENCRYPTION_KEY",
        "test-whatsapp-encryption-key-123456789",
    )

    store = CommunicationCredentialStore(
        db_path=str(tmp_path / "credentials.db"),
    )

    store.save(
        user_id="cloud_user",
        channel=CommunicationChannel.WHATSAPP.value,
        provider="whatsapp_business",
        credentials={
            "access_token": "test-access-token",
            "phone_number_id": "123456789",
            "api_version": "v23.0",
        },
    )

    class FakeResponse:
        status_code = 400

        def json(self):
            return {
                "error": {
                    "message": "Invalid OAuth access token",
                    "code": 190,
                }
            }

    class FakeSession:
        def post(self, *args, **kwargs):
            return FakeResponse()

    adapter = WhatsAppAdapter(
        credential_store=store,
        provider="whatsapp_business",
        http_session=FakeSession(),
    )

    result = adapter.send(
        SendMessageRequest(
            user_id="cloud_user",
            contact=Contact(
                contact_id="wa:cloud_user:919999999999",
                user_id="cloud_user",
                name="Test User",
                address="919999999999",
                channel=CommunicationChannel.WHATSAPP,
            ),
            content="This must not be reported as sent",
        )
    )

    assert result.success is False
    assert result.status.value == "failed"
    assert result.provider_message_id is None
    assert "Invalid OAuth access token" in (result.error or "")


def test_whatsapp_configure_validates_then_encrypts_credentials(
    client,
    monkeypatch,
):
    import python_brain.main as main

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "id": "123456789",
                "display_phone_number": "+919999999999",
            }

    class FakeSession:
        def get(self, *args, **kwargs):
            return FakeResponse()

    main.whatsapp_adapter.http = FakeSession()

    response = client.post(
        "/api/brain/communication/whatsapp/configure",
        json={
            "user_id": "configure_test_user",
            "access_token": "secret-test-token",
            "phone_number_id": "123456789",
            "api_version": "v23.0",
            "confirmed": True,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["channel"] == "whatsapp"
    assert data["provider"] == "whatsapp_business"
    assert data["status"] == "CONNECTED"
    assert "access_token" not in data

    credentials = main.communication_credential_store.get(
        user_id="configure_test_user",
        channel="whatsapp",
        provider="whatsapp_business",
    )

    assert credentials is not None
    assert credentials["access_token"] == "secret-test-token"
    assert credentials["phone_number_id"] == "123456789"
    assert credentials["api_version"] == "v23.0"


def test_whatsapp_configure_does_not_store_rejected_credentials(
    client,
    monkeypatch,
):
    import python_brain.main as main

    class FakeResponse:
        status_code = 400

        def json(self):
            return {
                "error": {
                    "message": "Invalid OAuth access token",
                    "code": 190,
                }
            }

    class FakeSession:
        def get(self, *args, **kwargs):
            return FakeResponse()

    main.whatsapp_adapter.http = FakeSession()

    response = client.post(
        "/api/brain/communication/whatsapp/configure",
        json={
            "user_id": "rejected_configure_user",
            "access_token": "invalid-test-token",
            "phone_number_id": "123456789",
            "api_version": "v23.0",
            "confirmed": True,
        },
    )

    assert response.status_code == 400

    data = response.json()

    assert data["detail"]["code"] == "WHATSAPP_VALIDATION_FAILED"
    assert "invalid-test-token" not in str(data)

    credentials = main.communication_credential_store.get(
        user_id="rejected_configure_user",
        channel="whatsapp",
        provider="whatsapp_business",
    )

    assert credentials is None


def test_whatsapp_configure_audit_never_records_access_token(
    client,
    monkeypatch,
):
    import python_brain.main as main

    class FakeResponse:
        status_code = 200

        def json(self):
            return {"id": "123456789"}

    class FakeSession:
        def get(self, *args, **kwargs):
            return FakeResponse()

    main.whatsapp_adapter.http = FakeSession()

    response = client.post(
        "/api/brain/communication/whatsapp/configure",
        json={
            "user_id": "audit_whatsapp_user",
            "access_token": "SUPER_SECRET_TOKEN_MUST_NOT_BE_LOGGED",
            "phone_number_id": "123456789",
            "api_version": "v23.0",
            "confirmed": True,
        },
    )

    assert response.status_code == 200

    logs = main.brain.audit.get_recent_logs(
        user_id="audit_whatsapp_user",
        limit=20,
    )

    configure_logs = [
        log for log in logs
        if log["tool_name"] == "whatsapp"
        and log["action_type"] == "INTEGRATION_CONFIGURE"
    ]

    assert configure_logs

    serialized_logs = str(configure_logs)

    assert "SUPER_SECRET_TOKEN_MUST_NOT_BE_LOGGED" not in serialized_logs
    assert "access_token" not in serialized_logs


def test_whatsapp_configure_audit_records_rejected_validation(
    client,
    monkeypatch,
):
    import python_brain.main as main

    class FakeResponse:
        status_code = 400

        def json(self):
            return {
                "error": {
                    "message": "Invalid OAuth access token",
                    "code": 190,
                }
            }

    class FakeSession:
        def get(self, *args, **kwargs):
            return FakeResponse()

    main.whatsapp_adapter.http = FakeSession()

    response = client.post(
        "/api/brain/communication/whatsapp/configure",
        json={
            "user_id": "audit_rejected_user",
            "access_token": "REJECTED_SECRET_TOKEN",
            "phone_number_id": "123456789",
            "api_version": "v23.0",
            "confirmed": True,
        },
    )

    assert response.status_code == 400

    logs = main.brain.audit.get_recent_logs(
        user_id="audit_rejected_user",
        limit=20,
    )

    configure_logs = [
        log for log in logs
        if log["tool_name"] == "whatsapp"
        and log["action_type"] == "INTEGRATION_CONFIGURE"
    ]

    assert configure_logs

    serialized_logs = str(configure_logs)

    assert "REJECTED_SECRET_TOKEN" not in serialized_logs
    assert "access_token" not in serialized_logs


def test_whatsapp_webhook_verification(client, monkeypatch):
    import python_brain.main as main

    monkeypatch.setenv(
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
        "aura-test-verify-token",
    )

    response = client.get(
        "/api/brain/communication/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "aura-test-verify-token",
            "hub.challenge": "123456",
        },
    )

    assert response.status_code == 200
    assert response.json() == 123456


def test_whatsapp_webhook_rejects_invalid_verification_token(client, monkeypatch):
    monkeypatch.setenv(
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
        "aura-test-verify-token",
    )

    response = client.get(
        "/api/brain/communication/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong-token",
            "hub.challenge": "123456",
        },
    )

    assert response.status_code == 403


def test_whatsapp_webhook_rejects_invalid_signature(client, monkeypatch):
    import json

    monkeypatch.setenv(
        "WHATSAPP_APP_SECRET",
        "aura-test-app-secret",
    )

    payload = {
        "object": "whatsapp_business_account",
        "entry": [],
    }

    response = client.post(
        "/api/brain/communication/whatsapp/webhook",
        content=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": "sha256=invalid",
        },
    )

    assert response.status_code == 403


def test_whatsapp_webhook_processes_inbound_and_replies_once(
    client,
    monkeypatch,
):
    import hashlib
    import hmac
    import json
    import python_brain.main as main

    monkeypatch.setenv(
        "ENCRYPTION_KEY",
        "test-whatsapp-encryption-key-123456789",
    )
    monkeypatch.setenv(
        "WHATSAPP_APP_SECRET",
        "aura-test-app-secret",
    )

    user_id = "webhook_test_user"
    phone_number_id = "987654321"
    sender = "919999999999"
    provider_message_id = "wamid.INBOUND_TEST_001"

    main.communication_credential_store.save(
        user_id=user_id,
        channel="whatsapp",
        provider="whatsapp_business",
        credentials={
            "access_token": "test-access-token",
            "phone_number_id": phone_number_id,
            "api_version": "v23.0",
            "base_url": "https://graph.facebook.com",
        },
    )

    brain_calls = []
    send_calls = []

    def fake_process_turn(**kwargs):
        brain_calls.append(kwargs)
        return {
            "success": True,
            "intent": "CONVERSATION",
            "response": "AURA test reply",
            "tasks_created": 0,
        }

    class FakeManagerResult:
        success = True
        integration = "whatsapp"
        action = "send_message"
        error = None
        metadata = {}
        data = {
            "status": "sent",
        }

    def fake_execute(**kwargs):
        send_calls.append(kwargs)
        return FakeManagerResult()

    monkeypatch.setattr(
        main.brain,
        "process_turn",
        fake_process_turn,
    )
    monkeypatch.setattr(
        main.communication_integration_manager,
        "execute",
        fake_execute,
    )

    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "business-account-test",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "+919888888888",
                                "phone_number_id": phone_number_id,
                            },
                            "messages": [
                                {
                                    "from": sender,
                                    "id": provider_message_id,
                                    "timestamp": "1760000000",
                                    "type": "text",
                                    "text": {
                                        "body": "Hello AURA",
                                    },
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    raw_body = json.dumps(
        payload,
        separators=(",", ":"),
    ).encode("utf-8")

    signature = hmac.new(
        b"aura-test-app-secret",
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    response = client.post(
        "/api/brain/communication/whatsapp/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": f"sha256={signature}",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["processed"] == 1
    assert data["duplicates"] == 0
    assert data["replies_sent"] == 1

    assert len(brain_calls) == 1
    assert brain_calls[0]["prompt"] == "Hello AURA"
    assert brain_calls[0]["user_id"] == user_id
    assert brain_calls[0]["session_id"] == f"whatsapp:{sender}"
    assert brain_calls[0]["idempotency_key"] == f"whatsapp:{provider_message_id}"

    assert len(send_calls) == 1
    assert send_calls[0]["arguments"]["address"] == sender
    assert send_calls[0]["arguments"]["content"] == "AURA test reply"

    # Provider retry of the exact same message must not execute again.
    response_retry = client.post(
        "/api/brain/communication/whatsapp/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": f"sha256={signature}",
        },
    )

    assert response_retry.status_code == 200

    retry_data = response_retry.json()

    assert retry_data["success"] is True
    assert retry_data["processed"] == 0
    assert retry_data["duplicates"] == 1
    assert retry_data["replies_sent"] == 0

    assert len(brain_calls) == 1
    assert len(send_calls) == 1
