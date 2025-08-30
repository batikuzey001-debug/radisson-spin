import os
import secrets, string
from uuid import uuid4
from datetime import datetime, timezone
from typing import Dict

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy import create_engine, Integer, String, Text, DateTime, ForeignKey, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session
from fastapi.middleware.cors import CORSMiddleware

# ---------- APP ----------
app = FastAPI()

# CORS (ilk aşama herkese açık; sonra domainlere daraltırız)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- DB ----------
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL env var is required")

# psycopg2-binary ile (postgresql://... formatı)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

class Base(DeclarativeBase): pass

class Prize(Base):
    __tablename__ = "prizes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(String(64))
    wheel_index: Mapped[int] = mapped_column(Integer)
    codes = relationship("Code", back_populates="prize")

class Code(Base):
    __tablename__ = "codes"
    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str | None] = mapped_column(String(128), nullable=True)
    prize_id: Mapped[int] = mapped_column(ForeignKey("prizes.id"))
    status: Mapped[str] = mapped_column(String(16), default="issued")  # issued|used|expired
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    prize = relationship("Prize", back_populates="codes")

class Spin(Base):
    __tablename__ = "spins"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # uuid str
    code: Mapped[str] = mapped_column(String(64))
    username: Mapped[str] = mapped_column(String(128))
    prize_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    client_ip: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# verify→commit arası geçici rezerve token
RESERVED: Dict[str, str] = {}

# ---------- MODELLER ----------
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

# ---------- STARTUP ----------
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.query(Prize).count() == 0:
            db.add_all([
                Prize(label="₺100",  wheel_index=0),
                Prize(label="₺250",  wheel_index=1),
                Prize(label="₺500",  wheel_index=2),
                Prize(label="₺1000", wheel_index=3),
            ])
            db.commit()
        if db.query(Code).count() == 0:
            p1000 = db.query(Prize).filter_by(label="₺1000").first()
            p500  = db.query(Prize).filter_by(label="₺500").first()
            db.add_all([
                Code(code="ABC123",  username="yasin", prize_id=p1000.id, status="issued"),
                Code(code="TEST500", username=None,    prize_id=p500.id,  status="issued"),
            ])
            db.commit()

# ---------- ENDPOINTS ----------
@app.get("/healthz")
def healthz():
    return "ok"

@app.post("/api/verify-spin", response_model=VerifyOut)
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
    token = str(uuid4())
    RESERVED[code] = token

    return VerifyOut(
        targetIndex=prize.wheel_index,
        prizeLabel=prize.label,
        spinToken=token,
    )

@app.post("/api/commit-spin")
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
        id=str(uuid4()),
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

# ===== Admin Panel (basit) ===============================================
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "changeme")

def _admin_guard(request: Request):
    token = request.headers.get("x-admin") or request.query_params.get("admin")
    if not token or token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")

def _gen_code(n=8):
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))

@app.get("/admin", response_class=HTMLResponse)
def admin_home(request: Request, db: Session = Depends(get_db)):
    _admin_guard(request)
    prizes = db.query(Prize).order_by(Prize.wheel_index).all()
    last = db.query(Code).order_by(Code.created_at.desc()).limit(20).all()

    html = [
        "<h2>Radisson Spin – Admin</h2>",
        "<form method='post' action='/admin/create-code'>",
        f"<input type='hidden' name='admin' value='{request.query_params.get('admin','')}'>",
        "<label>Kullanıcı adı (opsiyonel):</label><br>",
        "<input name='username' placeholder='örn: yasin'><br><br>",
        "<label>Ödül:</label><br><select name='prize_id'>",
    ]
    for p in prizes:
        html.append(f"<option value='{p.id}'>[{p.wheel_index}] {p.label}</option>")
    html += [
        "</select><br><br>",
        "<label>Kod (boşsa otomatik):</label><br>",
        "<input name='code' placeholder='örn: ABC123'><br><br>",
        "<button type='submit'>Tek Kod Oluştur</button>",
        "</form><hr>",
        "<form method='post' action='/admin/bulk-codes'>",
        f"<input type='hidden' name='admin' value='{request.query_params.get('admin','')}'>",
        "<b>Toplu Kod Üret</b><br>",
        "<label>Adet:</label> <input name='count' type='number' value='10' min='1' max='1000'>",
        "&nbsp; <label>Prefix (opsiyonel):</label> <input name='prefix' placeholder='RAD-'>",
        "&nbsp; <label>Ödül:</label> <select name='prize_id'>",
    ]
    for p in prizes:
        html.append(f"<option value='{p.id}'>[{p.wheel_index}] {p.label}</option>")
    html += [
        "</select> <button type='submit'>Üret</button>",
        "</form><hr>",
        "<h3>Son 20 Kod</h3>",
        "<table border='1' cellpadding='6' cellspacing='0'><tr><th>Kod</th><th>Kullanıcı</th><th>Ödül</th><th>Durum</th><th>Tarih</th></tr>"
    ]
    for c in last:
        pr = db.get(Prize, c.prize_id)
        html.append(f"<tr><td><code>{c.code}</code></td><td>{c.username or '-'}</td><td>{pr.label}</td><td>{c.status}</td><td>{c.created_at}</td></tr>")
    html.append("</table>")
    return HTMLResponse("".join(html))

@app.post("/admin/create-code")
async def admin_create_code(request: Request, db: Session = Depends(get_db)):
    _admin_guard(request)
    form = await request.form()
    username = (form.get("username") or "").strip() or None
    prize_id = int(form.get("prize_id"))
    code = (form.get("code") or "").strip() or _gen_code()

    if db.get(Code, code):
        raise HTTPException(status_code=409, detail="code_exists")

    db.add(Code(code=code, username=username, prize_id=prize_id, status="issued"))
    db.commit()

    admin = form.get("admin", "")
    return RedirectResponse(url=f"/admin?admin={admin}", status_code=303)

@app.post("/admin/bulk-codes")
async def admin_bulk_codes(request: Request, db: Session = Depends(get_db)):
    _admin_guard(request)
    form = await request.form()
    count = max(1, min(1000, int(form.get("count", 10))))
    prize_id = int(form.get("prize_id"))
    prefix = (form.get("prefix") or "").strip()

    created = []
    for _ in range(count):
        code = prefix + _gen_code()
        if db.get(Code, code):
            continue
        db.add(Code(code=code, username=None, prize_id=prize_id, status="issued"))
        created.append(code)
    db.commit()
    return JSONResponse({"ok": True, "created": created})
