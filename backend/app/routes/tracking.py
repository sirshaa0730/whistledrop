from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.report import TrackingRead
from app.services.reports import get_by_case_code

router = APIRouter(prefix="/api/reports", tags=["tracking"])


@router.get("/{case_code}", response_model=TrackingRead, summary="Track a report using its case code",
            description="Returns the category, status, timestamps, and public updates. The report description and evidence are not exposed.", responses={404: {"description": "No report matches this case code."}})
def track_report(case_code: str, db: Session = Depends(get_db)):
    return get_by_case_code(db, case_code)
