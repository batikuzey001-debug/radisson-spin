# app/api/routers/admin_mod/yerlesim.py
from html import escape as _e
from fastapi import Request

# ---------------- Flash API (değişmeden) ----------------
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

# ---------------- Logo URL (SiteConfig'ten oku) ----------------
def _resolve_logo_url_from_db() -> str | None:
    """
    Logo URL'ünü CMS/SiteConfig tablosundan okur (key='logo_url').
    Yerel değişken istemiyoruz; tek merkez: CMS.
    """
    try:
        from app.db.session import get_db
        from app.db.models import SiteConfig
        gen = get_db()              # dependency generator
        db = next(gen)              # Session
        try:
            row = db.get(SiteConfig, "logo_url")
            url = (row.value_text or "").strip() if row else ""
        finally:
            # generator'ı kapat ki db.close() çalışsın
            try:
                gen.close()
            except Exception:
                pass
        return url or None
    except Exception:
        return None

# --------------- Menü (sol sidebar) ---------------------
def _sidebar_links(active: str = "", is_super: bool = False) -> str:
    # active: "panel" | "kod" | "tb" | "home" | "users"
    items = [
        ("panel", "Dashboard",       "/admin"),
        ("kod",   "Kod Yönetimi",    "/admin/kod-yonetimi"),
        ("tb",    "Turnuva / Bonus", "/admin/turnuvabonus"),
        ("home",  "CMS (Bannerlar)", "/admin/home-banners"),
    ]
    if is_super:
        items.append(("users", "Adminler", "/admin/users"))
    # Çıkış butonu artık sadece header'da

    out = ["<nav class='sideNav' role='navigation' aria-label='Admin menü'>"]
    for key, label, href in items:
        cls = "item active" if key == active else "item"
        out.append(f"<a class='{cls}' href='{href}'><span class='txt'>{_e(label)}</span></a>")
    out.append("</nav>")
    return "".join(out)

