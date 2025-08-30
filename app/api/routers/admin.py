from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Prize, Code, AdminUser, AdminRole
from app.services.codes import gen_code
from app.services.auth import (
    require_role, get_current_admin,
    login_with_credentials, login_session, logout_session,
    hash_password
)

router = APIRouter()

# === Basit HTML şablonları ===
def _layout(body: str, notice: str = "") -> str:
    return f"""
    <div style='max-width:900px;margin:32px auto;font-family:sans-serif'>
      <h2>Radisson Spin – Admin</h2>
      {'<div style="padding:8px 12px;background:#eef;border:1px solid #ccd;margin-bottom:12px">'+notice+'</div>' if notice else ''}
      {body}
    </div>
    """

def _header_html(current: AdminUser | None) -> str:
    if not current:
        return ""
    nav = [
        "<a href='/admin'>Kod Yönetimi</a>",
        "<a href='/admin/users'>Adminler</a>" if current.role == AdminRole.super_admin else "",
        "<a href='/admin/logout'>Çıkış</a>",
    ]
    return f"<div style='margin-bottom:12px'>Giriş: <b>{current.username}</b> ({current.role}) | {' | '.join([n for n in nav if n])}</div>"

# === Giriş ekranı ===
@router.get("/admin/login", response_class=HTMLResponse)
def admin_login_form(request: Request):
    body = """
    <form method='post' action='/admin/login'>
      <label>Kullanıcı adı</label><br>
      <input name='username' required><br><br>
      <label>Şifre</label><br>
      <input name='password' type='password' required><br><br>
      <button type='submit'>Giriş Yap</button>
    </form>
    <p style='color:#666'>İlk giriş için env: ADMIN_BOOT_USERNAME / ADMIN_BOOT_PASSWORD</p>
    """
    return HTMLResponse(_layout(body))

