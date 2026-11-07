def test_memory_search_success(client):
    response = client.get("/api/memory/search?q=database+connection")
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    body = data["data"]
    assert body["query"] == "database connection"
    assert body["count"] >= 1
    assert len(body["memories"]) >= 1

    memory = body["memories"][0]
    assert "content" in memory
    assert "memory_type" in memory
    assert "id" in memory


def test_memory_search_empty_query(client):
    # Empty query should fail validation
    response = client.get("/api/memory/search?q=")
    assert response.status_code in [400, 422]
    assert response.json()["success"] is False
