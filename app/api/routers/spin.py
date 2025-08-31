from datetime import datetime, timezone
from typing import Annotated, List

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session

from app.db.models import Code, Prize, Spin
from app.db.session import get_db
from app.schemas.spin import VerifyIn, VerifyOut, CommitIn
from app.schemas.prize import PrizeOut
from app.services.spin import RESERVED, new_token

router = APIRouter()

# ===================== HATA KODLARI =====================
ERRORS = {
    "E1001": "Geçersiz kod girdiniz.",                   # 400
    "E1002": "Aynı kod ikinci kez kullanılamaz.",        # 409
    "E1003": "Bu kodun süresi dolmuş.",                  # 410
    "E1005": "Geçersiz veya süresi dolmuş doğrulama tokenı.",  # 400
    "E1006": "Kullanıcı adı ve kodu tekrar kontrol edin.",     # 400 (genel uyarı)
}

def raise_err(code: str, http_status: int) -> None:
    msg = ERRORS.get(code, "Beklenmeyen hata.")
    raise HTTPException(status_code=http_status, detail=f"{code}: {msg}")

# -------------------- helpers --------------------
def _abs_url(request: Request, u: str | None) -> str | None:
    """
    imageUrl'ı mutlak hale getirir:
    - data:, http:, https: -> olduğu gibi
    - //cdn... -> https: + //
    - /... -> base_url + yol
    - çıplak değer -> https:// + değer
    """
    if not u:
        return None
    if u.startswith(("data:", "http://", "https://")):
        return u
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return str(request.base_url).rstrip("/") + u
    return "https://" + u


# ===================== Dinamik Ödül Listesi =====================
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


# ===================== Verify =====================
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
        raise_err("E1001", 400)  # Geçersiz kod

    if row.status == "used":
        raise_err("E1002", 409)  # Aynı kod ikinci kez kullanılamaz

    if row.expires_at and row.expires_at < datetime.now(timezone.utc):
        raise_err("E1003", 410)  # Süresi dolmuş

    # Kullanıcı adı uyuşmazlığı -> genel uyarı (hangi alanın yanlış olduğunu açık etmez)
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


# ===================== Commit =====================
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
        raise_err("E1001", 400)  # Geçersiz kod

    # İdempotent: zaten kullanıldıysa ok döndür.
    if row.status == "used":
        return {"ok": True}

    saved = RESERVED.get(code)
    if not saved or saved != token:
        raise_err("E1005", 400)  # Token problemi

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
