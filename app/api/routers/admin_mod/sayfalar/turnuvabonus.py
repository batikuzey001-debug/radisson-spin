# app/api/routers/admin_mod/turnuvabonus.py
from typing import Annotated, Dict, Any, Type, Optional, Callable
from sqlalchemy import case, desc
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from app.db.session import get_db
from app.db.models import AdminUser, AdminRole, Tournament, DailyBonus, PromoCode, Event
from app.services.auth import require_role
from app.api.routers.admin_mod.yerlesim import _layout, _render_flash_blocks

# Ortak yardımcılar
from app.api.routers.admin_mod.turnuvabonus.helpers import (
    _e as _esc, _dt_parse, _dt_input, _fmt_try, _has, CATEGORY_OPTIONS
)

# Tab render'ları
from app.api.routers.admin_mod.turnuvabonus.tabs.events import render_events
from app.api.routers.admin_mod.turnuvabonus.tabs.tournaments import render_tournaments
from app.api.routers.admin_mod.turnuvabonus.tabs.daily_bonuses import render_daily_bonuses
from app.api.routers.admin_mod.turnuvabonus.tabs.promo_codes import render_promo_codes

router = APIRouter()

KIND_MAP: Dict[str, Dict[str, Any]] = {
    "tournaments":   {"label": "Turnuvalar",         "model": Tournament, "render": render_tournaments},
    "daily-bonuses": {"label": "Güne Özel Bonuslar", "model": DailyBonus, "render": render_daily_bonuses},
    "promo-codes":   {"label": "Promosyon Kodları",  "model": PromoCode,  "render": render_promo_codes},
    "events":        {"label": "Etkinlikler",        "model": Event,      "render": render_events},
}

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
    renderer: Callable[..., str] = KIND_MAP[tab]["render"]

    # Sıralama: start_at NULL'lar sona, sonra start_at DESC, sonra id DESC
    order_cols = []
    if _has(Model, "start_at"):
        order_cols.append(desc(case((Model.start_at == None, 1), else_=0)))  # noqa: E711
        order_cols.append(desc(Model.start_at))
    order_cols.append(desc(Model.id))
    rows = db.query(Model).order_by(*order_cols).all()

    # editing
    edit_id = request.query_params.get("edit")
    try:
        editing = db.get(Model, int(edit_id)) if edit_id else None
    except Exception:
        editing = None

    # Tabs
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
        tabs_html.append(f"<a class='{cls}' href='/admin/turnuvabonus?tab={key}'>{_esc(label)}</a>")
    tabs_html.append("</div></div>")

    # Flash
    fb = _render_flash_blocks(request) or ""

    # İçerik (seçili tabın render'ı)
    segment = renderer(request, db, Model, editing, rows, tab)

    # Stil & JS (mevcut)
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
    <script>function tbMenu(){var el=document.getElementById('tb-menu'); if(!el) return; el.classList.toggle('open');}</script>
    """

    body = "".join(tabs_html) + fb + segment
    html = _layout(style + body, title="Turnuva / Bonus", active="tb", is_super=(current.role == AdminRole.super_admin))
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

    data: Dict[str, Any] = {
        "title":     (form.get("title") or "").strip(),
        "image_url": (form.get("image_url") or "").strip() or None,
        "status":    (form.get("status") or "draft").strip() or "draft",
        "start_at":  _dt_parse(form.get("start_at")),
        "end_at":    _dt_parse(form.get("end_at")),
        "category":  (form.get("category") or "").strip() or None,
    }

    # opsiyonel alanlar (modelde varsa al)
    if _has(Model, "subtitle"):          data["subtitle"] = (form.get("subtitle") or "").strip() or None
    if _has(Model, "slug"):              data["slug"] = (form.get("slug") or "").strip() or None
    if _has(Model, "banner_url"):        data["banner_url"] = (form.get("banner_url") or "").strip() or None
    if _has(Model, "cta_url"):           data["cta_url"] = (form.get("cta_url") or "").strip() or None
    if _has(Model, "coupon_code"):       data["coupon_code"] = (form.get("coupon_code") or "").strip() or None
    if _has(Model, "short_desc"):        data["short_desc"] = (form.get("short_desc") or "").strip() or None
    if _has(Model, "long_desc"):         data["long_desc"] = (form.get("long_desc") or "").strip() or None
    if _has(Model, "rank_visible"):      data["rank_visible"] = (form.get("rank_visible") or "").lower() in ("1","true","on","yes","checked")
    if _has(Model, "prize_pool"):
        prize_raw = (form.get("prize_pool") or "").strip()
        data["prize_pool"] = int(prize_raw) if prize_raw.isdigit() else None
    if _has(Model, "participant_count"):
        pc_raw = (form.get("participant_count") or "").strip()
        data["participant_count"] = int(pc_raw) if pc_raw.isdigit() else None
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
