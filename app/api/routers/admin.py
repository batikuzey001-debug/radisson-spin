from typing import Annotated
from html import escape as _escape

from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
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

# ========== Flash Helpers ==========
def flash(request: Request, message: str, level: str = "info") -> None:
    message = _escape(message)  # XSS koruması
    request.session.setdefault("_flash", [])
    request.session["_flash"].append({"message": message, "level": level})

def consume_flash(request: Request) -> list[dict]:
    msgs = request.session.get("_flash") or []
    request.session["_flash"] = []
    return msgs

def _render_flash_blocks(request: Request) -> str:
    msgs = consume_flash(request)
    if not msgs:
        return ""
    def cls(level: str) -> str:
        if level == "error":   return "notice error"
        if level == "success": return "notice success"
        if level == "warn":    return "notice warn"
        return "notice"
    return "".join(f"<div class='{cls(m.get('level','info'))}'>{m['message']}</div>" for m in msgs)

# ========== UI Helpers ==========
def _layout(body: str, title: str = "Radisson Spin – Admin", notice: str = "") -> str:
    logo_url = "https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png"
    return f"""
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title}</title>
  <style>
    :root {{
      /* Neon kırmızı & siyah tema */
      --bg:#050607; --bg-2:#0a0b0f; --card:#0a0a0a; --muted:#a1a1aa; --text:#f5f5f5;
      --brand:#ff0033; --brand-2:#ff4d6d; --ok:#16a34a; --warn:#f59e0b; --err:#ef4444;
      --border: rgba(255,255,255,.08);
      --glow: 0 0 12px rgba(255,0,51,.55), 0 0 24px rgba(255,0,51,.35), inset 0 0 8px rgba(255,0,51,.15);
      --glow-soft: 0 0 10px rgba(255,255,255,.08), inset 0 0 10px rgba(255,255,255,.04);
    }}
    * {{ box-sizing:border-box; }}
    body {{
      margin:0;
      background:
        radial-gradient(1200px 600px at 20% -10%, rgba(255,0,51,.12), transparent 60%),
        radial-gradient(1000px 500px at 120% 10%, rgba(255,77,109,.10), transparent 60%),
        linear-gradient(180deg,var(--bg) 0%,var(--bg) 60%, var(--bg-2) 100%);
      color:var(--text);
      font: 14px/1.6 system-ui,-apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial;
    }}
    .container {{ max-width: 1100px; margin: 32px auto; padding: 0 16px; }}
    .header {{ display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap:12px; }}
    .brand img{{ height:28px; display:block; filter: drop-shadow(0 0 10px rgba(255,255,255,.12)); }}
    .nav a {{
      color:var(--muted); text-decoration:none; margin-left:10px; padding:6px 10px; border-radius:12px;
      border:1px solid transparent; transition: all .2s ease;
    }}
    .nav a.active, .nav a:hover {{
      color:var(--text); border-color:var(--border); background:rgba(255,0,51,.10);
      box-shadow: var(--glow);
    }}

    .notice {{
      padding:12px 14px; background:rgba(255,0,51,.08); border:1px solid var(--border);
      border-radius:14px; margin-bottom:16px; box-shadow: var(--glow-soft);
    }}
    .notice.success {{ background: rgba(22,163,74,.10); box-shadow: 0 0 14px rgba(22,163,74,.25); }}
    .notice.error {{ background: rgba(239,68,68,.12); box-shadow: 0 0 14px rgba(239,68,68,.35); }}
    .notice.warn {{ background: rgba(245,158,11,.12); box-shadow: 0 0 14px rgba(245,158,11,.35); }}

    .grid {{ display:grid; grid-template-columns: repeat(12, 1fr); gap:16px; }}
    .card {{
      grid-column: span 12; background:var(--card); border:1px solid var(--border);
      border-radius:18px; padding:16px; box-shadow: var(--glow-soft);
    }}
    @media (min-width: 900px) {{
      .span-4 {{ grid-column: span 4; }}
      .span-8 {{ grid-column: span 8; }}
      .span-12 {{ grid-column: span 12; }}
    }}
    h3 {{ margin:0 0 12px 0; font-size:16px; letter-spacing:.2px; }}
    /* "label" yerine daha güncel metin stili */
    .field-label {{ display:block; margin:6px 0 6px; color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.4px; }}

    input, select {{
      width:100%; background:#070709; color:#fafafa; border:1px solid var(--border); border-radius:14px;
      padding:10px 12px; outline:none; transition: box-shadow .15s ease, border-color .15s ease, background .15s ease;
      box-shadow: inset 0 0 0 rgba(0,0,0,0);
    }}
    input::placeholder {{ color:#6b7280; }}
    input:focus, select:focus {{
      border-color: rgba(255,0,51,.6); box-shadow: 0 0 0 2px rgba(255,0,51,.25), var(--glow);
      background: #0b0b0e;
    }}
    .row {{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }}

    .btn {{
      appearance:none; border:none; background:linear-gradient(135deg,var(--brand),var(--brand-2));
      color:#fff; padding:10px 14px; border-radius:14px; font-weight:700; cursor:pointer;
      box-shadow: 0 6px 24px rgba(255,0,51,.35), 0 0 12px rgba(255,0,51,.55);
      transition: transform .06s ease, box-shadow .2s ease, filter .2s ease;
      letter-spacing:.3px;
    }}
    .btn:hover {{ transform: translateY(-1px); filter: brightness(1.06); box-shadow: 0 10px 28px rgba(255,0,51,.5), 0 0 16px rgba(255,0,51,.75); }}
    .btn.secondary {{
      background:transparent; color:var(--text); border:1px solid var(--border); box-shadow: var(--glow-soft);
    }}
    .btn.small {{ padding:6px 10px; border-radius:10px; font-size:12px; }}
    .btn:disabled {{ opacity:.6; cursor:not-allowed; }}

    .table-wrap {{ overflow:auto; border:1px solid var(--border); border-radius:14px; box-shadow: var(--glow-soft); }}
    table {{ width:100%; border-collapse:collapse; min-width:560px; }}
    th, td {{ padding:10px 10px; border-bottom:1px solid var(--border); text-align:left; white-space:nowrap; }}
    th {{ color:#c9c9d1; font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:.4px; }}
    td {{ font-size:13px; }}

    .stack {{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }}
    .pill {{
      background:#0d0d11; border:1px solid var(--border); padding:10px 12px; border-radius:12px; font-size:13px;
      box-shadow: inset 0 0 10px rgba(255,0,51,.12);
    }}
    .copy-btn {{ margin-left:8px; position:relative; }}

    .footer {{ margin-top:18px; color:var(--muted); font-size:12px; text-align:center; }}
    .spacer {{ height:8px; }}

    .status-icon {{ font-size:16px; line-height:1; display:inline-block; }}
    .status-issued {{ color:#f59e0b; }}  /* ⏳ */
    .status-used   {{ color:#16a34a; }}  /* ✅ */

    /* Kopyalama tostu */
    .toast {{
      position: fixed; right: 16px; bottom: 16px; background: #111015; color:#fff;
      border:1px solid rgba(255,0,51,.4); padding:10px 12px; border-radius:12px;
      box-shadow: 0 0 12px rgba(255,0,51,.5), inset 0 0 8px rgba(255,0,51,.2);
      opacity:0; transform: translateY(8px); animation: toast-in .2s forwards, toast-out .2s 2.2s forwards;
      z-index: 9999;
    }}
    @keyframes toast-in {{ to {{ opacity:1; transform: translateY(0); }} }}
    @keyframes toast-out {{ to {{ opacity:0; transform: translateY(8px); }} }}

    /* Neon başlık alt-ışıltı */
    h3::after {{
      content:""; display:block; height:1px; margin-top:8px;
      background: linear-gradient(90deg, rgba(255,0,51,.5), rgba(255,0,51,0));
      box-shadow: 0 0 10px rgba(255,0,51,.6);
      opacity:.5;
    }}
  </style>
  <script>
    // Kopyalama geri bildirimi daha belirgin (neon toast + butonda durum)
    function showToast(msg) {{
      const t = document.createElement('div');
      t.className = 'toast';
      t.textContent = msg || 'Kopyalandı';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2600);
    }}
    function copyLastCode() {{
      const input = document.getElementById('last-code');
      const btn = document.getElementById('last-code-btn');
      if (!input) return;
      const val = input.value || '';
      navigator.clipboard.writeText(val).then(() => {{
        const old = btn.textContent;
        btn.textContent = 'Kopyalandı ✓';
        btn.disabled = true;
        btn.style.boxShadow = '0 0 12px rgba(22,163,74,.8), 0 0 24px rgba(22,163,74,.45)';
        showToast('Kod panoya kopyalandı');
        setTimeout(() => {{
          btn.textContent = old;
          btn.disabled = false;
          btn.style.boxShadow = '';
        }}, 1600);
      }});
    }}
  </script>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand"><img src="{logo_url}" alt="logo"></div>
      <div class="nav">__NAV__</div>
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
        ("Ödüller", "/admin/prizes", active == "prizes"),
        ("Adminler", "/admin/users", active == "users" if current.role == AdminRole.super_admin else False),
        ("Çıkış", "/admin/logout", False),
    ]
    items = []
    role_txt = "Süper" if current.role == AdminRole.super_admin else "Admin"
    items.append(f"<span class='nav-user'>Giriş: <b>{current.username}</b> ({role_txt})</span>")
    for title, href, is_active in links:
        if title == "Adminler" and current.role != AdminRole.super_admin:
            continue
        cls = "active" if is_active else ""
        items.append(f"<a class='{cls}' href='{href}'>{title}</a>")
    return " ".join(items)

# ========== Auth ==========
@router.get("/admin/login", response_class=HTMLResponse, response_model=None)
def admin_login_form(request: Request):
    flash_blocks = _render_flash_blocks(request)
    body = f"""
    {flash_blocks}
    <div class="grid">
      <div class="card span-4">
        <h3>Giriş</h3>
        <form method='post' action='/admin/login'>
          <span class="field-label">Kullanıcı adı</span>
          <input name='username' required>
          <div class="spacer"></div>
          <span class="field-label">Şifre</span>
          <input name='password' type='password' required>
          <div class="spacer"></div>
          <button class='btn' type='submit'>Giriş Yap</button>
        </form>
      </div>
    </div>
    """
    html = _layout(body).replace("__NAV__", "")
    return HTMLResponse(html)

@router.post("/admin/login", response_model=None)
async def admin_login(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    form = await request.form()
    username = (form.get("username") or "").strip()
    password = (form.get("password") or "").strip()
    try:
        user = login_with_credentials(db, username, password)
    except HTTPException as e:
        flash(request, e.detail if getattr(e, "detail", None) else "Giriş başarısız.", level="error")
        return RedirectResponse(url="/admin/login", status_code=303)

    login_session(request, user)
    flash(request, f"Hoş geldin, {user.username}!", level="success")
    return RedirectResponse(url="/admin", status_code=303)

@router.get("/admin/logout", response_model=None)
def admin_logout(request: Request):
    logout_session(request)
    flash(request, "Güvenli şekilde çıkış yapıldı.", level="success")
    return RedirectResponse(url="/admin/login", status_code=303)

# ========== Kod Yönetimi (sol form + sağ tablo) ==========
@router.get("/admin", response_class=HTMLResponse, response_model=None)
def admin_home(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    prizes = db.query(Prize).order_by(Prize.wheel_index).all()
    last = db.query(Code).order_by(Code.created_at.desc()).limit(20).all()

    # Son üretilen kod (oturum bazlı)
    last_code = request.session.get("_last_code")

    # Sol: Tek kod formu + son kod kutusu
    html_form_single = [
        "<div class='card span-4'>",
        "<h3>Tek Kod Oluştur</h3>",
        "<form method='post' action='/admin/create-code'>",
        "<span class='field-label'>Kullanıcı adı</span>",
        "<input name='username' placeholder='' required>",
        "<span class='field-label'>Ödül</span>",
        "<select name='prize_id'>",
    ]
    for p in prizes:
        html_form_single.append(f"<option value='{p.id}'>[{p.wheel_index}] {p.label}</option>")
    html_form_single += [
        "</select>",
        "<div class='spacer'></div>",
        "<button class='btn' type='submit'>Oluştur</button>",
        "</form>",
    ]
    # Son kod kutusu (kopyalama geri bildirimi belirgin)
    if last_code:
        html_form_single += [
            "<div class='spacer'></div>",
            "<h3>Oluşturulan Kod</h3>",
            "<div class='stack'>",
            f"<input id='last-code' class='pill' value='{last_code}' readonly>",
            "<button id='last-code-btn' class='btn small copy-btn' type='button' onclick='copyLastCode()'>Kopyala</button>",
            "</div>",
        ]
    html_form_single += ["</div>"]

    # Sağ: Son 20 kod küçük tablo (durum ikonlu)
    def status_icon(s: str) -> str:
        return "<span class='status-icon status-used'>✅</span>" if s == "used" else "<span class='status-icon status-issued'>⏳</span>"

    html_table = [
        "<div class='card span-8'>",
        "<h3>Son 20 Kod</h3>",
        "<div class='table-wrap'>",
        "<table>",
        "<tr><th>Kod</th><th>Kullanıcı</th><th>Ödül</th><th>Durum</th></tr>"
    ]
    for c in last:
        pr = db.get(Prize, c.prize_id)
        html_table.append(
            f"<tr>"
            f"<td><code>{c.code}</code></td>"
            f"<td>{c.username or '-'}</td>"
            f"<td>{pr.label}</td>"
            f"<td>{status_icon(c.status)}</td>"
            f"</tr>"
        )
    html_table += ["</table></div></div>"]

    flash_blocks = _render_flash_blocks(request)
    body = f"""
    {flash_blocks}
    <div class="grid">
      {''.join(html_form_single)}
      {''.join(html_table)}
    </div>
    """
    html = _layout(body).replace("__NAV__", _header_html(current, active="codes"))
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
    code = gen_code()  # her zaman otomatik üret

    db.add(Code(code=code, username=username, prize_id=prize_id, status="issued"))
    db.commit()

    # Son kodu oturuma yaz ki form yanında gösterelim
    request.session["_last_code"] = code

    # İSTEK: "üstteki kod oluşturuldu" bildirimini kaldır -> flash gönderme
    # flash(request, f"Kod oluşturuldu: {code}", level="success")
    return RedirectResponse(url="/admin", status_code=303)

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
        role_txt = "Süper" if u.role == AdminRole.super_admin else "Admin"
        table.append(f"<tr><td>{u.username}</td><td>{role_txt}</td><td>{'aktif' if u.is_active else 'pasif'}</td></tr>")
    table += ["</table></div></div>"]

    form = """
    <div class='card span-12'>
      <h3>Yeni Admin Oluştur</h3>
      <form method='post' action='/admin/users/create'>
        <div class='row'>
          <div>
            <span class='field-label'>Kullanıcı adı</span>
            <input name='username' required>
          </div>
          <div>
            <span class='field-label'>Rol</span>
            <select name='role'>
              <option value='admin'>admin</option>
              <option value='super_admin'>super_admin</option>
            </select>
          </div>
        </div>
        <span class='field-label'>Şifre</span>
        <input name='password' type='password' required>
        <div class='spacer'></div>
        <button class='btn' type='submit'>Oluştur</button>
      </form>
    </div>
    """

    flash_blocks = _render_flash_blocks(request)
    body = f"{flash_blocks}<div class='grid'>{''.join(table)}{form}</div>"
    html = _layout(body).replace("__NAV__", _header_html(current, active="users"))
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
        flash(request, "Kullanıcı adı ve şifre zorunludur.", level="error")
        return RedirectResponse(url="/admin/users", status_code=303)
    if db.query(AdminUser).filter(AdminUser.username == username).first():
        flash(request, "Bu kullanıcı adı zaten mevcut.", level="error")
        return RedirectResponse(url="/admin/users", status_code=303)
    if role not in ("admin", "super_admin"):
        flash(request, "Geçersiz rol.", level="error")
        return RedirectResponse(url="/admin/users", status_code=303)

    db.add(AdminUser(
        username=username,
        role=AdminRole(role),
        password_hash=hash_password(password),
        is_active=True,
    ))
    db.commit()
    flash(request, f"Admin oluşturuldu: {username}", level="success")
    return RedirectResponse(url="/admin/users", status_code=303)

# ========== ÖDÜLLER ==========
@router.get("/admin/prizes", response_class=HTMLResponse, response_model=None)
def prizes_page(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    prizes = db.query(Prize).order_by(Prize.wheel_index).all()
    edit_id = request.query_params.get("edit")
    editing = None
    if edit_id:
        editing = db.get(Prize, int(edit_id))

    rows = [
        "<div class='card span-12'>",
        "<h3>Ödül Dilimleri</h3>",
        "<div class='table-wrap'><table>",
        "<tr><th>Ad</th><th>Sıralama</th><th>Görsel</th><th>İşlem</th></tr>"
    ]
    for p in prizes:
        thumb = f"<img src='{getattr(p, 'image_url', None)}' style='height:24px;border-radius:6px'/>" if getattr(p, "image_url", None) else "-"
        rows.append(
            f"<tr>"
            f"<td>{p.label}</td>"
            f"<td>{p.wheel_index}</td>"
            f"<td>{thumb}</td>"
            f"<td class='stack'>"
            f"<a class='btn small secondary' href='/admin/prizes?edit={p.id}'>Düzenle</a>"
            f"<form method='post' action='/admin/prizes/delete' style='display:inline' onsubmit='return confirm(\"Silinsin mi?\")'>"
            f"<input type='hidden' name='id' value='{p.id}'>"
            f"<button class='btn small secondary' type='submit'>Sil</button>"
            f"</form>"
            f"</td>"
            f"</tr>"
        )
    rows += ["</table></div></div>"]

    # Form (ID input yok; edit varsa hidden input ile)
    eid = editing.id if editing else ""
    elabel = (editing.label if editing else "")
    ewi = (editing.wheel_index if editing else "")
    eurl = (editing.image_url if getattr(editing, "image_url", None) else "")

    form = f"""
    <div class='card span-12'>
      <h3>{'Ödül Düzenle' if editing else 'Yeni Ödül Ekle'}</h3>
      <form method='post' action='/admin/prizes/upsert'>
        {'<input type="hidden" name="id" value="'+str(eid)+'">' if editing else ''}
        <div class='row'>
          <div>
            <span class='field-label'>Sıralama</span>
            <input name='wheel_index' type='number' placeholder='0,1,2...' value='{ewi}' required>
          </div>
          <div>
            <span class='field-label'>Ad</span>
            <input name='label' placeholder='Örn: ₺250' value='{_escape(elabel)}' required>
          </div>
        </div>
        <span class='field-label'>Görsel URL (opsiyonel)</span>
        <input name='image_url' placeholder='https://...' value='{_escape(eurl)}'>
        <div class='spacer'></div>
        <button class='btn' type='submit'>Kaydet</button>
      </form>
    </div>
    """

    # İSTEK: "Wheel index nedir?" açıklamasını tamamen kaldırdık.

    flash_blocks = _render_flash_blocks(request)
    body = f"{flash_blocks}<div class='grid'>{''.join(rows)}{form}</div>"
    html = _layout(body).replace("__NAV__", _header_html(current, active="prizes"))
    return HTMLResponse(html)

@router.post("/admin/prizes/upsert", response_model=None)
async def prizes_upsert(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    form = await request.form()
    _id = (form.get("id") or "").strip()
    label = (form.get("label") or "").strip()
    wheel_index = int(form.get("wheel_index"))
    image_url = (form.get("image_url") or "").strip() or None

    if not label:
        flash(request, "Ad zorunludur.", level="error")
        return RedirectResponse(url="/admin/prizes", status_code=303)

    if _id:
        prize = db.get(Prize, int(_id))
        if not prize:
            flash(request, "Ödül bulunamadı.", level="error")
            return RedirectResponse(url="/admin/prizes", status_code=303)
        prize.label = label
        prize.wheel_index = wheel_index
        prize.image_url = image_url
        db.add(prize)
        msg = f"Ödül güncellendi."
    else:
        db.add(Prize(label=label, wheel_index=wheel_index, image_url=image_url))
        msg = "Yeni ödül eklendi."

    db.commit()
    flash(request, msg, level="success")
    # edit tamamlandıktan sonra edit parametresi olmadan dön
    return RedirectResponse(url="/admin/prizes", status_code=303)

@router.post("/admin/prizes/delete", response_model=None)
async def prizes_delete(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    form = await request.form()
    pid = int(form.get("id"))
    prize = db.get(Prize, pid)
    if not prize:
        flash(request, "Ödül bulunamadı.", level="error")
        return RedirectResponse(url="/admin/prizes", status_code=303)

    # Önce bu ödüle bağlı kodları sil (FK hatasını engeller)
    deleted_count = db.query(Code).filter(Code.prize_id == pid).delete(synchronize_session=False)

    db.delete(prize)
    db.commit()
    msg = f"Ödül silindi. Bağlı {deleted_count} kod temizlendi." if deleted_count else "Ödül silindi."
    flash(request, msg, level="success")
    return RedirectResponse(url="/admin/prizes", status_code=303)
