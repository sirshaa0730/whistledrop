from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.security import require_moderator
from app.db.database import get_db
from app.db.models import Report
from app.db.models import Evidence
from app.core.config import get_settings
from app.schemas.moderator import StatusChange, UpdateCreate
from app.schemas.report import Category, ReportRead, Status, UpdateRead
from app.services.moderation import add_update, change_status, close_report, list_reports

router = APIRouter(prefix="/api/moderator/reports", tags=["moderation"], dependencies=[Depends(require_moderator)])


@router.get("", response_model=list[ReportRead], summary="List and filter reports",
            description="Requires moderator authorization. Supports category, status, search, created_after, and created_before query filters; returns at most 200 newest matches.")
def reports(category: Category | None = None, status: Status | None = None,
            search: str | None = Query(default=None, max_length=100),
            created_after: datetime | None = None, created_before: datetime | None = None, db: Session = Depends(get_db)):
    return list_reports(db, category.value if category else None, status.value if status else None,
                        search, created_after, created_before)


@router.get("/{report_id}", response_model=ReportRead, summary="Read a report")
def report_detail(report_id: int, db: Session = Depends(get_db)):
    return _get_report(db, report_id)


@router.get("/{report_id}/evidence/{evidence_id}", summary="Download evidence attached to a report")
def download_evidence(report_id: int, evidence_id: int, db: Session = Depends(get_db)):
    _get_report(db, report_id)
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id, Evidence.report_id == report_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    root = get_settings().evidence_dir.resolve()
    path = (root / evidence.stored_filename).resolve()
    if path.parent != root or not path.is_file():
        raise HTTPException(status_code=404, detail="Evidence not found")
    return FileResponse(path, media_type=evidence.content_type, filename="evidence")


@router.patch("/{report_id}/status", response_model=ReportRead, summary="Change report status",
              description="Applies only an allowed workflow transition and records the supplied reporter-visible update. Permanent closure uses the close endpoint.", responses={409: {"description": "The requested status transition is not allowed."}})
def status_update(report_id: int, payload: StatusChange, db: Session = Depends(get_db)):
    report = _get_report(db, report_id)
    return change_status(db, report, payload.status, payload.message)


@router.post("/{report_id}/updates", response_model=UpdateRead, status_code=201, summary="Add a moderator update",
             description="Adds a reporter-visible timeline update without changing status. Closed cases cannot be updated.", responses={409: {"description": "The report is permanently closed."}})
def add_report_update(report_id: int, payload: UpdateCreate, db: Session = Depends(get_db)):
    return add_update(db, _get_report(db, report_id), payload.message)


@router.post("/{report_id}/close", response_model=ReportRead, summary="Permanently close a resolved or dismissed case",
             description="Permanently closes a resolved or dismissed report. Further status changes, updates, and evidence are rejected.", responses={409: {"description": "Only a resolved or dismissed report can be closed."}})
def close(report_id: int, db: Session = Depends(get_db)):
    return close_report(db, _get_report(db, report_id))


def _get_report(db: Session, report_id: int) -> Report:
    from fastapi import HTTPException
    report = db.get(Report, report_id)
    if not report: raise HTTPException(status_code=404, detail="Report not found")
    return report
