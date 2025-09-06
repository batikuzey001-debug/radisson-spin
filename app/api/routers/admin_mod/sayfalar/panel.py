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
    SiteConfig,
)
from app.services.auth import require_role
from app.api.routers.admin_mod.yerlesim import _layout, _render_flash_blocks

router = APIRouter()

def _now() -> datetime:
    return datetime.now(timezone.utc)

def _get_conf(db: Session, key: str, default: str = "") -> str:
    row = db.get(SiteConfig, key)
    return (row.value_text or "") if row else default

def _to_int(s: str, default: int = 0) -> int:
    try:
        return int((s or "").strip())
    except Exception:
        return default

@router.get("/admin", response_class=HTMLResponse)
def dashboard(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.admin))],
):
    fb = _render_flash_blocks(request)

    # ---- Aktif içerik sayıları ----
    now = _now()
    def active_count(model):
        q = db.query(func.count(model.id)).filter(model.status == "published")
        q = q.filter((model.start_at == None) | (model.start_at <= now))  # noqa: E711
        q = q.filter((model.end_at == None)   | (model.end_at   >= now))  # noqa: E711
        return q.scalar() or 0

    c_tour   = active_count(Tournament)
    c_bonus  = active_count(DailyBonus)
    c_promo  = active_count(PromoCode)
    c_event  = active_count(Event)
    c_active_total = c_tour + c_bonus + c_promo + c_event

    c_codes_total  = db.query(func.count(Code.code)).scalar() or 0
    # c_prizes_total = db.query(func.count(Prize.id)).scalar() or 0  # gerekirse gösterilir

    # ---- FE login toplamı (opsiyonel) ----
    fe_login_total = _to_int(_get_conf(db, "fe_login_total", "0"), 0)

    # ---- Benzersiz ziyaretçi: bugün ve bu ay ----
    today_key = now.strftime("%Y%m%d")
    month_prefix = now.strftime("%Y%m")  # visitors_daily_count_YYYYMM%

    visitors_today = _to_int(_get_conf(db, f"visitors_daily_count_{today_key}", "0"), 0)

    # Ay toplamı: SiteConfig key like visitors_daily_count_YYYYMM%
    month_rows = db.query(SiteConfig).filter(SiteConfig.key.like(f"visitors_daily_count_{month_prefix}%")).all()
    visitors_month = 0
    for r in month_rows:
        visitors_month += _to_int(r.value_text or "0", 0)

    # ---- Yakında bitecek içerik (tek öğe) ----
    def next_end(model):
        q = db.query(model).filter(model.status == "published")
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

    # ---- Büyük metrik döşemeleri ----
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
        <div class="kpiKey">BENZERSİZ ZİYARETÇİ</div>
        <div class="kpiValBig">{fmt(visitors_today)}</div>
        <div class="kpiHint">Bugün • Bu Ay: <b>{fmt(visitors_month)}</b></div>
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

    # ---- Dashboard'a özel stiller ----
    style = """
    <style>
      :root{--red:#ff0033;--red2:#ff263f;--line:#1c1f28;--muted:#9aa3b7;--text:#f2f4f8;--panel:#0d0f15}
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

      .kpiCard{border:1px solid var(--line);background:#0b0d13;padding:14px}
      .kpiHead{font-size:12px;color:var(--muted);letter-spacing:.6px;margin-bottom:6px}
      .kpiRow{display:flex;align-items:center;justify-content:space-between}
      .kpiLabel{font-weight:800}
      .kpiVal{font-weight:900;color:#fff}

      .card{margin:12px 0}
      code{background:#0b0d13;border:1px solid var(--line);padding:1px 6px}
    </style>
    """

    html = _layout(style + "".join(parts), title="Dashboard", active="panel", is_super=(current.role==AdminRole.super_admin))
    return HTMLResponse(html)
