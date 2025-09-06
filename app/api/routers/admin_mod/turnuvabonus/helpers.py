# app/api/routers/admin_mod/turnuvabonus/helpers.py
from typing import Optional, Type
from datetime import datetime
from html import escape as _e

# --- tarih parse/input yardımcıları ---
def _dt_parse(val: Optional[str]):
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace(" ", "T"))
    except Exception:
        return None

def _dt_input(v):
    if not v:
        return ""
    try:
        if isinstance(v, str):
            v = v.replace(" ", "T")
            return v[:16]
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%dT%H:%M")
    except Exception:
        return ""
    return ""

# --- sayı/para gösterimi ---
def _fmt_try(v) -> str:
    try:
        if v is None:
            return "-"
        n = int(v)
        s = f"{n:,}".replace(",", ".")
        return f"{s} ₺"
    except Exception:
        return "-"

# --- model alan kontrolü ---
def _has(Model: Type, name: str) -> bool:
    return hasattr(Model, name)

# --- kategoriler (ortak) ---
CATEGORY_OPTIONS = [
    ("slots",       "SLOT"),
    ("live-casino", "CANLI CASİNO"),
    ("sports",      "SPOR"),
    ("all",         "HEPSİ"),
    ("other",       "DİĞER"),
]

__all__ = ["_e", "_dt_parse", "_dt_input", "_fmt_try", "_has", "CATEGORY_OPTIONS"]
