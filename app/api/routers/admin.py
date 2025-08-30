from typing import Annotated

from fastapi import APIRouter, Depends, Request, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Prize, Code, AdminUser, AdminRole
from app.services.codes import gen_code
from app.services.auth import (
    require_role,
    login_with_credentials, login_session, logout_session,
    hash_password
)

router = APIRouter()

# ========== UI Helpers ==========
def _layout(body: str, title: str = "Radisson Spin – Admin", notice: str = "") -> str:
    return f"""
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title}</title>
  <style>
    :root {{
      --bg:#0b1220; --card:#0f172a; --muted:#94a3b8; --text:#e2e8f0;
      --brand:#7c3aed; --brand-2:#a78bfa; --ok:#16a34a; --warn:#f59e0b; --err:#ef4444;
      --border: rgba(148,163,184,.2);
    }}
    * {{ box-sizing:border-box; }}
    body {{
      margin:0; background: linear-gradient(180deg,#0b1220 0%,#0b1220 60%, #0e1528 100%);
      color:var(--text); font: 14px/1.6 system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial;
    }}
    .container {{ max-width: 1100px; margin: 32px auto; padding: 0 16px; }}
    .header {{ display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap:12px; }}
    .brand {{ font-weight:700; font-size:20px; letter-spacing:.3px; }}
    .nav a {{ color:var(--muted); text-decoration:none; margin-left:14px; padding:6px 10px; border-radius:10px; border:1px solid transparent; }}
    .nav a.active, .nav a:hover {{ color:var(--text); border-color:var(--border); background:rgba(124,58,237,.12); }}
    .notice {{ padding:10px 12px; background:rgba(124,58,237,.12); border:1px solid var(--border); border-radius:12px; margin-bottom:16px; }}
    .grid {{ display:grid; grid-template-columns: repeat(12, 1fr); gap:16px; }}
    .card {{ grid-column: span 12; background:var(--card); border:1px solid var(--border); border-radius:16px; padding:16px; }}
    @media (min-width: 900px) {{
      .span-4 {{ grid-column: span 4; }}
      .span-8 {{ grid-column: span 8; }}
      .span-12 {{ grid-column: span 12; }}
    }}
    h3 {{ margin:0 0 12px 0; font-size:16px; }}
    label {{ display:block; margin:6px 0 6px; color:var(--muted); }}
    input, select {{ width:100%; background:#0b1220; color:var(--text); border:1px solid var(--border); border-radius:12px; padding:10px 12px; outline:none; }}
    input::placeholder {{ color:#64748b; }}
    .row {{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }}
    .btn {{ appearance:none; border:none; background:linear-gradient(135deg,var(--brand),var(--brand-2));
      color:#fff; padding:10px 14px; border-radius:12px; font-weight:600; cursor:pointer; box-shadow:0 4px 18px rgba(124,58,237,.25); }}
    .btn.secondary {{ background:transparent; color:var(--text); border:1px solid var(--border); box-shadow:none; }}
    .btn:disabled {{ opacity:.6; cursor:not-allowed; }}
    .table-wrap {{ overflow:auto; border:1px solid var(--border); border-radius:12px; }}
    table {{ width:100%; border-collapse:collapse; min-width:720px; }}
    th, td {{ padding:10px 12px; border-bottom:1px solid var(--border); text-align:left; white-space:nowrap; }}
    th {{ color:var(--muted); font-weight:600; }}
    code {{ background:rgba(148,163,184,.15); padding:3px 6px; border-radius:8px; }}
    .footer {{ margin-top:18px; color:var(--muted); font-size:12px; text-align:center; }}
    .spacer {{ height:8px; }}
    .success {{ color: var(--ok); }}
    .error {{ color: var(--err); }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">🎯 Radisson Spin – Admin</div>
      <div class="nav">{{NAV}}</div>
    </div>
    {"<div class='notice'>" + notice + "</div>" if notice else ""}
    {body}
    <div class="footer">© {title}</div>
  </div>
</body>
</html>
    """

def _header_html(current: AdminUser | None, active: str = "") -> str:
    if not current:
        return ""
    links = [
        ("Kod Yönetimi", "/admin", active == "codes"),
        ("Adminler", "/admin/users", active == "users" if current.role == AdminRole.super_admin else False),
        ("Çıkış", "/admin/logout", False),
    ]
    items = []
    items.append(f"<span class='nav-user'>Giriş: <b>{current.username}</b> ({current.role})</span>")
    for title, href, is_active in links:
        if title == "Adminler" and current.role != AdminRole.super_admin:
            continue
        cls = "active" if is_active else ""
        items.append(f"<a class='{cls}' href='{href}'>{title}</a>")
    return " | ".join(items)

# ========== Auth ==========
@router.get("/admin/login", response_class=HTMLResponse, response_model=None)
def admin_login_form(request: Request):
    body = """
    <div class="grid">
      <div class="card span-4">
        <h3>Giriş</h3>
        <form method='post' action='/admin/login'>
          <label>Kullanıcı adı</label>
          <input name='username' placeholder='örn: Admin' required>
          <div class="spacer"></div>
          <label>Şifre</label>
          <input name='password' type='password' placeholder='••••••••' required>
          <div class="spacer"></div>
          <button class='btn' type='submit'>Giriş Yap</button>
        </form>
        <div class="spacer"></div>
        <p class="muted" style="color:#94a3b8">Giriş sonrası üst menüden Kod Yönetimi ve Adminler'e erişebilirsiniz.</p>
      </div>
    </div>
    """
    html = _layout(body).replace("{{NAV}}", "")
    return HTMLResponse(html)

