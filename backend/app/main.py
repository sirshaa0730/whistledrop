from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.db.database import Base, engine, get_db
from app.db import models
from app.routes import evidence, moderator, reports, tracking


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="WhistleDrop API", description="Privacy-conscious anonymous reporting and case tracking.", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=get_settings().allowed_origins, allow_credentials=False, allow_methods=["GET", "POST", "PATCH"], allow_headers=["Authorization", "Content-Type"])
app.include_router(reports.router); app.include_router(tracking.router); app.include_router(moderator.router); app.include_router(evidence.router)


@app.get("/health", tags=["health"], summary="Check application and database readiness")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
