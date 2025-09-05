# app/api/routers/admin_mod/sayfalar/turnuvabonus.py
from typing import Annotated, Dict, Any, Type, Optional
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

def _fmt_try(v) -> str:
    try:
        if v is None:
            return "-"
        n = int(v)
        s = f"{n:,}".replace(",", ".")
        return f"{s} ₺"
    except Exception:
        return "-"

def _has(Model: Type, name: str) -> bool:
    return hasattr(Model, name)

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

# ------- Sayfa (Neon tema + mobil menü + üstte form) -------
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
    rows = (
        db.query(Model)
        .order_by(
            getattr(Model, "start_at").desc().nullslast() if hasattr(Model, "start_at") else Model.id.desc(),
            Model.id.desc(),
        )
        .all()
    )

    edit_id = request.query_params.get("edit")
    try:
        editing = db.get(Model, int(edit_id)) if edit_id else None
    except Exception:
        editing = None

    # Sekmeler
    tabs = [
        ("tournaments",   "Turnuvalar"),
        ("daily-bonuses", "Güne Özel Bonuslar"),
        ("promo-codes",   "Promosyon Kodları"),
        ("events",        "Etkinlikler"),
    ]
    tabs_html = [
        "<div class='menu-wrap'>",
        "<button class='menu-toggle' type='button' onclick='tbMenu()'>Menü</button>",
        "<div id='tb-menu' class='tabs'>",
    ]
    for key, label in tabs:
        cls = "tab active" if tab == key else "tab"
        tabs_html.append(f"<a class='{cls}' href='/admin/turnuvabonus?tab={key}'>{_e(label)}</a>")
    tabs_html.append("</div></div>")

    # Üstte: Yeni / Düzenle formu
    title_text = "Yeni Kayıt" if not editing else f"Kayıt Düzenle (#{editing.id})"
    sub_text = _e(KIND_MAP[tab]['label'])
    val = (lambda name, default="": _e(getattr(editing, name, "") or default))
    current_cat = getattr(editing, "category", "") if editing else ""
    status_now = getattr(editing, "status", "draft") if editing else "draft"

    cancel_edit_btn = (
        f"<a class='btn ghost small' href='/admin/turnuvabonus?tab={tab}' title='Düzenlemeyi iptal et'>İptal</a>"
        if editing else ""
    )

    form = [
        "<div class='card form-card'>",
        f"<div class='form-head'><div><h1>{_e(title_text)}</h1><div class='sub'>{sub_text}</div></div>"
        f"<div class='head-actions'>{cancel_edit_btn}</div></div>",
        f"<form method='post' action='/admin/turnuvabonus/{tab}/upsert' autocomplete='on'>",
        f"{f'<input type=\"hidden\" name=\"id\" value=\"{editing.id}\">' if editing else ''}",
        "<div class='grid'>",
    ]

    # Temel
    form.append(f"<label class='field'><span>Başlık</span><input name='title' value='{val('title')}' required></label>")

    if _has(Model, "subtitle"):
        form.append(f"<label class='field'><span>Alt Başlık</span><input name='subtitle' value='{val('subtitle')}' placeholder='Kısa vurucu metin'></label>")

    if _has(Model, "slug"):
        form.append(f"<label class='field'><span>Bağlantı Kısaltması (Slug)</span><input name='slug' value='{val('slug')}' placeholder='ornek-turnuva'></label>")

    # Medya
    form.append(f"<label class='field'><span>Kapak Görseli URL</span><input name='image_url' value='{val('image_url')}' placeholder='https://... veya /static/...'></label>")

    if _has(Model, "banner_url"):
        form.append(f"<label class='field'><span>Banner Görseli URL</span><input name='banner_url' value='{val('banner_url')}' placeholder='Sayfa üst görseli (opsiyonel)'></label>")

    # Zaman / Kategori / Durum
    form.append(f"<label class='field'><span>Başlangıç</span><input type='datetime-local' name='start_at' value='{_dt_input(getattr(editing,'start_at',None))}'></label>")
    form.append(f"<label class='field'><span>Bitiş</span><input type='datetime-local' name='end_at' value='{_dt_input(getattr(editing,'end_at',None))}'></label>")

    form.append("<label class='field'><span>Kategori</span><select name='category'>")
    form.append(f"<option value='' {'selected' if not current_cat else ''}>— Seçiniz —</option>")
    for v, txt in CATEGORY_OPTIONS:
        sel = "selected" if str(current_cat) == v else ""
        form.append(f"<option value='{_e(v)}' {sel}>{_e(txt)}</option>")
    form.append("</select></label>")

    form.append("<label class='field'><span>Durum</span><select name='status'>")
    for s in ("draft", "published"):
        sel = "selected" if status_now == s else ""
        form.append(f"<option value='{s}' {sel}>{'Yayında' if s=='published' else 'Taslak'}</option>")
    form.append("</select></label>")

    # Promosyon kodları için ekstra
    if _has(Model, "cta_url"):
        form.append(f"<label class='field'><span>Buton Bağlantısı</span><input name='cta_url' value='{val('cta_url')}' placeholder='https://... veya /sayfa'></label>")
    if _has(Model, "coupon_code"):
        form.append(f"<label class='field'><span>Kupon Kodu</span><input name='coupon_code' value='{val('coupon_code')}' placeholder='Örn: NEON50'></label>")

    # Etkinlik özel: Ödül miktarı (₺)
    if _has(Model, "prize_amount"):
        form.append(
            f"<label class='field'><span>Ödül Miktarı (₺)</span>"
            f"<input name='prize_amount' type='number' inputmode='numeric' min='0' step='1' "
            f"value='{_e(str(getattr(editing, \"prize_amount\", \"\") or \"\"))}' placeholder='örn: 100000'>"
            f"</label>"
        )

    # Açıklamalar
    if _has(Model, "short_desc"):
        form.append(f"<label class='field'><span>Kısa Açıklama (Kart)</span><textarea name='short_desc' rows='2' placeholder='Kart üzerinde görünecek kısa açıklama...'>{val('short_desc')}</textarea></label>")

    if _has(Model, "long_desc"):
        form.append(f"<label class='field'><span>Detay Açıklama (Modal)</span><textarea name='long_desc' rows='4' placeholder='Kart tıklanınca açılacak uzun açıklama...'>{val('long_desc')}</textarea></label>")

    if _has(Model, "rank_visible"):
        checked = "checked" if bool(getattr(editing, "rank_visible", False)) else ""
        form.append(f"<label class='field'><span>Liderlik Tablosu</span><label class='cb'><input type='checkbox' name='rank_visible' {checked}> Görünsün</label></label>")

    form.extend(
        [
            "</div>",
            "<div class='form-actions'>"
            "<button class='btn primary' type='submit'>Kaydet</button>"
            f"{cancel_edit_btn}"
            "</div>",
            "</form></div>",
        ]
    )

    # Liste
    t = [f"<div class='card'><h1>{_e(KIND_MAP[tab]['label'])}</h1>"]
    headers = "<tr><th>ID</th><th>Başlık</th>"
    if _has(Model, "coupon_code"):
        headers += "<th>Kupon</th>"
    headers += "<th>Durum</th><th>Başlangıç</th><th>Bitiş</th>"
    if _has(Model, "prize_pool"):
        headers += "<th>Ödül</th>"
    if _has(Model, "participant_count"):
        headers += "<th>Katılımcı</th>"
    if _has(Model, "prize_amount"):
        headers += "<th>Etkinlik Ödülü</th>"
    headers += "<th>Görsel</th><th style='width:180px'>İşlem</th></tr>"
    t.append("<div class='table-wrap'><table>" + headers)

    for r in rows:
        img = "<span class='pill'>-</span>"
        if getattr(r, "image_url", None):
            img = f"<img src='{_e(r.image_url)}' alt='' loading='lazy' />"
        start_txt = _dt_input(getattr(r, "start_at", None)).replace("T", " ") or "-"
        end_txt = _dt_input(getattr(r, "end_at", None)).replace("T", " ") or "-"

        prize_td = f"<td>{_fmt_try(getattr(r, 'prize_pool', None))}</td>" if _has(Model, "prize_pool") else ""
        part_td = f"<td>{_e(str(getattr(r, 'participant_count', '-') or '-'))}</td>" if _has(Model, "participant_count") else ""
        coupon_td = f"<td><code>{_e(getattr(r, 'coupon_code', '') or '-')}</code></td>" if _has(Model, "coupon_code") else ""
        prize_amt_td = f"<td>{_fmt_try(getattr(r, 'prize_amount', None))}</td>" if _has(Model, "prize_amount") else ""

        t.append(
            f"<tr>"
            f"<td>{r.id}</td>"
            f"<td>{_e(r.title)}</td>"
            f"{coupon_td}"
            f"<td>{_e(getattr(r,'status','-') or '-')}</td>"
            f"<td>{start_txt}</td>"
            f"<td>{end_txt}</td>"
            f"{prize_td}"
            f"{part_td}"
            f"{prize_amt_td}"
            f"<td class='img'>{img}</td>"
            f"<td class='actions'>"
            f"<a class='btn neon small' href='/admin/turnuvabonus?tab={tab}&edit={r.id}' title='Düzenle'>Düzenle</a>"
            f"<form method='post' action='/admin/turnuvabonus/{tab}/delete' onsubmit=\"return confirm('Silinsin mi?')\">"
            f"<input type='hidden' name='id' value='{r.id}'/>"
            f"<button class='btn danger small' type='submit' title='Sil'>Sil</button>"
            f"</form>"
            f"</td>"
            f"</tr>"
        )
    t.append("</table></div></div>")

    fb = _render_flash_blocks(request) or ""
    body = "".join(tabs_html) + fb + "".join(form) + "".join(t)

    style = """
    <style>
      :root{--bg:#090a0f;--card:#0f1016;--line:#1b1d26;--text:#f2f3f7;--muted:#a9afbd;--red:#ff0033;--red2:#ff4d6d;--redh:#ff1a4b;--black:#0a0b0f;}
      .menu-wrap{display:flex;align-items:center;gap:8px;margin-bottom:10px}
      .menu-toggle{display:none;padding:8px 10px;border:1px solid var(--line);background:var(--black);color:var(--text);border-radius:10px;cursor:pointer}
      .tabs{display:flex;flex-wrap:wrap;gap:8px}
      .tab{padding:8px 10px;border:1px solid var(--line);border-radius:10px;text-decoration:none;color:var(--muted);background:var(--card)}
      .tab.active{color:#fff;border-color:var(--red);box-shadow:0 0 8px rgba(255,0,51,.35)}
      .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px}
      h1{font-size:16px;margin:0 0 10px}
      .sub{font-size:12px;color:var(--muted)}
      .form-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .field{display:flex;flex-direction:column;gap:6px}
      .field > span{font-size:12px;color:var(--muted)}
      input,select,textarea{width:100%;background:#0b0d13;border:1px solid var(--line);border-radius:10px;color:#fff;padding:10px}
      textarea{min-height:64px;resize:vertical}
      input:focus,select:focus,textarea:focus{outline:none;border-color:var(--red);box-shadow:0 0 0 2px rgba(255,0,51,.20)}
      .cb{display:inline-flex;align-items:center;gap:8px}
      .form-card{position:sticky;top:8px;z-index:1}
      .form-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
      .btn{display:inline-block;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#151824;color:#fff;text-decoration:none;cursor:pointer}
      .btn.small{font-size:12px;padding:6px 8px}
      .btn.primary{background:linear-gradient(90deg,var(--red),var(--red2));border-color:#2a0e15;box-shadow:0 0 16px rgba(255,0,51,.25)}
      .btn.primary:hover{filter:brightness(1.05)}
      .btn.neon{background:#1a0f14;border-color:#38131c;box-shadow:0 0 12px rgba(255,0,51,.3)}
      .btn.neon:hover{background:var(--redh)}
      .btn.danger{background:#2a0c14;border-color:#501926}
      .btn.danger:hover{background:#4a0f20}
      .btn.ghost{background:transparent;border-color:var(--line);color:var(--muted)}
      .table-wrap{overflow:auto}
      table{width:100%;border-collapse:collapse}
      th,td{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left;font-size:13px;vertical-align:middle}
      td.img img{height:26px;border-radius:6px;display:block}
      td.actions{display:flex;gap:6px;align-items:center}
      td.actions form{display:inline}
      .pill{display:inline-block;padding:4px 8px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:12px}
      @media(max-width:900px){.grid{grid-template-columns:1fr}}
      @media(max-width:700px){.menu-toggle{display:inline-block}.tabs{display:none}.tabs.open{display:flex}}
    </style>
    <script>
      function tbMenu(){var el=document.getElementById('tb-menu'); if(!el) return; el.classList.toggle('open');}
    </script>
    """

    html = _layout(style + body, title="Turnuva / Bonus", active="tb", is_super=(current.role == AdminRole.super_admin))
    return HTMLResponse(html)

