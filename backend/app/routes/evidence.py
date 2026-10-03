from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.evidence import EvidenceRead
from app.services.evidence import save_evidence
from app.services.reports import get_by_case_code

router = APIRouter(prefix="/api/reports", tags=["evidence"])


@router.post("/{case_code}/evidence", response_model=EvidenceRead, status_code=201, summary="Attach evidence using a case code",
             description="Accepts one PDF, PNG, JPG/JPEG, or TXT file up to 5 MiB. Closed reports cannot receive evidence.", responses={409: {"description": "The report is permanently closed."}, 413: {"description": "The file is too large."}, 415: {"description": "The file type or declared MIME type is not allowed."}})
async def upload_evidence(case_code: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    report = get_by_case_code(db, case_code)
    return await save_evidence(db, report, file)
