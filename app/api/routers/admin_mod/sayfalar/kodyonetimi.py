# app/api/routers/admin_mod/sayfalar/kodyonetimi.py
# SAYFA: Kod Yönetimi (Kodlar + Ödüller tek sayfa / iki sekme)
# URL: /admin/kod-yonetimi

from typing import Annotated, Dict
from html import escape as _e
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Prize, Code, PrizeDistribution, AdminUser, AdminRole
from app.services.codes import gen_code
from app.services.auth import require_role
from app.api.routers.admin_mod.yerlesim import _layout, _render_flash_blocks, flash

router = APIRouter()

TIERS: Dict[str, str] = {
    "bronze": "100 TL",
    "silver": "300 TL",
    "gold": "500 TL",
    "platinum": "1000 TL",
}

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
    return f'<img src="{_e(u)}" style="height:24px;border-radius:6px" loading="lazy" />'

# Eski adresten otomatik yönlendirme
@router.get("/admin/kod")
def _redir_old():
    return RedirectResponse(url="/admin/kod-yonetimi", status_code=307)


@router.get("/admin/kod-yonetimi", response_class=HTMLResponse)
def kod_yonetimi(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
    tab: str = "kodlar",
):
    tabs = [("kodlar", "Kodlar"), ("oduller", "Ödüller")]
    t_html = ["<div class='tabs'>"]
    for key, label in tabs:
        cls = "tab active" if tab == key else "tab"
        t_html.append(f"<a class='{cls}' href='/admin/kod-yonetimi?tab={key}'>{_e(label)}</a>")
    t_html.append("</div>")
    body_parts = ["".join(t_html)]

    fb = _render_flash_blocks(request)
    if fb:
        body_parts.append(fb)

    if tab == "kodlar":
        prizes = db.query(Prize).order_by(Prize.wheel_index).all()
        prize_label_by_id = {p.id: p.label for p in prizes}
        last = db.query(Code).order_by(Code.created_at.desc()).limit(20).all()

        form = [
            "<div class='card'><h1>Kod Oluştur</h1>",
            "<form method='post' action='/admin/kod-yonetimi/create-code'>",
            "<div class='grid'>",
            "<div class='span-6'><div>Kullanıcı adı</div><input name='username' required></div>",
            "<div class='span-6'><div>Seviye</div><select name='tier_key' required>",
            *[f"<option value='{k}'>{_e(v)}</option>" for k, v in TIERS.items()],
            "</select></div>",
            "</div>",
            "<div style='height:8px'></div>",
            "<div class='grid'>",
            "<div class='span-6'><div>Ödül Seçimi</div>",
            "<select name='mode'>",
            "<option value='auto' selected>Otomatik (dağılıma göre)</option>",
            "<option value='manual'>Manuel (tek seferlik)</option>",
            "</select></div>",
            "<div class='span-6'><div>Manuel Ödül (ops.)</div><select name='manual_prize_id'>",
            "<option value=''>— Seçiniz —</option>",
            *[f"<option value='{p.id}'>[{p.wheel_index}] {_e(p.label)}</option>" for p in prizes],
            "</select></div>",
            "</div>",
            "<div class='hint muted'>Not: 'Otomatik' modda ödül, seçilen seviyeye ait dağılım yüzdelerine göre belirlenir.</div>",
            "<div style='height:8px'></div>",
            "<button class='btn primary' type='submit'>Oluştur</button>",
            "</form></div>",
        ]

        table = [
            "<div class='card'><h1>Son 20 Kod</h1>",
            "<div class='table-wrap'><table>",
            "<tr><th>Kod</th><th>Kullanıcı</th><th>Seviye</th><th>Manuel Ödül</th><th>Kazanan Ödül</th><th>Durum</th></tr>",
            *[
                (
                    f"<tr><td><code>{_e(c.code)}</code></td>"
                    f"<td>{_e(c.username or '-')}</td>"
                    f"<td>{_e(TIERS.get(c.tier_key or '', c.tier_key or '-'))}</td>"
                    f"<td>{_e(prize_label_by_id.get(getattr(c,'manual_prize_id',None), '-') if getattr(c,'manual_prize_id',None) else '-')}</td>"
                    f"<td>{_e(prize_label_by_id.get(c.prize_id, '-') if c.prize_id else '-')}</td>"
                    f"<td>{'Kullanıldı' if c.status == 'used' else 'Verildi'}</td></tr>"
                )
                for c in last
            ],
            "</table></div></div>",
        ]
        body_parts += form + table

    else:
        prizes = db.query(Prize).order_by(Prize.wheel_index).all()

        # mevcut dağılımlar -> {prize_id:{tier:bp}}
        dist = {p.id: {k: 0 for k in TIERS} for p in prizes}
        for d in db.query(PrizeDistribution).all():
            if d.prize_id in dist and d.tier_key in TIERS:
                dist[d.prize_id][d.tier_key] = int(d.weight_bp or 0)

        # toplamlar sütun bazında
        sums = {k: 0 for k in TIERS}
        for p in prizes:
            for k in TIERS:
                sums[k] += dist[p.id][k]

        rows = [
            "<div class='card'><h1>Ödüller</h1>",
            "<div class='table-wrap'><form method='post' action='/admin/kod-yonetimi/prizes/dist/save'><table>",
            "<tr>",
            "<th>Ad</th><th>Sıra</th><th>Görsel</th>",
            *[f"<th>{_e(TIERS[k])}<br/><small>%</small></th>" for k in TIERS],
            "<th>Aktif</th><th style='width:110px'>İşlem</th></tr>",
        ]
        for p in prizes:
            cells = [
                f"<td>{_e(p.label)}</td>",
                f"<td>{p.wheel_index}</td>",
                f"<td>{_img_cell(p.image_url)}</td>",
            ]
            for k in TIERS:
                val = dist[p.id][k] / 100  # bp -> %
                cells.append(f"<td><input name='w_{p.id}_{k}' value='{val}' type='number' step='0.01' min='0' max='100' style='width:80px'></td>")
            checked = "checked" if getattr(p, "enabled", True) else ""
            cells.append(f"<td><input type='checkbox' name='en_{p.id}' {checked}></td>")
            cells.append(
                "<td>"
                f"<a class='btn small' href='/admin/kod-yonetimi?tab=oduller&edit={p.id}'>Düzenle</a> "
                f"<form method='post' action='/admin/kod-yonetimi/prizes/delete' style='display:inline' onsubmit=\"return confirm('Silinsin mi?')\">"
                f"<input type='hidden' name='id' value='{p.id}' />"
                f"<button class='btn small' type='submit'>Sil</button></form>"
                "</td>"
            )
            rows.append("<tr>" + "".join(cells) + "</tr>")

        sum_cells = ["<td colspan='3' style='text-align:right'><b>Toplam (%)</b></td>"]
        for k in TIERS:
            sum_cells.append(f"<td><b>{sums[k]/100:.2f}</b></td>")
        sum_cells += ["<td></td><td></td>"]
        rows.append("<tr>" + "".join(sum_cells) + "</tr>")

        rows.append("</table><div style='height:8px'></div><button class='btn primary' type='submit'>Dağılımları Kaydet</button></form></div></div>")

        # ödül ekleme/düzenleme formu (mevcut)
        edit_id = request.query_params.get("edit")
        try:
            editing = db.get(Prize, int(edit_id)) if edit_id else None
        except (TypeError, ValueError):
            editing = None

        eid = editing.id if editing else ""
        elabel = editing.label if editing else ""
        ewi = editing.wheel_index if editing else ""
        eurl = getattr(editing, "image_url", "") or ""

        form = f"""
        <div class='card'>
          <h1>{'Ödül Düzenle' if editing else 'Yeni Ödül'}</h1>
          <form method='post' action='/admin/kod-yonetimi/prizes/upsert'>
            {f'<input type="hidden" name="id" value="{eid}">' if editing else ''}
            <div class='grid'>
              <div class='span-6'><div>Sıralama</div><input name='wheel_index' type='number' value='{ewi}' required></div>
              <div class='span-6'><div>Ad</div><input name='label' value='{_e(elabel)}' required></div>
            </div>
            <div style='height:8px'></div>
            <div>Görsel URL</div>
            <input name='image_url' value='{_e(eurl)}' placeholder='https://... veya /static/...'>
            <div style='height:10px'></div>
            <button class='btn primary' type='submit'>Kaydet</button>
          </form>
        </div>
        """
        body_parts += rows + [form]

    style = """
    <style>
      :root{--bg:#090a0f;--card:#0f1016;--line:#1b1d26;--text:#f2f3f7;--muted:#a9afbd;--red:#ff0033;--red2:#ff4d6d;--redh:#ff1a4b;--black:#0a0b0f;}
      .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}
      .tab{padding:6px 10px;border:1px solid var(--line);border-radius:10px;color:var(--muted);text-decoration:none}
      .tab.active,.tab:hover{color:#fff;border-color:rgba(255,0,51,.45)}
      .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0}
      .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
      .span-6{grid-column:span 6}
      @media (max-width:900px){ .span-6{grid-column:span 12} }
      input,select{width:100%;background:#0c0c10;color:#fff;border:1px solid #26262c;border-radius:10px;padding:9px}
      input:focus,select:focus{outline:none;border-color:rgba(255,0,51,.45);box-shadow:0 0 0 2px rgba(255,0,51,.20)}
      .btn{appearance:none;border:1px solid #26262c;border-radius:10px;background:#141418;color:#fff;padding:8px 12px;cursor:pointer}
      .btn.primary{background:linear-gradient(90deg,var(--red),var(--red2));border-color:#2a0e15;box-shadow:0 0 16px rgba(255,0,51,.25)}
      .table-wrap{overflow:auto}
      table{width:100%;border-collapse:collapse;min-width:760px}
      th,td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
      th small{opacity:.8}
      .muted{color:#a9afbd;font-size:12px}
    </style>
    """
    html = _layout(style + "".join(body_parts), title="Kod Yönetimi", active="kod", is_super=(current.role == AdminRole.super_admin))
    return HTMLResponse(html)


