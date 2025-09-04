# app/api/routers/spin.py
from datetime import datetime, timezone
from typing import Annotated, List, Optional, Tuple

import secrets
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.models import Code, Prize, Spin, PrizeDistribution
from app.db.session import get_db
from app.schemas.spin import VerifyIn, VerifyOut, CommitIn
from app.schemas.prize import PrizeOut
from app.services.spin import RESERVED, new_token  # RESERVED: dict[code] -> token (mevcut yapı)

# Not: main.py içinde bu router prefix="/api" ile include ediliyor.
router = APIRouter()

# ===================== HATA KODLARI =====================
ERRORS = {
    "E1001": "Geçersiz kod girdiniz.",
    "E1002": "Aynı kod ikinci kez kullanılamaz.",
    "E1003": "Bu kodun süresi dolmuş.",
    "E1004": "Bu seviye için tanımlı dağılım yok.",
    "E1005": "Geçersiz veya süresi dolmuş doğrulama tokenı.",
    "E1006": "Kullanıcı adı ve kodu tekrar kontrol edin.",
}

def raise_err(code: str, http_status: int) -> None:
    msg = ERRORS.get(code, "Beklenmeyen hata.")
    raise HTTPException(status_code=http_status, detail=f"{code}: {msg}")

# -------------------- helpers --------------------
def _abs_url(request: Request, u: Optional[str]) -> Optional[str]:
    if not u:
        return None
    if u.startswith(("data:", "http://", "https://")):
        return u
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return str(request.base_url).rstrip("/") + u
    return "https://" + u

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

# Seçilen ödülü token ile ilişkilendirmek için (RESERVED sadece code->token tutuyor)
# token -> (prize_id, wheel_index)
CHOSEN: dict[str, Tuple[int, int]] = {}

