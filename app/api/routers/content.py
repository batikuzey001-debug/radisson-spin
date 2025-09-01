# app/api/routers/content.py
from typing import Annotated, Literal, Optional, Type, Dict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Tournament, DailyBonus, PromoCode, Event

router = APIRouter(prefix="/content", tags=["content"])

StatusFilter = Literal["published", "all"]

def _now() -> datetime:
    return datetime.now(timezone.utc)

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
    "sports":      {"label": "SPOR",         "badgeColor": "#22c55e", "ribbonBg": "#3B82F6", "ctaBg": "#3B82F6"},
    "all":         {"label": "HEPSİ",        "badgeColor": "#22c55e", "ribbonBg": "#EC4899", "ctaBg": "#EC4899"},
    "other":       {"label": "DİĞER",        "badgeColor": "#22c55e", "ribbonBg": "#9CA3AF", "ctaBg": "#9CA3AF"},
}
def _theme(cat: Optional[str]) -> Dict[str, str]:
    key = (cat or "other").strip().lower()
    return CATEGORY_THEME.get(key, CATEGORY_THEME["other"])

def _serialize_row(request: Request, r) -> dict:
    cat = getattr(r, "category", None)
    return {
        "id": r.id,
        "slug": getattr(r, "slug", None),
        "title": r.title,
        "subtitle": getattr(r, "subtitle", None),
        "short_desc": getattr(r, "short_desc", None),
        "long_desc": getattr(r, "long_desc", None),  # modal için
        "status": r.status,
        "category": cat,
        "image_url": _abs_url(request, getattr(r, "image_url", None)),
        "banner_url": _abs_url(request, getattr(r, "banner_url", None)),
        "cta_url": getattr(r, "cta_url", None),
        "start_at": getattr(r, "start_at", None),
        "end_at": getattr(r, "end_at", None),
        "ui": _theme(cat),
        "prize_pool": getattr(r, "prize_pool", None),
        "participant_count": getattr(r, "participant_count", None),
        "rank_visible": getattr(r, "rank_visible", None),
        "i18n": getattr(r, "i18n", None),
    }

def _list_generic(
    request: Request,
    db: Session,
    Model: Type,
    status: StatusFilter,
    limit: Optional[int],
):
    q = db.query(Model)
    if status == "published":
        now = _now()
        q = q.filter(Model.status == "published")
        if hasattr(Model, "start_at"):
            q = q.filter((Model.start_at == None) | (Model.start_at <= now))
        if hasattr(Model, "end_at"):
            q = q.filter((Model.end_at == None) | (Model.end_at >= now))
    if hasattr(Model, "start_at"):
        q = q.order_by(getattr(Model, "start_at").desc().nullslast(), Model.id.desc())
    else:
        q = q.order_by(Model.id.desc())
    if limit and limit > 0:
        q = q.limit(int(limit))
    rows = q.all()
    return [_serialize_row(request, r) for r in rows]

@router.get("/tournaments")
def list_tournaments(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    status: StatusFilter = Query("published"),
    limit: Optional[int] = Query(None, ge=1, le=100),
):
    return _list_generic(request, db, Tournament, status, limit)

@router.get("/daily-bonuses")
def list_daily_bonuses(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    status: StatusFilter = Query("published"),
    limit: Optional[int] = Query(None, ge=1, le=100),
):
    return _list_generic(request, db, DailyBonus, status, limit)

@router.get("/promo-codes")
def list_promo_codes(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    status: StatusFilter = Query("published"),
    limit: Optional[int] = Query(None, ge=1, le=100),
):
    return _list_generic(request, db, PromoCode, status, limit)

@router.get("/events")
def list_events(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    status: StatusFilter = Query("published"),
    limit: Optional[int] = Query(None, ge=1, le=100),
):
    return _list_generic(request, db, Event, status, limit)
