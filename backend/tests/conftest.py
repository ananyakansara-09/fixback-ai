import os
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Ensure test environment
os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.database.base import Base
from app.database.connection import get_db
from app.main import app
from app.models.incident import Incident
from app.services.hindsight_service import hindsight_service
from app.services.groq_service import groq_service

# In-memory SQLite engine for unit tests
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_external_services(monkeypatch):
    """Mock external Hindsight and Groq network calls during automated test suite."""

    # Mock Hindsight Recall
    def mock_recall_incidents(query: str, limit: int = 5):
        return {
            "success": True,
            "count": 1,
            "memories": [
                {
                    "id": "mem-test-101",
                    "content": "Observed database connection pool exhausted in payment-api. Confirmed root cause: unclosed connection in checkout handler. Fixed by implementing scoped connection cleanup.",
                    "memory_type": "incident",
                    "metadata": {"service": "payment-api", "environment": "production"},
                    "context": "Payment gateway outage Q3",
                    "tags": ["incident", "payment-api", "production"],
                }
            ],
            "error": None,
        }

    # Mock Hindsight Retain
    def mock_retain_incident(*args, **kwargs):
        return {
            "success": True,
            "bank_id": "fixback-engineering",
            "items_count": 1,
            "operation_id": "op_test_999",
        }

    monkeypatch.setattr(hindsight_service, "recall_incidents", mock_recall_incidents)
    monkeypatch.setattr(hindsight_service, "retain_incident", mock_retain_incident)
    monkeypatch.setattr(
        hindsight_service,
        "check_health",
        lambda: {"configured": True, "ready": True, "bank_id": "fixback-engineering", "message": "Mocked test bank"},
    )
