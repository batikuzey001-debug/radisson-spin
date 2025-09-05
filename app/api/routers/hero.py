# app/api/routers/hero.py
from typing import Dict, Any
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import SiteConfig

router = APIRouter()

# Güvenli varsayılan aralıklar (admin ayarları yoksa)
DEFAULTS: Dict[str, int] = {
    # Toplam Ödül (₺)
    "total_min": 60_000_000,
    "total_max": 95_000_000,
    # Dağıtılan Ödül (₺)
    "dist_min": 200_000,
    "dist_max": 1_200_000,
    # Katılımcı (adet)
    "part_min": 300_000,
    "part_max": 800_000,
}


def _load_json(db: Session, key: str) -> Dict[str, Any]:
    row = db.get(SiteConfig, key)
    if not row or not row.value_text:
        return {}
    try:
        return json.loads(row.value_text)
    except Exception:
        return {}


@router.get("/hero/stats")
def hero_stats(db: Session = Depends(get_db)) -> Dict[str, int]:
    """
    Hero istatistik aralıkları (min/max). Admin panelinden 'hero_stats' JSON'u ile yönetilir.
    Dönüş örn:
    {
      "total_min": 60000000, "total_max": 95000000,
      "dist_min": 200000,    "dist_max": 1200000,
      "part_min": 300000,    "part_max": 800000
    }
    """
    data = {**DEFAULTS, **_load_json(db, "hero_stats")}
    out: Dict[str, int] = {}
    for k, v in data.items():
        try:
            out[k] = int(v)
        except Exception:
            out[k] = DEFAULTS[k]
    return out
