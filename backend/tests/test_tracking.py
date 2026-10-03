def test_track_by_case_code_and_not_internal_id(client, submitted):
    code = submitted["case_code"]
    attached = client.post(f"/api/reports/{code}/evidence", files={"file": ("private.txt", b"moderator-only evidence", "text/plain")})
    assert attached.status_code == 201
    result = client.get(f"/api/reports/{code}")
    assert result.status_code == 200
    assert result.json()["status"] == "SUBMITTED"
    public = result.json()
    assert set(public) == {"case_code", "category", "status", "created_at", "updated_at", "updates"}
    assert not {"id", "report_id", "description", "reference_url", "closed_at", "evidence", "reporter", "email", "phone"} & public.keys()
    assert "description" not in public
    assert client.get("/api/reports/1").status_code == 404


def test_unknown_case_code_returns_404(client):
    assert client.get("/api/reports/WD-not-a-real-code").status_code == 404
