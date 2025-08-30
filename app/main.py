from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.api.routers.health import router as health_router
from app.api.routers.spin import router as spin_router
from app.api.routers.admin import router as admin_router
from app.db.session import SessionLocal, engine
from app.db.models import Base, Prize, Code

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session (admin login için)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    same_site="lax",
    https_only=False,  # prod'da True önerilir (HTTPS üzerinde)
)

# Routers
app.include_router(health_router)
app.include_router(spin_router, prefix="/api")
app.include_router(admin_router)

# Startup: tablo oluştur + mini migration + seed
@app.on_event("startup")
def on_startup():
    # ORM tabloları oluştur
    Base.metadata.create_all(engine)

    # --- Mini migration: eski 'token_hash' kolonunu 'password_hash' yap + yoksa ekle ---
    with engine.begin() as conn:
        # Eğer eski şema varsa güvenli şekilde rename yap
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
        # Kolon yoksa ekle (idempotent)
        conn.execute(text("ALTER TABLE IF EXISTS admin_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"))

    # Seed verileri
    with SessionLocal() as db:
        # Ödüller
        if db.query(Prize).count() == 0:
            db.add_all([
                Prize(label="₺100",  wheel_index=0),
                Prize(label="₺250",  wheel_index=1),
                Prize(label="₺500",  wheel_index=2),
                Prize(label="₺1000", wheel_index=3),
            ])
            db.commit()

        # Örnek kodlar
        if db.query(Code).count() == 0:
            p1000 = db.query(Prize).filter_by(label="₺1000").first()
            p500  = db.query(Prize).filter_by(label="₺500").first()
            db.add_all([
                Code(code="ABC123",  username="yasin", prize_id=p1000.id, status="issued"),
                Code(code="TEST500", username=None,    prize_id=p500.id,  status="issued"),
            ])
            db.commit()
