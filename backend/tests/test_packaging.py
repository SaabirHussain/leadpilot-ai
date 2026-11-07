import os

import pytest

from app import __version__
from app.__main__ import reset_password
from app.main import private_write


def test_secret_write_without_unix_permissions(tmp_path, monkeypatch):
    monkeypatch.delattr(os, "fchmod", raising=False)
    path = tmp_path / "secret"
    private_write(path, "test-value")
    assert path.read_text() == "test-value"


def test_public_health(client):
    assert client.get("/api/health").json() == {"ok": True, "version": __version__}


def test_reset_password(owner, tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    with pytest.raises(ValueError):
        reset_password("short")
    reset_password("replacement123")
    assert owner.get("/api/leads").status_code == 401
    assert (
        owner.post(
            "/api/auth/login", json={"email": "owner@example.com", "password": "replacement123"}
        ).status_code
        == 200
    )


def test_reset_missing_database(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    with pytest.raises(ValueError, match="No workspace"):
        reset_password("replacement123")


def test_provider_data_minimization(owner, lead, monkeypatch):
    from app import ai

    def capture(context, *args):
        assert set(context["lead"]) == {
            "name",
            "company",
            "service_requested",
            "inquiry_message",
            "notes",
        }
        assert set(context["business"]) == {
            "business_name",
            "industry",
            "services",
            "description",
            "signature",
        }
        return {"subject": "Hello", "body": "Hello Sarah"}

    monkeypatch.setattr(ai, "generate", capture)
    assert owner.post(f"/api/leads/{lead['id']}/drafts/generate", json={}).status_code == 200
