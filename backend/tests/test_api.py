import os
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import CSV_FIELDS, create_app
from app.models import FollowUp, Lead, now


def generate(client, lead):
    return client.post(f"/api/leads/{lead['id']}/drafts/generate", json={})


def test_auth(client):
    assert client.get("/api/auth/status").json() == {"setup_required": True, "authenticated": False}
    assert client.get("/api/leads").status_code == 401
    assert (
        client.post(
            "/api/auth/setup", json={"email": "owner@example.com", "password": "short"}
        ).status_code
        == 422
    )
    result = client.post(
        "/api/auth/setup", json={"email": "owner@example.com", "password": "password123"}
    )
    assert (
        "HttpOnly" in result.headers["set-cookie"]
        and "SameSite=strict" in result.headers["set-cookie"]
    )
    assert (
        client.post(
            "/api/auth/setup", json={"email": "owner@example.com", "password": "password123"}
        ).status_code
        == 409
    )
    assert client.post("/api/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/auth/login", json={"email": "owner@example.com", "password": "password123"}
        ).status_code
        == 200
    )
    client.headers.pop("X-Requested-With")
    assert client.post("/api/auth/logout").status_code == 403


def test_rate_limit(owner):
    owner.post("/api/auth/logout")
    for _ in range(5):
        assert (
            owner.post(
                "/api/auth/login", json={"email": "owner@example.com", "password": "wrongpass"}
            ).status_code
            == 401
        )
    assert (
        owner.post(
            "/api/auth/login", json={"email": "owner@example.com", "password": "password123"}
        ).status_code
        == 429
    )


def test_leads(owner, lead):
    assert lead["next_follow_up_at"].endswith("Z")
    for query in ["Sarah", "Studio", "sarah@example", "redesign"]:
        assert owner.get("/api/leads", params={"search": query}).json()["total"] == 1
    assert owner.get("/api/leads?status=won").json()["total"] == 0
    assert owner.get("/api/leads?follow_up_due=today").json()["total"] == 1
    assert owner.get("/api/leads?search=absent").json()["items"] == []
    assert owner.get("/api/leads?page=0").status_code == 422
    assert owner.post("/api/leads", json={"name": "No contact"}).status_code == 422
    path = f"/api/leads/{lead['id']}"
    assert owner.patch(path, json={"notes": "Updated"}).json()["notes"] == "Updated"
    assert owner.patch(path, json={"email": "bad"}).status_code == 422
    assert owner.get(path).json()["activity"]
    assert owner.get("/api/activity").json()[0]["lead_name"] == "Sarah Chen"
    assert owner.get("/api/dashboard").json()["recent_activity"][0]["lead_name"] == "Sarah Chen"
    assert owner.delete(path).json()["deleted"]
    assert owner.get(path).status_code == 404


def test_draft_lifecycle(owner, lead):
    draft = generate(owner, lead).json()["draft"]
    assert draft["generated_by"] == "demo"
    assert "Sarah," in draft["body"] and "Website redesign" in draft["subject"]
    assert generate(owner, lead).json()["duplicate"]
    path = f"/api/drafts/{draft['id']}"
    assert owner.post(path + "/mark-sent").status_code == 409
    assert owner.patch(path, json={"body": "Edited body"}).status_code == 200
    revisions = owner.get(path + "/revisions").json()
    assert revisions[0]["body"] == draft["body"]
    assert owner.post(path + "/approve").json()["status"] == "approved"
    assert owner.post(path + "/mark-sent").json()["status"] == "sent"
    detail = owner.get(f"/api/leads/{lead['id']}").json()
    assert detail["last_contacted_at"] and detail["followups"][0]["step"] == 1
    second = generate(owner, lead).json()["draft"]
    owner.post(f"/api/drafts/{second['id']}/approve")
    owner.post(f"/api/drafts/{second['id']}/mark-sent")
    detail = owner.get(f"/api/leads/{lead['id']}").json()
    assert detail["followups"][0]["step"] == 2
    assert detail["followups"][1]["status"] == "done"
    assert owner.patch(path, json={"body": "Too late"}).status_code == 409


def test_regenerate_and_discard(owner, lead):
    first = generate(owner, lead).json()["draft"]
    second = owner.post(
        f"/api/leads/{lead['id']}/drafts/generate", json={"regenerate": True}
    ).json()["draft"]
    assert first["id"] != second["id"]
    assert owner.post(f"/api/drafts/{second['id']}/discard").json()["status"] == "discarded"
    assert not generate(owner, lead).json()["duplicate"]


