from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.models import Report, ReportUpdate
from app.schemas.report import Status

TRANSITIONS = {"SUBMITTED": {"UNDER_REVIEW"}, "UNDER_REVIEW": {"RESOLVED", "DISMISSED"}, "RESOLVED": {"CLOSED"}, "DISMISSED": {"CLOSED"}, "CLOSED": set()}


def list_reports(db: Session, category: str | None = None, status: str | None = None, search: str | None = None,
                 created_after: datetime | None = None, created_before: datetime | None = None) -> list[Report]:
    query = db.query(Report)
    if category: query = query.filter(Report.category == category)
    if status: query = query.filter(Report.status == status)
    if search: query = query.filter(or_(Report.case_code.ilike(f"%{search}%"), Report.description.ilike(f"%{search}%")))
    if created_after: query = query.filter(Report.created_at >= created_after)
    if created_before: query = query.filter(Report.created_at <= created_before)
    return query.order_by(Report.created_at.desc()).limit(200).all()


def change_status(db: Session, report: Report, status: Status, message: str) -> Report:
    new_status = status.value
    if new_status == "CLOSED":
        raise HTTPException(status_code=409, detail="Use the permanent close action to close a case")
    if new_status not in TRANSITIONS[report.status]:
        raise HTTPException(status_code=409, detail=f"Cannot transition {report.status} to {new_status}")
    report.status = new_status
    report.updated_at = datetime.now(timezone.utc)
    db.add(ReportUpdate(report_id=report.id, status=new_status, message=message))
    db.commit(); db.refresh(report)
    return report


def add_update(db: Session, report: Report, message: str) -> ReportUpdate:
    if report.status == "CLOSED": raise HTTPException(status_code=409, detail="Closed reports cannot be modified")
    update = ReportUpdate(report_id=report.id, status=report.status, message=message)
    report.updated_at = datetime.now(timezone.utc)
    db.add(update); db.commit(); db.refresh(update)
    return update


def close_report(db: Session, report: Report) -> Report:
    if "CLOSED" not in TRANSITIONS[report.status]:
        raise HTTPException(status_code=409, detail="Only resolved or dismissed reports can be closed")
    report.status = "CLOSED"
    report.closed_at = datetime.now(timezone.utc)
    report.updated_at = report.closed_at
    db.add(ReportUpdate(report_id=report.id, status="CLOSED", message="Case permanently closed."))
    db.commit(); db.refresh(report)
    return report
