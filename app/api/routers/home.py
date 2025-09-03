# app/api/routers/home.py
from typing import List, Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import HomeBanner
from app.schemas.home import HomeBannerOut

router = APIRouter(prefix="/home", tags=["home"])

@router.get("/banners", response_model=List[HomeBannerOut])
def list_banners(
    db: Annotated[Session, Depends(get_db)],
    active: bool = True
):
    q = select(HomeBanner).order_by(HomeBanner.order.asc(), HomeBanner.id.desc())
    if active:
        q = q.where(HomeBanner.is_active.is_(True))
    rows = db.execute(q).scalars().all()
    return rows
