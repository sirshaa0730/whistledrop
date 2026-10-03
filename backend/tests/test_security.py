import pytest
from app.core.config import Settings
from app.services.moderation import TRANSITIONS


def test_transition_map_has_no_exit_from_closed():
    assert TRANSITIONS["CLOSED"] == set()


def test_health_and_swagger(client):
    assert client.get("/health").json() == {"status":"ok"}
    assert client.get("/docs").status_code == 200


def test_production_configuration_rejects_sqlite(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./whistledrop.db")
    with pytest.raises(RuntimeError, match="Production requires DATABASE_URL"):
        Settings()
