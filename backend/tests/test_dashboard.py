def test_dashboard_stats(client):
    # Seed an incident and confirm it
    analyze_resp = client.post(
        "/api/incidents/analyze",
        json={
            "title": "High CPU utilization on ingest workers",
            "service": "worker-pool",
            "environment": "production",
            "error_message": "CPU pegged at 100% on worker nodes",
        },
    )
    assert analyze_resp.status_code == 201
    inc_id = analyze_resp.json()["data"]["incident"]["id"]

    client.post(
        f"/api/incidents/{inc_id}/confirm",
        json={
            "root_cause": "Infinite loop in JSON parsing regex.",
            "resolution": "Replaced backtracking regex with linear JSON scanner.",
        },
    )

    # Call dashboard stats
    stats_resp = client.get("/api/dashboard/stats")
    assert stats_resp.status_code == 200

    data = stats_resp.json()
    assert data["success"] is True
    stats = data["data"]

    assert stats["total_incidents"] >= 1
    assert stats["resolved_incidents"] >= 1
    assert "incidents_by_status" in stats
    assert "resolved" in stats["incidents_by_status"]
    assert "awaiting_confirmation" in stats["incidents_by_status"]
    assert "analyzing" in stats["incidents_by_status"]
    assert isinstance(stats["incidents_over_time"], list)
    assert isinstance(stats["recent_incidents"], list)
    assert isinstance(stats["recent_activity"], list)
    assert len(stats["recent_activity"]) >= 1
