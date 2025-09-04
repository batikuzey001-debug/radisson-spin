# app/main.py
import os
import json
from pathlib import Path
from typing import List, Union
from urllib.parse import quote

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse, HTMLResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text

from app.core.config import settings
from app.api.routers.health import router as health_router
from app.api.routers.spin import router as spin_router
from app.api.routers.home import router as home_router
from app.api.routers.site import router as site_router
from app.api.routers.live import router as live_router
from app.api.routers.schedule import router as schedule_router
from app.api.routers.promos import router as promos_router
from app.api.routers.events import router as events_router
from app.api.routers.admin_mod import admin_router
from app.db.session import SessionLocal, engine
from app.db.models import Base, Prize, Code


def _normalize_origins(val: Union[str, List[str]]) -> List[str]:
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
# Session
# -----------------------------
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    same_site="lax",
    https_only=False,
)

# -----------------------------
# Static Files
# -----------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[1]
STATIC_DIR = PROJECT_ROOT / "static"
(STATIC_DIR / "uploads").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# -----------------------------
# Routers
# -----------------------------
app.include_router(health_router,    prefix="/api")
app.include_router(spin_router,      prefix="/api")
app.include_router(home_router,      prefix="/api")
app.include_router(site_router,      prefix="/api")
app.include_router(live_router,      prefix="/api")
app.include_router(schedule_router,  prefix="/api")
app.include_router(promos_router,    prefix="/api")
app.include_router(events_router,    prefix="/api")
app.include_router(admin_router)

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
# Admin yönlendirmeleri
# -----------------------------
@app.get("/admin", response_class=HTMLResponse, include_in_schema=False)
def admin_root():
    return RedirectResponse(url="/admin/panel", status_code=303)

