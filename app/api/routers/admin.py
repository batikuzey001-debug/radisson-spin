from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import admin_guard
from app.db.session import get_db
from app.db.models import Prize, Code
from app.services.codes import gen_code

router = APIRouter()

@router.get("/admin", response_class=HTMLResponse)
def admin_home(request: Request, db: Session = Depends(get_db)):
    admin_guard(request)
    prizes = db.query(Prize).order_by(Prize.wheel_index).all()
    last = db.query(Code).order_by(Code.created_at.desc()).limit(20).all()

    token = request.query_params.get("admin", "")

    html = [
        "<h2>Radisson Spin – Admin</h2>",
        f"<form method='post' action='/admin/create-code?admin={token}'>",
        "<label>Kullanıcı adı (opsiyonel):</label><br>",
        "<input name='username' placeholder='örn: yasin'><br><br>",
        "<label>Ödül:</label><br><select name='prize_id'>",
    ]
    for p in prizes:
        html.append(f"<option value='{p.id}'>[{p.wheel_index}] {p.label}</option>")
    html += [
        "</select><br><br>",
        "<label>Kod (boşsa otomatik):</label><br>",
        "<input name='code' placeholder='örn: ABC123'><br><br>",
        "<button type='submit'>Tek Kod Oluştur</button>",
        "</form><hr>",
        f"<form method='post' action='/admin/bulk-codes?admin={token}'>",
        "<b>Toplu Kod Üret</b><br>",
        "<label>Adet:</label> <input name='count' type='number' value='10' min='1' max='1000'>",
        "&nbsp; <label>Prefix (opsiyonel):</label> <input name='prefix' placeholder='RAD-'>",
        "&nbsp; <label>Ödül:</label> <select name='prize_id'>",
    ]
    for p in prizes:
        html.append(f"<option value='{p.id}'>[{p.wheel_index}] {p.label}</option>")
    html += [
        "</select> <button type='submit'>Üret</button>",
        "</form><hr>",
        "<h3>Son 20 Kod</h3>",
        "<table border='1' cellpadding='6' cellspacing='0'><tr><th>Kod</th><th>Kullanıcı</th><th>Ödül</th><th>Durum</th><th>Tarih</th></tr>"
    ]
    for c in last:
        pr = db.get(Prize, c.prize_id)
        html.append(f"<tr><td><code>{c.code}</code></td><td>{c.username or '-'}</td><td>{pr.label}</td><td>{c.status}</td><td>{c.created_at}</td></tr>")
    html.append("</table>")
    return HTMLResponse("".join(html))

@router.post("/admin/create-code")
async def admin_create_code(request: Request, db: Session = Depends(get_db)):
    admin_guard(request)
    form = await request.form()
    username = (form.get("username") or "").strip() or None
    prize_id = int(form.get("prize_id"))
    code = (form.get("code") or "").strip() or gen_code()

    if db.get(Code, code):
        raise HTTPException(status_code=409, detail="code_exists")

    db.add(Code(code=code, username=username, prize_id=prize_id, status="issued"))
    db.commit()

    token = request.query_params.get("admin", "")
    return RedirectResponse(url=f"/admin?admin={token}", status_code=303)

@router.post("/admin/bulk-codes")
async def admin_bulk_codes(request: Request, db: Session = Depends(get_db)):
    admin_guard(request)
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
