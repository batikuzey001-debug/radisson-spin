# app/api/routers/admin_mod/sayfalar/loginpage.py
# SAYFA: Giriş (Login)
# URL'ler: GET /admin/login  · POST /admin/login  · GET /admin/logout
# Bu dosyada login'e dair her şey var: logo, arkaplan, stil, küçük JS, flash.

from typing import Annotated
from html import escape as _e

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.auth import login_with_credentials, login_session, logout_session

router = APIRouter()

# --- Flash (login'e özel) ---------------------------------
def flash(request: Request, message: str, level: str = "info") -> None:
    message = _e(message)
    request.session.setdefault("_flash", [])
    request.session["_flash"].append({"message": message, "level": level})

def consume_flash(request: Request) -> list[dict]:
    msgs = request.session.get("_flash") or []
    request.session["_flash"] = []
    return msgs

def _render_flash(request: Request) -> str:
    msgs = consume_flash(request)
    if not msgs:
        return ""
    def cls(x: str) -> str:
        return {"error": "msg error", "success": "msg success", "warn": "msg warn"}.get(x, "msg")
    return "".join(f"<div class='{cls(m.get('level','info'))}'>{m['message']}</div>" for m in msgs)

# --- Sayfa şablonu (login bağımsız tema) ------------------
LOGO_URL = "https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png"

def _page(body: str, title: str = "Yönetim • Giriş") -> str:
    return f"""<!doctype html><html lang="tr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_e(title)}</title>
<style>
  :root {{
    --bg:#0a0b0f; --bg2:#0f0f14; --card:#111114; --text:#f5f5f5; --muted:#b3b3bb; --accent:#ff0033; --accent2:#ff4d6d; --line:#1d1d22;
  }}
  *{{box-sizing:border-box}}
  body{{margin:0;background:linear-gradient(180deg,var(--bg),var(--bg2));color:var(--text);font:14px/1.55 system-ui,Segoe UI,Roboto}}
  .wrap{{min-height:100dvh;display:grid;place-items:center;padding:16px}}
  .card{{width:min(440px,92vw);background:rgba(17,17,20,.9);border:1px solid var(--line);border-radius:16px;padding:18px 16px;box-shadow:0 10px 40px rgba(0,0,0,.45)}}
  .logo{{display:flex;justify-content:center;margin:6px 0 10px}}
  .logo img{{height:28px;filter:drop-shadow(0 0 6px rgba(255,255,255,.2))}}
  h1{{text-align:center;font-size:16px;margin:0 0 12px;color:#fff;letter-spacing:.2px}}
  .row{{display:grid;grid-template-columns:1fr;gap:10px}}
  label{{font-size:12px;color:var(--muted)}}
  input{{width:100%;background:#0b0b0f;color:#fff;border:1px solid #26262c;border-radius:10px;padding:10px}}
  input:focus{{outline:none;border-color:rgba(255,0,51,.45);box-shadow:0 0 0 2px rgba(255,0,51,.22)}}
  .field{{position:relative}}
  .toggle{{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:12px;color:#bbb;cursor:pointer}}
  .btn{{width:100%;appearance:none;border:1px solid #26262c;border-radius:10px;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#fff;padding:10px 12px;font-weight:700}}
  .btn:hover{{filter:brightness(1.05)}}
  .msg{{margin:8px 0;padding:10px 12px;border-radius:10px;border:1px solid #333;background:#17171c}}
  .msg.success{{border-color:#1f5131;background:#0f2617}}
  .msg.error{{border-color:#5a1f22;background:#2a1215}}
  .hint{{text-align:center;color:var(--muted);font-size:12px;margin-top:8px}}
</style>
<script>
  function togglePwd(){{
    const i = document.getElementById('pwd'); const t = document.getElementById('pwdbtn');
    if(!i||!t) return; const vis = i.type === 'password';
    i.type = vis ? 'text' : 'password'; t.textContent = vis ? 'Gizle' : 'Göster';
  }}
</script>
</head><body><div class="wrap">{body}</div></body></html>"""

# --- Routes -------------------------------------------------------
@router.get("/admin/login", response_class=HTMLResponse)
def login_form(request: Request):
    flashes = _render_flash(request)
    body = f"""
    <div class="card">
      <div class="logo"><img src="{LOGO_URL}" alt="logo"></div>
      <h1>Yönetici Girişi</h1>
      {flashes}
      <form method="post" action="/admin/login" autocomplete="on">
        <div class="row">
          <div class="field">
            <label>Kullanıcı adı</label>
            <input name="username" required autofocus>
          </div>
          <div class="field">
            <label>Şifre</label>
            <input id="pwd" name="password" type="password" required>
            <span id="pwdbtn" class="toggle" onclick="togglePwd()">Göster</span>
          </div>
        </div>
        <div style="height:10px"></div>
        <button class="btn" type="submit">Giriş Yap</button>
      </form>
      <div class="hint">Güvenli bağlantı ile giriş yapın.</div>
    </div>
    """
    return HTMLResponse(_page(body))

@router.post("/admin/login", response_model=None)
async def login_post(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    form = await request.form()
    username = (form.get("username") or "").strip()
    password = (form.get("password") or "").strip()
    try:
        user = login_with_credentials(db, username, password)
    except HTTPException as e:
        flash(request, e.detail if getattr(e, "detail", None) else "Giriş başarısız.", "error")
        return RedirectResponse(url="/admin/login", status_code=303)
    login_session(request, user)
    flash(request, f"Hoş geldin, {user.username}!", "success")
    return RedirectResponse(url="/admin", status_code=303)

@router.get("/admin/logout", response_model=None)
def logout_get(request: Request):
    logout_session(request)
    flash(request, "Güvenli şekilde çıkış yapıldı.", "success")
    return RedirectResponse(url="/admin/login", status_code=303)
