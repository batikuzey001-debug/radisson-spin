# app/api/routers/content.py
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Tournament, DailyBonus, PromoCode, Event
from app.schemas.content import HomeFeed, ImageCard, SummaryOut

router = APIRouter(prefix="/api/content", tags=["content"])

def _now(): 
    return datetime.now(timezone.utc)

def _abs_url(req: Request, u: Optional[str]) -> Optional[str]:
    if not u: return None
    if u.startswith(("http://","https://","data:")): return u
    if u.startswith("//"): return "https:" + u
    if u.startswith("/"):  return str(req.base_url).rstrip("/") + u
    return "https://" + u

def _active(q, now, model):
    q = q.filter(model.status == "published")
    q = q.filter((model.start_at == None) | (model.start_at <= now))
    q = q.filter((model.end_at == None)   | (model.end_at >= now))
    return q

@router.get("/home", response_model=HomeFeed)
def home(
    request: Request,
    db: Session = Depends(get_db),
    category: Optional[str] = Query(None),
    limit: int = Query(9, ge=1, le=50),
):
    now = _now()

    def collect(model):
        q = _active(db.query(model), now, model)
        if category: q = q.filter(model.category == category)
        q = q.order_by(model.is_pinned.desc(), model.priority.desc(), model.start_at.desc().nullslast())\
             .limit(limit)
        return [ImageCard(id=r.id, imageUrl=_abs_url(request, r.image_url)) for r in q.all()]

    return HomeFeed(
        tournaments  = collect(Tournament),
        dailyBonuses = collect(DailyBonus),
        promoCodes   = collect(PromoCode),
        events       = collect(Event),
        serverTime   = now
    )

@router.get("/summary", response_model=SummaryOut)
def summary(
    request: Request,
    db: Session = Depends(get_db),
):
    now = _now()

    def count(model): return _active(db.query(model), now, model).count()

    def next_end(model):
        row = _active(db.query(model), now, model)\
              .filter(model.end_at != None).order_by(model.end_at.asc()).first()
        if not row: return None
        return {"type": model.__tablename__, "id": row.id, "endAt": row.end_at}

    nxt = next_end(Tournament) or next_end(DailyBonus) or next_end(PromoCode) or next_end(Event)

    return SummaryOut(
        activeCounts = {
            "tournaments":  count(Tournament),
            "dailyBonuses": count(DailyBonus),
            "promoCodes":   count(PromoCode),
            "events":       count(Event),
        },
        nextToEnd = nxt,
        serverTime = now
    )
