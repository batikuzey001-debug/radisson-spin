# app/api/routers/admin_mod/sayfalar/kodyonetimi.py
# SAYFA: Kod Yönetimi (Kodlar + Ödüller + Seviyeler)
# URL: /admin/kod-yonetimi

from typing import Annotated, Dict, List
from html import escape as _e
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError  # aksiyonlarda kullanılabilir

from app.db.session import get_db
from app.db.models import Prize, Code, PrizeDistribution, PrizeTier, AdminUser, AdminRole
from app.services.codes import gen_code
from app.services.auth import require_role
from app.api.routers.admin_mod.yerlesim import _layout, _render_flash_blocks, flash

# yeni: modüler render ve yardımcılar
from app.api.routers.admin_mod.kodyonetimi.tabs.codes import render_codes
from app.api.routers.admin_mod.kodyonetimi.tabs.prizes import render_prizes
from app.api.routers.admin_mod.kodyonetimi.tabs.tiers import render_tiers
from app.api.routers.admin_mod.kodyonetimi.helpers import _normalize, _tiers

router = APIRouter()

# ----------------- SAYFA -----------------
@router.get("/admin/kod-yonetimi", response_class=HTMLResponse)
def kod_yonetimi(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
    tab: str = "kodlar",
):
    tabs = [("kodlar", "Kodlar"), ("oduller", "Ödüller"), ("seviyeler", "Seviyeler")]
    t_html = ["<div class='tabs'>"]
    for key, label in tabs:
        cls = "tab active" if tab == key else "tab"
        t_html.append(f"<a class='{cls}' href='/admin/kod-yonetimi?tab={key}'>{_e(label)}</a>")
    t_html.append("</div>")

    parts: List[str] = ["".join(t_html)]
    fb = _render_flash_blocks(request)
    if fb:
        parts.append(fb)

    # İçerik (modüler render)
    if tab == "kodlar":
        parts.append(render_codes(db))
    elif tab == "oduller":
        parts.append(render_prizes(db, request.query_params))
    else:  # seviyeler
        parts.append(render_tiers(db, request.query_params))

    # stil (mevcut)
    style = """
    <style>
      :root{--bg:#090a0f;--card:#0f1016;--line:#1b1d26;--text:#f2f3f7;--muted:#a9afbd;--red:#ff0033;--red2:#ff4d6d;--black:#0a0b0f;}
      .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}
      .tab{padding:6px 10px;border:1px solid var(--line);border-radius:10px;color:var(--muted);text-decoration:none}
      .tab.active,.tab:hover{color:#fff;border-color:rgba(255,0,51,.45)}
      .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0}
      .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
      .span-6{grid-column:span 6}
      @media (max-width:900px){ .span-6{grid-column:span 12} }
      .table-wrap{overflow:auto}
      table{width:100%;border-collapse:collapse;min-width:760px}
      th,td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
      input,select{width:100%;background:#0c0c10;color:#fff;border:1px solid #26262c;border-radius:10px;padding:9px}
      input:focus,select:focus{outline:none;border-color:rgba(255,0,51,.45);box-shadow:0 0 0 2px rgba(255,0,51,.20)}
      .btn{appearance:none;border:1px solid #26262c;border-radius:10px;background:#141418;color:#fff;padding:8px 12px;cursor:pointer}
      .btn.primary{background:linear-gradient(90deg,var(--red),var(--red2));border-color:#2a0e15;box-shadow:0 0 16px rgba(255,0,51,.25)}
      .muted{color:#a9afbd;font-size:12px}
      .cb{display:inline-flex;align-items:center;gap:8px}
    </style>
    """

    return HTMLResponse(_layout(style + "".join(parts), title="Kod Yönetimi", active="kod", is_super=(current.role == AdminRole.super_admin)))


