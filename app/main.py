# app/services/main.py
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.api.routers.health import router as health_router
from app.api.routers.spin import router as spin_router
from app.db.session import SessionLocal, engine
from app.db.models import Base, Prize, Code

app = FastAPI()

# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Session (admin login için)
# -----------------------------
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    same_site="lax",
    https_only=False,  # prod'da True önerilir (HTTPS üzerinde)
)

# -----------------------------
# Static Files: /static -> <kök>/static
# -----------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]
STATIC_DIR = PROJECT_ROOT / "static"
(STATIC_DIR / "uploads").mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# -----------------------------
# Routers
# -----------------------------
app.include_router(health_router)
app.include_router(spin_router, prefix="/api")

# Public content feed
from app.api.routers.content import router as content_router
app.include_router(content_router)

# Yeni modüler admin (login, dashboard, kod yönetimi, turnuva/bonus, admin yönetim)
from app.api.routers.admin_mod import admin_router as admin_mod_router
app.include_router(admin_mod_router)

# -----------------------------
# Startup: tablo oluştur + mini migration + seed
# -----------------------------
@app.on_event("startup")
def on_startup() -> None:
    # ORM tabloları oluştur
    Base.metadata.create_all(engine)

    # --- Mini migration'lar (idempotent) ---
    with engine.begin() as conn:
        # 1) admin_users.token_hash -> password_hash (varsa)
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

        # 2) admin_users.password_hash kolonu yoksa ekle
        conn.execute(text("""
            ALTER TABLE IF EXISTS admin_users
            ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
        """))

        # 3) prizes.image_url kolonu yoksa ekle
        conn.execute(text("""
            ALTER TABLE IF EXISTS prizes
            ADD COLUMN IF NOT EXISTS image_url VARCHAR(512)
        """))

    # --- Seed verileri (varsa ekleme) ---
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
