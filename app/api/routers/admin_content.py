# app/api/routers/admin_content.py
from typing import Annotated, Dict, Any, Type
from datetime import datetime
from html import escape as _e

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import AdminUser, AdminRole, Tournament, DailyBonus, PromoCode, Event
from app.services.auth import require_role

router = APIRouter()

# ------------------ Yardımcılar ------------------
def _dt_parse(val: str | None):
    """HTML datetime-local ('YYYY-MM-DDTHH:MM') -> datetime (naive destekler)."""
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace(" ", "T"))
    except Exception:
        return None

def _dt_input(v):
    """datetime -> HTML input formatı 'YYYY-MM-DDTHH:MM'"""
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

# Bu listeyi ayrı bir ayarlar dosyasından da besleyebiliriz.
CATEGORY_OPTIONS = [
    ("slots", "Slot"),
    ("poker", "Poker"),
    ("casino", "Casino"),
    ("promo", "Promosyon"),
]

KIND_MAP: Dict[str, Dict[str, Any]] = {
    "tournaments":   {"label": "Turnuvalar",         "model": Tournament},
    "daily-bonuses": {"label": "Güne Özel Bonuslar", "model": DailyBonus},
    "promo-codes":   {"label": "Promosyon Kodları",  "model": PromoCode},
    "events":        {"label": "Etkinlikler",        "model": Event},
}

# ------------------ Basit Şablon ------------------
def _layout(title: str, body: str) -> str:
    return f"""<!doctype html><html lang="tr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_e(title)}</title>
<style>
  body{{margin:0;background:#0a0b0f;color:#eef2ff;font:14px/1.5 system-ui,Segoe UI,Roboto}}
  .wrap{{max-width:1100px;margin:24px auto;padding:0 16px}}
  h1{{font-size:20px;margin:8px 0 16px}}
  .tabs a{{display:inline-block;margin-right:8px;padding:6px 10px;border:1px solid #2a2f3a;border-radius:8px;color:#aeb7d0;text-decoration:none}}
  .tabs a.active,.tabs a:hover{{color:#fff;background:#121624}}
  .card{{background:#0f1320;border:1px solid #20283a;border-radius:12px;padding:14px;margin:14px 0}}
  table{{width:100%;border-collapse:collapse}}
  th,td{{border-bottom:1px solid #1e2433;padding:8px;text-align:left;white-space:nowrap}}
  th{{font-size:12px;text-transform:uppercase;color:#9aa3b7}}
  input,select{{width:100%;background:#0b0f1a;color:#fff;border:1px solid #243049;border-radius:10px;padding:8px}}
  .row{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
  .row-1{{display:grid;grid-template-columns:1fr;gap:10px}}
  .actions form{{display:inline}}
  .btn{{display:inline-block;padding:8px 12px;border-radius:10px;border:1px solid #2a2f3a;background:#101629;color:#fff;text-decoration:none}}
  .btn.primary{{background:linear-gradient(90deg,#0ea5e9,#60a5fa)}}
  .pill{{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #2a2f3a;color:#aeb7d0}}
  .hint{{font-size:12px;color:#9aa3b7;margin-top:4px}}
  label.cb{{display:flex;align-items:center;gap:8px;color:#c8d1e3}}
</style></head><body><div class="wrap">{body}</div></body></html>"""

def _tabs(active: str) -> str:
    items = []
    for k, v in KIND_MAP.items():
        cls = "active" if k == active else ""
        items.append(f'<a href="/admin/content/{k}" class="{cls}">{_e(v["label"])}</a>')
    return '<div class="tabs">' + "".join(items) + "</div>"

