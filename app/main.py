from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routers.health import router as health_router
from app.api.routers.spin import router as spin_router
from app.api.routers.admin import router as admin_router
from app.db.session import SessionLocal
from app.db.models import Base, Prize, Code
from app.db.session import engine

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router)
app.include_router(spin_router, prefix="/api")
app.include_router(admin_router)

# Startup: tablo oluştur + seed
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

    # --- Süper admin seed ---
    from app.db.models import AdminUser, AdminRole
    from app.services.auth import sha256

    boot_token = settings.ADMIN_TOKEN
    if boot_token:
        token_hash = sha256(boot_token)
        if not db.query(AdminUser).filter_by(username="root").first():
            db.add(AdminUser(
                username="root",
                role=AdminRole.super_admin,
                token_hash=token_hash,
                is_active=True,
            ))
            db.commit()
