from datetime import datetime
from enum import StrEnum
from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field


class Category(StrEnum):
    SECURITY = "SECURITY"
    HARASSMENT = "HARASSMENT"
    CORRUPTION = "CORRUPTION"
    TECHNICAL = "TECHNICAL"
    MISCONDUCT = "MISCONDUCT"
    FRAUD = "FRAUD"
    OTHER = "OTHER"


class Status(StrEnum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"
    CLOSED = "CLOSED"


class ReportCreate(BaseModel):
    category: Category
    description: str = Field(min_length=10, max_length=10000)
    reference_url: AnyHttpUrl | None = None
    model_config = ConfigDict(extra="forbid")


class UpdateRead(BaseModel):
    status: Status
    message: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ReportCreated(BaseModel):
    case_code: str
    status: Status
    created_at: datetime


class TrackingRead(BaseModel):
    case_code: str
    category: Category
    status: Status
    created_at: datetime
    updated_at: datetime
    updates: list[UpdateRead]


class ReportRead(TrackingRead):
    id: int
    description: str
    reference_url: str | None
    closed_at: datetime | None
    evidence: list["EvidenceRead"] = []


from app.schemas.evidence import EvidenceRead
ReportRead.model_rebuild()