@router.post("/admin/login", response_model=None)
async def admin_login(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    form = await request.form()
    username = (form.get("username") or "").strip()
    password = (form.get("password") or "").strip()
    user = login_with_credentials(db, username, password)
    login_session(request, user)
    return RedirectResponse(url="/admin", status_code=303)

@router.get("/admin/logout", response_model=None)
def admin_logout(request: Request):
    logout_session(request)
    return RedirectResponse(url="/admin/login", status_code=303)

# ========== Kod Yönetimi ==========
@router.get("/admin", response_class=HTMLResponse, response_model=None)
def admin_home(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    prizes = db.query(Prize).order_by(Prize.wheel_index).all()
    last = db.query(Code).order_by(Code.created_at.desc()).limit(20).all()

    # Tek kod formu
    html_form_single = [
        "<div class='card span-4'>",
        "<h3>Tek Kod Oluştur</h3>",
        "<form method='post' action='/admin/create-code'>",
        "<label>Kullanıcı adı (opsiyonel)</label>",
        "<input name='username' placeholder='örn: yasin'>",
        "<label>Ödül</label>",
        "<select name='prize_id'>",
    ]
    for p in prizes:
        html_form_single.append(f"<option value='{p.id}'>[{p.wheel_index}] {p.label}</option>")
    html_form_single += [
        "</select>",
        "<label>Kod (boşsa otomatik)</label>",
        "<input name='code' placeholder='örn: ABC123'>",
        "<div class='spacer'></div>",
        "<button class='btn' type='submit'>Oluştur</button>",
        "</form>",
        "</div>"
    ]

    # Toplu kod formu
    html_form_bulk = [
        "<div class='card span-8'>",
        "<h3>Toplu Kod Üret</h3>",
        "<form method='post' action='/admin/bulk-codes'>",
        "<div class='row'>",
        "<div>",
        "<label>Adet</label>",
        "<input name='count' type='number' value='10' min='1' max='1000'>",
        "</div>",
        "<div>",
        "<label>Prefix (opsiyonel)</label>",
        "<input name='prefix' placeholder='RAD-'>",
        "</div>",
        "</div>",
        "<label>Ödül</label>",
        "<select name='prize_id'>",
    ]
    for p in prizes:
        html_form_bulk.append(f"<option value='{p.id}'>[{p.wheel_index}] {p.label}</option>")
    html_form_bulk += [
        "</select>",
        "<div class='spacer'></div>",
        "<button class='btn' type='submit'>Üret</button>",
        "</form>",
        "</div>"
    ]

    # Son 20 kod tablosu
    html_table = [
        "<div class='card span-12'>",
        "<h3>Son 20 Kod</h3>",
        "<div class='table-wrap'>",
        "<table>",
        "<tr><th>Kod</th><th>Kullanıcı</th><th>Ödül</th><th>Durum</th><th>Tarih</th></tr>"
    ]
    for c in last:
        pr = db.get(Prize, c.prize_id)
        html_table.append(
            f"<tr><td><code>{c.code}</code></td>"
            f"<td>{c.username or '-'}</td>"
            f"<td>{pr.label}</td>"
            f"<td>{c.status}</td>"
            f"<td>{c.created_at}</td></tr>"
        )
    html_table += ["</table></div></div>"]

    body = f"""
    <div class="grid">
      {''.join(html_form_single)}
      {''.join(html_form_bulk)}
      {''.join(html_table)}
    </div>
    """
    html = _layout(body).replace("{{NAV}}", _header_html(current, active="codes"))
    return HTMLResponse(html)

@router.post("/admin/create-code", response_model=None)
async def admin_create_code(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
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

@router.post("/admin/bulk-codes", response_model=None)
async def admin_bulk_codes(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
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

# ========== Admin Yönetimi ==========
@router.get("/admin/users", response_class=HTMLResponse, response_model=None)
def list_admins(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
):
    users = db.query(AdminUser).order_by(AdminUser.username).all()

    table = [
        "<div class='card span-12'>",
        "<h3>Admin Kullanıcıları</h3>",
        "<div class='table-wrap'><table>",
        "<tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th></tr>"
    ]
    for u in users:
        table.append(f"<tr><td>{u.username}</td><td>{u.role}</td><td>{'aktif' if u.is_active else 'pasif'}</td></tr>")
    table += ["</table></div></div>"]

    form = """
    <div class='card span-12'>
      <h3>Yeni Admin Oluştur</h3>
      <form method='post' action='/admin/users/create'>
        <div class='row'>
          <div>
            <label>Kullanıcı adı</label>
            <input name='username' required>
          </div>
          <div>
            <label>Rol</label>
            <select name='role'>
              <option value='admin'>admin</option>
              <option value='super_admin'>super_admin</option>
            </select>
          </div>
        </div>
        <label>Şifre</label>
        <input name='password' type='password' required>
        <div class='spacer'></div>
        <button class='btn' type='submit'>Oluştur</button>
      </form>
    </div>
    """

    body = f"<div class='grid'>{''.join(table)}{form}</div>"
    html = _layout(body).replace("{{NAV}}", _header_html(current, active="users"))
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
