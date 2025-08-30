from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session

from app.db.models import Code, Prize, Spin
from app.db.session import get_db
from app.schemas.spin import VerifyIn, VerifyOut, CommitIn
from app.services.spin import RESERVED, new_token

router = APIRouter()

@router.post("/verify-spin", response_model=VerifyOut)
def verify_spin(payload: VerifyIn, db: Session = Depends(get_db)):
    code = payload.code.strip()
    username = payload.username.strip()

    row = db.get(Code, code)
    if not row:
        raise HTTPException(status_code=400, detail="invalid")
    if row.status == "used":
        raise HTTPException(status_code=409, detail="already_used")
    if row.expires_at and row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="expired")
    if row.username and row.username != username:
        raise HTTPException(status_code=403, detail="username_mismatch")

    prize = db.get(Prize, row.prize_id)
    token = new_token()
    RESERVED[code] = token

    return VerifyOut(
        targetIndex=prize.wheel_index,
        prizeLabel=prize.label,
        spinToken=token,
    )

@router.post("/commit-spin")
def commit_spin(payload: CommitIn, request: Request, db: Session = Depends(get_db)):
    code = payload.code.strip()
    token = payload.spinToken.strip()

    row = db.get(Code, code)
    if not row:
        raise HTTPException(status_code=400, detail="invalid")
    if row.status == "used":
        return {"ok": True}  # idempotent

    saved = RESERVED.get(code)
    if not saved or saved != token:
        raise HTTPException(status_code=400, detail="invalid_or_stale_token")

    row.status = "used"
    db.add(row)

    spin = Spin(
        id=token,  # ya da str(uuid4()) ama token zaten uuid4
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
