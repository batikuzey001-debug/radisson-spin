# app/api/routers/admin_content.py
from typing import Annotated, Optional, Dict, Any, Type
from datetime import datetime
from html import escape as _e

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import AdminUser, AdminRole, Tournament, DailyBonus, PromoCode, Event
from app.services.auth import require_role  # sizde zaten var

router = APIRouter()

# ---- Yardımcılar -------------------------------------------------
def _dt(val: str | None):
    if not val: return None
    try:
        # "2025-09-01T12:00" veya "2025-09-01 12:00" gelir
        val = val.replace("T", " ")
        return datetime.fromisoformat(val)
    except Exception:
        return None

KIND_MAP: Dict[str, Dict[str, Any]] = {
    "tournaments": {"label": "Turnuvalar", "model": Tournament},
    "daily-bonuses": {"label": "Güne Özel Bonuslar", "model": DailyBonus},
    "promo-codes": {"label": "Promosyon Kodları", "model": PromoCode},
    "events": {"label": "Etkinlikler", "model": Event},
}

FIELDS = [
    ("title", "Başlık", "text", True),
    ("image_url", "Görsel URL", "text", True),
    ("status", "Durum (draft/published/archived)", "text", True),
    ("start_at", "Başlangıç (YYYY-MM-DD HH:MM)", "datetime", False),
    ("end_at", "Bitiş (YYYY-MM-DD HH:MM)", "datetime", False),
    ("category", "Kategori", "text", False),
    ("is_pinned", "Öne Çıkar (true/false)", "bool", False),
    ("priority", "Öncelik (int)", "number", False),
    ("accent_color", "Accent Renk (#hex)", "text", False),
    ("bg_color", "Arkaplan Renk (#hex)", "text", False),
    ("variant", "Varyant (ör. gold/blue)", "text", False),
]

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
  .actions form{{display:inline}}
  .btn{{display:inline-block;padding:8px 12px;border-radius:10px;border:1px solid #2a2f3a;background:#101629;color:#fff;text-decoration:none}}
  .btn.primary{{background:linear-gradient(90deg,#0ea5e9,#60a5fa)}}
  .pill{{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #2a2f3a;color:#aeb7d0}}
</style></head><body><div class="wrap">{body}</div></body></html>"""

def _tabs(active: str) -> str:
    items = []
    for k, v in KIND_MAP.items():
        cls = "active" if k == active else ""
        items.append(f'<a href="/admin/content/{k}" class="{cls}">{_e(v["label"])}</a>')
    return '<div class="tabs">' + "".join(items) + "</div>"

# ---- Sayfa: liste + form ----------------------------------------
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
    rows = db.query(Model).order_by(Model.is_pinned.desc(), Model.priority.desc(), Model.start_at.desc().nullslast()).all()
    edit_id = request.query_params.get("edit")
    editing = db.get(Model, int(edit_id)) if edit_id else None

    # tablo
    t = ['<div class="card"><h1>'+_e(KIND_MAP[kind]["label"])+'</h1><div class="tabs">'+_tabs(kind)+'</div><div style="height:8px"></div>']
    t.append('<div class="card"><table><tr><th>ID</th><th>Başlık</th><th>Durum</th><th>Öncelik</th><th>Görsel</th><th>İşlem</th></tr>')
    for r in rows:
        img = f"<span class='pill'>-</span>"
        if r.image_url:
            img = f"<img src='{_e(r.image_url)}' style='height:26px;border-radius:6px' loading='lazy' />"
        t.append(f"<tr><td>{r.id}</td><td>{_e(r.title)}</td><td>{_e(r.status or '-')}</td>"
                 f"<td>{r.priority or 0}</td><td>{img}</td>"
                 f"<td class='actions'>"
                 f"<a class='btn' href='/admin/content/{kind}?edit={r.id}'>Düzenle</a> "
                 f"<form method='post' action='/admin/content/{kind}/delete' onsubmit=\"return confirm('Silinsin mi?')\">"
                 f"<input type='hidden' name='id' value='{r.id}'/><button class='btn'>Sil</button></form></td></tr>")
    t.append("</table></div>")

    # form
    title = "Yeni Kayıt" if not editing else f"Kayıt Düzenle (#{editing.id})"
    t.append('<div class="card"><h1>'+_e(title)+'</h1>')
    t.append(f"<form method='post' action='/admin/content/{kind}/upsert'>")
    if editing:
        t.append(f"<input type='hidden' name='id' value='{editing.id}'>")
    # alanlar
    def val(name, default=""):
        return _e(getattr(editing, name, "") or default)

    # grid
    t.append('<div class="row">')
    for name, label, typ, required in FIELDS:
        ph = "" if typ != "datetime" else "YYYY-MM-DD HH:MM"
        v = val(name)
        if typ == "bool":
            v = "true" if str(getattr(editing, name, "")).lower() in ("1","true","on","yes") else "false"
        t.append(f"<div><div style='font-size:12px;color:#9aa3b7;margin:4px 0'>{_e(label)}</div>"
                 f"<input name='{name}' value='{v}' placeholder='{ph}'></div>")
    t.append("</div><div style='height:10px'></div>")
    t.append("<button class='btn primary' type='submit'>Kaydet</button></form></div></div>")

    return HTMLResponse(_layout("İçerik Yönetimi", "".join(t)))

# ---- Upsert ------------------------------------------------------
@router.post("/admin/content/{kind}/upsert")
def content_upsert(
    kind: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    if kind not in KIND_MAP:
        return RedirectResponse("/admin/content/tournaments", status_code=303)
    Model: Type = KIND_MAP[kind]["model"]

    form = await request.form() if hasattr(request, "form") else {}
    # Starlette Request sync kullanımı için:
    if not form:
        form = {}

    id_raw = (form.get("id") or "").strip()
    data = {
        "title": (form.get("title") or "").strip(),
        "image_url": (form.get("image_url") or "").strip(),
        "status": (form.get("status") or "draft").strip(),
        "start_at": _dt(form.get("start_at")),
        "end_at": _dt(form.get("end_at")),
        "category": (form.get("category") or "").strip() or None,
        "is_pinned": (form.get("is_pinned") or "").lower() in ("1","true","on","yes"),
        "priority": int((form.get("priority") or "0") or 0),
        "accent_color": (form.get("accent_color") or "").strip() or None,
        "bg_color": (form.get("bg_color") or "").strip() or None,
        "variant": (form.get("variant") or "").strip() or None,
    }

    if id_raw:
        row = db.get(Model, int(id_raw))
        if not row:
            return RedirectResponse(f"/admin/content/{kind}", status_code=303)
        for k,v in data.items(): setattr(row, k, v)
        db.add(row)
    else:
        db.add(Model(**data))
    db.commit()
    return RedirectResponse(f"/admin/content/{kind}", status_code=303)

# ---- Delete ------------------------------------------------------
@router.post("/admin/content/{kind}/delete")
def content_delete(
    kind: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    if kind not in KIND_MAP:
        return RedirectResponse("/admin/content/tournaments", status_code=303)
    Model: Type = KIND_MAP[kind]["model"]

    form = await request.form() if hasattr(request, "form") else {}
    id_raw = (form.get("id") or "").strip()
    if id_raw:
        row = db.get(Model, int(id_raw))
        if row:
            db.delete(row)
            db.commit()
    return RedirectResponse(f"/admin/content/{kind}", status_code=303)
