# app/api/routers/admin_mod/sayfalar/turnuvabonus.py
from typing import Annotated, Dict, Any, Type
from datetime import datetime
from html import escape as _e

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import AdminUser, AdminRole, Tournament, DailyBonus, PromoCode, Event
from app.services.auth import require_role
from app.api.routers.admin_mod.yerlesim import _layout, _render_flash_blocks

router = APIRouter()

# ------- Yardımcılar -------
def _dt_parse(val: str | None):
    if not val: return None
    try:
        return datetime.fromisoformat(val.replace(" ", "T"))
    except Exception:
        return None

def _dt_input(v):
    if not v: return ""
    try:
        if isinstance(v, str):
            v = v.replace(" ", "T"); return v[:16]
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%dT%H:%M")
    except Exception:
        return ""
    return ""

# SABİT kategoriler
CATEGORY_OPTIONS = [
    ("slots",       "SLOT"),
    ("live-casino", "CANLI CASİNO"),
    ("sports",      "SPOR"),
    ("all",         "HEPSİ"),
    ("other",       "DİĞER"),
]

KIND_MAP: Dict[str, Dict[str, Any]] = {
    "tournaments":   {"label": "Turnuvalar",         "model": Tournament},
    "daily-bonuses": {"label": "Güne Özel Bonuslar", "model": DailyBonus},
    "promo-codes":   {"label": "Promosyon Kodları",  "model": PromoCode},
    "events":        {"label": "Etkinlikler",        "model": Event},
}

# ------- Sayfa (sekme) -------
@router.get("/admin/turnuvabonus", response_class=HTMLResponse)
def page_turnuvabonus(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
    tab: str = "tournaments",
):
    if tab not in KIND_MAP:
        tab = "tournaments"

    Model: Type = KIND_MAP[tab]["model"]
    rows = db.query(Model).order_by(
        Model.is_pinned.desc(),
        Model.priority.desc(),
        Model.start_at.desc().nullslast()
    ).all()

    edit_id = request.query_params.get("edit")
    editing = db.get(Model, int(edit_id)) if edit_id else None

    # Sekmeler
    tabs = [
        ("tournaments",   "Turnuvalar"),
        ("daily-bonuses", "Güne Özel Bonuslar"),
        ("promo-codes",   "Promosyon Kodları"),
        ("events",        "Etkinlikler"),
    ]
    tabs_html = ["<div class='tabs'>"]
    for key, label in tabs:
        cls = "tab active" if tab == key else "tab"
        tabs_html.append(f"<a class='{cls}' href='/admin/turnuvabonus?tab={key}'>{_e(label)}</a>")
    tabs_html.append("</div>")

    # Liste
    t = [f"<div class='card'><h1>{_e(KIND_MAP[tab]['label'])}</h1>"]
    t.append("<div class='table-wrap'><table><tr><th>ID</th><th>Başlık</th><th>Durum</th><th>Öncelik</th><th>Görsel</th><th>İşlem</th></tr>")
    for r in rows:
        img = "<span class='pill'>-</span>"
        if r.image_url:
            img = f"<img src='{_e(r.image_url)}' style='height:26px;border-radius:6px' loading='lazy' />"
        t.append(
            f"<tr><td>{r.id}</td><td>{_e(r.title)}</td><td>{_e(r.status or '-')}</td>"
            f"<td>{r.priority or 0}</td><td>{img}</td>"
            f"<td>"
            f"<a class='btn small' href='/admin/turnuvabonus?tab={tab}&edit={r.id}'>Düzenle</a> "
            f"<form method='post' action='/admin/turnuvabonus/{tab}/delete' style='display:inline' onsubmit=\"return confirm('Silinsin mi?')\">"
            f"<input type='hidden' name='id' value='{r.id}'/><button class='btn small' type='submit'>Sil</button></form>"
            f"</td></tr>"
        )
    t.append("</table></div></div>")

    # Form
    title = "Yeni Kayıt" if not editing else f"Kayıt Düzenle (#{editing.id})"
    t.append(f"<div class='card'><h1>{_e(title)}</h1>")
    t.append(f"<form method='post' action='/admin/turnuvabonus/{tab}/upsert'>")
    if editing:
        t.append(f"<input type='hidden' name='id' value='{editing.id}'>")

    val = lambda name, default="": _e(getattr(editing, name, "") or default)
    t.append("<div class='row'>")
    t.append(f"<div><div>Başlık</div><input name='title' value='{val('title')}' required></div>")
    t.append(f"<div><div>Görsel URL</div><input name='image_url' value='{val('image_url')}' placeholder='https://... veya /static/...' required></div>")
    t.append(f"<div><div>Başlangıç</div><input type='datetime-local' name='start_at' value='{_dt_input(getattr(editing,'start_at',None))}'></div>")
    t.append(f"<div><div>Bitiş</div><input type='datetime-local' name='end_at' value='{_dt_input(getattr(editing,'end_at',None))}'></div>")
    t.append("<div><div>Kategori</div><select name='category'>")
    current_cat = getattr(editing, "category", "") if editing else ""
    t.append(f"<option value='' {'selected' if not current_cat else ''}>— Seçiniz —</option>")
    for v, txt in CATEGORY_OPTIONS:
        sel = "selected" if str(current_cat) == v else ""
        t.append(f"<option value='{_e(v)}' {sel}>{_e(txt)}</option>")
    t.append("</select></div>")
    checked = "checked" if str(getattr(editing, "is_pinned", "")).lower() in ("1","true","on","yes") else ""
    t.append(f"<div><label class='cb'><input type='checkbox' name='is_pinned' {checked}> Öne çıkar</label></div>")
    t.append(f"<div><div>Öncelik</div><input type='number' name='priority' value='{val('priority','0')}' step='1' min='0'></div>")
    t.append("</div>")  # row
    t.append("<div style='height:10px'></div><button class='btn primary' type='submit'>Kaydet</button></form></div>")

    body = "".join(tabs_html) + "".join(t)
    html = _layout(body, title="Turnuva / Bonus", active="tb", is_super=(current.role == AdminRole.super_admin))
    return HTMLResponse(html)

