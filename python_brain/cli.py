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

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No input payload provided"}))
        sys.exit(1)

    try:
        raw_input = sys.argv[1]
        payload = json.loads(raw_input)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON payload: {str(e)}"}))
        sys.exit(1)

    action = payload.get("action", "turn")
    workspace = payload.get("workspace_root")
    brain = AuraBrain(workspace_root=workspace)

    if action == "status":
        status = brain.get_system_status()
        print(json.dumps({"success": True, "status": status, **status}))
        return

    if action == "turn":
        prompt = payload.get("prompt", "")
        user_id = payload.get("user_id", "default_user")
        session_id = payload.get("session_id", "default_session")
        interactive_confirm = payload.get("interactive_confirm", False)
        idempotency_key = payload.get("idempotency_key")

        result = brain.process_turn(
            prompt=prompt,
            user_id=user_id,
            session_id=session_id,
            interactive_confirm=interactive_confirm,
            idempotency_key=idempotency_key
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
