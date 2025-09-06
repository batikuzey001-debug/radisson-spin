# app/api/routers/content.py
from typing import Annotated, Literal, Optional, Type, Dict, List, Tuple
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.db.session import get_db
from app.db.models import Tournament, DailyBonus, PromoCode, Event

router = APIRouter(prefix="/content", tags=["content"])

StatusFilter = Literal["published", "all"]

def _now() -> datetime:
    return datetime.now(timezone.utc)

def _iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    try:
        return dt.isoformat()
    except Exception:
        return None

def _abs_url(request: Request, u: Optional[str]) -> Optional[str]:
    if not u:
        return None
    if u.startswith(("data:", "http://", "https://")):
        return u
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return str(request.base_url).rstrip("/") + u
    return "https://" + u

CATEGORY_THEME: Dict[str, Dict[str, str]] = {
    "slots":       {"label": "SLOT",         "badgeColor": "#22c55e", "ribbonBg": "#F59E0B", "ctaBg": "#F59E0B"},
    "live-casino": {"label": "CANLI CASİNO", "badgeColor": "#22c55e", "ribbonBg": "#8B5CF6", "ctaBg": "#8B5CF6"},
    "sports":      {"label": "SPOR",         "badgeColor": "#22c55e", "ribbonBg": "#22C55E", "ctaBg": "#22C55E"},
    "all":         {"label": "HEPSİ",        "badgeColor": "#22c55e", "ribbonBg": "#06B6D4", "ctaBg": "#06B6D4"},
    "other":       {"label": "DİĞER",        "badgeColor": "#22c55e", "ribbonBg": "#9CA3AF", "ctaBg": "#9CA3AF"},
}
def _theme(cat: Optional[str]) -> Dict[str, str]:
    key = (cat or "other").strip().lower()
    return CATEGORY_THEME.get(key, CATEGORY_THEME["other"])

def _state_fields(
    start_at: Optional[datetime],
    end_at: Optional[datetime],
    now: datetime
) -> Tuple[str, Optional[int], Optional[int]]:
    """
    Promos/Events ile aynı davranış:
      - state: "active" (now∈[start,end]) | "upcoming" (start>now) | "idle"
      - seconds_left (active), seconds_to_start (upcoming)
    """
    if start_at and start_at > now:
        return ("upcoming", int((start_at - now).total_seconds()), None)
    if (not start_at or start_at <= now) and (not end_at or now <= end_at):
        left = int((end_at - now).total_seconds()) if end_at else None
        return ("active", None, (left if left is None else max(0, left)))
    return ("idle", None, None)

def _serialize_row(request: Request, r, now: datetime) -> dict:
    cat = getattr(r, "category", None)
    start_at = getattr(r, "start_at", None)
    end_at = getattr(r, "end_at", None)
    state, seconds_to_start, seconds_left = _state_fields(start_at, end_at, now)

    payload = {
        "id": r.id,
        "slug": getattr(r, "slug", None),
        "title": r.title,
        "subtitle": getattr(r, "subtitle", None),
        "short_desc": getattr(r, "short_desc", None),
        "long_desc": getattr(r, "long_desc", None),  # modal için
        "status": getattr(r, "status", None),
        "category": cat,
        "image_url": _abs_url(request, getattr(r, "image_url", None)),
        "banner_url": _abs_url(request, getattr(r, "banner_url", None)),
        "cta_text": getattr(r, "cta_text", None),
        "cta_url": getattr(r, "cta_url", None),
        "start_at": _iso(start_at),
        "end_at": _iso(end_at),
        "state": state,                      # <-- eklendi
        "seconds_to_start": seconds_to_start,# <-- eklendi (upcoming)
        "seconds_left": seconds_left,        # <-- eklendi (active)
        "ui": _theme(cat),
        # Türlere özel alanlar güvenli şekilde eklenir:
        "prize_pool": getattr(r, "prize_pool", None),
        "participant_count": getattr(r, "participant_count", None),
        "rank_visible": getattr(r, "rank_visible", None),
        "prize_amount": getattr(r, "prize_amount", None),
        "coupon_code": getattr(r, "coupon_code", None),
        "i18n": getattr(r, "i18n", None),
        # sıralama/öncelik için işaretler:
        "is_pinned": bool(getattr(r, "is_pinned", False)),
        "priority": getattr(r, "priority", 0),
    }
    return payload

