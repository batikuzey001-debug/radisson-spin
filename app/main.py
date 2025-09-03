# app/main.py
import os
import json
from pathlib import Path
from typing import List, Union

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.api.routers.health import router as health_router
from app.api.routers.spin import router as spin_router
from app.api.routers.admin_mod import admin_router
from app.db.session import SessionLocal, engine
from app.db.models import Base, Prize, Code


def _normalize_origins(val: Union[str, List[str]]) -> List[str]:
    """CORS allow_origins değerini güvenle listeye çevirir."""
    if isinstance(val, list):
        return [s.strip() for s in val if s and s.strip()]
    if not val:
        return []
    s = str(val).strip()
    if s.startswith("["):
        try:
            arr = json.loads(s)
            return [str(x).strip() for x in arr if x and str(x).strip()]
        except Exception:
            pass
    return [p.strip() for p in s.split(",") if p.strip()]


app = FastAPI()

# -----------------------------
# CORS
# -----------------------------
origins = _normalize_origins(settings.CORS_ALLOW_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# -----------------------------
# Static Files: /static -> <kök>/static
# -----------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[1]
STATIC_DIR = PROJECT_ROOT / "static"
(STATIC_DIR / "uploads").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# -----------------------------
# Routers
# -----------------------------
app.include_router(health_router)                 # /health
app.include_router(spin_router, prefix="/api")    # /api/spin/...
app.include_router(admin_router)                  # /admin/...

# -----------------------------
# Root & Status
# -----------------------------
@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs", status_code=302)

@app.get("/status")
def status():
    return JSONResponse({"ok": True, "service": "radisson-spin-backend"})

# -----------------------------
# Startup: tablo oluştur + idempotent mini migration + seed
# -----------------------------
@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(engine)

    if engine.dialect.name.lower() in ("postgresql", "postgres"):
        with engine.begin() as conn:
            # admin_users.token_hash -> password_hash (varsa)
            conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='admin_users' AND column_name='token_hash'
                ) THEN
                    EXECUTE 'ALTER TABLE admin_users RENAME COLUMN token_hash TO password_hash';
                END IF;
            END $$;
            """))

            # admin_users.password_hash kolonu yoksa ekle
            conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='admin_users' AND column_name='password_hash'
                ) THEN
                    EXECUTE 'ALTER TABLE admin_users ADD COLUMN password_hash VARCHAR(255)';
                END IF;
            END $$;
            """))

            # prizes.image_url kolonu yoksa ekle
            conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name='prizes'
                ) THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='prizes' AND column_name='image_url'
                    ) THEN
                        EXECUTE 'ALTER TABLE prizes ADD COLUMN image_url VARCHAR(512)';
                    END IF;
                END IF;
            END $$;
            """))

    # Seed (spin için temel veriler)
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
            if p1000 and p500:
                db.add_all([
                    Code(code="ABC123",  username="yasin", prize_id=p1000.id, status="issued"),
                    Code(code="TEST500", username=None,    prize_id=p500.id,  status="issued"),
                ])
                db.commit()

# -----------------------------
# Lokal çalıştırma kolaylığı
# -----------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
