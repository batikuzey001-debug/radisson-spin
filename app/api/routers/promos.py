# app/api/routers/promos.py
from typing import Annotated, Dict, List, Optional
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.db.session import get_db
from app.db.models import PromoCode

router = APIRouter(prefix="/promos", tags=["promos"])

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _sec_between(a: Optional[datetime], b: Optional[datetime]) -> Optional[int]:
    if not a or not b:
        return None
    try:
        return max(0, int((a - b).total_seconds()))
    except Exception:
        return None

@router.get("/active")
async def get_active_promos(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(6, ge=1, le=50),
    include_future: int = Query(1, ge=0, le=1, description="1=yakında başlayacak olanları da getir"),
    window_hours: int = Query(48, ge=1, le=168, description="Gelecek promosyonları şu kadar saat için göster"),
    include_drafts: int = Query(0, ge=0, le=1, description="1=taslakları da getir (debug)"),
) -> List[Dict]:
    """
    Aktif + (opsiyonel) Yakında başlayacak promosyonlar.
    Dönüş alanları:
      id, title, image_url, category, start_at, end_at,
      state: 'active'|'upcoming',
      seconds_left (active), seconds_to_start (upcoming),
      accent_color, bg_color, priority, is_pinned,
      coupon_code (ham kupon), promo_code (FE uyumlu alias),
      cta_text, cta_url, participant_count (varsa)
    Sıralama: pinned/priority -> (active üstte) -> en yakın bitecek/başlayacak -> title
    """
    now = _utcnow()

    # --- Aktif olanlar ---
    q = db.query(PromoCode)
    if not include_drafts:
        q = q.filter(PromoCode.status == "published")
    q = q.filter(
        and_(
            or_(PromoCode.start_at == None, PromoCode.start_at <= now),   # noqa: E711
            or_(PromoCode.end_at == None, now <= PromoCode.end_at),       # noqa: E711
        )
    )
    active_rows = q.all()

    # --- Yakında başlayacaklar ---
    future_rows: List[PromoCode] = []
    if include_future:
        until = now + timedelta(hours=window_hours)
        qf = db.query(PromoCode)
        if not include_drafts:
            qf = qf.filter(PromoCode.status == "published")
        qf = qf.filter(
            and_(
                PromoCode.start_at != None,              # noqa: E711
                PromoCode.start_at > now,
                PromoCode.start_at <= until,
            )
        )
        future_rows = qf.all()

    def map_row_active(r: PromoCode) -> Dict:
        return {
            "id": r.id,
            "title": r.title,
            "image_url": r.image_url,
            "category": getattr(r, "category", None),
            "start_at": r.start_at.isoformat() if r.start_at else None,
            "end_at": r.end_at.isoformat() if r.end_at else None,
            "state": "active",
            "seconds_left": _sec_between(r.end_at, now),
            "seconds_to_start": None,
            "accent_color": getattr(r, "accent_color", None),
            "bg_color": getattr(r, "bg_color", None),
            "priority": getattr(r, "priority", 0),
            "is_pinned": bool(getattr(r, "is_pinned", False)),
            # Kupon/CTA
            "coupon_code": getattr(r, "coupon_code", None),
            "promo_code": getattr(r, "coupon_code", None),  # FE uyumluluk: QuickBonus promo_code alanını okuyor
            "cta_text": getattr(r, "cta_text", None),
            "cta_url": getattr(r, "cta_url", None),
            # Opsiyonel max kişi
            "participant_count": getattr(r, "participant_count", None),
        }

    def map_row_upcoming(r: PromoCode) -> Dict:
        return {
            "id": r.id,
            "title": r.title,
            "image_url": r.image_url,
            "category": getattr(r, "category", None),
            "start_at": r.start_at.isoformat() if r.start_at else None,
            "end_at": r.end_at.isoformat() if r.end_at else None,
            "state": "upcoming",
            "seconds_left": None,
            "seconds_to_start": _sec_between(r.start_at, now),
            "accent_color": getattr(r, "accent_color", None),
            "bg_color": getattr(r, "bg_color", None),
            "priority": getattr(r, "priority", 0),
            "is_pinned": bool(getattr(r, "is_pinned", False)),
            # Kupon/CTA (upcoming için FE kodu kilitler ama alanlar yine döndürülür)
            "coupon_code": getattr(r, "coupon_code", None),
            "promo_code": getattr(r, "coupon_code", None),
            "cta_text": getattr(r, "cta_text", None),
            "cta_url": getattr(r, "cta_url", None),
            "participant_count": getattr(r, "participant_count", None),
        }

    out: List[Dict] = [*map(map_row_active, active_rows), *map(map_row_upcoming, future_rows)]

    # Sıralama: pinned/priority -> state(active önce) -> yakın (end_at/ start_at) -> title
    def sort_key(x: Dict):
        pinned = 1 if x.get("is_pinned") else 0
        prio = int(x.get("priority") or 0)
        state_rank = 1 if x.get("state") == "active" else 0
        near = x.get("seconds_left") if state_rank == 1 else x.get("seconds_to_start")
        near = near if near is not None else 1_000_000_000
        return (-pinned, -prio, -state_rank, near, (x.get("title") or ""))

    out.sort(key=sort_key)
    return out[:limit]
