import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path, background=False)) as client:
        client.headers["X-Requested-With"] = "LeadPilot"
        yield client


@pytest.fixture
def owner(client):
    assert (
        client.post(
            "/api/auth/setup", json={"email": "owner@example.com", "password": "password123"}
        ).status_code
        == 200
    )
    return client


@pytest.fixture
def lead(owner):
    response = owner.post(
        "/api/leads",
        json={
            "name": "Sarah Chen",
            "company": "Fictional Studio",
            "email": "sarah@example.com",
            "service_requested": "Website redesign",
        },
    )
    assert response.status_code == 201
    return response.json()
