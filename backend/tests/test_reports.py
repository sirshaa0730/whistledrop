def test_submit_report_is_anonymous_and_uses_random_code(client):
    response = client.post("/api/reports", json={"category":"OTHER", "description":"A sufficiently detailed report."})
    second = client.post("/api/reports", json={"category":"OTHER", "description":"Another sufficiently detailed report."})
    assert response.status_code == 201
    assert second.status_code == 201
    body = response.json()
    assert body["case_code"].startswith("WD-")
    assert len(body["case_code"]) >= 20
    assert body["case_code"] != second.json()["case_code"]
    assert not any(key in body for key in ("name", "email", "phone", "reporter"))


def test_invalid_and_missing_fields_are_rejected(client):
    assert client.post("/api/reports", json={"category":"SECURITY"}).status_code == 422
    assert client.post("/api/reports", json={"category":"BOGUS", "description":"Some useful report text"}).status_code == 422
    assert client.post("/api/reports", json={"category":"OTHER", "description":"tiny"}).status_code == 422
    assert client.post("/api/reports", json={"category":"OTHER", "description":"A sufficiently detailed report.", "email":"reporter@example.com"}).status_code == 422


def test_recruiter_categories_are_supported(client):
    for category in ("SECURITY", "HARASSMENT", "CORRUPTION", "TECHNICAL", "OTHER"):
        response = client.post("/api/reports", json={"category":category, "description":"A sufficiently detailed report."})
        assert response.status_code == 201
        assert response.json()["status"] == "SUBMITTED"