# ------------------ Liste + Form ------------------
@router.get("/admin/content/{kind}", response_class=HTMLResponse)
def content_list(
    kind: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    if kind not in KIND_MAP:
        return HTMLResponse(_layout("İçerik", "<p>Geçersiz tür.</p>"), status_code=404)

    Model: Type = KIND_MAP[kind]["model"]
    rows = db.query(Model).order_by(
        Model.is_pinned.desc(),
        Model.priority.desc(),
        Model.start_at.desc().nullslast()
    ).all()

    edit_id = request.query_params.get("edit")
    editing = db.get(Model, int(edit_id)) if edit_id else None

    # Liste tablo
    t = [f'<div class="card"><h1>{_e(KIND_MAP[kind]["label"])}</h1>{_tabs(kind)}<div style="height:8px"></div>']
    t.append('<div class="card"><table><tr><th>ID</th><th>Başlık</th><th>Durum</th><th>Öncelik</th><th>Görsel</th><th>İşlem</th></tr>')
    for r in rows:
        img = "<span class='pill'>-</span>"
        if r.image_url:
            img = f"<img src='{_e(r.image_url)}' style='height:26px;border-radius:6px' loading='lazy' />"
        t.append(
            f"<tr><td>{r.id}</td><td>{_e(r.title)}</td><td>{_e(r.status or '-')}</td>"
            f"<td>{r.priority or 0}</td><td>{img}</td>"
            f"<td class='actions'>"
            f"<a class='btn' href='/admin/content/{kind}?edit={r.id}'>Düzenle</a> "
            f"<form method='post' action='/admin/content/{kind}/delete' onsubmit=\"return confirm('Silinsin mi?')\">"
            f"<input type='hidden' name='id' value='{r.id}'/><button class='btn'>Sil</button></form></td></tr>"
        )
    t.append("</table></div>")

    # Form
    title = "Yeni Kayıt" if not editing else f"Kayıt Düzenle (#{editing.id})"
    t.append(f'<div class="card"><h1>{_e(title)}</h1>')
    t.append(f"<form method='post' action='/admin/content/{kind}/upsert'>")
    if editing:
        t.append(f"<input type='hidden' name='id' value='{editing.id}'>")

    # Alanlar
    val = lambda name, default="": _e(getattr(editing, name, "") or default)

    t.append('<div class="row">')
    # Başlık
    t.append(f"<div><div>Başlık</div><input name='title' value='{val('title')}' required></div>")
    # Görsel URL
    t.append(f"<div><div>Görsel URL</div><input name='image_url' value='{val('image_url')}' placeholder='https://... veya /static/...' required></div>")
    # Başlangıç
    t.append(f"<div><div>Başlangıç</div><input type='datetime-local' name='start_at' value='{_dt_input(getattr(editing,'start_at',None))}'></div>")
    # Bitiş
    t.append(f"<div><div>Bitiş</div><input type='datetime-local' name='end_at' value='{_dt_input(getattr(editing,'end_at',None))}'></div>")
    # Kategori (select)
    t.append("<div><div>Kategori</div><select name='category'>")
    current_cat = getattr(editing, "category", "") if editing else ""
    t.append(f"<option value='' {'selected' if not current_cat else ''}>— Seçiniz —</option>")
    for v, txt in CATEGORY_OPTIONS:
        sel = "selected" if str(current_cat) == v else ""
        t.append(f"<option value='{_e(v)}' {sel}>{_e(txt)}</option>")
    t.append("</select><div class='hint'>Kategori seçenekleri ayrı alandan yönetilecek.</div></div>")
    # Öne çıkar (checkbox)
    checked = "checked" if str(getattr(editing, "is_pinned", "")).lower() in ("1","true","on","yes") else ""
    t.append(f"<div><label class='cb'><input type='checkbox' name='is_pinned' {checked}> Öne çıkar</label></div>")
    # Öncelik
    t.append(f"<div><div>Öncelik</div><input type='number' name='priority' value='{val('priority','0')}' step='1' min='0'></div>")
    t.append("</div>")  # .row

    t.append("<div style='height:10px'></div>")
    t.append("<button class='btn primary' type='submit'>Kaydet</button></form></div></div>")

    return HTMLResponse(_layout("İçerik Yönetimi", "".join(t)))

# ------------------ Upsert (ASYNC) ------------------
@router.post("/admin/content/{kind}/upsert")
async def content_upsert(
    kind: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    if kind not in KIND_MAP:
        return RedirectResponse("/admin/content/tournaments", status_code=303)
    Model: Type = KIND_MAP[kind]["model"]

    form = await request.form()

    id_raw = (form.get("id") or "").strip()
    data = {
        "title":     (form.get("title") or "").strip(),
        "image_url": (form.get("image_url") or "").strip(),
        "status":    (form.get("status") or "draft").strip() or "draft",  # formda status alanını kaldırdık; default 'draft'
        "start_at":  _dt_parse(form.get("start_at")),
        "end_at":    _dt_parse(form.get("end_at")),
        "category":  (form.get("category") or "").strip() or None,
        "is_pinned": (form.get("is_pinned") or "").lower() in ("1","true","on","yes","checked","on"),
        "priority":  int((form.get("priority") or "0") or 0),
    }

    if id_raw:
        row = db.get(Model, int(id_raw))
        if not row:
            return RedirectResponse(f"/admin/content/{kind}", status_code=303)
        for k, v in data.items():
            setattr(row, k, v)
        db.add(row)
    else:
        db.add(Model(**data))

    db.commit()
    return RedirectResponse(f"/admin/content/{kind}", status_code=303)

# ------------------ Sil (ASYNC) ------------------
@router.post("/admin/content/{kind}/delete")
async def content_delete(
    kind: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    if kind not in KIND_MAP:
        return RedirectResponse("/admin/content/tournaments", status_code=303)
    Model: Type = KIND_MAP[kind]["model"]

    form = await request.form()
    id_raw = (form.get("id") or "").strip()

    if id_raw:
        row = db.get(Model, int(id_raw))
        if row:
            db.delete(row)
            db.commit()

    return RedirectResponse(f"/admin/content/{kind}", status_code=303)
