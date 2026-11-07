import uuid


def test_analyze_incident(client):
    payload = {
        "title": "Database connection pool exhausted",
        "service": "payment-api",
        "environment": "production",
        "error_message": "Database connection pool exhausted. Requests are timing out after 30000ms.",
        "logs": "Connection pool size 50 reached. Timeout acquiring connection.",
    }

    response = client.post("/api/incidents/analyze", json=payload)
    assert response.status_code == 201

    body = response.json()
    assert body["success"] is True
    assert "data" in body

    data = body["data"]
    incident = data["incident"]
    assert incident["title"] == payload["title"]
    assert incident["service"] == payload["service"]
    assert incident["environment"] == payload["environment"]
    assert incident["status"] == "awaiting_confirmation"
    assert incident["incident_code"].startswith("INC-")
    assert incident["memory_retained"] is False

    diagnosis = data["diagnosis"]
    assert "summary" in diagnosis
    assert "possible_root_cause" in diagnosis
    assert "recommended_steps" in diagnosis
    assert isinstance(diagnosis["recommended_steps"], list)

    memories = data["historical_memories"]
    assert isinstance(memories, list)
    assert len(memories) >= 1


def test_confirm_incident_resolution(client):
    # 1. First analyze an incident
    analyze_resp = client.post(
        "/api/incidents/analyze",
        json={
            "title": "Cache eviction storm",
            "service": "auth-service",
            "environment": "staging",
            "error_message": "Redis OOM error on session store",
            "logs": "Command failed: OOM command not allowed when used memory > 'maxmemory'.",
        },
    )
    assert analyze_resp.status_code == 201
    incident_id = analyze_resp.json()["data"]["incident"]["id"]

    # 2. Confirm resolution
    confirm_payload = {
        "root_cause": "Session keys were set without TTL, causing unbounded memory growth.",
        "resolution": "Configured 24-hour default TTL on session keys and added Redis memory alerts.",
    }
    confirm_resp = client.post(f"/api/incidents/{incident_id}/confirm", json=confirm_payload)
    assert confirm_resp.status_code == 200

    data = confirm_resp.json()["data"]
    assert data["memory_retained"] is True
    incident = data["incident"]
    assert incident["status"] == "resolved"
    assert incident["root_cause"] == confirm_payload["root_cause"]
    assert incident["resolution"] == confirm_payload["resolution"]
    assert incident["resolved_at"] is not None

    # 3. Test Idempotency / Retry-Safety
    retry_resp = client.post(f"/api/incidents/{incident_id}/confirm", json=confirm_payload)
    assert retry_resp.status_code == 200
    retry_data = retry_resp.json()["data"]
    assert retry_data["incident"]["status"] == "resolved"
    assert retry_data["retention_details"]["idempotent"] is True


def test_get_incidents_listing_and_filtering(client):
    # Create two incidents
    client.post(
        "/api/incidents/analyze",
        json={
            "title": "Kafka partition lag spike",
            "service": "order-processor",
            "environment": "production",
            "error_message": "Lag exceeded 50000 records on partition 3",
        },
    )
    client.post(
        "/api/incidents/analyze",
        json={
            "title": "Frontend gateway HTTP 504 gateway timeout",
            "service": "api-gateway",
            "environment": "staging",
            "error_message": "Upstream service timeout on /checkout",
        },
    )

    # List all
    list_resp = client.get("/api/incidents?page=1&limit=10")
    assert list_resp.status_code == 200
    list_data = list_resp.json()["data"]
    assert list_data["total"] >= 2
    assert len(list_data["items"]) >= 2
    assert list_data["page"] == 1

    # Filter by service
    service_resp = client.get("/api/incidents?service=order-processor")
    assert service_resp.status_code == 200
    items = service_resp.json()["data"]["items"]
    assert all(it["service"] == "order-processor" for it in items)

    # Search filter
    search_resp = client.get("/api/incidents?search=Kafka")
    assert search_resp.status_code == 200
    search_items = search_resp.json()["data"]["items"]
    assert len(search_items) >= 1
    assert "Kafka" in search_items[0]["title"]


def test_get_incident_details(client):
    analyze_resp = client.post(
        "/api/incidents/analyze",
        json={
            "title": "Disk I/O saturation on replica",
            "service": "billing-db",
            "environment": "production",
            "error_message": "I/O wait exceeded 90%",
        },
    )
    incident_id = analyze_resp.json()["data"]["incident"]["id"]

    # Fetch by UUID
    detail_resp = client.get(f"/api/incidents/{incident_id}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()["data"]
    assert detail_data["id"] == incident_id
    assert detail_data["title"] == "Disk I/O saturation on replica"

    # Fetch by invalid / non-existent UUID
    random_uuid = str(uuid.uuid4())
    not_found_resp = client.get(f"/api/incidents/{random_uuid}")
    assert not_found_resp.status_code == 404
    assert not_found_resp.json()["success"] is False


def test_analyze_incident_validation_error(client):
    # Title too short (< 3 chars)
    invalid_payload = {
        "title": "A",
        "service": "api",
        "environment": "prod",
        "error_message": "Err",
    }
    resp = client.post("/api/incidents/analyze", json=invalid_payload)
    assert resp.status_code == 422
    assert resp.json()["success"] is False
