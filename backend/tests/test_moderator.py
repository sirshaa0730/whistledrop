def test_auth_filter_transition_and_close(client, submitted, moderator_headers):
    path = "/api/moderator/reports"
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"Authorization":"test-moderator-secret"}).status_code == 401
    assert len(client.get(path + "?status=SUBMITTED&category=SECURITY", headers=moderator_headers).json()) == 1
    assert client.get(path + "?status=DISMISSED", headers=moderator_headers).json() == []
    assert client.get(path + "?status=INVALID", headers=moderator_headers).status_code == 422
    detail = f"/api/moderator/reports/{1}"
    assert client.patch(detail + "/status", headers=moderator_headers, json={"status":"RESOLVED", "message":"Invalid direct transition"}).status_code == 409
    assert client.patch(detail + "/status", headers=moderator_headers, json={"status":"CLOSED", "message":"Skip stages"}).status_code == 409
    changed = client.patch(detail + "/status", headers=moderator_headers, json={"status":"UNDER_REVIEW", "message":"Review started."})
    assert changed.status_code == 200
    assert client.patch(detail + "/status", headers=moderator_headers, json={"status":"DISMISSED", "message":"No issue found."}).status_code == 200
    closed = client.post(detail + "/close", headers=moderator_headers)
    assert closed.status_code == 200
    assert closed.json()["closed_at"] is not None
    assert client.patch(detail + "/status", headers=moderator_headers, json={"status":"UNDER_REVIEW", "message":"After closure"}).status_code == 409
    assert client.post(detail + "/updates", headers=moderator_headers, json={"message":"After closure"}).status_code == 409


def test_update_and_search(client, submitted, moderator_headers):
    detail = "/api/moderator/reports/1"
    assert client.post(detail + "/updates", headers=moderator_headers, json={"message":"We received the report."}).status_code == 201
    assert len(client.get("/api/moderator/reports?search=" + submitted["case_code"][:8], headers=moderator_headers).json()) == 1
