# app/api/routers/promos.py
from typing import Annotated, Dict, List, Optional
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.db.session import get_db
from app.db.models import PromoCode

router = APIRouter(prefix="/promos", tags=["promos"])


def _utcnow() -> datetime:
    # Why: tüm karşılaştırmaları UTC ile yapıyoruz.
    return datetime.now(timezone.utc)


def _seconds_left(now: datetime, end_at: Optional[datetime]) -> Optional[int]:
    if not end_at:
        return None
    try:
        diff = int((end_at - now).total_seconds())
        return max(0, diff)
    except Exception:
        return None


@router.get("/active")
async def get_active_promos(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(6, ge=1, le=50, description="Döndürülecek promo kart sayısı"),
    include_drafts: int = Query(0, ge=0, le=1, description="1=taslakları da getir (debug)"),
) -> List[Dict]:
    """
    Yayındaki promosyon kodları (Hızlı Bonus alanı).
    Kriter:
      - status = 'published'  (include_drafts=1 ise bu kısıt kalkar)
      - start_at <= now AND (end_at IS NULL OR now <= end_at)
    Sıralama:
      - is_pinned desc
      - priority desc
      - end_at asc NULLS LAST
      - start_at desc
    Dönüş şeması (FE kartları için sade):
    [
      {
        "id": 1,
        "title": "Hafta Sonu Bonusu",
        "image_url": "...",
        "coupon_code": "NEON50",
        "cta_url": "/kampanya/neon50",
        "start_at": "2025-09-04T10:00:00+00:00",
        "end_at": "2025-09-04T23:59:59+00:00",
        "seconds_left": 43200,
        "accent_color": "#00e5ff",
        "bg_color": "#0b1224",
        "priority": 10,
        "is_pinned": true
      }
    ]
    """
    now = _utcnow()

    q = db.query(PromoCode)

    if not include_drafts:
        q = q.filter(PromoCode.status == "published")

    # zaman penceresi (başlamış olmalı ve bitmemiş/sona ermemiş olmalı)
    q = q.filter(
        and_(
            or_(PromoCode.start_at == None, PromoCode.start_at <= now),  # noqa: E711
            or_(PromoCode.end_at == None, now <= PromoCode.end_at),      # noqa: E711
        )
    )

    # sıralama
    q = (
        q.order_by(
            PromoCode.is_pinned.desc(),
            PromoCode.priority.desc(),
            PromoCode.end_at.asc().nulls_last(),  # type: ignore[attr-defined]
            PromoCode.start_at.desc(),
        )
        .limit(limit)
    )

    rows = q.all()

    out: List[Dict] = []
    for r in rows:
        out.append(
            {
                "id": r.id,
                "title": r.title,
                "image_url": r.image_url,
                "coupon_code": getattr(r, "coupon_code", None),
                "cta_url": getattr(r, "cta_url", None),
                "start_at": r.start_at.isoformat() if r.start_at else None,
                "end_at": r.end_at.isoformat() if r.end_at else None,
                "seconds_left": _seconds_left(now, r.end_at),
                "accent_color": getattr(r, "accent_color", None),
                "bg_color": getattr(r, "bg_color", None),
                "priority": getattr(r, "priority", 0),
                "is_pinned": bool(getattr(r, "is_pinned", False)),
            }
        )

    return out
