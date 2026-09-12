from pathlib import Path
import json
import os
import time
import urllib.request


BASE = "http://localhost:3000"
COOKIE = os.environ["AURA_E2E_COOKIE"]


def request(method, path, body=None):
    data = None
    headers = {"Cookie": COOKIE}

    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers=headers,
        method=method,
    )

    with urllib.request.urlopen(req, timeout=15) as response:
        return response.status, json.loads(response.read().decode())


def test_native_website_editor_real_workspace():
    unique = str(int(time.time()))
    project_name = f"AURA Native E2E {unique}"

    status, created = request(
        "POST",
        "/api/websites",
        {
            "name": project_name,
            "category": "gym",
            "headline": "AURA Native Gym",
            "description": "Real workspace editor verification",
            "whatsappNumber": "919999999999",
        },
    )

    assert status == 201
    site = created["website"]
    project_id = site["id"]

    assert created["filesCreated"]
    assert created["qaVerification"]["ok"] is True

    status, listing = request(
        "GET",
        f"/api/websites/{project_id}/files",
    )

    assert status == 200
    assert "index.html" in listing["files"]
    assert "style.css" in listing["files"]
    assert "aura-project.json" in listing["files"]

    status, index_before = request(
        "GET",
        f"/api/websites/{project_id}/files/index.html",
    )

    assert status == 200
    assert "AURA Native Gym" in index_before["content"]

    replacement = index_before["content"].replace(
        "AURA Native Gym",
        "AURA Native Gym — Edited",
        1,
    )

    status, edited = request(
        "PUT",
        f"/api/websites/{project_id}/files/index.html",
        {"content": replacement},
    )

    assert status == 200
    assert edited["success"] is True
    assert edited["verified"] is True
    assert edited["qaVerification"]["ok"] is True

    status, index_after = request(
        "GET",
        f"/api/websites/{project_id}/files/index.html",
    )

    assert status == 200
    assert "AURA Native Gym — Edited" in index_after["content"]

    workspace = Path(listing["workspace"])
    assert workspace.exists()
    assert (workspace / "index.html").read_text() == replacement

    print("NATIVE_WEBSITE_EDITOR_E2E: PASS")
    print(f"PROJECT_ID: {project_id}")
    print(f"WORKSPACE: {workspace}")


if __name__ == "__main__":
    test_native_website_editor_real_workspace()
