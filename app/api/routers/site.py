# app/api/routers/site.py
from typing import Annotated, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import SiteConfig

router = APIRouter(prefix="/site", tags=["site"])

# Varsayılanlar (CMS boşsa bunlar döner)
DEFAULTS: Dict[str, str] = {
    "logo_url": "",            # boş
    "login_cta_text": "Giriş", # butonda "Giriş"
    "login_cta_url": "",       # boş
    "online_min": "",          # boş (frontend fallback kullanır)
    "online_max": ""           # boş (frontend fallback kullanır)
}


@router.get("/header")
def get_header_config(db: Annotated[Session, Depends(get_db)]) -> Dict[str, str]:
    """
    Frontend header ayarları (logo + giriş butonu + online aralığı).
    CMS (SiteConfig) kaydı yoksa DEFAULTS döner.
    """
    keys = list(DEFAULTS.keys())
    rows = db.execute(select(SiteConfig).where(SiteConfig.key.in_(keys))).scalars().all()

    result = DEFAULTS.copy()
    for row in rows:
        val = (row.value_text or "").strip()
        # login_cta_text için boş kalsa da "Giriş" defaultu koru
        if row.key == "login_cta_text":
            result[row.key] = val or DEFAULTS[row.key]
        else:
            result[row.key] = val  # diğerleri boş kalabilir

    return result
