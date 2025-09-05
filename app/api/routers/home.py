# app/api/routers/home.py
from typing import List, Annotated, Dict, Any
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import HomeBanner, SiteConfig
from app.schemas.home import HomeBannerOut

router = APIRouter(prefix="/home", tags=["home"])

# -----------------------------
# /home/banners (mevcut)
# -----------------------------
@router.get("/banners", response_model=List[HomeBannerOut])
def list_banners(
    db: Annotated[Session, Depends(get_db)],
    active: bool = True
):
    q = select(HomeBanner).order_by(HomeBanner.order.asc(), HomeBanner.id.desc())
    if active:
        q = q.where(HomeBanner.is_active.is_(True))
    rows = db.execute(q).scalars().all()
    return rows


# -----------------------------
# /home/stats  (Hero sol blok istatistik aralıkları)
# Admin panelinde 'hero_stats' JSON olarak saklanır.
# Örn payload:
# {
#   "total_min": 60000000, "total_max": 95000000,
#   "dist_min":  200000,   "dist_max":  1200000,
#   "part_min":  300000,   "part_max":  800000
# }
# -----------------------------
_DEFAULTS: Dict[str, int] = {
    "total_min": 60_000_000, "total_max": 95_000_000,
    "dist_min":   200_000,   "dist_max":  1_200_000,
    "part_min":   300_000,   "part_max":  800_000,
}

def _get_json_conf(db: Session, key: str) -> Dict[str, Any]:
    row = db.get(SiteConfig, key)
    if not row or not row.value_text:
        return {}
    try:
        return json.loads(row.value_text)
    except Exception:
        return {}

@router.get("/stats")
def home_stats(db: Annotated[Session, Depends(get_db)]) -> Dict[str, int]:
    """
    Hero istatistik aralıkları (min/max).
    Frontend bu aralıkları küçük salınım (drift) ile gösterecek.
    """
    data = {**_DEFAULTS, **_get_json_conf(db, "hero_stats")}
    out: Dict[str, int] = {}
    # tip güvenliği: int'e çevir, hata olursa defaults
    for k, v in data.items():
        try:
            out[k] = int(v)
        except Exception:
            out[k] = _DEFAULTS[k]
    return out