def _list_generic(
    request: Request,
    db: Session,
    Model: Type,
    status: StatusFilter,
    limit: Optional[int],
    include_future: int,
    window_days: int,
) -> List[dict]:
    """
    Promos/Events'e benzer:
      - status="published" ise: aktif olanları getir
      - include_future=1 ise: start_at>now ve start_at<=now+window_days olanları da ekle (upcoming)
      - Çıkış: active + upcoming, state & seconds* alanlarıyla
      - Sıralama: pinned/priority -> (active önce) -> en yakın bitecek/başlayacak -> başlık
    """
    now = _now()

    active_rows = []
    future_rows = []

    # Aktif
    q = db.query(Model)
    if status == "published":
        q = q.filter(Model.status == "published")
    q = q.filter(
        and_(
            or_(getattr(Model, "start_at", None) == None, Model.start_at <= now) if hasattr(Model, "start_at") else True,  # noqa
            or_(getattr(Model, "end_at", None) == None, now <= Model.end_at) if hasattr(Model, "end_at") else True,        # noqa
        )
    )
    active_rows = q.all()

    # Upcoming (opsiyonel)
    if include_future and hasattr(Model, "start_at"):
        until = now + timedelta(days=window_days)
        qf = db.query(Model)
        if status == "published":
            qf = qf.filter(Model.status == "published")
        qf = qf.filter(
            and_(
                Model.start_at != None,   # noqa
                Model.start_at > now,
                Model.start_at <= until,
            )
        )
        future_rows = qf.all()

    # Map + sort
    out = [_serialize_row(request, r, now) for r in active_rows] + [_serialize_row(request, r, now) for r in future_rows]

    def sort_key(x: dict):
        pinned = 1 if x.get("is_pinned") else 0
        prio = int(x.get("priority") or 0)
        state_rank = 1 if x.get("state") == "active" else 0
        near = x.get("seconds_left") if state_rank == 1 else x.get("seconds_to_start")
        near = near if near is not None else 1_000_000_000
        return (-pinned, -prio, -state_rank, near, (x.get("title") or ""))

    out.sort(key=sort_key)
    if limit and limit > 0:
        out = out[: int(limit)]
    return out

# ---------- ROUTES ----------

@router.get("/tournaments")
def list_tournaments(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    status: StatusFilter = Query("published"),
    limit: Optional[int] = Query(None, ge=1, le=100),
    include_future: int = Query(1, ge=0, le=1, description="1=yakında başlayacakları da getir"),
    window_days: int = Query(30, ge=1, le=90),
):
    return _list_generic(request, db, Tournament, status, limit, include_future, window_days)

@router.get("/daily-bonuses")
def list_daily_bonuses(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    status: StatusFilter = Query("published"),
    limit: Optional[int] = Query(None, ge=1, le=100),
    include_future: int = Query(1, ge=0, le=1),
    window_days: int = Query(30, ge=1, le=90),
):
    return _list_generic(request, db, DailyBonus, status, limit, include_future, window_days)

@router.get("/promo-codes")
def list_promo_codes(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    status: StatusFilter = Query("published"),
    limit: Optional[int] = Query(None, ge=1, le=100),
    include_future: int = Query(1, ge=0, le=1),
    window_days: int = Query(30, ge=1, le=90),
):
    return _list_generic(request, db, PromoCode, status, limit, include_future, window_days)

@router.get("/events")
def list_events(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    status: StatusFilter = Query("published"),
    limit: Optional[int] = Query(None, ge=1, le=100),
    include_future: int = Query(1, ge=0, le=1),
    window_days: int = Query(30, ge=1, le=90),
):
    return _list_generic(request, db, Event, status, limit, include_future, window_days)