# ------- Upsert -------
@router.post("/admin/turnuvabonus/{kind}/upsert")
async def upsert_item(
    kind: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    if kind not in KIND_MAP:
        return RedirectResponse("/admin/turnuvabonus?tab=tournaments", status_code=303)
    Model: Type = KIND_MAP[kind]["model"]

    form = await request.form()
    id_raw = (form.get("id") or "").strip()
    data = {
        "title":     (form.get("title") or "").strip(),
        "image_url": (form.get("image_url") or "").strip(),
        "status":    (form.get("status") or "draft").strip() or "draft",
        "start_at":  _dt_parse(form.get("start_at")),
        "end_at":    _dt_parse(form.get("end_at")),
        "category":  (form.get("category") or "").strip() or None,
        "is_pinned": (form.get("is_pinned") or "").lower() in ("1","true","on","yes","checked","on"),
        "priority":  int((form.get("priority") or "0") or 0),
    }

    if id_raw:
        row = db.get(Model, int(id_raw))
        if not row:
            return RedirectResponse(f"/admin/turnuvabonus?tab={kind}", status_code=303)
        for k, v in data.items():
            setattr(row, k, v)
        db.add(row)
    else:
        db.add(Model(**data))

    db.commit()
    return RedirectResponse(f"/admin/turnuvabonus?tab={kind}", status_code=303)

# ------- Sil -------
@router.post("/admin/turnuvabonus/{kind}/delete")
async def delete_item(
    kind: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    if kind not in KIND_MAP:
        return RedirectResponse("/admin/turnuvabonus?tab=tournaments", status_code=303)
    Model: Type = KIND_MAP[kind]["model"]

    form = await request.form()
    id_raw = (form.get("id") or "").strip()
    if id_raw:
        row = db.get(Model, int(id_raw))
        if row:
            db.delete(row)
            db.commit()

    return RedirectResponse(f"/admin/turnuvabonus?tab={kind}", status_code=303)
