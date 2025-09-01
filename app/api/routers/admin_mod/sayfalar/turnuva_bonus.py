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
    """HTML datetime-local ('YYYY-MM-DDTHH:MM') -> datetime."""
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

# Kategoriler SABİT (yalnız bu seçenekler)
# value -> label (TR)
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

# ------------------ Şablon ------------------
def _layout(title: str, body: str, menu: str) -> str:
    return f"""<!doctype html><html lang="tr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_e(title)}</title>
<style>
  :root {{
    --bg:#0a0b0f; --card:#111114; --muted:#b3b3bb; --text:#f5f5f5;
    --line:#1d1d22; --accent:#ff0033; --accent2:#ff4d6d;
  }}
  *{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,Segoe UI,Roboto}}
  .wrap{{max-width:1100px;margin:24px auto;padding:0 16px}}

  /* Üst çubuk: tıkla-açılır menü (sabit değil) */
  .topnav{{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px}}
  .brand{{display:flex;align-items:center;gap:10px}}
  .brand .dot{{width:10px;height:10px;border-radius:999px;background:var(--accent);box-shadow:0 0 12px var(--accent)}}
  .menu-btn{{appearance:none;border:1px solid var(--line);background:#121214;color:var(--text);border-radius:10px;
            padding:8px 10px;cursor:pointer}}
  .menu-btn:hover{{border-color:rgba(255,0,51,.4)}}
  .menu{{display:none;position:absolute;background:#0f0f13;border:1px solid var(--line);border-radius:10px; padding:8px; margin-top:6px}}
  .menu.open{{display:block}}
  .menu a{{display:block;color:var(--muted);text-decoration:none;padding:6px 10px;border-radius:8px}}
  .menu a:hover, .menu a.active{{background:#15151a;color:#fff;border:1px solid rgba(255,0,51,.35)}}

  .card{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin:14px 0}}
  h1{{font-size:16px;margin:6px 0 12px}}
  table{{width:100%;border-collapse:collapse}}
  th,td{{border-bottom:1px solid var(--line);padding:8px;text-align:left;white-space:nowrap}}
  th{{font-size:12px;text-transform:uppercase;color:#9aa3b7}}

  input,select{{width:100%;background:#0c0c10;color:#fff;border:1px solid #25252b;border-radius:10px;padding:9px}}
  input[type="datetime-local"]{{padding:8px}}
  input:focus,select:focus{{outline:none;border-color:rgba(255,0,51,.45);box-shadow:0 0 0 2px rgba(255,0,51,.20)}}

  .row{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
  .row-1{{display:grid;grid-template-columns:1fr;gap:10px}}

  .btn{{display:inline-block;padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:#141418;color:#fff;text-decoration:none}}
  .btn.primary{{background:linear-gradient(90deg,var(--accent),var(--accent2))}}
  .btn.small{{padding:6px 10px;font-size:12px}}

  .actions form{{display:inline}}
  .pill{{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}}
  label.cb{{display:flex;align-items:center;gap:8px;color:#d7d7de;font-size:13px}}
</style>
<script>
  function toggleMenu(){{
    const m = document.getElementById('menu');
    if(!m) return;
    m.classList.toggle('open');
  }}
  document.addEventListener('click', (e)=>{{
    const btn = document.getElementById('menu-btn');
    const m = document.getElementById('menu');
    if(!m || !btn) return;
    if(!m.contains(e.target) && !btn.contains(e.target)) m.classList.remove('open');
  }});
</script>
</head>
<body>
  <div class="wrap">
    <div class="topnav">
      <div class="brand"><div class="dot"></div><div>İçerik Yönetimi</div></div>
      <div style="position:relative">
        <button id="menu-btn" class="menu-btn" type="button" onclick="toggleMenu()">Menü</button>
        <div id="menu" class="menu">{menu}</div>
      </div>
    </div>
    {body}
  </div>
</body></html>"""

def _menu(active: str) -> str:
    items = []
    for k, v in KIND_MAP.items():
        cls = "active" if k == active else ""
        items.append(f'<a href="/admin/content/{k}" class="{cls}">{_e(v["label"])}</a>')
    return "".join(items)

