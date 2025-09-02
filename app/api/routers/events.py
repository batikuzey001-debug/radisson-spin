# app/api/routers/events.py
from fastapi import APIRouter, Query
from sqlalchemy import text
from app.db.session import engine

router = APIRouter()

@router.get("/events/upcoming")
def get_upcoming_events(limit: int = Query(4, ge=1, le=24)):
    """
    Yaklaşan etkinlikler. Tablo yoksa boş döner.
    Öneri tablo: events(id, title, starts_at, description)
    """
    try:
        sql = text("""
            SELECT id, title, starts_at, description
            FROM events
            WHERE starts_at >= NOW()
            ORDER BY starts_at ASC
            LIMIT :limit
        """)
        with engine.begin() as conn:
            rows = conn.execute(sql, {"limit": limit}).mappings().all()
            return [dict(r) for r in rows]
    except Exception:
        return []
