def test_health_check_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert "database" in data["data"]
    assert "hindsight" in data["data"]
    assert "groq" in data["data"]
