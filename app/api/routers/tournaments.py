# app/api/routers/tournaments.py
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
from app.db.session import engine

router = APIRouter()

@router.get("/tournaments/active")
def get_active_tournaments(limit: int = Query(4, ge=1, le=24)) -> List[dict]:
    """
    Aktif turnuvaları döndürür. Sahte veri yok; kayıt yoksa [].
    Beklenen kolonlar (öneri): id, title, prize_pool, participant_count, banner_url, slug
    """
    sql = text("""
        SELECT id, title, prize_pool, participant_count, banner_url, slug
        FROM tournaments
        WHERE COALESCE(is_active, true) = true
        ORDER BY COALESCE(updated_at, created_at) DESC
        LIMIT :limit
    """)
    with engine.begin() as conn:
        rows = conn.execute(sql, {"limit": limit}).mappings().all()
        return [dict(r) for r in rows]