# ------------------ Liste + Form ------------------
@router.get("/admin/content/{kind}", response_class=HTMLResponse)
def content_list(
    kind: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    if kind not in KIND_MAP:
        return HTMLResponse(_layout("İçerik", "<p>Geçersiz tür.</p>", _menu("tournaments")), status_code=404)

    Model: Type = KIND_MAP[kind]["model"]
    rows = db.query(Model).order_by(
        Model.is_pinned.desc(),
        Model.priority.desc(),
        Model.start_at.desc().nullslast()
    ).all()

    edit_id = request.query_params.get("edit")
    editing = db.get(Model, int(edit_id)) if edit_id else None

    # Liste
    t = [f'<div class="card"><h1>{_e(KIND_MAP[kind]["label"])}</h1>']
    t.append('<div class="card"><table><tr><th>ID</th><th>Başlık</th><th>Durum</th><th>Öncelik</th><th>Görsel</th><th>İşlem</th></tr>')
    for r in rows:
        img = "<span class='pill'>-</span>"
        if r.image_url:
            img = f"<img src='{_e(r.image_url)}' style='height:26px;border-radius:6px' loading='lazy' />"
        t.append(
            f"<tr><td>{r.id}</td><td>{_e(r.title)}</td><td>{_e(r.status or '-')}</td>"
            f"<td>{r.priority or 0}</td><td>{img}</td>"
            f"<td class='actions'>"
            f"<a class='btn small' href='/admin/content/{kind}?edit={r.id}'>Düzenle</a> "
            f"<form method='post' action='/admin/content/{kind}/delete' onsubmit=\"return confirm('Silinsin mi?')\">"
            f"<input type='hidden' name='id' value='{r.id}'/><button class='btn small'>Sil</button></form></td></tr>"
        )
    t.append("</table></div>")

    # Form
    title = "Yeni Kayıt" if not editing else f"Kayıt Düzenle (#{editing.id})"
    t.append(f'<div class="card"><h1>{_e(title)}</h1>')
    t.append(f"<form method='post' action='/admin/content/{kind}/upsert'>")
    if editing:
        t.append(f"<input type='hidden' name='id' value='{editing.id}'>")

    val = lambda name, default="": _e(getattr(editing, name, "") or default)

    t.append('<div class="row">')
    t.append(f"<div><div>Başlık</div><input name='title' value='{val('title')}' required></div>")
    t.append(f"<div><div>Görsel URL</div><input name='image_url' value='{val('image_url')}' placeholder='https://... veya /static/...' required></div>")
    t.append(f"<div><div>Başlangıç</div><input type='datetime-local' name='start_at' value='{_dt_input(getattr(editing,'start_at',None))}'></div>")
    t.append(f"<div><div>Bitiş</div><input type='datetime-local' name='end_at' value='{_dt_input(getattr(editing,'end_at',None))}'></div>")
    # Kategori (sabit seçenekler)
    t.append("<div><div>Kategori</div><select name='category'>")
    current_cat = getattr(editing, "category", "") if editing else ""
    t.append(f"<option value='' {'selected' if not current_cat else ''}>— Seçiniz —</option>")
    for v, txt in CATEGORY_OPTIONS:
        sel = "selected" if str(current_cat) == v else ""
        t.append(f"<option value='{_e(v)}' {sel}>{_e(txt)}</option>")
    t.append("</select></div>")
    # Öne çıkar
    checked = "checked" if str(getattr(editing, "is_pinned", "")).lower() in ("1","true","on","yes") else ""
    t.append(f"<div><label class='cb'><input type='checkbox' name='is_pinned' {checked}> Öne çıkar</label></div>")
    # Öncelik
    t.append(f"<div><div>Öncelik</div><input type='number' name='priority' value='{val('priority','0')}' step='1' min='0'></div>")
    t.append("</div>")  # .row

    t.append("<div style='height:10px'></div>")
    t.append("<button class='btn primary' type='submit'>Kaydet</button></form></div></div>")

    html = _layout("İçerik Yönetimi", "".join(t), _menu(kind))
    return HTMLResponse(html)

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