# =========================================================
# 1) PRİZELER: /api/prizes  (eş-dilim çizimi için)
# =========================================================
@router.get("/prizes", response_model=List[PrizeOut])
def list_prizes(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.query(Prize).order_by(Prize.wheel_index).all()
    return [
        PrizeOut(
            id=p.id,
            label=p.label,
            wheelIndex=p.wheel_index,
            imageUrl=_abs_url(request, getattr(p, "image_url", None)),
        )
        for p in rows
    ]

# =========================================================
# 2) DOĞRULAMA + ÖDÜL SEÇİMİ (AĞIRLIKLI): /api/verify-spin
#    - Kod doğrulanır
#    - Manuel ödül varsa doğrudan o atanır
#    - Yoksa ilgili tier için prize_distributions'a göre ağırlıklı seçim yapılır
#    - Token üretilir, FRONT için targetIndex + prizeLabel döner
# =========================================================
@router.post("/verify-spin", response_model=VerifyOut)
def verify_spin(
    payload: VerifyIn,
    db: Annotated[Session, Depends(get_db)],
    request: Request,
):
    code = (payload.code or "").strip()
    username = (payload.username or "").strip()

    row = db.get(Code, code)
    if not row:
        raise_err("E1001", 400)

    if row.status == "used":
        raise_err("E1002", 409)

    if row.expires_at and row.expires_at < _utcnow():
        raise_err("E1003", 410)

    if row.username and row.username.strip() and row.username != username:
        raise_err("E1006", 400)

    # --- ÖDÜL SEÇİMİ ---
    prize: Optional[Prize] = None

    # 1) Manuel ödül (tek seferlik override)
    if getattr(row, "manual_prize_id", None):
        prize = db.get(Prize, row.manual_prize_id)
        # pasif ödül seçilmişse bloke et
        if not prize or getattr(prize, "enabled", True) is False:
            raise_err("E1004", 400)

    # 2) Otomatik dağılım: tier_key'e göre ağırlıklı seçim
    if prize is None:
        tier = (row.tier_key or "").strip()
        if not tier:
            # tier yoksa dağılım yapamayız (legacy kod)
            # eski davranışa düş: prize_id zaten atanmış olabilir
            if row.prize_id:
                prize = db.get(Prize, row.prize_id)
            else:
                raise_err("E1004", 400)
        else:
            # ilgili tier için BP>0 ve enabled ödülleri topla (PrizeDistribution + Prize)
            q = (
                db.query(PrizeDistribution, Prize)
                .join(Prize, Prize.id == PrizeDistribution.prize_id)
                .filter(
                    and_(
                        PrizeDistribution.tier_key == tier,
                        PrizeDistribution.enabled == True,  # noqa
                        Prize.enabled == True,              # noqa
                        PrizeDistribution.weight_bp > 0,
                    )
                )
            )
            items = q.all()
            if not items:
                raise_err("E1004", 400)

            total = sum(int(pd.weight_bp or 0) for pd, _ in items)
            pick = secrets.randbelow(total)  # 0..total-1
            acc = 0
            chosen: Optional[Prize] = None
            for pd, pr in items:
                acc += int(pd.weight_bp or 0)
                if pick < acc:
                    chosen = pr
                    break
            if not chosen:
                # teoride olmamalı; pick/acc uyuşmazlığı
                chosen = items[-1][1]
            prize = chosen

    if not prize:
        raise_err("E1004", 400)

    # Front animasyonu için: seçim token'ına prize/wheel_index bağla
    token = new_token()
    RESERVED[code] = token               # mevcut yapı: code -> token
    CHOSEN[token] = (prize.id, prize.wheel_index)

    return VerifyOut(
        targetIndex=prize.wheel_index,
        prizeLabel=prize.label,
        spinToken=token,
        prizeImage=_abs_url(request, getattr(prize, "image_url", None)),
    )

# =========================================================
# 3) KULLANIMI TAMAMLA (KAYDET): /api/commit-spin
#    - Token doğrulanır
#    - Code.used + prize_id (seçilen) yazılır
#    - spins tablosuna kayıt atılır
# =========================================================
@router.post("/commit-spin", response_model=None)
def commit_spin(
    payload: CommitIn,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    code = (payload.code or "").strip()
    token = (payload.spinToken or "").strip()

    row = db.get(Code, code)
    if not row:
        raise_err("E1001", 400)

    # İdempotent
    if row.status == "used":
        return {"ok": True}

    saved = RESERVED.get(code)
    if not saved or saved != token:
        raise_err("E1005", 400)

    # verify anında seçilmiş ödülü al
    chosen = CHOSEN.get(token)
    if chosen:
        prize_id, _ = chosen
    else:
        # güvenlik için fallback: eski davranış (row.prize_id set edilmişse)
        prize_id = row.prize_id

    if not prize_id:
        # verify doğru çalışmadıysa
        raise_err("E1004", 400)

    # kodu kullanılmış yap ve prize_id'ı kaydet
    row.status = "used"
    row.used_at = _utcnow()
    row.prize_id = prize_id
    db.add(row)

    spin = Spin(
        id=token,  # token uuid4
        code=code,
        username=row.username or "",
        prize_id=prize_id,
        client_ip=request.headers.get("x-forwarded-for") or (request.client.host if request.client else None),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(spin)
    db.commit()

    # bellekten temizle
    RESERVED.pop(code, None)
    CHOSEN.pop(token, None)
    return {"ok": True}

# =========================================================
# 4) UYUMLULUK KISAYOLLARI (opsiyonel): /api/spin/prizes, /api/spin/redeem
# =========================================================
@router.get("/spin/prizes", response_model=List[PrizeOut])
def list_prizes_alias(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    return list_prizes(request, db)

class RedeemIn(VerifyIn):
    pass

@router.post("/spin/redeem")
def redeem_one_step(
    payload: RedeemIn,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    # 1) verify
    try:
        vo = verify_spin(payload, db, request)
    except HTTPException as e:
        return {"status": str(e.detail)}

    # 2) commit
    try:
        commit_spin(CommitIn(code=payload.code, spinToken=vo.spinToken), request, db)
    except HTTPException as e:
        return {"status": str(e.detail)}

    return {"status": "Tebrikler!", "prize": vo.prizeLabel}
