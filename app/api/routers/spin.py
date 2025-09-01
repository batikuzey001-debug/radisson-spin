# app/api/routers/spin.py
from datetime import datetime, timezone
from typing import Annotated, List, Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session

from app.db.models import Code, Prize, Spin
from app.db.session import get_db
from app.schemas.spin import VerifyIn, VerifyOut, CommitIn
from app.schemas.prize import PrizeOut
from app.services.spin import RESERVED, new_token

# Not: main.py içinde bu router zaten prefix="/api" ile include ediliyor.
router = APIRouter()

# ===================== HATA KODLARI =====================
ERRORS = {
    "E1001": "Geçersiz kod girdiniz.",
    "E1002": "Aynı kod ikinci kez kullanılamaz.",
    "E1003": "Bu kodun süresi dolmuş.",
    "E1005": "Geçersiz veya süresi dolmuş doğrulama tokenı.",
    "E1006": "Kullanıcı adı ve kodu tekrar kontrol edin.",
}

def raise_err(code: str, http_status: int) -> None:
    # Neden: Tutarlı hata sözlüğü tek noktadan
    msg = ERRORS.get(code, "Beklenmeyen hata.")
    raise HTTPException(status_code=http_status, detail=f"{code}: {msg}")

# -------------------- helpers --------------------
def _abs_url(request: Request, u: Optional[str]) -> Optional[str]:
    """imageUrl'ı mutlak hale getirir; front için rahat tüketim."""
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

# =========================================================
# 1) VAR OLAN UÇLAR (DEĞİŞMEDİ)  -> /api/prizes, /api/verify-spin, /api/commit-spin
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


@router.post("/verify-spin", response_model=VerifyOut)
def verify_spin(
    payload: VerifyIn,
    db: Annotated[Session, Depends(get_db)],
    request: Request,
):
    code = payload.code.strip()
    username = payload.username.strip()

    row = db.get(Code, code)
    if not row:
        raise_err("E1001", 400)

    if row.status == "used":
        raise_err("E1002", 409)

    if row.expires_at and row.expires_at < _utcnow():
        raise_err("E1003", 410)

    if row.username and row.username.strip() and row.username != username:
        raise_err("E1006", 400)

    prize = db.get(Prize, row.prize_id)
    token = new_token()
    RESERVED[code] = token

    return VerifyOut(
        targetIndex=prize.wheel_index,
        prizeLabel=prize.label,
        spinToken=token,
        prizeImage=_abs_url(request, getattr(prize, "image_url", None)),
    )


@router.post("/commit-spin", response_model=None)
def commit_spin(
    payload: CommitIn,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    code = payload.code.strip()
    token = payload.spinToken.strip()

    row = db.get(Code, code)
    if not row:
        raise_err("E1001", 400)

    # İdempotent
    if row.status == "used":
        return {"ok": True}

    saved = RESERVED.get(code)
    if not saved or saved != token:
        raise_err("E1005", 400)

    row.status = "used"
    db.add(row)

    spin = Spin(
        id=token,  # token uuid4
        code=code,
        username=row.username or "",
        prize_id=row.prize_id,
        client_ip=request.headers.get("x-forwarded-for") or request.client.host,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(spin)
    db.commit()

    RESERVED.pop(code, None)
    return {"ok": True}

# =========================================================
# 2) UYUMLULUK KATMANI (FRONTEND İÇİN YENİ KISA YOLLAR)
#    Bu sayede /api/spin/prizes ve /api/spin/redeem çalışır.
#    Mevcut akışı bozmaz; sadece alias sağlar.
# =========================================================

# GET /api/spin/prizes  -> list_prizes ile aynı veriyi döndürür
@router.get("/spin/prizes", response_model=List[PrizeOut])
def list_prizes_alias(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    return list_prizes(request, db)

# POST /api/spin/redeem  -> verify + commit tek adım (frontend'in basit akışı için)
class RedeemIn(VerifyIn):
    pass

@router.post("/spin/redeem")
def redeem_one_step(
    payload: RedeemIn,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Frontend basit kullanım için: code(+username) alır, doğrular ve tek adımda kullanır.
    Yanıt: {"status": "...", "prize": "<etiket>"}  (UI happy-path ile uyumlu)
    """
    # --- verify-like kontroller ---
    code = payload.code.strip()
    username = payload.username.strip()

    row = db.get(Code, code)
    if not row:
        return {"status": ERRORS["E1001"]}

    if row.status == "used":
        return {"status": ERRORS["E1002"]}

    if row.expires_at and row.expires_at < _utcnow():
        return {"status": ERRORS["E1003"]}

    if row.username and row.username.strip() and row.username != username:
        return {"status": ERRORS["E1006"]}

    prize = db.get(Prize, row.prize_id)
    prize_label = prize.label if prize else ""

    # --- commit-like kayıt ---
    if row.status != "used":
        row.status = "used"
        db.add(row)

        spin = Spin(
            id=new_token(),  # tek adım kullanımlarda da benzersiz id
            code=code,
            username=row.username or username or "",
            prize_id=row.prize_id,
            client_ip=request.headers.get("x-forwarded-for") or request.client.host,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(spin)
        db.commit()

    return {"status": "Tebrikler!", "prize": prize_label}