# --------------- Kabuğu üret -----------------------------
def _layout(body: str, title: str = "Yönetim", notice: str = "", active: str = "", is_super: bool = False) -> str:
    sidebar = _sidebar_links(active, is_super)
    logo_url = _resolve_logo_url_from_db()
    # Logo varsa göster; yoksa "YÖNETİM" yaz
    brand_html = (
        f"<a href='/admin' class='brandLink'><img src='{_e(logo_url)}' alt='Logo' class='brandLogo'></a>"
        if logo_url else
        "YÖNETİM"
    )

    return f"""<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_e(title)}</title>
<style>
/* ================== Tema (köşeli siyah-kırmızı) ================== */
:root {{
  --bg:#0a0b0f; --panel:#0d0f15; --panel2:#0b0d13; --line:#1c1f28;
  --text:#f2f4f8; --muted:#9aa3b7; --red:#ff0033; --red2:#ff263f; --redh:#ff334f;
}}
*{{box-sizing:border-box}}
html,body{{height:100%}}
body{{margin:0;background:
  linear-gradient(180deg,var(--bg),#090a10 50%, var(--bg));
  color:var(--text);font:14px/1.55 system-ui,Segoe UI,Roboto,Arial,sans-serif}}

/* Köşeler tamamen sıfır */
:where(.btn, .card, input, select, textarea, .item, .notice, .table-wrap, .header, .sideNav, .searchBar){{border-radius:0}}

/* ============ Uygulama ızgarası ============ */
.appShell{{display:grid;grid-template-columns:260px 1fr;min-height:100vh}}
@media(max-width:980px){{.appShell{{grid-template-columns:56px 1fr}}}}
@media(max-width:720px){{.appShell{{grid-template-columns:1fr}}}}

.sidebar{{background:var(--panel);border-right:1px solid var(--line);position:sticky;top:0;height:100vh;display:flex;flex-direction:column}}
.brandBar{{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);background:var(--panel2)}}
.brand{{padding:12px 14px;color:#fff;border-right:1px solid var(--line);display:flex;align-items:center}}
.brandLink{{display:inline-flex;align-items:center;text-decoration:none}}
.brandLogo{{height:28px;display:block;filter:drop-shadow(0 0 6px rgba(255,255,255,.12))}}
.toggleBtn{{display:none}}
@media(max-width:720px){{
  .brand{{padding:12px}}
  .toggleBtn{{display:inline-block;margin-right:8px;padding:8px 10px;border:1px solid var(--line);background:transparent;color:var(--text);cursor:pointer}}
}}

.sideNav{{display:flex;flex-direction:column;gap:0;padding:6px 0}}
.sideNav .item{{display:flex;align-items:center;gap:10px;padding:12px 16px;color:var(--muted);text-decoration:none;border-left:3px solid transparent;border-bottom:1px solid var(--line)}}
.sideNav .item:hover{{color:#fff;background:rgba(255,0,51,.05);border-left-color:rgba(255,0,51,.35)}}
.sideNav .item.active{{color:#fff;background:#0f121b;border-left-color:var(--red)}}
.sideNav .item .txt{{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
@media(max-width:980px){{ .sideNav .item .txt{{display:none}} .sideNav .item{{justify-content:center;padding:12px}} }}

.main{{display:flex;flex-direction:column;min-width:0}}
.header{{display:flex;align-items:center;justify-content:space-between;background:var(--panel);border-bottom:1px solid var(--line)}}
.header .left{{display:flex;align-items:center;gap:12px;padding:10px 14px}}
.header .title{{font-weight:800;letter-spacing:.3px}}
.header .right{{display:flex;align-items:center;gap:8px;padding:10px 14px}}
.header .logout{{padding:8px 12px;border:1px solid var(--line);background:linear-gradient(90deg,var(--red),var(--red2));color:#fff;text-decoration:none}}
.header .logout:hover{{filter:brightness(1.07)}}

.container{{padding:16px;max-width:1400px;margin:0 auto}}
.notice{{padding:10px 12px;border:1px solid var(--line);background:#14171f;margin:12px 0}}
.notice.success{{border-color:#275a34;background:#0f2417}}
.notice.error{{border-color:#5a1f22;background:#2a1215}}
.notice.warn{{border-color:#5a4a1f;background:#2a2415}}

/* Kart, tablo, form genel */
.card{{background:var(--panel);border:1px solid var(--line);padding:14px;margin:12px 0}}
h1{{font-size:16px;margin:0 0 10px;letter-spacing:.2px}}
.grid{{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}}
.span-6{{grid-column:span 6}} .span-12{{grid-column:span 12}}
@media(max-width:900px){{.span-6{{grid-column:span 12}}}}

.table-wrap{{overflow:auto;border:1px solid var(--line)}}
table{{width:100%;border-collapse:collapse;min-width:720px}}
th,td{{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}}
th{{font-size:12px;text-transform:uppercase;color:#aeb7c6}}

input,select,textarea{{width:100%;background:#0b0d13;color:#fff;border:1px solid #26262c;padding:9px}}
input:focus,select:focus,textarea:focus{{outline:none;border-color:var(--red);box-shadow:0 0 0 2px rgba(255,0,51,.20)}}
textarea{{min-height:64px;resize:vertical}}
.cb{{display:inline-flex;align-items:center;gap:8px}}

.btn{{appearance:none;border:1px solid #26262c;background:#151824;color:#fff;padding:8px 12px;text-decoration:none;cursor:pointer}}
.btn.small{{font-size:12px;padding:6px 8px}}
.btn.primary{{background:linear-gradient(90deg,var(--red),var(--red2));border-color:#2a0e15}}
.btn.ghost{{background:transparent;color:var(--muted)}}
.btn.danger{{background:#2a0c14;border-color:#501926}}
.btn.neon{{background:#1a0f14;border-color:#38131c}}
.btn.neon:hover{{background:var(--redh)}}

/* Mobil sidebar aç/kapa */
@media(max-width:720px){{
  .sidebar{{position:fixed;z-index:40;inset:0 40% 0 0;transform:translateX(-100%);transition:transform .2s ease}}
  .sidebar.open{{transform:translateX(0)}}
  .main{{min-height:100vh}}
}}
</style>
<script>
  // Mobil sidebar toggle (state localStorage'a yazılır)
  function __sb_toggle(){{
    var sb=document.getElementById('sidebar'); if(!sb) return;
    sb.classList.toggle('open');
    try{{ localStorage.setItem('sb_open', sb.classList.contains('open')?'1':'0'); }}catch(e){{}}
  }}
  (function(){{
    try{{
      var sb=document.getElementById('sidebar');
      var st=localStorage.getItem('sb_open');
      if(sb && window.matchMedia('(max-width: 720px)').matches && st==='1') sb.classList.add('open');
    }}catch(e){{}}
  }})();
</script>
</head>
<body>
  <div class="appShell">
    <aside id="sidebar" class="sidebar">
      <div class="brandBar">
        <div class="brand">{brand_html}</div>
        <button class="toggleBtn" type="button" onclick="__sb_toggle()">MENÜ</button>
      </div>
      {sidebar}
    </aside>

    <div class="main">
      <div class="header">
        <div class="left">
          <div class="title">{_e(title)}</div>
        </div>
        <div class="right">
          <a class="logout" href="/admin/logout" title="Çıkış">Çıkış</a>
        </div>
      </div>

      <div class="container">
        {f"<div class='notice'>{_e(notice)}</div>" if notice else ""}
        {body}
      </div>
    </div>
  </div>
</body>
</html>"""
