# SAYFA: Kod Yönetimi (Kodlar + Ödüller tek sayfa / iki sekme)
# URL: /admin/kod-yonetimi

from typing import Annotated
from html import escape as _e
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Prize, Code, AdminUser, AdminRole
from app.services.codes import gen_code
from app.services.auth import require_role
from app.api.routers.admin_mod.yerlesim import _layout, _render_flash_blocks, flash

router = APIRouter()

def _normalize(u: str | None) -> str | None:
    if not u: return None
    x = u.strip()
    if not x: return None
    if x.startswith(("http://","https://","data:")): return x
    if x.startswith("//"): return "https:" + x
    return x

# Eski adresten otomatik yönlendirme (isteğe bağlı)
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
    if fb: body_parts.append(fb)

    if tab == "kodlar":
        prizes = db.query(Prize).order_by(Prize.wheel_index).all()
        last   = db.query(Code).order_by(Code.created_at.desc()).limit(20).all()

        form = [
            "<div class='card'><h1>Kod Oluştur</h1>",
            "<form method='post' action='/admin/kod-yonetimi/create-code'>",
            "<div class='grid'>",
            "<div class='span-6'><div>Kullanıcı adı</div><input name='username' required></div>",
            "<div class='span-6'><div>Ödül</div><select name='prize_id'>",
            *[f"<option value='{p.id}'>[{p.wheel_index}] {_e(p.label)}</option>" for p in prizes],
            "</select></div></div>",
            "<div style='height:8px'></div>",
            "<button class='btn primary' type='submit'>Oluştur</button>",
            "</form></div>"
        ]
        table = [
            "<div class='card'><h1>Son 20 Kod</h1>",
            "<div class='table-wrap'><table>",
            "<tr><th>Kod</th><th>Kullanıcı</th><th>Ödül</th><th>Durum</th></tr>",
            *[
                f"<tr><td><code>{_e(c.code)}</code></td>"
                f"<td>{_e(c.username or '-')}</td>"
                f"<td>{_e((db.get(Prize, c.prize_id).label) if db.get(Prize, c.prize_id) else '-')}</td>"
                f"<td>{'Kullanıldı' if c.status=='used' else 'Verildi'}</td></tr>"
                for c in last
            ],
            "</table></div></div>"
        ]
        body_parts += form + table

    else:
        prizes = db.query(Prize).order_by(Prize.wheel_index).all()
        edit_id = request.query_params.get("edit")
        editing = db.get(Prize, int(edit_id)) if edit_id else None

        rows = [
            "<div class='card'><h1>Ödüller</h1>",
            "<div class='table-wrap'><table>",
            "<tr><th>Ad</th><th>Sıra</th><th>Görsel</th><th>İşlem</th></tr>",
            *[
                (
                  f"<tr><td>{_e(p.label)}</td><td>{p.wheel_index}</td>"
                  f"<td>{f\"<img src='{_e(_normalize(p.image_url) or '')}' style='height:24px;border-radius:6px' loading='lazy' />\" if p.image_url else '-'}</td>"
                  f"<td><a class='btn small' href='/admin/kod-yonetimi?tab=oduller&edit={p.id}'>Düzenle</a> "
                  f"<form method='post' action='/admin/kod-yonetimi/prizes/delete' style='display:inline' onsubmit=\"return confirm('Silinsin mi?')\">"
                  f"<input type='hidden' name='id' value='{p.id}' /><button class='btn small' type='submit'>Sil</button></form></td></tr>"
                )
                for p in prizes
            ],
            "</table></div></div>"
        ]

        eid   = editing.id if editing else ""
        elabel= (editing.label if editing else "")
        ewi   = (editing.wheel_index if editing else "")
        eurl  = (editing.image_url if getattr(editing, "image_url", None) else "")

        form = f"""
        <div class='card'>
          <h1>{'Ödül Düzenle' if editing else 'Yeni Ödül'}</h1>
          <form method='post' action='/admin/kod-yonetimi/prizes/upsert'>
            {'<input type="hidden" name="id" value="'+str(eid)+'">' if editing else ''}
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

    html = _layout("Kod Yönetimi", "".join(body_parts), active="kod", is_super=(current.role == AdminRole.super_admin))
    return HTMLResponse(html)

@router.post("/admin/kod-yonetimi/create-code", response_model=None)
async def create_code(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    form = await request.form()
    username = (form.get("username") or "").strip() or None
    prize_id = int(form.get("prize_id"))
    code = gen_code()
    db.add(Code(code=code, username=username, prize_id=prize_id, status="issued"))
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
