# app/api/routers/admin_mod/sayfalar/home_banners.py
from typing import Annotated
from html import escape as _e
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import AdminUser, AdminRole, HomeBanner
from app.services.auth import require_role
from app.api.routers.admin_mod.yerlesim import _layout, _render_flash_blocks, flash

router = APIRouter()

def _norm(s: str | None) -> str | None:
    if not s: return None
    s = s.strip()
    return s or None

@router.get("/admin/home-banners", response_class=HTMLResponse)
def page(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))]
):
    rows = db.query(HomeBanner).order_by(HomeBanner.order.asc(), HomeBanner.id.desc()).all()
    edit_id = request.query_params.get("edit")
    try:
        editing = db.get(HomeBanner, int(edit_id)) if edit_id else None
    except Exception:
        editing = None

    fb = _render_flash_blocks(request) or ""

    # Liste
    t = [
        "<div class='card'><h1>Ana Sayfa Slider</h1>",
        "<div class='table-wrap'><table>",
        "<tr><th>Sıra</th><th>Görsel</th><th>1. Metin</th><th>2. Metin</th><th>Aktif</th><th style='width:170px'>İşlem</th></tr>",
    ]
    for r in rows:
        img = f"<img src='{_e(r.image_url)}' alt='' style='height:26px;border-radius:6px' loading='lazy'/>"
        t.append(
            f"<tr>"
            f"<td>{r.order}</td>"
            f"<td>{img}</td>"
            f"<td>{_e(r.title or '-')}</td>"
            f"<td>{_e(r.subtitle or '-')}</td>"
            f"<td>{'Evet' if r.is_active else 'Hayır'}</td>"
            f"<td class='actions'>"
            f"<a class='btn small' href='/admin/home-banners?edit={r.id}'>Düzenle</a> "
            f"<form method='post' action='/admin/home-banners/delete' style='display:inline' onsubmit=\"return confirm('Silinsin mi?')\">"
            f"<input type='hidden' name='id' value='{r.id}'/>"
            f"<button class='btn danger small' type='submit'>Sil</button></form>"
            f"</td>"
            f"</tr>"
        )
    t.append("</table></div></div>")

    # Form
    eid = editing.id if editing else ""
    title = editing.title if editing else ""
    subtitle = editing.subtitle if editing else ""
    image_url = editing.image_url if editing else ""
    order = editing.order if editing else 1
    is_active = "checked" if (editing.is_active if editing else True) else ""

    form = f"""
    <div class='card'>
      <h1>{'Banner Düzenle' if editing else 'Yeni Banner'}</h1>
      <form method='post' action='/admin/home-banners/upsert'>
        {f"<input type='hidden' name='id' value='{eid}'/>" if editing else ""}
        <div class='grid'>
          <label class='field'><span>Görsel URL</span><input name='image_url' value='{_e(image_url)}' required placeholder='https://... veya /static/...'></label>
          <label class='field'><span>1. Metin</span><input name='title' value='{_e(title)}' placeholder='opsiyonel'></label>
          <label class='field'><span>2. Metin</span><input name='subtitle' value='{_e(subtitle)}' placeholder='opsiyonel'></label>
          <label class='field'><span>Sıra</span><input name='order' type='number' min='1' value='{order}' required></label>
          <label class='field'><span>Aktif</span><label class='cb'><input type='checkbox' name='is_active' {is_active}> Yayında</label></label>
        </div>
        <div class='form-actions'><button class='btn primary' type='submit'>Kaydet</button></div>
      </form>
    </div>
    """

    style = """
    <style>
      :root{--bg:#090a0f;--card:#0f1016;--line:#1b1d26;--text:#f2f3f7;--muted:#a9afbd;--red:#ff0033;--red2:#ff4d6d;--black:#0a0b0f;}
      .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px}
      .table-wrap{overflow:auto}
      table{width:100%;border-collapse:collapse}
      th,td{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left;font-size:13px;vertical-align:middle}
      img{display:block}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .field{display:flex;flex-direction:column;gap:6px}
      .field > span{font-size:12px;color:var(--muted)}
      input{width:100%;background:#0b0d13;border:1px solid var(--line);border-radius:10px;color:#fff;padding:10px}
      input:focus{outline:none;border-color:var(--red);box-shadow:0 0 0 2px rgba(255,0,51,.20)}
      .cb{display:inline-flex;align-items:center;gap:8px}
      .btn{display:inline-block;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#151824;color:#fff;text-decoration:none;cursor:pointer}
      .btn.small{font-size:12px;padding:6px 8px}
      .btn.primary{background:linear-gradient(90deg,var(--red),var(--red2));border-color:#2a0e15;box-shadow:0 0 16px rgba(255,0,51,.25)}
      .btn.danger{background:#2a0c14;border-color:#501926}
      .form-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
      @media(max-width:900px){.grid{grid-template-columns:1fr}}
    </style>
    """

    html = _layout(style + (_render_flash_blocks(request) or "") + "".join(t) + form, title="Ana Sayfa Slider", active="home")
    return HTMLResponse(html)

@router.post("/admin/home-banners/upsert")
async def upsert(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))]
):
    form = await request.form()
    id_raw = (form.get("id") or "").strip()
    image_url = _norm(form.get("image_url"))
    title = _norm(form.get("title"))
    subtitle = _norm(form.get("subtitle"))
    order = int((form.get("order") or "1").strip() or "1")
    is_active = (form.get("is_active") or "").lower() in ("1","true","on","yes","checked")

    if not image_url:
        flash(request, "Görsel URL zorunlu.", "error")
        return RedirectResponse("/admin/home-banners", status_code=303)

    if id_raw:
        row = db.get(HomeBanner, int(id_raw))
        if not row:
            flash(request, "Kayıt bulunamadı.", "error")
            return RedirectResponse("/admin/home-banners", status_code=303)
        row.image_url = image_url
        row.title = title
        row.subtitle = subtitle
        row.order = order
        row.is_active = is_active
        db.add(row)
        msg = "Güncellendi."
    else:
        db.add(HomeBanner(image_url=image_url, title=title, subtitle=subtitle, order=order, is_active=is_active))
        msg = "Eklendi."

    db.commit()
    flash(request, msg, "success")
    return RedirectResponse("/admin/home-banners", status_code=303)

@router.post("/admin/home-banners/delete")
async def delete(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))]
):
    form = await request.form()
    id_raw = (form.get("id") or "").strip()
    if id_raw:
        row = db.get(HomeBanner, int(id_raw))
        if row:
            db.delete(row)
            db.commit()
    return RedirectResponse("/admin/home-banners", status_code=303)
