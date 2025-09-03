# app/api/routers/admin_mod/yerlesim.py
from html import escape as _e
from fastapi import Request

def flash(request: Request, message: str, level: str = "info") -> None:
    message = _e(message)
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

def _header_nav(active: str = "", is_super: bool = False) -> str:
    links = [
        ("Dashboard", "/admin", active == "panel"),
        ("Kod Yönetimi", "/admin/kod-yonetimi", active == "kod"),
        ("Turnuva / Bonus", "/admin/turnuvabonus", active == "tb"),
        ("Ana Sayfa Slider", "/admin/home-banners", active == "home"),  # eklendi
        ("Adminler", "/admin/users", active == "users" if is_super else False),
        ("Çıkış", "/admin/logout", False),
    ]
    items = []
    for title, href, is_active in links:
        if title == "Adminler" and not is_super:
            continue
        cls = "active" if is_active else ""
        items.append(f"<a class='{cls}' href='{href}'>{_e(title)}</a>")
    return " ".join(items)

def _layout(body: str, title: str = "Yönetim", notice: str = "", active: str = "", is_super: bool = False) -> str:
    nav = _header_nav(active, is_super)
    return f"""
<!doctype html><html lang="tr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_e(title)}</title>
<style>
  :root {{
    --bg:#0a0b0f; --bg2:#0f0f14; --card:#111114; --muted:#b3b3bb; --text:#f5f5f5;
    --accent:#ff0033; --accent2:#ff4d6d; --line:#1d1d22;
  }}
  *{{box-sizing:border-box}}
  body{{margin:0;background:linear-gradient(180deg,var(--bg),var(--bg2));color:var(--text);font:14px/1.55 system-ui,Segoe UI,Roboto}}
  .wrap{{max-width:1100px;margin:20px auto;padding:0 16px}}
  .header{{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}}
  .brand{{font-weight:800;letter-spacing:.4px}}
  .nav a{{display:inline-block;margin-left:8px;padding:6px 10px;border-radius:10px;border:1px solid #25252b;color:var(--muted);text-decoration:none}}
  .nav a.active,.nav a:hover{{color:#fff;border-color:rgba(255,0,51,.45);box-shadow:0 0 0 2px rgba(255,0,51,.18)}}
  .card{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0}}
  .grid{{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}}
  @media (max-width:900px) {{ .span-6, .span-12 {{ grid-column: span 12; }} }}
  @media (min-width:901px) {{ .span-6 {{ grid-column: span 6; }} .span-12 {{ grid-column: span 12; }} }}
  input,select{{width:100%;background:#0c0c10;color:#fff;border:1px solid #26262c;border-radius:10px;padding:9px}}
  input:focus,select:focus{{outline:none;border-color:rgba(255,0,51,.45);box-shadow:0 0 0 2px rgba(255,0,51,.20)}}
  .btn{{appearance:none;border:1px solid #26262c;border-radius:10px;background:#141418;color:#fff;padding:8px 12px;cursor:pointer}}
  .btn.primary{{background:linear-gradient(90deg,var(--accent),var(--accent2))}}
  .btn.small{{padding:6px 10px;font-size:12px}}
  .tabs{{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}}
  .tab{{padding:6px 10px;border:1px solid #26262c;border-radius:10px;color:var(--muted);text-decoration:none}}
  .tab.active,.tab:hover{{color:#fff;border-color:rgba(255,0,51,.45)}}
  .notice{{padding:10px 12px;border:1px solid #333;border-radius:10px;margin:10px 0;background:#17171c}}
  .notice.success{{border-color:#1f5131;background:#0f2617}}
  .notice.error{{border-color:#5a1f22;background:#2a1215}}
  .table-wrap{{overflow:auto;border:1px solid var(--line);border-radius:10px}}
  table{{width:100%;border-collapse:collapse;min-width:560px}}
  th,td{{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}}
  th{{font-size:12px;text-transform:uppercase;color:#9aa3b7}}
</style>
</head><body>
  <div class="wrap">
    <div class="header">
      <div class="brand">Yönetim</div>
      <div class="nav">{nav}</div>
    </div>
    {f"<div class='notice'>{_e(notice)}</div>" if notice else ""}
    {body}
  </div>
</body></html>
"""
