from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Prize, Code, AdminUser, AdminRole
from app.services.codes import gen_code
from app.services.auth import require_role, get_current_admin, sha256

router = APIRouter()

# === Ortak HTML header ===
def _header_html(current: AdminUser) -> str:
    nav = [
        "<a href='/admin'>Kod Yönetimi</a>",
        "<a href='/admin/users'>Adminler</a>" if current.role == AdminRole.super_admin else "",
    ]
    return f"<div style='margin-bottom:12px'>Giriş: <b>{current.username}</b> ({current.role}) | {' | '.join([n for n in nav if n])}</div>"

# === Kod yönetimi (admin ve üzeri) ===
@router.get("/admin", response_class=HTMLResponse)
def admin_home(
    request: Request,
    db: Session = Depends(get_db),
    current: AdminUser = Depends(require_role(AdminRole.admin)),
):
    prizes = db.query(Prize).order_by(Prize.wheel_index).all()
    last = db.query(Code).order_by(Code.created_at.desc()).limit(20).all()

    token = request.query_params.get("admin", "")
    html = [_header_html(current)]
    html += [
        "<h2>Kod Yönetimi</h2>",
        f"<form method='post' action='/admin/create-code?admin={token}'>",
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
        f"<form method='post' action='/admin/bulk-codes?admin={token}'>",
        "<b>Toplu Kod Üret</b><br>",
        "<label>Adet:</label> <input name='count' type='number' value='10'>",
        "&nbsp;<label>Prefix:</label> <input name='prefix'>",
        "&nbsp;<label>Ödül:</label><select name='prize_id'>",
    ]
    for p in prizes:
        html.append(f"<option value='{p.id}'>[{p.wheel_index}] {p.label}</option>")
    html += [
        "</select><button type='submit'>Üret</button>",
        "</form><hr>",
        "<h3>Son 20 Kod</h3>",
        "<table border='1'><tr><th>Kod</th><th>Kullanıcı</th><th>Ödül</th><th>Durum</th><th>Tarih</th></tr>",
    ]
    for c in last:
        pr = db.get(Prize, c.prize_id)
        html.append(f"<tr><td>{c.code}</td><td>{c.username or '-'}</td><td>{pr.label}</td><td>{c.status}</td><td>{c.created_at}</td></tr>")
    html.append("</table>")
    return HTMLResponse("".join(html))

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

    token = request.query_params.get("admin", "")
    return RedirectResponse(url=f"/admin?admin={token}", status_code=303)

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

# === Admin yönetimi (sadece super admin) ===
@router.get("/admin/users", response_class=HTMLResponse)
def list_admins(
    request: Request,
    db: Session = Depends(get_db),
    current: AdminUser = Depends(require_role(AdminRole.super_admin)),
):
    users = db.query(AdminUser).all()
    token = request.query_params.get("admin", "")
    html = [_header_html(current)]
    html.append("<h2>Admin Kullanıcıları</h2><ul>")
    for u in users:
        html.append(f"<li>{u.username} ({u.role}) - {'aktif' if u.is_active else 'pasif'}</li>")
    html.append("</ul>")
    return HTMLResponse("".join(html))
