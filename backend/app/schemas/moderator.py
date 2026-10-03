from pydantic import BaseModel, ConfigDict, Field
from app.schemas.report import Status


class StatusChange(BaseModel):
    status: Status
    message: str = Field(min_length=1, max_length=2000)
    model_config = ConfigDict(extra="forbid")


class UpdateCreate(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    model_config = ConfigDict(extra="forbid")