@router.post("/admin/kod-yonetimi/create-code", response_model=None)
async def create_code(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    form = await request.form()
    username = (form.get("username") or "").strip() or None
    tier_key = (form.get("tier_key") or "").strip() or None
    mode = (form.get("mode") or "auto").strip()
    manual_prize_id = (form.get("manual_prize_id") or "").strip()
    manual_pid = int(manual_prize_id) if (manual_prize_id and manual_prize_id.isdigit()) else None

    if not tier_key:
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
    form = await request.form()
    prizes = db.query(Prize).order_by(Prize.wheel_index).all()

    # 1) ödül enabled güncelle
    for p in prizes:
        p.enabled = f"en_{p.id}" in form
        db.add(p)

    # 2) mevcut dağılımlar
    existing = {(d.prize_id, d.tier_key): d for d in db.query(PrizeDistribution).all()}

    sums = {k: 0 for k in TIERS}
    for p in prizes:
        for k in TIERS:
            key = f"w_{p.id}_{k}"
            raw = (form.get(key) or "").strip()
            try:
                pct = float(raw or "0")
            except ValueError:
                pct = 0.0
            bp = max(0, int(round(pct * 100)))
            sums[k] += bp

            d = existing.get((p.id, k))
            if not d:
                d = PrizeDistribution(prize_id=p.id, tier_key=k, weight_bp=bp, enabled=True)
            else:
                d.weight_bp = bp
                d.enabled = True
            db.add(d)

    bad = [k for k, total in sums.items() if total != 10000]
    if bad:
        db.rollback()
        flash(request, "Toplam %100 değil: " + ", ".join(f"{TIERS[k]} = {sums[k]/100:.2f}%" for k in bad), "error")
        return RedirectResponse(url="/admin/kod-yonetimi?tab=oduller", status_code=303)

    db.commit()
    flash(request, "Dağılımlar kaydedildi.", "success")
    return RedirectResponse(url="/admin/kod-yonetimi?tab=oduller", status_code=303)
