# app/api/routers/promos.py
from fastapi import APIRouter
from sqlalchemy import text
from app.db.session import engine

router = APIRouter()

@router.get("/promos/today")
def get_today_promos():
    """
    Bugünün promo kodları. Tablo yoksa ya da içerik yoksa boş liste döner.
    Öneri tablo: promos(id, code, starts_at, ends_at, is_active)
    """
    try:
        sql = text("""
            SELECT code
            FROM promos
            WHERE COALESCE(is_active, true)=true
              AND (starts_at IS NULL OR starts_at <= NOW())
              AND (ends_at   IS NULL OR ends_at   >= NOW())
            ORDER BY starts_at NULLS LAST, id DESC
            LIMIT 10
        """)
        with engine.begin() as conn:
            rows = conn.execute(sql).scalars().all()
            return rows  # []
    except Exception:
        return []  # tablo yoksa da boş
