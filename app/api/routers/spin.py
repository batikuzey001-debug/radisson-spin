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

# ===================== Dinamik Ödül Listesi =====================
@router.get("/prizes", response_model=List[PrizeOut])
def list_prizes(
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.query(Prize).order_by(Prize.wheel_index).all()
    return [
        PrizeOut(
            id=p.id,
            label=p.label,
            wheelIndex=p.wheel_index,
            imageUrl=getattr(p, "image_url", None),  # kolon varsa döner
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

    # prizeImage alanı VerifyOut şemanda tanımlıysa görünür; değilse response_model filtreler.
    return VerifyOut(
        targetIndex=prize.wheel_index,
        prizeLabel=prize.label,
        spinToken=token,
        prizeImage=getattr(prize, "image_url", None),  # <-- görsel (opsiyonel)
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
        id=token,  # token zaten uuid4
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

# --- PRIZES: frontende ödülleri ve görsel URL'lerini ver ---
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Prize

@router.get("/prizes")
def list_prizes(db: Session = Depends(get_db)):
    items = db.query(Prize).order_by(Prize.wheel_index).all()
    return [
        {
            "id": p.id,
            "label": p.label,
            "wheel_index": p.wheel_index,
            "image_url": p.image_url,   # <— frontend doğrudan <img src>’e koyacak
        }
        for p in items
    ]
