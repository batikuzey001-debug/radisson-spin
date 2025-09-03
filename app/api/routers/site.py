# app/api/routers/site.py
from typing import Annotated, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import SiteConfig

router = APIRouter(prefix="/site", tags=["site"])

# Varsayılan değerler (CMS boşsa bunlar döner)
DEFAULTS: Dict[str, str] = {
    "logo_url": "",               # boş gelsin
    "login_cta_text": "Giriş",    # butonda sadece "Giriş" yazsın
    "login_cta_url": ""           # boş gelsin
}


@router.get("/header")
def get_header_config(db: Annotated[Session, Depends(get_db)]) -> Dict[str, str]:
    """
    Frontend header ayarları (logo + giriş butonu).
    Eğer CMS (SiteConfig) üzerinde değer yoksa DEFAULTS döner.
    """
    keys = list(DEFAULTS.keys())
    rows = db.execute(
        select(SiteConfig).where(SiteConfig.key.in_(keys))
    ).scalars().all()

    result = DEFAULTS.copy()
    for row in rows:
        val = (row.value_text or "").strip()
        if val or row.key == "login_cta_text":
            # login_cta_text için boş değilse default zaten "Giriş"
            result[row.key] = val or DEFAULTS[row.key]

    return result