# ------- Upsert (genişletilmiş alan desteği) -------
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

    data: Dict[str, Any] = {
        "title":     (form.get("title") or "").strip(),
        "image_url": (form.get("image_url") or "").strip() or None,
        "status":    (form.get("status") or "draft").strip() or "draft",
        "start_at":  _dt_parse(form.get("start_at")),
        "end_at":    _dt_parse(form.get("end_at")),
        "category":  (form.get("category") or "").strip() or None,
    }

    # Opsiyonel alanlar
    if _has(Model, "subtitle"):
        data["subtitle"] = (form.get("subtitle") or "").strip() or None
    if _has(Model, "slug"):
        data["slug"] = (form.get("slug") or "").strip() or None
    if _has(Model, "banner_url"):
        data["banner_url"] = (form.get("banner_url") or "").strip() or None
    if _has(Model, "cta_url"):
        data["cta_url"] = (form.get("cta_url") or "").strip() or None
    if _has(Model, "coupon_code"):
        data["coupon_code"] = (form.get("coupon_code") or "").strip() or None
    if _has(Model, "short_desc"):
        data["short_desc"] = (form.get("short_desc") or "").strip() or None
    if _has(Model, "long_desc"):
        data["long_desc"] = (form.get("long_desc") or "").strip() or None
    if _has(Model, "rank_visible"):
        data["rank_visible"] = (form.get("rank_visible") or "").lower() in ("1","true","on","yes","checked")
    if _has(Model, "prize_pool"):
        prize_raw = (form.get("prize_pool") or "").strip()
        data["prize_pool"] = int(prize_raw) if prize_raw.isdigit() else None
    if _has(Model, "participant_count"):
        pc_raw = (form.get("participant_count") or "").strip()
        data["participant_count"] = int(pc_raw) if pc_raw.isdigit() else None
    # Etkinlik: Ödül miktarı (₺)
    if _has(Model, "prize_amount"):
        amt_raw = (form.get("prize_amount") or "").replace(".", "").strip()
        data["prize_amount"] = int(amt_raw) if amt_raw.isdigit() else None

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