def test_status_and_optout(owner, lead):
    path = f"/api/leads/{lead['id']}"
    owner.post(path + "/status", json={"status": "contacted"})
    owner.post(path + "/status", json={"status": "replied"})
    result = owner.get(path).json()
    assert result["next_follow_up_at"] is None
    assert result["followups"][0]["cancel_reason"] == "replied"
    assert generate(owner, lead).status_code == 409
    owner.post(path + "/status", json={"status": "new"})
    owner.post(path + "/status", json={"status": "contacted"})
    owner.post(path + "/opt-out")
    assert generate(owner, lead).status_code == 409
    assert owner.get(path).json()["followups"][0]["cancel_reason"] == "opted out"


@pytest.mark.parametrize("status", ["won", "lost"])
def test_terminal_status(owner, lead, status):
    path = f"/api/leads/{lead['id']}"
    owner.post(path + "/status", json={"status": "contacted"})
    owner.post(path + "/status", json={"status": status})
    assert owner.get(path).json()["followups"][0]["cancel_reason"] == status
    assert generate(owner, lead).status_code == 409


def test_stale_initial(owner, lead):
    draft = generate(owner, lead).json()["draft"]
    owner.post(f"/api/leads/{lead['id']}/status", json={"status": "contacted"})
    owner.post(f"/api/drafts/{draft['id']}/approve")
    assert owner.post(f"/api/drafts/{draft['id']}/mark-sent").status_code == 409


def test_csv(owner, lead):
    header = ",".join(CSV_FIELDS) + "\n"
    rows = "BOM User,,bom@example.com,,SEO,,,new\nDuplicate,,sarah@example.com,,,,,new\nBad,,not-email,,,,,new\nBadStatus,,status@example.com,,,,,invalid\n"
    data = ("\ufeff" + header + rows).encode()
    dry = owner.post("/api/leads/import?dry_run=true", files={"file": ("leads.csv", data)}).json()
    assert (dry["created"], dry["skipped"], dry["errors"]) == (1, 1, 2)
    assert dry["preview"][0]["name"] == "BOM User"
    assert owner.get("/api/leads").json()["total"] == 1
    real = owner.post("/api/leads/import", files={"file": ("leads.csv", data)}).json()
    assert real["created"] == 1
    assert (
        owner.post(
            "/api/leads/import", files={"file": ("big.csv", b"a" * (2 * 1024 * 1024 + 1))}
        ).status_code
        == 413
    )
    assert owner.post("/api/leads/import", files={"file": ("bad.csv", b"\xff")}).status_code == 422
    assert owner.post("/api/leads/import", files={"file": ("empty.csv", b"")}).status_code == 422
    assert (
        owner.post(
            "/api/leads/import",
            files={
                "file": ("many.csv", (header + "Name,,a@example.com,,,,,new\n" * 5001).encode())
            },
        ).status_code
        == 413
    )
    assert owner.get("/api/leads/import/template").text.strip() == header.strip()


def test_secrets_and_webhook(owner, tmp_path):
    response = owner.patch("/api/settings", json={"ai_api_key": "secret-for-test"})
    assert response.json()["ai_api_key_configured"] is True
    assert "secret-for-test" not in owner.get("/api/settings").text
    assert os.stat(tmp_path / "secrets.json").st_mode & 0o777 == 0o600
    assert os.stat(tmp_path / "secret_key").st_mode & 0o777 == 0o600
    assert owner.post("/api/settings/ai/test").json()["ok"]
    token = owner.post("/api/settings/inbound-token").json()["token"]
    assert token not in owner.get("/api/settings").text
    owner.post("/api/auth/logout")
    payload = {"name": "Webhook Person", "email": "webhook@example.com"}
    assert owner.post("/api/inbound/lead", json=payload).status_code == 401
    assert (
        owner.post(
            "/api/inbound/lead", json=payload, headers={"Authorization": f"Bearer {token}"}
        ).status_code
        == 201
    )
    assert (
        owner.post(
            "/api/inbound/lead",
            json={**payload, "name": "x" * 201},
            headers={"Authorization": f"Bearer {token}"},
        ).status_code
        == 422
    )


def test_export_delete(owner, lead):
    generate(owner, lead)
    owner.patch(f"/api/leads/{lead['id']}", json={"company": "=SUM(A1)"})
    assert "'=SUM(A1)" in owner.get("/api/export?format=csv").text
    data = owner.get("/api/export").json()
    assert len(data["leads"]) == 1 and data["drafts"] and data["activity"]
    assert owner.request("DELETE", "/api/data", json={"confirm": "wrong"}).status_code == 422
    assert (
        owner.request("DELETE", "/api/data", json={"confirm": "DELETE ALL DATA"}).status_code == 200
    )
    assert owner.get("/api/export").json()["drafts"] == []
    assert not owner.get("/api/auth/status").json()["setup_required"]
    owner.request("DELETE", "/api/data?include_settings=true", json={"confirm": "DELETE ALL DATA"})
    assert owner.get("/api/auth/status").json()["setup_required"]


