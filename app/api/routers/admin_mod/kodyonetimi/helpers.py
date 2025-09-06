# app/api/routers/admin_mod/kodyonetimi/helpers.py
from typing import List, Optional
from html import escape as _e
from sqlalchemy.orm import Session

from app.db.models import PrizeTier

def _normalize(u: str | None) -> str | None:
    if not u:
        return None
    x = u.strip()
    if not x:
        return None
    if x.startswith(("http://", "https://", "data:")):
        return x
    if x.startswith("//"):
        return "https:" + x
    return x

def _img_cell(url: str | None) -> str:
    u = _normalize(url or "")
    if not u:
        return "-"
    return f'<img src="{_e(u)}" style="height:24px" loading="lazy" />'

def _tiers(db: Session) -> List[PrizeTier]:
    return db.query(PrizeTier).order_by(PrizeTier.sort.asc(), PrizeTier.key.asc()).all()

__all__ = ["_e", "_normalize", "_img_cell", "_tiers"]
