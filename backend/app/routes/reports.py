from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.report import ReportCreate, ReportCreated
from app.services.reports import create_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("", response_model=ReportCreated, status_code=201, summary="Submit an anonymous report",
             description="Creates a report without a user account or reporter identity fields. Evidence can be attached separately with the returned case code.")
def submit_report(payload: ReportCreate, db: Session = Depends(get_db)):
    return create_report(db, payload)
