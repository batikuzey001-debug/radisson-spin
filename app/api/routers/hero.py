# app/api/routers/hero.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.db.session import get_db
from app.db.models import SiteConfig

router = APIRouter()

# Varsayılan aralıklar (backend tarafındaki güvenli fallback)
DEFAULTS = {
    "total_min": 60_000_000, "total_max": 95_000_000,   # Toplam Ödül (₺)
    "dist_min":   200_000,   "dist_max":   1_200_000,   # Dağıtılan Ödül (₺)
    "part_min":   300_000,   "part_max":   800_000,     # Katılımcı (adet)
}

def _get_json(db: Session, key: str) -> Dict[str, Any]:
    row = db.get(SiteConfig, key)
    if not row or not row.value_text:
        return {}
    try:
        import json
        return json.loads(row.value_text)
    except Exception:
        return {}

@router.get("/hero/stats")
def hero_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Frontend Hero istatistik aralıkları (min/max). Admin panelinden ayarlanır.
    """
    data = {**DEFAULTS, **_get_json(db, "hero_stats")}
    # tip güvenliği
    out = {}
    for k, v in data.items():
        try:
            out[k] = int(v)
        except Exception:
            out[k] = DEFAULTS[k]
    return out
