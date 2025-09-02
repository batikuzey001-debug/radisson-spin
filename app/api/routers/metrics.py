# app/api/routers/metrics.py
from fastapi import APIRouter, Response, status
from sqlalchemy import text
from app.db.session import engine

router = APIRouter()

@router.get("/metrics/summary")
def metrics_summary(response: Response):
    """
    Özet metrikler. Kaynak yoksa 204 döner (sahte veri yok).
    Öneri tablo/kv: metrics(key TEXT PRIMARY KEY, value JSONB)
    """
    try:
        sql = text("SELECT value FROM metrics WHERE key='homepage_summary'")
        with engine.begin() as conn:
            row = conn.execute(sql).scalar_one_or_none()
            if row is None:
                response.status_code = status.HTTP_204_NO_CONTENT
                return None
            return row
    except Exception:
        response.status_code = status.HTTP_204_NO_CONTENT
        return None
