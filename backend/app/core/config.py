import os
from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv


class Settings:
    def __init__(self) -> None:
        load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./whistledrop.db")
        if self.environment.lower() in {"prod", "production"} and not self.database_url.startswith("postgresql+psycopg://"):
            raise RuntimeError("Production requires DATABASE_URL to use PostgreSQL with psycopg")
        self.moderator_token = os.getenv("MODERATOR_TOKEN", "")
        self.evidence_dir = Path(os.getenv("EVIDENCE_DIRECTORY", os.getenv("EVIDENCE_DIR", "./evidence"))).resolve()
        self.max_upload_bytes = int(os.getenv("MAX_UPLOAD_BYTES", "5242880"))
        self.clamav_host = os.getenv("CLAMAV_HOST", "").strip()
        self.clamav_port = int(os.getenv("CLAMAV_PORT", "3310"))
        self.clamav_timeout_seconds = float(os.getenv("CLAMAV_TIMEOUT_SECONDS", "15"))
        self.allowed_origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
