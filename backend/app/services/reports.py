import secrets
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.models import Report, ReportUpdate
from app.schemas.report import ReportCreate


def create_report(db: Session, payload: ReportCreate) -> Report:
    report = Report(case_code="WD-" + secrets.token_urlsafe(18), category=payload.category.value,
                    description=payload.description, reference_url=str(payload.reference_url) if payload.reference_url else None)
    db.add(report)
    db.flush()
    db.add(ReportUpdate(report_id=report.id, status="SUBMITTED", message="Report received."))
    db.commit()
    db.refresh(report)
    return report


def get_by_case_code(db: Session, case_code: str) -> Report:
    report = db.query(Report).filter(Report.case_code == case_code).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
