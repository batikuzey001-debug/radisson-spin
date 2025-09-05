# app/api/routers/events.py
from typing import Annotated, Dict, List, Optional
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.db.session import get_db
from app.db.models import Event

router = APIRouter(prefix="/events", tags=["events"])


# ---------- helpers ----------
def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _sec_between(later: Optional[datetime], earlier: Optional[datetime]) -> Optional[int]:
    """later - earlier (>=0). later/earlier None ise None döner."""
    if not later or not earlier:
        return None
    try:
        return max(0, int((later - earlier).total_seconds()))
    except Exception:
        return None


# ---------- public: aktif + yakında başlayacak etkinlikler ----------
@router.get("/active")
async def get_active_events(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(8, ge=1, le=50, description="Kart sayısı"),
    include_future: int = Query(1, ge=0, le=1, description="1=yakında başlayacakları da dahil et"),
    window_days: int = Query(30, ge=1, le=90, description="Yakındaki etkinlikler için gün penceresi"),
    include_drafts: int = Query(0, ge=0, le=1, description="1=tüm statüler (debug)"),
    category: Optional[str] = Query(None, description="Kategori filtresi (opsiyonel)"),
) -> List[Dict]:
    """
    Etkinlik kartları (admin'den doldurulan Event kayıtları):
      - state: "active"   -> now, start/end aralığında
      - state: "upcoming" -> start_at gelecekte ve window_days içinde
    Sıralama: pinned/priority -> (active önce) -> en yakın bitecek/başlayacak -> başlık
    Dönen alanlar: id, title, image_url, start_at, end_at, category, state,
                   seconds_left (active), seconds_to_start (upcoming),
                   accent_color, bg_color, priority, is_pinned, prize_amount
    """
    now = _utcnow()

    # --- aktif ---
    qa = db.query(Event)
    if not include_drafts:
        qa = qa.filter(Event.status == "published")
    if category:
        qa = qa.filter(Event.category == category)
    qa = qa.filter(
        and_(
            or_(Event.start_at == None, Event.start_at <= now),  # noqa: E711
            or_(Event.end_at == None, now <= Event.end_at),      # noqa: E711
        )
    )
    active = qa.all()

    # --- yakında ---
    future: List[Event] = []
    if include_future:
        until = now + timedelta(days=window_days)
        qf = db.query(Event)
        if not include_drafts:
            qf = qf.filter(Event.status == "published")
        if category:
            qf = qf.filter(Event.category == category)
        qf = qf.filter(
            and_(
                Event.start_at != None,            # noqa: E711
                Event.start_at > now,
                Event.start_at <= until,
            )
        )
        future = qf.all()

    # map -> FE için sade JSON
    out: List[Dict] = []
    for r in active:
        out.append({
            "id": r.id,
            "title": r.title,
            "image_url": r.image_url,
            "category": r.category,
            "start_at": r.start_at.isoformat() if r.start_at else None,
            "end_at": r.end_at.isoformat() if r.end_at else None,
            "state": "active",
            "seconds_left": _sec_between(r.end_at, now),
            "seconds_to_start": None,
            "accent_color": getattr(r, "accent_color", None),
            "bg_color": getattr(r, "bg_color", None),
            "priority": getattr(r, "priority", 0),
            "is_pinned": bool(getattr(r, "is_pinned", False)),
            "prize_amount": int(getattr(r, "prize_amount", 0)) if getattr(r, "prize_amount", None) is not None else None,
        })

    for r in future:
        out.append({
            "id": r.id,
            "title": r.title,
            "image_url": r.image_url,
            "category": r.category,
            "start_at": r.start_at.isoformat() if r.start_at else None,
            "end_at": r.end_at.isoformat() if r.end_at else None,
            "state": "upcoming",
            "seconds_left": None,
            "seconds_to_start": _sec_between(r.start_at, now),
            "accent_color": getattr(r, "accent_color", None),
            "bg_color": getattr(r, "bg_color", None),
            "priority": getattr(r, "priority", 0),
            "is_pinned": bool(getattr(r, "is_pinned", False)),
            "prize_amount": int(getattr(r, "prize_amount", 0)) if getattr(r, "prize_amount", None) is not None else None,
        })

    # sıralama
    def sort_key(x: Dict):
        pinned = 1 if x.get("is_pinned") else 0
        prio = int(x.get("priority") or 0)
        state_rank = 1 if x.get("state") == "active" else 0
        near = x.get("seconds_left") if state_rank == 1 else x.get("seconds_to_start")
        near = near if near is not None else 1_000_000_000
        return (-pinned, -prio, -state_rank, near, (x.get("title") or ""))

    out.sort(key=sort_key)
    return out[:limit]
