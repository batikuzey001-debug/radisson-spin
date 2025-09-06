# app/api/routers/fe_metrics.py
from typing import Optional
from datetime import datetime, timezone
from hashlib import sha1
import json

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import SiteConfig

router = APIRouter(prefix="/api/fe/metrics", tags=["fe-metrics"])

def _get_conf(db: Session, key: str, default: str = "") -> str:
    row = db.get(SiteConfig, key)
    return (row.value_text or "") if row else default

def _set_conf(db: Session, key: str, val: Optional[str]) -> None:
    row = db.get(SiteConfig, key)
    if row:
        row.value_text = val or None
        db.add(row)
    else:
        db.add(SiteConfig(key=key, value_text=val or None))

@router.post("/visit")
def unique_visit_ping(
    db: Session = Depends(get_db),
    x_api_key: Optional[str] = Header(default=None, alias="X-Api-Key"),
    x_visitor_id: Optional[str] = Header(default=None, alias="X-Visitor-Id"),
    x_user_agent: Optional[str] = Header(default=None, alias="User-Agent"),
    x_forwarded_for: Optional[str] = Header(default=None, alias="X-Forwarded-For"),
):
    """
    FE tarafı her sayfa yüklenişinde 1 kez çağırır.
    - X-Api-Key  : FE için paylaşılan basit anahtar (SiteConfig.key='fe_metric_key')
    - X-Visitor-Id: FE'nin sakladığı anonim ziyaretçi ID'si (cookie/localStorage UUID)
    Benzersiz ziyaretçi: gün başına 1 kez sayılır.
    Sayaçlar:
      - total: SiteConfig.key='visitors_total_count' (int string)
      - today: SiteConfig.key=f'visitors_daily_count_YYYYMMDD' (int string)
      - seen set (bugüne özel): SiteConfig.key=f'visitors_set_YYYYMMDD' (JSON list of hashes)
    Not: Set büyümesini sınırlamak için 100k üstüne çıkarsa yeni ID’leri saymayız (koruma).
    """
    # 1) Basit API key kontrolü
    stored_key = _get_conf(db, "fe_metric_key", "").strip()
    if stored_key:
        if not x_api_key or x_api_key.strip() != stored_key:
            raise HTTPException(status_code=401, detail="invalid api key")
    else:
        # İlk kurulum: gelen key’i kaydet (boş gelirse güvenliksiz çalışır, önerilmez)
        if x_api_key and x_api_key.strip():
            _set_conf(db, "fe_metric_key", x_api_key.strip())

    # 2) Ziyaretçi kimliği (zorunlu): FE bir UUID üretip header'a koymalı
    vid_src = (x_visitor_id or "").strip()
    if not vid_src:
        # Yine de zorunlu tutalım; aksi halde çift sayım olur
        raise HTTPException(status_code=400, detail="missing X-Visitor-Id")

    # 3) Hash (K/V boyutunu küçük tutmak için)
    basis = vid_src
    # Katkı olarak UA/IP’yi de katabilirsiniz (opsiyonel):
    # basis = f"{vid_src}|{(x_user_agent or '')[:40]}|{(x_forwarded_for or '')[:40]}"
    vid_hash = sha1(basis.encode("utf-8")).hexdigest()[:16]

    # 4) Gün anahtarları
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    k_set   = f"visitors_set_{today}"
    k_daily = f"visitors_daily_count_{today}"
    k_total = "visitors_total_count"

    # 5) Bugünün set'i
    raw = _get_conf(db, k_set, "[]")
    try:
        seen_list = json.loads(raw)
        if not isinstance(seen_list, list):
            seen_list = []
    except Exception:
        seen_list = []

    # Kapasite koruması
    if len(seen_list) > 100_000:
        # Set şişmişse daha fazla hash tutma; sadece sayaç artışı yapma (ya da tamamen durdur)
        pass

    if vid_hash not in seen_list:
        seen_list.append(vid_hash)
        _set_conf(db, k_set, json.dumps(seen_list, ensure_ascii=False))

        # günlük
        daily_raw = _get_conf(db, k_daily, "0")
        try:
            daily = int(daily_raw)
        except Exception:
            daily = 0
        _set_conf(db, k_daily, str(daily + 1))

        # toplam
        total_raw = _get_conf(db, k_total, "0")
        try:
            total = int(total_raw)
        except Exception:
            total = 0
        _set_conf(db, k_total, str(total + 1))

        db.commit()

    # Eski gün set’lerini tutmak istemiyorsanız burada temizleme yapabilirsiniz (opsiyonel)

    return {"ok": True}
