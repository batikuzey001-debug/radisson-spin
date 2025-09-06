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

    # ---- Aktif içerik sayıları (kutu İÇİNDE OLMAYACAK) ----
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

    # ---- Toplam verilen kod ----
    c_codes_total = db.query(func.count(Code.code)).scalar() or 0

    # ---- Benzersiz ziyaretçi: Bugün & Bu Ay (ÖNEMLİ KART) ----
    today_key    = now.strftime("%Y%m%d")
    month_prefix = now.strftime("%Y%m")  # visitors_daily_count_YYYYMM*

    visitors_today = _to_int(_get_conf(db, f"visitors_daily_count_{today_key}", "0"), 0)
    month_rows = db.query(SiteConfig).filter(SiteConfig.key.like(f"visitors_daily_count_{month_prefix}%")).all()
    visitors_month = sum(_to_int(r.value_text or "0", 0) for r in month_rows)

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

    # ---- Görünüm (kutu düzeni sade; aktif içerik ŞERİT halinde) ----
    def fmt(n: int) -> str:
        try:
            return f"{int(n):,}".replace(",", ".")
        except Exception:
            return str(n)

    # Üst satır: Ziyaretçi (büyük) + Toplam Kod (ikincil)
    top_row = f"""
    <div class="kpiGrid">
      <div class="card kpiTile accent span-8">
        <div class="kpiKey">BENZERSİZ ZİYARETÇİ</div>
        <div class="kpiValBig xl">{fmt(visitors_today)}</div>
        <div class="kpiHint">Bugün • Bu Ay: <b>{fmt(visitors_month)}</b></div>
      </div>
      <div class="card kpiTile span-4">
        <div class="kpiKey">TOPLAM VERİLEN KOD</div>
        <div class="kpiValBig">{fmt(c_codes_total)}</div>
      </div>
    </div>
    """

    # Aktif içerik: kutu İÇERİSİNDE DEĞİL; şerit görünümü
    active_strip = f"""
    <div class="statStrip" aria-label="Aktif içerik">
      <div class="sTitle">AKTİF İÇERİK</div>
      <div class="sBadge total"><span>Toplam</span><b>{fmt(c_active_total)}</b></div>
      <div class="sBadge"><span>Turnuva</span><b>{fmt(c_tour)}</b></div>
      <div class="sBadge"><span>Bonus</span><b>{fmt(c_bonus)}</b></div>
      <div class="sBadge"><span>Promo Kod</span><b>{fmt(c_promo)}</b></div>
      <div class="sBadge"><span>Etkinlik</span><b>{fmt(c_event)}</b></div>
    </div>
    """

    parts = []
    if fb: parts.append(fb)
    parts.append(top_row)
    parts.append(active_strip)
    if nxt_html: parts.append(nxt_html)

    style = """
    <style>
      :root{--red:#ff0033;--line:#1c1f28;--muted:#9aa3b7;--text:#f2f4f8;--panel:#0d0f15}
      /* GRID */
      .kpiGrid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
      .span-8{grid-column:span 8}.span-4{grid-column:span 4}
      @media(max-width:1080px){.span-8{grid-column:span 12}.span-4{grid-column:span 12}}

      /* KARTLAR */
      .kpiTile{border:1px solid var(--line);background:var(--panel);padding:14px}
      .kpiTile.accent{border-left:4px solid var(--red)}
      .kpiKey{font-size:12px;letter-spacing:.6px;color:var(--muted)}
      .kpiValBig{margin-top:6px;font-weight:900;font-size:28px;letter-spacing:.2px;color:var(--text)}
      .kpiValBig.xl{font-size:34px}
      .kpiHint{margin-top:4px;color:var(--muted);font-size:12px}

      /* AKTİF İÇERİK ŞERİDİ (kutu yok) */
      .statStrip{
        margin:8px 0 4px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;
        border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:10px 8px;
        background:#0b0d13;
      }
      .statStrip .sTitle{font-size:12px; letter-spacing:.6px; color:var(--muted); margin-right:6px}
      .sBadge{
        display:inline-flex; align-items:baseline; gap:6px; padding:6px 8px;
        border:1px solid var(--line); background:#0e121b; color:#fff;
      }
      .sBadge span{font-size:11px; color:var(--muted)}
      .sBadge b{font-size:16px}
      .sBadge.total{border-color:var(--red)}

      /* YAKINDA BİTEN */
      .kpiCard{border:1px solid var(--line);background:#0b0d13;padding:14px;margin-top:12px}
      .kpiHead{font-size:12px;color:var(--muted);letter-spacing:.6px;margin-bottom:6px}
      .kpiRow{display:flex;align-items:center;justify-content:space-between}
      .kpiLabel{font-weight:800}
      .kpiVal{font-weight:900;color:#fff}

      /* GENEL */
      .card{margin:12px 0}
    </style>
    """

    html = _layout(style + "".join(parts), title="Dashboard", active="panel", is_super=(current.role == AdminRole.super_admin))
    return HTMLResponse(html)
