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
    AdminUser, AdminRole, Code,
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

    now = _now()

    # ---- Aktif içerik sayıları (BÜYÜK panel) ----
    def active_count(model):
        q = db.query(func.count(model.id)).filter(model.status == "published")
        q = q.filter((model.start_at == None) | (model.start_at <= now))  # noqa: E711
        q = q.filter((model.end_at == None)   | (model.end_at   >= now))  # noqa: E711
        return q.scalar() or 0

    c_tour  = active_count(Tournament)
    c_bonus = active_count(DailyBonus)
    c_promo = active_count(PromoCode)
    c_event = active_count(Event)
    c_active_total = c_tour + c_bonus + c_promo + c_event

    # ---- Toplam verilen kod (büyük kutu) ----
    c_codes_total = db.query(func.count(Code.code)).scalar() or 0

    # ---- Benzersiz ziyaretçi: Bugün & Bu Ay (büyük kutu) ----
    today_key    = now.strftime("%Y%m%d")
    month_prefix = now.strftime("%Y%m")
    visitors_today = _to_int(_get_conf(db, f"visitors_daily_count_{today_key}", "0"), 0)
    month_rows = db.query(SiteConfig).filter(SiteConfig.key.like(f"visitors_daily_count_{month_prefix}%")).all()
    visitors_month = sum(_to_int(r.value_text or "0", 0) for r in month_rows)

    # ---- Yakında bitecek içerik (tek kart) ----
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
        <div class="card upcomingCard">
          <div class="upHead">Yakında Biten</div>
          <div class="upRow">
            <div class="upLabel">{_e(label)}</div>
            <div class="upVal">{_e(end_txt)}</div>
          </div>
        </div>
        """

    # ---- Sayılar formatı ----
    def fmt(n: int) -> str:
        try:
            return f"{int(n):,}".replace(",", ".")
        except Exception:
            return str(n)

    # ----- DÜZEN: Solda büyük “Aktif İçerik” paneli, sağda 2 büyük KPI -----
    # Sol panel geniş, okunabilir ve profesyonel tipografiyle.
    active_panel = f"""
    <section class="activePanel card">
      <div class="apTop">
        <div class="apTitle">AKTİF İÇERİK</div>
        <div class="apTotal">
          <div class="apTotalKey">TOPLAM</div>
          <div class="apTotalVal">{fmt(c_active_total)}</div>
        </div>
      </div>
      <div class="apGrid">
        <div class="apBox">
          <div class="k">{_e("Turnuva")}</div>
          <div class="v">{fmt(c_tour)}</div>
        </div>
        <div class="apBox">
          <div class="k">{_e("Bonus")}</div>
          <div class="v">{fmt(c_bonus)}</div>
        </div>
        <div class="apBox">
          <div class="k">{_e("Promo Kod")}</div>
          <div class="v">{fmt(c_promo)}</div>
        </div>
        <div class="apBox">
          <div class="k">{_e("Etkinlik")}</div>
          <div class="v">{fmt(c_event)}</div>
        </div>
      </div>
    </section>
    """

    visitors_panel = f"""
    <section class="kpiBig card">
      <div class="kpiTitle">BENZERSİZ ZİYARETÇİ</div>
      <div class="kpiValue">{fmt(visitors_today)}</div>
      <div class="kpiSub">Bugün</div>
      <div class="kpiSplitRow">
        <div class="kpiMini">
          <span>Bu Ay</span>
          <b>{fmt(visitors_month)}</b>
        </div>
      </div>
    </section>
    """

    codes_panel = f"""
    <section class="kpiBig card">
      <div class="kpiTitle">TOPLAM VERİLEN KOD</div>
      <div class="kpiValue">{fmt(c_codes_total)}</div>
      <div class="kpiSub">&nbsp;</div>
    </section>
    """

    # Kompozisyon
    layout = f"""
    <div class="dashGrid">
      <div class="colLeft">
        {active_panel}
      </div>
      <div class="colRight">
        {visitors_panel}
        {codes_panel}
      </div>
    </div>
    {nxt_html}
    """

    style = """
    <style>
      :root{
        --red:#ff0033; --line:#1c1f28; --muted:#a3aec2; --text:#f2f4f8; --panel:#0d0f15; --panel2:#0b0d13;
      }

      /* Ana grid: solda büyük panel, sağda iki büyük kutu */
      .dashGrid{
        display:grid; grid-template-columns: 2fr 1fr; gap:16px;
      }
      @media(max-width:1100px){ .dashGrid{ grid-template-columns:1fr; } .colRight{ display:grid; grid-template-columns:1fr 1fr; gap:16px } }
      @media(max-width:680px){ .colRight{ grid-template-columns:1fr } }

      /* Kartlar */
      .card{ border:1px solid var(--line); background:var(--panel); padding:22px }

      /* --- AKTİF PANEL --- */
      .activePanel{ background:linear-gradient(180deg,var(--panel),var(--panel2)); }
      .apTop{ display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:14px; }
      .apTitle{ font-size:18px; font-weight:900; letter-spacing:.6px; color:#fff }
      .apTotal{ text-align:right }
      .apTotalKey{ font-size:12px; color:var(--muted); letter-spacing:.6px }
      .apTotalVal{ font-size:42px; font-weight:900; color:#fff; letter-spacing:.5px }

      .apGrid{ display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:14px; }
      @media(max-width:900px){ .apGrid{ grid-template-columns:repeat(2, minmax(0,1fr)); } }
      .apBox{ border:1px solid var(--line); background:#0e121b; padding:16px }
      .apBox .k{ font-size:13px; color:var(--muted); margin-bottom:6px; letter-spacing:.4px }
      .apBox .v{ font-size:28px; font-weight:900; color:#fff; }

      /* --- KPI BÜYÜK --- */
      .kpiBig{ display:flex; flex-direction:column; gap:6px; background:linear-gradient(180deg,var(--panel),#101422); }
      .kpiTitle{ font-size:14px; letter-spacing:.6px; color:var(--muted) }
      .kpiValue{ font-size:40px; font-weight:900; letter-spacing:.6px; color:#fff }
      .kpiSub{ font-size:13px; color:#cfd8ea }
      .kpiSplitRow{ display:flex; gap:12px; margin-top:6px }
      .kpiMini{ border:1px solid var(--line); background:#0e121b; padding:10px 12px; display:flex; align-items:baseline; gap:8px }
      .kpiMini span{ font-size:12px; color:var(--muted) }
      .kpiMini b{ font-size:18px; color:#fff }

      /* --- YAKINDA BİTEN --- */
      .upcomingCard{ margin-top:16px; background:#0b0d13; }
      .upHead{ font-size:14px; letter-spacing:.6px; color:var(--muted); margin-bottom:8px }
      .upRow{ display:flex; justify-content:space-between; align-items:center }
      .upLabel{ font-size:16px; font-weight:800; color:#fff }
      .upVal{ font-size:18px; font-weight:900; color:#fff }
    </style>
    """

    html = _layout(style + (fb or "") + layout, title="Dashboard", active="panel", is_super=(current.role == AdminRole.super_admin))
    return HTMLResponse(html)