@router.post("/admin/login")
async def admin_login(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    username = (form.get("username") or "").strip()
    password = (form.get("password") or "").strip()
    user = login_with_credentials(db, username, password)
    login_session(request, user)
    return RedirectResponse(url="/admin", status_code=303)

@router.get("/admin/logout")
def admin_logout(request: Request):
    logout_session(request)
    return RedirectResponse(url="/admin/login", status_code=303)

# === Kod yönetimi (admin ve üzeri) ===
@router.get("/admin", response_class=HTMLResponse)
def admin_home(
    request: Request,
    db: Session = Depends(get_db),
    current: AdminUser = Depends(require_role(AdminRole.admin)),
):
    prizes = db.query(Prize).order_by(Prize.wheel_index).all()
    last = db.query(Code).order_by(Code.created_at.desc()).limit(20).all()

    html = [
        _header_html(current),
        "<h3>Kod Yönetimi</h3>",
        "<form method='post' action='/admin/create-code'>",
        "<label>Kullanıcı adı (opsiyonel):</label><br>",
        "<input name='username'><br><br>",
        "<label>Ödül:</label><br><select name='prize_id'>",
    ]
    for p in prizes:
        html.append(f"<option value='{p.id}'>[{p.wheel_index}] {p.label}</option>")
    html += [
        "</select><br><br>",
        "<label>Kod (boşsa otomatik):</label><br>",
        "<input name='code'><br><br>",
        "<button type='submit'>Tek Kod Oluştur</button>",
        "</form><hr>",
        "<form method='post' action='/admin/bulk-codes'>",
        "<b>Toplu Kod Üret</b><br>",
        "<label>Adet:</label> <input name='count' type='number' value='10' min='1' max='1000'>",
        "&nbsp;<label>Prefix:</label> <input name='prefix'>",
        "&nbsp;<label>Ödül:</label><select name='prize_id'>",
    ]
    for p in prizes:
        html.append(f"<option value='{p.id}'>[{p.wheel_index}] {p.label}</option>")
    html += [
        "</select> <button type='submit'>Üret</button>",
        "</form><hr>",
        "<h3>Son 20 Kod</h3>",
        "<table border='1' cellpadding='6' cellspacing='0'>",
        "<tr><th>Kod</th><th>Kullanıcı</th><th>Ödül</th><th>Durum</th><th>Tarih</th></tr>"
    ]
    for c in last:
        pr = db.get(Prize, c.prize_id)
        html.append(f"<tr><td><code>{c.code}</code></td><td>{c.username or '-'}</td><td>{pr.label}</td><td>{c.status}</td><td>{c.created_at}</td></tr>")
    html.append("</table>")
    return HTMLResponse(_layout("".join(html)))

@router.post("/admin/create-code")
async def admin_create_code(
    request: Request,
    db: Session = Depends(get_db),
    current: AdminUser = Depends(require_role(AdminRole.admin)),
):
    form = await request.form()
    username = (form.get("username") or "").strip() or None
    prize_id = int(form.get("prize_id"))
    code = (form.get("code") or "").strip() or gen_code()

    if db.get(Code, code):
        raise HTTPException(status_code=409, detail="Bu kod zaten mevcut.")

    db.add(Code(code=code, username=username, prize_id=prize_id, status="issued"))
    db.commit()

    return RedirectResponse(url="/admin", status_code=303)

@router.post("/admin/bulk-codes")
async def admin_bulk_codes(
    request: Request,
    db: Session = Depends(get_db),
    current: AdminUser = Depends(require_role(AdminRole.admin)),
):
    form = await request.form()
    count = max(1, min(1000, int(form.get("count", 10))))
    prize_id = int(form.get("prize_id"))
    prefix = (form.get("prefix") or "").strip()

    created = []
    for _ in range(count):
        code = prefix + gen_code()
        if db.get(Code, code):
            continue
        db.add(Code(code=code, username=None, prize_id=prize_id, status="issued"))
        created.append(code)
    db.commit()
    return JSONResponse({"ok": True, "created": created})

# === Admin yönetimi (sadece süper admin) ===
@router.get("/admin/users", response_class=HTMLResponse)
def list_admins(
    request: Request,
    db: Session = Depends(get_db),
    current: AdminUser = Depends(require_role(AdminRole.super_admin)),
):
    users = db.query(AdminUser).order_by(AdminUser.username).all()
    html = [_header_html(current), "<h3>Admin Kullanıcıları</h3>"]
    html.append("<table border='1' cellpadding='6' cellspacing='0'><tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th></tr>")
    for u in users:
        html.append(f"<tr><td>{u.username}</td><td>{u.role}</td><td>{'aktif' if u.is_active else 'pasif'}</td></tr>")
    html.append("</table><hr>")

    # Yeni admin formu
    html.append("""
    <h4>Yeni Admin Oluştur</h4>
    <form method='post' action='/admin/users/create'>
      <label>Kullanıcı adı</label><br>
      <input name='username' required><br><br>
      <label>Şifre</label><br>
      <input name='password' type='password' required><br><br>
      <label>Rol</label><br>
      <select name='role'>
        <option value='admin'>admin</option>
        <option value='super_admin'>super_admin</option>
      </select><br><br>
      <button type='submit'>Oluştur</button>
    </form>
    """)
    return HTMLResponse(_layout("".join(html)))

@router.post("/admin/users/create")
async def create_admin_user(
    request: Request,
    db: Session = Depends(get_db),
    current: AdminUser = Depends(require_role(AdminRole.super_admin)),
):
    form = await request.form()
    username = (form.get("username") or "").strip()
    password = (form.get("password") or "").strip()
    role = (form.get("role") or "admin").strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Kullanıcı adı ve şifre zorunludur.")
    if db.query(AdminUser).filter(AdminUser.username == username).first():
        raise HTTPException(status_code=409, detail="Bu kullanıcı adı zaten mevcut.")
    if role not in ("admin", "super_admin"):
        raise HTTPException(status_code=400, detail="Geçersiz rol.")

    db.add(AdminUser(
        username=username,
        role=AdminRole(role),
        password_hash=hash_password(password),
        is_active=True,
    ))
    db.commit()
    return RedirectResponse(url="/admin/users", status_code=303)