# ----------------- ACTIONS (Aynen korunur) -----------------
@router.post("/admin/kod-yonetimi/create-code", response_model=None)
async def create_code(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    from app.db.models import Code  # tipin üstte olması yeterliydi, değişmedi
    form = await request.form()
    username = (form.get("username") or "").strip() or None
    tier_key = (form.get("tier_key") or "").strip() or None
    mode = (form.get("mode") or "auto").strip()
    manual_prize_id = (form.get("manual_prize_id") or "").strip()
    manual_pid = int(manual_prize_id) if (manual_prize_id and manual_prize_id.isdigit()) else None

    # seviye doğrulama
    if tier_key:
        tier = db.get(PrizeTier, tier_key)
        if not tier or not tier.enabled:
            flash(request, "Geçersiz seviye.", "error")
            return RedirectResponse(url="/admin/kod-yonetimi?tab=kodlar", status_code=303)
    else:
        flash(request, "Seviye zorunludur.", "error")
        return RedirectResponse(url="/admin/kod-yonetimi?tab=kodlar", status_code=303)

    code = gen_code()
    db.add(Code(
        code=code,
        username=username,
        tier_key=tier_key,
        status="issued",
        manual_prize_id=manual_pid if mode == "manual" else None,
        prize_id=None,
    ))
    db.commit()
    flash(request, "Kod oluşturuldu.", "success")
    return RedirectResponse(url="/admin/kod-yonetimi?tab=kodlar", status_code=303)


@router.post("/admin/kod-yonetimi/prizes/upsert", response_model=None)
async def prizes_upsert(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    form = await request.form()
    _id = (form.get("id") or "").strip()
    label = (form.get("label") or "").strip()
    wheel_index = int(form.get("wheel_index"))
    image_url_raw = (form.get("image_url") or "").strip()
    image_url = _normalize(image_url_raw)

    if not label:
        flash(request, "Ad zorunludur.", "error")
        return RedirectResponse(url="/admin/kod-yonetimi?tab=oduller", status_code=303)

    if _id:
        prize = db.get(Prize, int(_id))
        if not prize:
            flash(request, "Ödül bulunamadı.", "error")
            return RedirectResponse(url="/admin/kod-yonetimi?tab=oduller", status_code=303)
        prize.label = label
        prize.wheel_index = wheel_index
        prize.image_url = image_url
        db.add(prize)
        msg = "Ödül güncellendi."
    else:
        db.add(Prize(label=label, wheel_index=wheel_index, image_url=image_url))
        msg = "Yeni Ödül eklendi."

    db.commit()
    flash(request, msg, "success")
    return RedirectResponse(url="/admin/kod-yonetimi?tab=oduller", status_code=303)


@router.post("/admin/kod-yonetimi/prizes/delete", response_model=None)
async def prizes_delete(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    form = await request.form()
    pid = int(form.get("id"))
    prize = db.get(Prize, pid)
    if not prize:
        flash(request, "Ödül bulunamadı.", "error")
        return RedirectResponse(url="/admin/kod-yonetimi?tab=oduller", status_code=303)

    db.query(Code).filter(Code.prize_id == pid).delete(synchronize_session=False)
    db.delete(prize)
    db.commit()
    flash(request, "Ödül silindi.", "success")
    return RedirectResponse(url="/admin/kod-yonetimi?tab=oduller", status_code=303)


@router.post("/admin/kod-yonetimi/prizes/dist/save", response_model=None)
async def prizes_dist_save(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    """Dinamik seviyeler için dağılımı kaydeder."""
    form = await request.form()
    prizes = db.query(Prize).order_by(Prize.wheel_index).all()
    tiers = [t for t in _tiers(db) if t.enabled]

    # 1) ödül enabled güncelle
    for p in prizes:
        p.enabled = f"en_{p.id}" in form
        db.add(p)

    # 2) mevcut dağılımlar
    existing = {(d.prize_id, d.tier_key): d for d in db.query(PrizeDistribution).all()}

    sums = {t.key: 0 for t in tiers}
    for p in prizes:
        for t in tiers:
            key = f"w_{p.id}_{t.key}"
            raw = (form.get(key) or "").strip()
            try:
                pct = float(raw or "0")
            except ValueError:
                pct = 0.0
            bp = max(0, int(round(pct * 100)))
            sums[t.key] += bp

            d = existing.get((p.id, t.key))
            if not d:
                d = PrizeDistribution(prize_id=p.id, tier_key=t.key, weight_bp=bp, enabled=True)
            else:
                d.weight_bp = bp
                d.enabled = True
            db.add(d)

    bad = [t for t in tiers if sums[t.key] != 10000]
    if bad:
        db.rollback()
        msg = "Toplam %100 değil: " + ", ".join(f"{t.label} = {sums[t.key]/100:.2f}%" for t in bad)
        flash(request, msg, "error")
        return RedirectResponse(url="/admin/kod-yonetimi?tab=oduller", status_code=303)

    db.commit()
    flash(request, "Dağılımlar kaydedildi.", "success")
    return RedirectResponse(url="/admin/kod-yonetimi?tab=oduller", status_code=303)


@router.post("/admin/kod-yonetimi/tiers/upsert", response_model=None)
async def tiers_upsert(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    form = await request.form()
    key = (form.get("key") or "").strip()
    label = (form.get("label") or "").strip()
    sort_raw = (form.get("sort") or "0").strip()
    enabled = (form.get("enabled") or "").lower() in ("1","true","on","yes","checked")
    try:
        sort = int(sort_raw)
    except ValueError:
        sort = 0

    if not key or not label:
        flash(request, "Anahtar ve Etiket zorunludur.", "error")
        return RedirectResponse(url="/admin/kod-yonetimi?tab=seviyeler", status_code=303)

    row = db.get(PrizeTier, key)
    if row:
        row.label = label
        row.sort = sort
        row.enabled = enabled
        db.add(row)
        msg = "Seviye güncellendi."
    else:
        db.add(PrizeTier(key=key, label=label, sort=sort, enabled=enabled))
        msg = "Seviye eklendi."

    db.commit()
    flash(request, msg, "success")
    return RedirectResponse(url="/admin/kod-yonetimi?tab=seviyeler", status_code=303)


@router.post("/admin/kod-yonetimi/tiers/delete", response_model=None)
async def tiers_delete(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    form = await request.form()
    key = (form.get("key") or "").strip()
    row = db.get(PrizeTier, key)
    if not row:
        flash(request, "Seviye bulunamadı.", "error")
        return RedirectResponse(url="/admin/kod-yonetimi?tab=seviyeler", status_code=303)

    db.delete(row)
    db.commit()
    flash(request, "Seviye silindi.", "success")
    return RedirectResponse(url="/admin/kod-yonetimi?tab=seviyeler", status_code=303)