@app.exception_handler(StarletteHTTPException)
async def _admin_auth_redirect(request: Request, exc: StarletteHTTPException):
    path = request.url.path or ""
    is_html = "text/html" in (request.headers.get("accept") or "")
    is_admin = path.startswith("/admin")
    is_login = path.startswith("/admin/login")
    if exc.status_code in (401, 403) and is_html and is_admin and not is_login:
        qs = ("?" + request.url.query) if request.url.query else ""
        nxt = quote(path + qs, safe="/:=&?")
        return RedirectResponse(url=f"/admin/login?next={nxt}", status_code=303)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

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
            # promo_codes.coupon_code / cta_url kolonları yoksa ekle
            conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='promo_codes') THEN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promo_codes' AND column_name='coupon_code') THEN
                        EXECUTE 'ALTER TABLE promo_codes ADD COLUMN coupon_code VARCHAR(64)';
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promo_codes' AND column_name='cta_url') THEN
                        EXECUTE 'ALTER TABLE promo_codes ADD COLUMN cta_url VARCHAR(512)';
                    END IF;
                END IF;
            END $$;
            """))
            # --- Çark için idempotent migrationlar ---
            # prizes.enabled kolonu yoksa ekle
            conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='prizes') THEN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prizes' AND column_name='enabled') THEN
                        EXECUTE 'ALTER TABLE prizes ADD COLUMN enabled BOOLEAN DEFAULT TRUE';
                    END IF;
                END IF;
            END $$;
            """))
            # codes.tier_key, manual_prize_id, used_at kolonu yoksa ekle; prize_id'ı nullable yap
            conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='codes') THEN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='codes' AND column_name='tier_key') THEN
                        EXECUTE 'ALTER TABLE codes ADD COLUMN tier_key VARCHAR(32)';
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='codes' AND column_name='manual_prize_id') THEN
                        EXECUTE 'ALTER TABLE codes ADD COLUMN manual_prize_id INTEGER REFERENCES prizes(id)';
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='codes' AND column_name='used_at') THEN
                        EXECUTE 'ALTER TABLE codes ADD COLUMN used_at TIMESTAMPTZ';
                    END IF;
                    -- prize_id'ı nullable yap (spin sonrası dolacak)
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='codes' AND column_name='prize_id' AND is_nullable='NO') THEN
                        EXECUTE 'ALTER TABLE codes ALTER COLUMN prize_id DROP NOT NULL';
                    END IF;
                END IF;
            END $$;
            """))

            # --- prize_tiers: tablo + seed (plain SQL) ---
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS prize_tiers (
                    key VARCHAR(32) PRIMARY KEY,
                    label VARCHAR(100) NOT NULL,
                    sort INTEGER NOT NULL DEFAULT 0,
                    enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ DEFAULT now(),
                    updated_at TIMESTAMPTZ DEFAULT now()
                );
            """))
            conn.execute(text(
                "INSERT INTO prize_tiers(key,label,sort,enabled) VALUES ('bronze','100 TL',0,TRUE) "
                "ON CONFLICT (key) DO NOTHING;"
            ))
            conn.execute(text(
                "INSERT INTO prize_tiers(key,label,sort,enabled) VALUES ('silver','300 TL',1,TRUE) "
                "ON CONFLICT (key) DO NOTHING;"
            ))
            conn.execute(text(
                "INSERT INTO prize_tiers(key,label,sort,enabled) VALUES ('gold','500 TL',2,TRUE) "
                "ON CONFLICT (key) DO NOTHING;"
            ))
            conn.execute(text(
                "INSERT INTO prize_tiers(key,label,sort,enabled) VALUES ('platinum','1000 TL',3,TRUE) "
                "ON CONFLICT (key) DO NOTHING;"
            ))

            # prize_distributions tablosu yoksa oluştur + indexler
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS prize_distributions (
                    id SERIAL PRIMARY KEY,
                    tier_key VARCHAR(32) NOT NULL,
                    prize_id INTEGER NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
                    weight_bp INTEGER NOT NULL DEFAULT 0,
                    enabled BOOLEAN NOT NULL DEFAULT TRUE
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_prize_distributions_tier ON prize_distributions(tier_key);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_prize_distributions_prize ON prize_distributions(prize_id);"))

            # FK: prize_distributions.tier_key -> prize_tiers.key  (varsa sessiz geç)
            try:
                conn.execute(text("""
                    ALTER TABLE prize_distributions
                    ADD CONSTRAINT fk_prize_distributions_tier
                    FOREIGN KEY (tier_key) REFERENCES prize_tiers(key)
                    ON UPDATE CASCADE ON DELETE RESTRICT;
                """))
            except Exception:
                pass  # zaten var

    # Seed (Ödül ve Kod örneği)
    with SessionLocal() as db:
        if db.query(Prize).count() == 0:
            db.add_all([
                Prize(label="₺100",  wheel_index=0, enabled=True),
                Prize(label="₺250",  wheel_index=1, enabled=True),
                Prize(label="₺500",  wheel_index=2, enabled=True),
                Prize(label="₺1000", wheel_index=3, enabled=True),
            ])
            db.commit()

        if db.query(Code).count() == 0:
            db.add_all([
                Code(code="ABC123",  username="yasin", prize_id=None, tier_key="platinum", status="issued"),
                Code(code="TEST500", username=None,    prize_id=None, tier_key="gold",     status="issued"),
            ])
            db.commit()

    # ---- prize_distributions için otomatik başlangıç verisi ----
    # Amaç: Ödüller sekmesi 500 vermesin diye her aktif tier için en az 1 satır olsun.
    # Strateji: Eğer bir tier için hiç satır yoksa, wheel_index'i en küçük olan ödüle %100 ver.
    with engine.begin() as conn:
        # prize var mı?
        has_prize = conn.execute(text("SELECT EXISTS(SELECT 1 FROM prizes)")).scalar()
        if has_prize:
            # her aktif tier için yoksa seed ekle
            conn.execute(text("""
                INSERT INTO prize_distributions(tier_key, prize_id, weight_bp, enabled)
                SELECT pt.key,
                       (SELECT id FROM prizes ORDER BY wheel_index ASC LIMIT 1) AS prize_id,
                       10000, TRUE
                FROM prize_tiers pt
                WHERE pt.enabled = TRUE
                  AND NOT EXISTS (
                      SELECT 1 FROM prize_distributions pd WHERE pd.tier_key = pt.key
                  );
            """))

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
