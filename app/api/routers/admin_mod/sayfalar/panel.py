# app/api/routers/admin_mod/sayfalar/panel.py
# SAYFA: Dashboard (Genel Özet) • URL: /admin
from typing import Annotated
from html import escape as _e
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.db.models import (
    AdminUser, AdminRole, Code, Prize,
    Tournament, DailyBonus, PromoCode, Event,
    SiteConfig,  # FE login toplamı için
)
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

    # ---- Sayaçlar (aktif içerikler) ----
    now = _now()
    def active_count(model):
        q = db.query(func.count(model.id)).filter(model.status == "published")
        q = q.filter((model.start_at == None) | (model.start_at <= now))  # noqa: E711
        q = q.filter((model.end_at == None) | (model.end_at >= now))      # noqa: E711
        return q.scalar() or 0

    c_tour   = active_count(Tournament)
    c_bonus  = active_count(DailyBonus)
    c_promo  = active_count(PromoCode)
    c_event  = active_count(Event)
    c_active_total = c_tour + c_bonus + c_promo + c_event

    c_codes_total = db.query(func.count(Code.code)).scalar() or 0
    c_prizes_total = db.query(func.count(Prize.id)).scalar() or 0  # referans/kıyas için

    # ---- FE (Frontend) giriş yapan kullanıcı toplamı (SiteConfig.key='fe_login_total') ----
    fe_login_total = 0
    try:
        row = db.get(SiteConfig, "fe_login_total")
        if row and row.value_text:
            try:
                fe_login_total = max(0, int(str(row.value_text).strip()))
            except Exception:
                fe_login_total = 0
    except Exception:
        fe_login_total = 0

    # ---- Yakında bitecek içerik (tek öğe) ----
    def next_end(model):
        q = db.query(model).filter(model.status=="published")
        q = q.filter((model.end_at != None) & (model.end_at >= now))  # noqa: E711
        q = q.order_by(model.end_at.asc())
        return q.first()
    nxt = next_end(Tournament) or next_end(DailyBonus) or next_end(PromoCode) or next_end(Event)
    nxt_html = ""
    if nxt:
        label = getattr(nxt, "title", "İçerik")
        end_at = getattr(nxt, "end_at", None)
        end_txt = end_at.strftime("%d.%m.%Y %H:%M") if end_at else "-"
        nxt_html = f"""
        <div class="card kpiCard">
          <div class="kpiHead">Yakında Biten</div>
          <div class="kpiRow">
            <div class="kpiLabel">{_e(label)}</div>
            <div class="kpiVal">{_e(end_txt)}</div>
          </div>
        </div>
        """

    # ---- Büyük metrik döşemeleri (köşeli, kırmızı vurgu, sade) ----
    # Not: Kısayollar ve "Son Kodlar" kaldırıldı; sol menü mevcut.
    def fmt(n: int) -> str:
        try:
            return f"{int(n):,}".replace(",", ".")
        except Exception:
            return str(n)

    tiles = f"""
    <div class="kpiGrid">
      <div class="card kpiTile accent">
        <div class="kpiKey">TOPLAM VERİLEN KOD</div>
        <div class="kpiValBig">{fmt(c_codes_total)}</div>
      </div>

      <div class="card kpiTile">
        <div class="kpiKey">AKTİF İÇERİK (TOPLAM)</div>
        <div class="kpiValBig">{fmt(c_active_total)}</div>
        <div class="kpiSplit">
          <div class="sp"><span>Turnuva</span><b>{fmt(c_tour)}</b></div>
          <div class="sp"><span>Bonus</span><b>{fmt(c_bonus)}</b></div>
          <div class="sp"><span>Promo Kod</span><b>{fmt(c_promo)}</b></div>
          <div class="sp"><span>Etkinlik</span><b>{fmt(c_event)}</b></div>
        </div>
      </div>

      <div class="card kpiTile">
        <div class="kpiKey">GİRİŞ YAPAN KULLANICI (FE)</div>
        <div class="kpiValBig">{fmt(fe_login_total)}</div>
        <div class="kpiHint">SiteConfig: <code>fe_login_total</code></div>
      </div>
    </div>
    """

    # ---- Sayfa gövdesi ----
    parts = []
    if fb: parts.append(fb)
    parts.append(tiles)
    if nxt_html: parts.append(nxt_html)

    # ---- Dashboard'a özel küçük stiller ----
    style = """
    <style>
      :root{--red:#ff0033;--red2:#ff263f;--line:#1c1f28;--muted:#9aa3b7;--text:#f2f4f8;--panel:#0d0f15}
      /* KPI grid */
      .kpiGrid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
      .kpiTile{position:relative;border:1px solid var(--line);background:var(--panel);padding:14px;grid-column:span 4}
      .kpiTile.accent{border-left:4px solid var(--red)}
      @media(max-width:1080px){.kpiTile{grid-column:span 6}}
      @media(max-width:680px){.kpiTile{grid-column:span 12}}

      .kpiKey{font-size:12px;letter-spacing:.6px;color:var(--muted)}
      .kpiValBig{margin-top:6px;font-weight:900;font-size:28px;letter-spacing:.2px;color:var(--text)}
      .kpiSplit{margin-top:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
      .kpiSplit .sp{display:flex;flex-direction:column;gap:2px;border:1px solid var(--line);padding:8px;background:#0b0d13}
      .kpiSplit .sp span{font-size:11px;color:var(--muted)}
      .kpiSplit .sp b{font-size:16px;color:#fff}

      /* Yakında Biten */
      .kpiCard{border:1px solid var(--line);background:#0b0d13;padding:14px}
      .kpiHead{font-size:12px;color:var(--muted);letter-spacing:.6px;margin-bottom:6px}
      .kpiRow{display:flex;align-items:center;justify-content:space-between}
      .kpiLabel{font-weight:800}
      .kpiVal{font-weight:900;color:#fff}

      /* Genel card (layout'tan köşeli miras alır) */
      .card{margin:12px 0}
      code{background:#0b0d13;border:1px solid var(--line);padding:1px 6px}
    </style>
    """

    html = _layout(style + "".join(parts), title="Dashboard", active="panel", is_super=(current.role==AdminRole.super_admin))
    return HTMLResponse(html)
