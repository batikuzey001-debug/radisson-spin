from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from uuid import uuid4
from typing import Dict

app = FastAPI()

# ---- Geçici veri (DB yerine) ----
PRIZES = {
    0: {"label": "₺100"},
    1: {"label": "₺250"},
    2: {"label": "₺500"},
    3: {"label": "₺1000"},
}
# code -> {username(optional), prize_index, status}
CODES: Dict[str, Dict] = {
    "ABC123": {"username": "yasin", "prize_index": 3, "status": "issued"},
    "TEST500": {"username": None,   "prize_index": 2, "status": "issued"},
}
# commit için rezerve token tutar: code -> token
RESERVED: Dict[str, str] = {}
# basit log
SPINS = []

class VerifyIn(BaseModel):
    username: str
    code: str

class VerifyOut(BaseModel):
    ok: bool = True
    targetIndex: int
    prizeLabel: str
    spinToken: str

class CommitIn(BaseModel):
    code: str
    spinToken: str

@app.get("/healthz")
def healthz():
    return "ok"

@app.post("/api/verify-spin", response_model=VerifyOut)
def verify_spin(payload: VerifyIn):
    code = payload.code.strip()
    username = payload.username.strip()

    meta = CODES.get(code)
    if not meta:
        raise HTTPException(status_code=400, detail="invalid")
    if meta["status"] == "used":
        raise HTTPException(status_code=409, detail="already_used")

    # username kilidi varsa kontrol et
    if meta["username"] and meta["username"] != username:
        raise HTTPException(status_code=403, detail="username_mismatch")

    prize_index = meta["prize_index"]
    prize_label = PRIZES[prize_index]["label"]

    # idempotent amaçlı token üret ve rezerve et
    token = str(uuid4())
    RESERVED[code] = token

    return VerifyOut(
        targetIndex=prize_index,
        prizeLabel=prize_label,
        spinToken=token,
    )

@app.post("/api/commit-spin")
def commit_spin(payload: CommitIn):
    code = payload.code.strip()
    token = payload.spinToken.strip()

    meta = CODES.get(code)
    if not meta:
        raise HTTPException(status_code=400, detail="invalid")
    if meta["status"] == "used":
        # idempotent: zaten kullanıldıysa OK dönüş
        return {"ok": True}

    # verify sırasında üretilen token ile eşleşmeli
    saved = RESERVED.get(code)
    if not saved or saved != token:
        raise HTTPException(status_code=400, detail="invalid_or_stale_token")

    # Kullanımı kilitle
    meta["status"] = "used"
    # logla
    SPINS.append({
        "code": code,
        "prize_index": meta["prize_index"],
        "spinToken": token,
    })
    # token'ı tüket
    RESERVED.pop(code, None)
    return {"ok": True}
