from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.api.routers.health import router as health_router
from app.api.routers.spin import router as spin_router
from app.api.routers.admin import router as admin_router
from app.db.session import SessionLocal, engine
from app.db.models import Base, Prize, Code, AdminUser, AdminRole
from app.services.auth import hash_password

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
    https_only=False,  # prod'da True yapabilirsiniz (HTTPS üzerinde)
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

        # Süper admin bootstrap (ilk kurulum)
        if db.query(AdminUser).count() == 0:
            db.add(AdminUser(
                username=settings.ADMIN_BOOT_USERNAME,
                role=AdminRole.super_admin,
                password_hash=hash_password(settings.ADMIN_BOOT_PASSWORD),
                is_active=True,
            ))
            db.commit()
