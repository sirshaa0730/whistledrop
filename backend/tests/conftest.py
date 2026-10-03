import os
os.environ["DATABASE_URL"] = "sqlite:///./test_whistledrop.db"
os.environ["MODERATOR_TOKEN"] = "test-moderator-secret"
os.environ["EVIDENCE_DIR"] = "./test-evidence"
os.environ["ENVIRONMENT"] = "test"

import pytest
from fastapi.testclient import TestClient
from app.db.database import Base, engine
from app.main import app
import app.services.evidence as evidence_service


@pytest.fixture(autouse=True)
def clean_database(monkeypatch):
    # API tests use a clean scanner stub; scanner protocol/failure cases override it explicitly.
    monkeypatch.setattr(evidence_service, "scan_with_clamav", lambda _path: None)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def submitted(client):
    result = client.post("/api/reports", json={"category":"SECURITY", "description":"A sufficiently detailed report."})
    assert result.status_code == 201
    return result.json()


@pytest.fixture
def moderator_headers():
    return {"Authorization": "Bearer test-moderator-secret"}
