import asyncio
import os
import secrets
import socket
import struct
import tempfile
from pathlib import Path
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.db.models import Evidence, Report

ALLOWED = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".txt": "text/plain"}
SIGNATURES = {
    ".pdf": b"%PDF-",
    ".png": b"\x89PNG\r\n\x1a\n",
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
}


class ClamAVUnavailable(Exception):
    pass


class MalwareDetected(Exception):
    pass


def scan_with_clamav(path: Path) -> None:
    settings = get_settings()
    if not settings.clamav_host:
        raise ClamAVUnavailable("ClamAV is not configured")

    try:
        with socket.create_connection((settings.clamav_host, settings.clamav_port), timeout=settings.clamav_timeout_seconds) as connection:
            connection.settimeout(settings.clamav_timeout_seconds)
            connection.sendall(b"zINSTREAM\0")
            with path.open("rb") as evidence_file:
                while chunk := evidence_file.read(64 * 1024):
                    connection.sendall(struct.pack("!I", len(chunk)))
                    connection.sendall(chunk)
            connection.sendall(b"\0\0\0\0")
            response = bytearray()
            while len(response) < 1024 and not response.endswith(b"\0"):
                part = connection.recv(1024)
                if not part:
                    break
                response.extend(part)
    except (OSError, TimeoutError) as exc:
        raise ClamAVUnavailable("ClamAV did not respond") from exc

    result = bytes(response).rstrip(b"\0\r\n").decode("utf-8", errors="replace")
    if result.endswith(" OK") or result == "OK":
        return
    if result.endswith(" FOUND"):
        raise MalwareDetected
    raise ClamAVUnavailable("ClamAV returned no valid scan result")


async def save_evidence(db: Session, report: Report, upload: UploadFile) -> Evidence:
    if report.status == "CLOSED":
        raise HTTPException(status_code=409, detail="Closed reports cannot receive evidence")
    extension = Path(upload.filename or "").suffix.lower()
    expected = ALLOWED.get(extension)
    if not expected or upload.content_type != expected:
        raise HTTPException(status_code=415, detail="Unsupported evidence type")
    content = await upload.read(get_settings().max_upload_bytes + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Evidence file is empty")
    if len(content) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=413, detail="Evidence file exceeds the size limit")
    signature = SIGNATURES.get(extension)
    if signature and not content.startswith(signature):
        raise HTTPException(status_code=415, detail="Evidence content does not match its file type")
    if extension == ".txt":
        try:
            if b"\0" in content:
                raise UnicodeDecodeError("utf-8", content, 0, 1, "NUL byte in text file")
            content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(status_code=415, detail="Text evidence must be valid UTF-8 text") from exc

    settings = get_settings()
    root = settings.evidence_dir.resolve()
    root.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix=".whistledrop-scan-", dir=root)
    temporary_path = Path(temporary_name).resolve()
    permanent_path: Path | None = None
    committed = False
    try:
        if temporary_path.parent != root:
            raise HTTPException(status_code=400, detail="Invalid evidence location")
        with os.fdopen(fd, "wb") as temporary_file:
            temporary_file.write(content)
        try:
            await asyncio.to_thread(scan_with_clamav, temporary_path)
        except MalwareDetected as exc:
            raise HTTPException(status_code=422, detail="Evidence was rejected by malware scanning") from exc
        except ClamAVUnavailable as exc:
            raise HTTPException(status_code=503, detail="Evidence scanning is temporarily unavailable; try again later") from exc

        name = secrets.token_hex(24) + extension
        permanent_path = (root / name).resolve()
        if permanent_path.parent != root:
            raise HTTPException(status_code=400, detail="Invalid evidence location")
        os.replace(temporary_path, permanent_path)
        evidence = Evidence(report_id=report.id, original_filename=Path(upload.filename or "evidence").name[:255],
                            stored_filename=name, content_type=expected, file_size=len(content))
        db.add(evidence)
        db.commit()
        committed = True
        db.refresh(evidence)
        return evidence
    except Exception:
        db.rollback()
        if not committed and permanent_path and permanent_path.exists():
            permanent_path.unlink()
        raise
    finally:
        if temporary_path.exists():
            temporary_path.unlink()
