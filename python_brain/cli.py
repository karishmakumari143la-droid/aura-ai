#!/usr/bin/env python3
"""
AURA AI — CLI & JSON-RPC Bridge
Allows server.ts (Node.js/Express) to invoke AuraBrain capabilities directly via JSON.
"""

import sys
import json
import os
import logging

logging.basicConfig(stream=sys.stderr, level=logging.INFO)

from python_brain.brain import AuraBrain

def _load_local_env():
    """Load simple KEY=VALUE entries from the project .env without logging secrets."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.isfile(env_path):
        return

    try:
        with open(env_path, "r", encoding="utf-8") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue

                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()

                if not key:
                    continue

                if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
                    value = value[1:-1]

                os.environ.setdefault(key, value)
    except OSError:
        return


def main():
    _load_local_env()
    try:
        if len(sys.argv) >= 2:
            raw_input = sys.argv[1]
        else:
            raw_input = sys.stdin.read()

        if not raw_input.strip():
            print(json.dumps({
                "success": False,
                "error": "No input payload provided"
            }))
            sys.exit(1)

        payload = json.loads(raw_input)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON payload: {str(e)}"}))
        sys.exit(1)

    action = payload.get("action", "turn")

    # Use one shared persistent runtime configuration.
    # Explicit payload values win; environment variables provide
    # the server/runtime defaults.
    workspace = (
        payload.get("workspace_root")
        or os.environ.get("AURA_WORKSPACE_ROOT")
    )

    # Keep persistent project data authoritative unless an explicit
    # payload data_dir is supplied. The CLI may inherit a temporary
    # runtime AURA_DATA_DIR from the server/launcher; that must not
    # split durable state across different SQLite databases.
    data_dir = (
        payload.get("data_dir")
        or "/workspaces/aura-ai/data"
    )

    brain = AuraBrain(
        workspace_root=workspace,
        data_dir=data_dir,
    )

    if action == "status":
        status = brain.get_system_status()
        print(json.dumps({"success": True, "status": status, **status}))
        return

    if action == "background_task":
        from .runtime.background import BackgroundTaskManager, DurableTaskDispatcher

        user_id = payload.get("user_id", "")
        title = payload.get("title", "")
        command = payload.get("command")
        scope_id = payload.get("scope_id")
        grant_id = payload.get("grant_id")

        if not user_id or not title:
            print(json.dumps({
                "success": False,
                "error": "user_id and title are required"
            }))
            return

        from .security.permissions import PermissionKey

        task_db_path = os.path.join(
            brain.data_dir,
            "aura_tasks.db",
        )

        task_manager = BackgroundTaskManager(
            db_path=task_db_path,
        )

        dispatcher = DurableTaskDispatcher(
            manager=task_manager,
            brain=brain,
        )

        if command:
            scope_id = scope_id or f"background:{user_id}:{title}"

            allowed, msg, state = brain.permissions.check_permission(
                user_id=user_id,
                perm_key=PermissionKey.TERMINAL_EXECUTION.value,
                interactive_confirm=False,
                grant_id=grant_id,
                scope_id=scope_id
            )

            if allowed and state == "grant":
                consumed = brain.permissions.consume_grant(
                    grant_id=grant_id or "",
                    user_id=user_id,
                    perm_key=PermissionKey.TERMINAL_EXECUTION.value,
                    scope_id=scope_id
                )
                if not consumed:
                    print(json.dumps({
                        "success": False,
                        "error": "Permission grant could not be consumed safely.",
                        "permission_state": "deny",
                        "status": "BLOCKED",
                        "scope_id": scope_id
                    }))
                    return

            if not allowed:
                waiting = state == "ask"
                print(json.dumps({
                    "success": False,
                    "error": msg,
                    "permission_state": state,
                    "requires_confirmation": waiting,
                    "status": "WAITING_FOR_APPROVAL" if waiting else "BLOCKED",
                    "scope_id": scope_id
                }))
                return

            task_id = task_manager.create_durable_task(
                user_id=user_id,
                title=title,
                task_type="terminal_command",
                payload={
                    "command": command,
                    "cwd": brain.workspace_root,
                },
            )

            dispatcher.dispatch_task_async(task_id)

            print(json.dumps({
                "success": True,
                "task_id": task_id,
                "status": "QUEUED",
                "scope_id": scope_id,
                "durable": True,
            }))
            return

        task_id = task_manager.create_task(
            user_id=user_id,
            title=title,
        )

        print(json.dumps({
            "success": True,
            "task_id": task_id,
            "status": "QUEUED",
            "scope_id": scope_id,
            "durable": False,
        }))
        return

    if action == "background_task_status":
        from .runtime.background import BackgroundTaskManager

        task_id = payload.get("task_id", "")
        user_id = payload.get("user_id", "")

        if not task_id or not user_id:
            print(json.dumps({
                "success": False,
                "error": "task_id and user_id are required"
            }))
            return

        # Background task status must use the same persistent database
        # as task creation/execution. Ignore inherited temporary
        # AURA_DATA_DIR unless an explicit payload data_dir is supplied.
        data_dir = (
            payload.get("data_dir")
            or brain.data_dir
        )

        task_manager = BackgroundTaskManager(
            db_path=os.path.join(
                data_dir,
                "aura_tasks.db",
            )
        )

        task = task_manager.get_task(
            task_id,
            user_id=user_id,
        )

        if not task:
            print(json.dumps({
                "success": False,
                "error": "Task not found"
            }))
            return

        print(json.dumps({
            "success": True,
            "task": task
        }))
        return

    if action == "whatsapp_webhook_verify":
        from urllib.parse import parse_qs

        query = payload.get("query") or {}

        def query_value(name):
            value = query.get(name)
            if isinstance(value, list):
                return str(value[0]) if value else ""
            return str(value or "")

        hub_mode = query_value("hub.mode")
        hub_verify_token = query_value("hub.verify_token")
        hub_challenge = query_value("hub.challenge")

        expected_token = os.environ.get(
            "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
            ""
        ).strip()

        import hmac

        if (
            hub_mode != "subscribe"
            or not expected_token
            or not hub_verify_token
            or not hmac.compare_digest(
                hub_verify_token,
                expected_token,
            )
        ):
            print(json.dumps({
                "success": False,
                "error_code": "INVALID_VERIFY_TOKEN",
                "error": "WhatsApp webhook verification failed."
            }))
            return

        if not hub_challenge:
            print(json.dumps({
                "success": False,
                "error": "hub.challenge is required."
            }))
            return

        challenge = (
            int(hub_challenge)
            if hub_challenge.isdigit()
            else hub_challenge
        )

        print(json.dumps({
            "success": True,
            "challenge": challenge
        }))
        return

    if action == "whatsapp_webhook":
        import asyncio
        from .main import process_whatsapp_webhook

        raw_body_value = payload.get("raw_body", "")
        if not isinstance(raw_body_value, str):
            print(json.dumps({
                "success": False,
                "error": "raw_body must be a string"
            }))
            return

        signature = str(
            payload.get("signature", "")
        ).strip()

        result = asyncio.run(
            process_whatsapp_webhook(
                raw_body=raw_body_value.encode("utf-8"),
                signature=signature,
            )
        )

        print(json.dumps(result))
        return

    if action == "whatsapp_oauth_store":
        from .integrations.communication_token_store import CommunicationCredentialStore

        user_id = str(payload.get("user_id", "")).strip()
        phone_number_id = str(payload.get("phone_number_id", "")).strip()
        access_token = str(payload.get("access_token", "")).strip()
        api_version = str(payload.get("api_version", "v23.0")).strip()
        base_url = str(
            payload.get("base_url", "https://graph.facebook.com")
        ).strip()
        waba_id = str(payload.get("waba_id", "")).strip()

        if not user_id:
            print(json.dumps({
                "success": False,
                "error": "user_id is required"
            }))
            return

        if not phone_number_id:
            print(json.dumps({
                "success": False,
                "error": "phone_number_id is required"
            }))
            return

        if not access_token:
            print(json.dumps({
                "success": False,
                "error": "access_token is required"
            }))
            return

        if not waba_id:
            print(json.dumps({
                "success": False,
                "error": "waba_id is required"
            }))
            return

        if not base_url.startswith("https://"):
            print(json.dumps({
                "success": False,
                "error": "base_url must use HTTPS"
            }))
            return

        credential_store = CommunicationCredentialStore(
            db_path=os.path.join(
                brain.data_dir,
                "aura_communication_credentials.db",
            )
        )

        credentials = {
            "access_token": access_token,
            "phone_number_id": phone_number_id,
            "waba_id": waba_id,
            "api_version": api_version,
            "base_url": base_url,
        }

        credential_store.save(
            user_id=user_id,
            channel="whatsapp",
            provider="whatsapp_business",
            credentials=credentials,
        )

        print(json.dumps({
            "success": True,
            "status": "STORED",
            "channel": "whatsapp",
            "provider": "whatsapp_business",
            "phone_number_id": phone_number_id,
            "waba_id": waba_id,
        }))
        return

    if action == "whatsapp_oauth_provision":
        from .integrations.communication_token_store import CommunicationCredentialStore
        import requests

        user_id = str(payload.get("user_id", "")).strip()
        access_token = str(payload.get("access_token", "")).strip()
        api_version = str(payload.get("api_version", "v23.0")).strip()
        base_url = str(
            payload.get("base_url", "https://graph.facebook.com")
        ).strip().rstrip("/")

        if not user_id or not access_token:
            print(json.dumps({
                "success": False,
                "error": "user_id and access_token are required"
            }))
            return

        if not base_url.startswith("https://"):
            print(json.dumps({
                "success": False,
                "error": "base_url must use HTTPS"
            }))
            return

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        session = requests.Session()

        try:
            businesses_response = session.get(
                f"{base_url}/{api_version}/me/businesses",
                headers=headers,
                params={
                    "fields": "id,name",
                    "limit": "100"
                },
                timeout=20,
            )
        except requests.RequestException as exc:
            print(json.dumps({
                "success": False,
                "error": f"Meta business discovery failed: {exc}"
            }))
            return

        if not 200 <= businesses_response.status_code < 300:
            print(json.dumps({
                "success": False,
                "error": "Meta business discovery was rejected.",
                "provider_status": businesses_response.status_code
            }))
            return

        businesses = businesses_response.json().get("data") or []

        if not businesses:
            print(json.dumps({
                "success": False,
                "error": "No Meta Business portfolio is available to this authorized connection."
            }))
            return

        selected_waba = None

        for business in businesses:
            business_id = str(business.get("id", "")).strip()

            if not business_id:
                continue

            try:
                waba_response = session.get(
                    f"{base_url}/{api_version}/{business_id}/client_whatsapp_business_accounts",
                    headers=headers,
                    params={
                        "fields": "id,name",
                        "limit": "100"
                    },
                    timeout=20,
                )
            except requests.RequestException:
                continue

            if not 200 <= waba_response.status_code < 300:
                continue

            wabas = waba_response.json().get("data") or []

            if wabas:
                selected_waba = {
                    "business_id": business_id,
                    "waba": wabas[0]
                }
                break

        if not selected_waba:
            print(json.dumps({
                "success": False,
                "error": "No WhatsApp Business Account is available to this authorized connection."
            }))
            return

        waba_id = str(selected_waba["waba"].get("id", "")).strip()

        if not waba_id:
            print(json.dumps({
                "success": False,
                "error": "Meta returned an invalid WhatsApp Business Account."
            }))
            return

        try:
            phone_response = session.get(
                f"{base_url}/{api_version}/{waba_id}/phone_numbers",
                headers=headers,
                params={
                    "fields": "id,display_phone_number,verified_name",
                    "limit": "100"
                },
                timeout=20,
            )
        except requests.RequestException as exc:
            print(json.dumps({
                "success": False,
                "error": f"Meta phone-number discovery failed: {exc}"
            }))
            return

        if not 200 <= phone_response.status_code < 300:
            print(json.dumps({
                "success": False,
                "error": "Meta phone-number discovery was rejected.",
                "provider_status": phone_response.status_code
            }))
            return

        phone_numbers = phone_response.json().get("data") or []

        if not phone_numbers:
            print(json.dumps({
                "success": False,
                "error": "No WhatsApp Business phone number is available for the authorized WABA."
            }))
            return

        phone = phone_numbers[0]
        phone_number_id = str(phone.get("id", "")).strip()

        if not phone_number_id:
            print(json.dumps({
                "success": False,
                "error": "Meta returned an invalid phone number ID."
            }))
            return

        # Subscribe this WABA to the current Meta app so webhook events can arrive.
        try:
            subscribe_response = session.post(
                f"{base_url}/{api_version}/{waba_id}/subscribed_apps",
                headers=headers,
                timeout=20,
            )
        except requests.RequestException as exc:
            print(json.dumps({
                "success": False,
                "error": f"Meta webhook subscription failed: {exc}"
            }))
            return

        if not 200 <= subscribe_response.status_code < 300:
            print(json.dumps({
                "success": False,
                "error": "Meta webhook subscription was rejected.",
                "provider_status": subscribe_response.status_code
            }))
            return

        credential_store = CommunicationCredentialStore(
            db_path=os.path.join(
                brain.data_dir,
                "aura_communication_credentials.db",
            )
        )

        credential_store.save(
            user_id=user_id,
            channel="whatsapp",
            provider="whatsapp_business",
            credentials={
                "access_token": access_token,
                "phone_number_id": phone_number_id,
                "waba_id": waba_id,
                "api_version": api_version,
                "base_url": base_url,
            },
        )

        print(json.dumps({
            "success": True,
            "status": "STORED",
            "channel": "whatsapp",
            "provider": "whatsapp_business",
            "waba_id": waba_id,
            "phone_number_id": phone_number_id,
            "display_phone_number": phone.get("display_phone_number"),
            "verified_name": phone.get("verified_name"),
            "webhook_subscribed": True,
        }))
        return

    if action == "turn":
        prompt = payload.get("prompt", "")
        user_id = payload.get("user_id", "default_user")
        session_id = payload.get("session_id", "default_session")
        interactive_confirm = payload.get("interactive_confirm", False)
        idempotency_key = payload.get("idempotency_key")
        scope_id = payload.get("scope_id")
        grant_id = payload.get("grant_id")

        result = brain.process_turn(
            prompt=prompt,
            user_id=user_id,
            session_id=session_id,
            interactive_confirm=interactive_confirm,
            idempotency_key=idempotency_key,
            scope_id=scope_id,
            grant_id=grant_id
        )
        print(json.dumps(result))
        return

    if action == "get_audit_logs":
        user_id = payload.get("user_id")
        limit = payload.get("limit", 50)
        logs = brain.audit.get_recent_logs(user_id=user_id, limit=limit)
        print(json.dumps({"success": True, "logs": logs}))
        return

    if action == "get_permissions":
        user_id = payload.get("user_id", "default_user")
        perms = brain.permissions.get_user_permissions(user_id=user_id)
        print(json.dumps({"success": True, "permissions": perms}))
        return

    if action == "set_permission":
        user_id = payload.get("user_id", "default_user")
        perm_key = payload.get("perm_key", "")
        state = payload.get("state", "ask")
        res = brain.permissions.set_permission(user_id=user_id, perm_key=perm_key, state=state)
        print(json.dumps({"success": True, "result": res}))
        return

    if action == "memory_search":
        user_id = payload.get("user_id", "default_user")
        query = payload.get("query", "")
        memories = brain.memory.semantic_search(user_id=user_id, query=query)
        print(json.dumps({"success": True, "memories": memories}))
        return

    print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))

if __name__ == "__main__":
    main()
