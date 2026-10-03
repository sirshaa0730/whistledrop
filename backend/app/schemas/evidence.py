from datetime import datetime
from pydantic import BaseModel


class EvidenceRead(BaseModel):
    id: int
    original_filename: str
    content_type: str
    file_size: int
    created_at: datetime