def test_demo(owner, lead):
    assert owner.post("/api/demo/load").json()["loaded"]
    assert not owner.post("/api/demo/load").json()["loaded"]
    assert owner.get("/api/dashboard").json()["overdue_count"] >= 1
    assert owner.get("/api/reminders").json()["today"]
    assert owner.post("/api/demo/simulate-inquiry").json()["is_demo"]
    owner.delete("/api/demo")
    assert owner.get("/api/leads").json()["total"] == 1


def test_rich_demo_history_and_rotation(owner):
    from datetime import datetime, timezone
    from zoneinfo import ZoneInfo

    owner.post("/api/demo/load")
    dashboard = owner.get("/api/dashboard").json()
    assert dashboard["counts_by_status"]["new"] == 2
    assert all(dashboard["counts_by_status"][status] for status in ["replied", "won", "lost"])
    reminders = owner.get("/api/reminders").json()
    assert reminders["overdue"] and reminders["today"] and reminders["upcoming"]
    local_today = datetime.now(timezone.utc).astimezone(ZoneInfo("America/Toronto")).date()
    for lead in owner.get("/api/leads").json()["items"]:
        assert lead["is_demo"] and lead["email"].endswith("@example.com")
        assert "555-01" in lead["phone"] and "fictional" in lead["company"]
        assert len(lead["inquiry_message"].split(". ")) >= 2 and lead["notes"]
        detail = owner.get(f"/api/leads/{lead['id']}").json()
        assert len(detail["activity"]) >= 2
        assert detail["created_at"] < detail["activity"][0]["created_at"]
        if lead["status"] != "new":
            assert lead["created_at"] < lead["last_contacted_at"]
        if lead["status"] in {"won", "lost", "replied"}:
            assert lead["next_follow_up_at"] is None
    olivia = next(lead for lead in reminders["today"] if lead["name"] == "Olivia Taylor")
    assert (
        datetime.fromisoformat(olivia["next_follow_up_at"].replace("Z", "+00:00"))
        .astimezone(ZoneInfo("America/Toronto"))
        .date()
        == local_today
    )
    simulated = [owner.post("/api/demo/simulate-inquiry").json() for _ in range(4)]
    assert len({lead["inquiry_message"] for lead in simulated[:3]}) == 3
    assert simulated[0]["name"] == simulated[3]["name"]
    assert all(lead["is_demo"] and lead["source"] == "demo" for lead in simulated)


def test_demo_followup_step_context(owner):
    owner.post("/api/demo/load")
    michael = owner.get("/api/leads?search=Michael").json()["items"][0]
    draft = owner.post(
        f"/api/leads/{michael['id']}/drafts/generate", json={"tone": "friendly"}
    ).json()["draft"]
    assert draft["generated_by"] == "demo"
    assert "planning idea" in draft["subject"]
    assert "address, hours and service area" in draft["body"]


def test_sweep_idempotent(owner, lead):
    owner.post(f"/api/leads/{lead['id']}/status", json={"status": "contacted"})
    with owner.app.state.sessions.begin() as db:
        db.get(Lead, lead["id"]).next_follow_up_at = now() - timedelta(days=2)
        db.scalar(select(FollowUp)).due_at = now() - timedelta(days=2)
    first = owner.get("/api/dashboard").json()
    second = owner.get("/api/dashboard").json()
    assert first == second
    assert second["counts_by_status"]["follow_up_needed"] == 1


def test_persistence(tmp_path):
    with TestClient(create_app(tmp_path, False)) as client:
        client.headers["X-Requested-With"] = "LeadPilot"
        client.post(
            "/api/auth/setup", json={"email": "owner@example.com", "password": "password123"}
        )
        client.post("/api/leads", json={"name": "Persistent", "phone": "555-0100"})
        cookies = client.cookies
    with TestClient(create_app(tmp_path, False)) as client:
        client.cookies = cookies
        assert client.get("/api/leads").json()["items"][0]["name"] == "Persistent"


def test_static_fallback(tmp_path, monkeypatch):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<h1>Frontend</h1>")
    monkeypatch.setenv("FRONTEND_DIST", str(dist))
    with TestClient(create_app(tmp_path / "data", False)) as client:
        assert client.get("/leads/1").text == "<h1>Frontend</h1>"
        assert client.get("/api/missing").status_code == 401
