# SAYFA: Dashboard (Genel Özet)
# URL: /admin
# Not: Kod oluşturma / Ödüller artık /admin/kod-yonetimi altında (iki sekme)

from typing import Annotated
from html import escape as _e
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.db.models import AdminUser, AdminRole, Code, Prize, Tournament, DailyBonus, PromoCode, Event
from app.services.auth import require_role
from app.api.routers.admin_mod.yerlesim import _layout, _render_flash_blocks

router = APIRouter()

def _now():
    return datetime.now(timezone.utc)

@router.get("/admin", response_class=HTMLResponse)
def dashboard(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],  # admin ve super admin erişir
):
    fb = _render_flash_blocks(request)

    # ---- Sayılar (aktif içerikler) ----
    now = _now()
    def active_count(model):
        q = db.query(func.count(model.id)).filter(model.status == "published")
        q = q.filter((model.start_at == None) | (model.start_at <= now))
        q = q.filter((model.end_at == None) | (model.end_at >= now))
        return q.scalar() or 0

    c_tour   = active_count(Tournament)
    c_bonus  = active_count(DailyBonus)
    c_promo  = active_count(PromoCode)
    c_event  = active_count(Event)
    c_codes  = db.query(func.count(Code.code)).scalar() or 0
    c_prize  = db.query(func.count(Prize.id)).scalar() or 0

    # ---- Yakında bitecek içerik (ilk 1) ----
    def next_end(model):
        q = db.query(model).filter(model.status=="published")
        q = q.filter((model.end_at != None) & (model.end_at >= now))
        q = q.order_by(model.end_at.asc())
        return q.first()
    nxt = next_end(Tournament) or next_end(DailyBonus) or next_end(PromoCode) or next_end(Event)
    nxt_html = ""
    if nxt:
        label = getattr(nxt, "title", "İçerik")
        end_at = getattr(nxt, "end_at", None)
        end_txt = end_at.strftime("%d %b %Y %H:%M") if end_at else "-"
        nxt_html = f"<div class='card'><h1>Yakında Biten</h1><div><b>{_e(label)}</b> · {end_txt}</div></div>"

    # ---- Kısayollar ----
    shortcuts = f"""
    <div class='card'>
      <h1>Kısayollar</h1>
      <div class='quick'>
        <a class='q' href='/admin/kod-yonetimi?tab=kodlar'>Kod Oluştur</a>
        <a class='q' href='/admin/kod-yonetimi?tab=oduller'>Ödüller</a>
        <a class='q' href='/admin/content/tournaments'>Turnuva / Bonus</a>
        {"<a class='q' href='/admin/users'>Admin Yönetim</a>" if current.role==AdminRole.super_admin else ""}
      </div>
    </div>
    """

    # ---- Sayaç kartları ----
    stats = f"""
    <div class='grid'>
      <div class='card span-6'><h1>İçerik Özeti</h1>
        <div class='stats'>
          <div class='st'><div class='k'>Turnuva</div><div class='v'>{c_tour}</div></div>
          <div class='st'><div class='k'>Bonus</div><div class='v'>{c_bonus}</div></div>
          <div class='st'><div class='k'>Promo Kod</div><div class='v'>{c_promo}</div></div>
          <div class='st'><div class='k'>Etkinlik</div><div class='v'>{c_event}</div></div>
        </div>
      </div>
      <div class='card span-6'><h1>Sistem Özeti</h1>
        <div class='stats'>
          <div class='st'><div class='k'>Kod Sayısı</div><div class='v'>{c_codes}</div></div>
          <div class='st'><div class='k'>Ödül Sayısı</div><div class='v'>{c_prize}</div></div>
        </div>
      </div>
    </div>
    """

    # ---- Son kodlar (5 adet) ----
    last = db.query(Code).order_by(Code.created_at.desc()).limit(5).all()
    # Neden: N+1 sorguyu önlemek için ödül adlarını toplu çek.
    prize_ids = [c.prize_id for c in last if c.prize_id is not None]
    prize_map = {}
    if prize_ids:
        rows = db.query(Prize.id, Prize.label).filter(Prize.id.in_(prize_ids)).all()
        prize_map = {pid: label for (pid, label) in rows}

    last_html = ["<div class='card'><h1>Son Kodlar</h1><div class='table-wrap'><table>"]
    last_html.append("<tr><th>Kod</th><th>Kullanıcı</th><th>Ödül</th><th>Durum</th></tr>")
    for c in last:
        pr_label = prize_map.get(c.prize_id, "-")
        last_html.append(
            f"<tr><td><code>{_e(c.code)}</code></td>"
            f"<td>{_e(c.username or '-')}</td>"
            f"<td>{_e(pr_label)}</td>"
            f"<td>{'Kullanıldı' if c.status=='used' else 'Verildi'}</td></tr>"
        )
    last_html.append("</table></div></div>")

    # ---- Sayfa gövdesi ----
    body = []
    if fb: body.append(fb)
    body.append(stats)
    if nxt_html: body.append(nxt_html)
    body.append(shortcuts)
    body.append("".join(last_html))

    # ---- Mobil uyumlu minik stiller (yalnız bu sayfa) ----
    page_html = f"""
    <style>
      .stats{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}}
      .st{{background:#141418;border:1px solid #26262c;border-radius:10px;padding:10px;text-align:center}}
      .st .k{{font-size:12px;color:#b3b3bb}}
      .st .v{{font-size:18px;font-weight:800}}
      .quick{{display:flex;gap:8px;flex-wrap:wrap}}
      .q{{display:inline-block;padding:8px 10px;border-radius:10px;border:1px solid #26262c;background:#141418;color:#fff;text-decoration:none}}
      .q:hover{{border-color:rgba(255,0,51,.45)}}
      .grid{{display:grid;grid-template-columns:repeat(12,1fr);gap:10px}}
      .span-6{{grid-column:span 6}}
      @media(max-width:900px){{.stats{{grid-template-columns:repeat(2,1fr)}} .span-6{{grid-column:span 12}}}}
    </style>
    {"".join(body)}
    """

    html = _layout(page_html, title="Dashboard", active="panel", is_super=(current.role==AdminRole.super_admin))
    return HTMLResponse(html)
