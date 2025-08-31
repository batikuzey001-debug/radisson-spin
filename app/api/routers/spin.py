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

# -------------------- helpers --------------------
def _abs_url(request: Request, u: str | None) -> str | None:
    """
    imageUrl'ı mutlak hale getirir:
    - data:, http:, https: -> olduğu gibi
    - //cdn... -> https: + //
    - /api/media/... veya /static/... -> base_url + yol
    - çıplak değer -> https:// + değer
    """
    if not u:
        return None
    if u.startswith("data:") or u.startswith("http://") or u.startswith("https://"):
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
            wheelIndex=p.wheel_index,                # camelCase
            imageUrl=_abs_url(request, getattr(p, "image_url", None)),  # camelCase + mutlak
        )
        for p in rows
    ]


# ===================== Verify =====================
@router.post("/verify-spin", response_model=VerifyOut)
def verify_spin(
    payload: VerifyIn,
    db: Annotated[Session, Depends(get_db)],
):
    code = payload.code.strip()
    username = payload.username.strip()

    row = db.get(Code, code)
    if not row:
        raise HTTPException(status_code=400, detail="Geçersiz kod girdiniz.")
    if row.status == "used":
        raise HTTPException(status_code=409, detail="Bu kod daha önce kullanılmış.")
    if row.expires_at and row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Bu kodun süresi dolmuş.")
    if row.username and row.username != username:
        raise HTTPException(status_code=403, detail="Kod farklı bir kullanıcıya ait.")

    prize = db.get(Prize, row.prize_id)
    token = new_token()
    RESERVED[code] = token

    return VerifyOut(
        targetIndex=prize.wheel_index,
        prizeLabel=prize.label,
        spinToken=token,
        prizeImage=getattr(prize, "image_url", None),  # şema izin veriyorsa görünecek
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
        raise HTTPException(status_code=400, detail="Geçersiz kod girdiniz.")
    if row.status == "used":
        return {"ok": True}  # idempotent

    saved = RESERVED.get(code)
    if not saved or saved != token:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş doğrulama tokenı.")

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
