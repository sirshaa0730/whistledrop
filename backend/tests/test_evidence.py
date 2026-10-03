import socket
import struct
import threading
from pathlib import Path

import pytest
from app.core.config import get_settings
import app.services.evidence as evidence_service

REAL_SCAN_WITH_CLAMAV = evidence_service.scan_with_clamav


def test_evidence_validation_and_closed_lock(client, submitted, moderator_headers):
    code = submitted["case_code"]
    accepted = client.post(f"/api/reports/{code}/evidence", files={"file":("note.txt", b"supporting evidence", "text/plain")})
    assert accepted.status_code == 201
    file_id = accepted.json()["id"]
    assert client.get(f"/api/moderator/reports/1/evidence/{file_id}").status_code == 401
    downloaded = client.get(f"/api/moderator/reports/1/evidence/{file_id}", headers=moderator_headers)
    assert downloaded.status_code == 200
    assert downloaded.content == b"supporting evidence"
    invalid = client.post(f"/api/reports/{code}/evidence", files={"file":("tool.exe", b"bad", "application/octet-stream")})
    assert invalid.status_code == 415
    mismatched = client.post(f"/api/reports/{code}/evidence", files={"file":("picture.png", b"bad", "text/plain")})
    assert mismatched.status_code == 415
    oversized = client.post(f"/api/reports/{code}/evidence", files={"file":("large.txt", b"x" * (5 * 1024 * 1024 + 1), "text/plain")})
    assert oversized.status_code == 413
    detail = "/api/moderator/reports/1"
    client.patch(detail + "/status", headers=moderator_headers, json={"status":"UNDER_REVIEW", "message":"Review"})
    client.patch(detail + "/status", headers=moderator_headers, json={"status":"RESOLVED", "message":"Resolved"})
    client.post(detail + "/close", headers=moderator_headers)
    assert client.post(f"/api/reports/{code}/evidence", files={"file":("late.txt", b"late", "text/plain")}).status_code == 409


def test_supported_evidence_types_and_report_scoping(client, submitted, moderator_headers):
    code = submitted["case_code"]
    for filename, content_type, content in [
        ("proof.pdf", "application/pdf", b"%PDF-1.4 synthetic"),
        ("proof.png", "image/png", b"\x89PNG\r\n\x1a\nsynthetic png"),
        ("proof.jpg", "image/jpeg", b"\xff\xd8\xffsynthetic jpeg"),
        ("proof.jpeg", "image/jpeg", b"\xff\xd8\xffsynthetic jpeg"),
        ("proof.txt", "text/plain", b"synthetic text"),
    ]:
        response = client.post(f"/api/reports/{code}/evidence", files={"file": (filename, content, content_type)})
        assert response.status_code == 201
        evidence_id = response.json()["id"]
        assert client.get(f"/api/moderator/reports/1/evidence/{evidence_id}", headers=moderator_headers).status_code == 200
        assert client.get(f"/api/moderator/reports/999/evidence/{evidence_id}", headers=moderator_headers).status_code == 404


def test_binary_signatures_and_text_content_are_validated(client, submitted):
    code = submitted["case_code"]
    invalid = [
        ("fake.pdf", "application/pdf", b"MZ executable"),
        ("fake.png", "image/png", b"\xff\xd8\xffjpeg signature"),
        ("fake.jpg", "image/jpeg", b"arbitrary binary"),
        ("binary.txt", "text/plain", b"text\x00binary"),
    ]
    for filename, content_type, content in invalid:
        response = client.post(f"/api/reports/{code}/evidence", files={"file": (filename, content, content_type)})
        assert response.status_code == 415


def test_scanner_infection_and_unavailable_fail_closed(client, submitted, moderator_headers, monkeypatch):
    from app.services.evidence import ClamAVUnavailable, MalwareDetected

    code = submitted["case_code"]
    test_evidence = Path("./test-evidence")
    before = set(test_evidence.glob("*"))

    def infected(_path):
        raise MalwareDetected

    monkeypatch.setattr(evidence_service, "scan_with_clamav", infected)
    infected = client.post(f"/api/reports/{code}/evidence", files={"file": ("clean.pdf", b"%PDF-1.4 valid", "application/pdf")})
    assert infected.status_code == 422
    assert "malware scanning" in infected.json()["detail"]
    assert set(test_evidence.glob("*")) == before
    assert client.get("/api/moderator/reports/1", headers=moderator_headers).json()["evidence"] == []

    def unavailable(_path):
        raise ClamAVUnavailable

    monkeypatch.setattr(evidence_service, "scan_with_clamav", unavailable)
    unavailable = client.post(f"/api/reports/{code}/evidence", files={"file": ("clean.pdf", b"%PDF-1.4 valid", "application/pdf")})
    assert unavailable.status_code == 503
    assert set(test_evidence.glob("*")) == before
    assert client.get("/api/moderator/reports/1", headers=moderator_headers).json()["evidence"] == []


def test_clamd_instream_protocol_clean_and_infected(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "clamav_host", "127.0.0.1")
    sample = b"%PDF-1.4 synthetic protocol check"
    evidence_path = Path("test-evidence/.scanner-protocol-check")
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_bytes(sample)

    def call_fake_clamd(reply):
        server = socket.socket()
        server.bind(("127.0.0.1", 0))
        server.listen(1)
        server.settimeout(3)
        monkeypatch.setattr(settings, "clamav_port", server.getsockname()[1])
        received = []
        errors = []

        def receive_exact(connection, size):
            chunks = bytearray()
            while len(chunks) < size:
                block = connection.recv(size - len(chunks))
                if not block:
                    raise RuntimeError("scanner client ended the stream early")
                chunks.extend(block)
            return bytes(chunks)

        def serve():
            try:
                connection, _ = server.accept()
                with connection:
                    command = bytearray()
                    while not command.endswith(b"\0"):
                        command.extend(connection.recv(1))
                    assert command == b"zINSTREAM\0"
                    while True:
                        length = struct.unpack("!I", receive_exact(connection, 4))[0]
                        if length == 0:
                            break
                        received.append(receive_exact(connection, length))
                    connection.sendall(reply + b"\0")
            except Exception as exc:
                errors.append(exc)
            finally:
                server.close()

        thread = threading.Thread(target=serve, daemon=True)
        thread.start()
        return thread, received, errors

    try:
        thread, received, errors = call_fake_clamd(b"stream: OK")
        REAL_SCAN_WITH_CLAMAV(evidence_path)
        thread.join(timeout=3)
        assert not thread.is_alive() and not errors
        assert b"".join(received) == sample

        thread, _, errors = call_fake_clamd(b"stream: Test.Signature FOUND")
        with pytest.raises(evidence_service.MalwareDetected):
            REAL_SCAN_WITH_CLAMAV(evidence_path)
        thread.join(timeout=3)
        assert not thread.is_alive() and not errors
    finally:
        evidence_path.unlink(missing_ok=True)
