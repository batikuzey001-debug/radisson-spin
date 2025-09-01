# SAYFA: Admin Yönetim
# URL: /admin/users

from typing import Annotated
from html import escape as _e

from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import AdminUser, AdminRole
from app.services.auth import require_role, hash_password
from app.api.routers.admin_mod.yerlesim import _layout, _render_flash_blocks, flash

router = APIRouter()

@router.get("/admin/users", response_class=HTMLResponse)
def list_admins(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    users = db.query(AdminUser).order_by(AdminUser.username).all()
    fb = _render_flash_blocks(request)

    table = [
        "<div class='card'><h1>Admin Yönetim</h1>",
        "<div class='table-wrap'><table>",
        "<tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th><th>İşlem</th></tr>"
    ]
    for u in users:
        role_txt = "Süper" if u.role == AdminRole.super_admin else "Admin"
        actions = (
            f"<form method='post' action='/admin/users/delete' onsubmit='return confirm(\"Silinsin mi?\")' style='display:inline'>"
            f"<input type='hidden' name='id' value='{u.id}'>"
            f"<button class='btn small' type='submit'>Sil</button></form>"
        )
        table.append(
            f"<tr><td>{_e(u.username)}</td><td>{role_txt}</td><td>{'aktif' if u.is_active else 'pasif'}</td><td>{actions}</td></tr>"
        )
    table.append("</table></div></div>")

    form = """
    <div class='card'>
      <h1>Yeni Admin Oluştur</h1>
      <form method='post' action='/admin/users/create'>
        <div class='grid'>
          <div class='span-6'><div>Kullanıcı adı</div><input name='username' required></div>
          <div class='span-6'><div>Rol</div>
            <select name='role'>
              <option value='admin'>Admin</option>
              <option value='super_admin'>Süper Admin</option>
            </select>
          </div>
        </div>
        <div style='height:8px'></div>
        <div>Şifre</div><input type='password' name='password' required>
        <div style='height:10px'></div>
        <button class='btn primary' type='submit'>Oluştur</button>
      </form>
    </div>
    """

    html = _layout(fb + "".join(table) + form, title="Admin Yönetim", active="users", is_super=True)
    return HTMLResponse(html)

@router.post("/admin/users/create", response_model=None)
async def create_admin_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    form = await request.form()
    username = (form.get("username") or "").strip()
    password = (form.get("password") or "").strip()
    role = (form.get("role") or "admin").strip()

    if not username or not password:
        flash(request, "Kullanıcı adı ve şifre zorunludur.", "error")
        return RedirectResponse(url="/admin/users", status_code=303)
    if db.query(AdminUser).filter(AdminUser.username == username).first():
        flash(request, "Bu kullanıcı adı zaten mevcut.", "error")
        return RedirectResponse(url="/admin/users", status_code=303)
    if role not in ("admin", "super_admin"):
        flash(request, "Geçersiz rol.", "error")
        return RedirectResponse(url="/admin/users", status_code=303)

    db.add(AdminUser(username=username, role=AdminRole(role), password_hash=hash_password(password), is_active=True))
    db.commit()
    flash(request, f"Admin oluşturuldu: {username}", "success")
    return RedirectResponse(url="/admin/users", status_code=303)

@router.post("/admin/users/delete", response_model=None)
async def delete_admin_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    form = await request.form()
    uid = int(form.get("id"))
    user = db.get(AdminUser, uid)
    if not user:
        flash(request, "Kullanıcı bulunamadı.", "error")
        return RedirectResponse(url="/admin/users", status_code=303)

    if user.id == current.id:
        flash(request, "Kendinizi silemezsiniz.", "error")
        return RedirectResponse(url="/admin/users", status_code=303)

    if user.role == AdminRole.super_admin:
        others = db.query(AdminUser).filter(AdminUser.role == AdminRole.super_admin, AdminUser.id != user.id).count()
        if others == 0:
            flash(request, "Son süper admin silinemez.", "error")
            return RedirectResponse(url="/admin/users", status_code=303)

    db.delete(user)
    db.commit()
    flash(request, "Admin silindi.", "success")
    return RedirectResponse(url="/admin/users", status_code=303)
