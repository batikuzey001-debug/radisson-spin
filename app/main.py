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
from app.db.session import SessionLocal, engine
from app.db.models import Base, Prize, Code

# ----------------------------- helpers -----------------------------
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

def _is_postgres() -> bool:
    try:
        return engine.dialect.name.lower() in ("postgresql", "postgres")
    except Exception:
        return False

def _run_safe(conn, sql: str) -> None:
    try:
        conn.execute(text(sql))
    except Exception:
        # İsterseniz burada print/log yapabilirsiniz
        pass

# ----------------------------- app -----------------------------
app = FastAPI()

# CORS
origins = _normalize_origins(settings.CORS_ALLOW_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Session
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    same_site="lax",
    https_only=False,
)

# Static
PROJECT_ROOT = Path(__file__).resolve().parents[1]
STATIC_DIR = PROJECT_ROOT / "static"
(STATIC_DIR / "uploads").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Routers (import errors kırmasın)
try:
    from app.api.routers.health import router as health_router
    app.include_router(health_router, prefix="/api")
except Exception:
    pass

try:
    from app.api.routers.spin import router as spin_router
    app.include_router(spin_router, prefix="/api")
except Exception:
    pass

try:
    from app.api.routers.home import router as home_router
    app.include_router(home_router, prefix="/api")
except Exception:
    pass

try:
    from app.api.routers.site import router as site_router
    app.include_router(site_router, prefix="/api")
except Exception:
    pass

try:
    from app.api.routers.live import router as live_router
    app.include_router(live_router, prefix="/api")
except Exception:
    pass

try:
    from app.api.routers.schedule import router as schedule_router
    app.include_router(schedule_router, prefix="/api")
except Exception:
    pass

try:
    from app.api.routers.promos import router as promos_router
    app.include_router(promos_router, prefix="/api")
except Exception:
    pass

try:
    from app.api.routers.events import router as events_router
    app.include_router(events_router, prefix="/api")
except Exception:
    pass

try:
    from app.api.routers.hero import router as hero_router
    app.include_router(hero_router, prefix="/api")  # /api/hero/stats
except Exception:
    pass

# >>> Content (tournaments / daily-bonuses / promo-codes / events — generic liste)
try:
    from app.api.routers.content import router as content_router
    app.include_router(content_router, prefix="/api")
except Exception:
    pass
# <<< Content SON

# FE ziyaretçi metrikleri (benzersiz ziyaretçi ping)
try:
    from app.api.routers.fe_metrics import router as fe_metrics_router
    app.include_router(fe_metrics_router)  # router kendi prefix'ini içerir: /api/fe/metrics
except Exception:
    pass

# admin router en son (auth ve şablonlar buna bağlı)
try:
    from app.api.routers.admin_mod import admin_router
    app.include_router(admin_router)
except Exception:
    pass

# Root
@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs", status_code=302)

@app.get("/status")
def status():
    return JSONResponse({"ok": True, "service": "radisson-spin-backend"})

# Admin yönlendirme (401/403)
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

# ----------------------------- startup (safe migrations) -----------------------------
@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(engine)

    if os.getenv("MIGRATIONS_OFF") == "1":
        return

    if _is_postgres():
        with engine.begin() as conn:
            # admin_users: token_hash -> password_hash rename (varsa)
            _run_safe(conn, """
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='admin_users' AND column_name='token_hash'
              ) THEN
                EXECUTE 'ALTER TABLE admin_users RENAME COLUMN token_hash TO password_hash';
              END IF;
            END $$;""")

            # admin_users.password_hash (yoksa ekle)
            _run_safe(conn, """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='admin_users' AND column_name='password_hash'
              ) THEN
                EXECUTE 'ALTER TABLE admin_users ADD COLUMN password_hash VARCHAR(255)';
              END IF;
            END $$;""")

            # prizes.image_url (yoksa ekle)
            _run_safe(conn, """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='prizes') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='prizes' AND column_name='image_url'
                ) THEN
                  EXECUTE 'ALTER TABLE prizes ADD COLUMN image_url VARCHAR(512)';
                END IF;
              END IF;
            END $$;""")

            # promo_codes.coupon_code, cta_url (yoksa ekle)
            _run_safe(conn, """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='promo_codes') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='promo_codes' AND column_name='coupon_code'
                ) THEN
                  EXECUTE 'ALTER TABLE promo_codes ADD COLUMN coupon_code VARCHAR(64)';
                END IF;
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='promo_codes' AND column_name='cta_url'
                ) THEN
                  EXECUTE 'ALTER TABLE promo_codes ADD COLUMN cta_url VARCHAR(512)';
                END IF;
              END IF;
            END $$;""")

            # >>> EK: promo_codes.cta_text (yoksa ekle)
            _run_safe(conn, """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='promo_codes') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='promo_codes' AND column_name='cta_text'
                ) THEN
                  EXECUTE 'ALTER TABLE promo_codes ADD COLUMN cta_text VARCHAR(128)';
                END IF;
              END IF;
            END $$;""")

            # >>> EK: promo_codes.participant_count (yoksa ekle)
            _run_safe(conn, """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='promo_codes') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='promo_codes' AND column_name='participant_count'
                ) THEN
                  EXECUTE 'ALTER TABLE promo_codes ADD COLUMN participant_count INTEGER';
                END IF;
              END IF;
            END $$;""")

            # events.prize_amount (yoksa ekle)
            _run_safe(conn, """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='events') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='events' AND column_name='prize_amount'
                ) THEN
                  EXECUTE 'ALTER TABLE events ADD COLUMN prize_amount INTEGER';
                END IF;
              END IF;
            END $$;""")

            # >>> daily_bonuses.bonus_percent (yoksa ekle)
            _run_safe(conn, """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='daily_bonuses') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='daily_bonuses' AND column_name='bonus_percent'
                ) THEN
                  EXECUTE 'ALTER TABLE daily_bonuses ADD COLUMN bonus_percent NUMERIC(6,2)';
                END IF;
              END IF;
            END $$;""")

            # >>> CTA TEXT/LINK alanları (yoksa ekle)
            # tournaments.cta_text / cta_url
            _run_safe(conn, """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tournaments') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='tournaments' AND column_name='cta_text'
                ) THEN
                  EXECUTE 'ALTER TABLE tournaments ADD COLUMN cta_text VARCHAR(128)';
                END IF;
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='tournaments' AND column_name='cta_url'
                ) THEN
                  EXECUTE 'ALTER TABLE tournaments ADD COLUMN cta_url VARCHAR(512)';
                END IF;
              END IF;
            END $$;""")

            # daily_bonuses.cta_text / cta_url
            _run_safe(conn, """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='daily_bonuses') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='daily_bonuses' AND column_name='cta_text'
                ) THEN
                  EXECUTE 'ALTER TABLE daily_bonuses ADD COLUMN cta_text VARCHAR(128)';
                END IF;
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='daily_bonuses' AND column_name='cta_url'
                ) THEN
                  EXECUTE 'ALTER TABLE daily_bonuses ADD COLUMN cta_url VARCHAR(512)';
                END IF;
              END IF;
            END $$;""")

            # events.cta_text / cta_url
            _run_safe(conn, """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='events') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='events' AND column_name='cta_text'
                ) THEN
                  EXECUTE 'ALTER TABLE events ADD COLUMN cta_text VARCHAR(128)';
                END IF;
                IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name='events' AND column_name='cta_url'
                ) THEN
                  EXECUTE 'ALTER TABLE events ADD COLUMN cta_url VARCHAR(512)';
                END IF;
              END IF;
            END $$;""")
            # <<< CTA alanları SON >>>

            # prize_tiers tabloları (idempotent)
            _run_safe(conn, """
            CREATE TABLE IF NOT EXISTS prize_tiers (
              key VARCHAR(32) PRIMARY KEY,
              label VARCHAR(100) NOT NULL,
              sort INTEGER NOT NULL DEFAULT 0,
              enabled BOOLEAN NOT NULL DEFAULT TRUE,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
            );""")

            for key, label, sort in [
                ("bronze",   "100 TL",  0),
                ("silver",   "300 TL",  1),
                ("gold",     "500 TL",  2),
                ("platinum", "1000 TL", 3),
            ]:
                _run_safe(conn, f"""
                INSERT INTO prize_tiers(key,label,sort,enabled)
                VALUES ('{key}','{label}',{sort},TRUE)
                ON CONFLICT (key) DO NOTHING;""")

            # prize_distributions (idempotent)
            _run_safe(conn, """
            CREATE TABLE IF NOT EXISTS prize_distributions (
              id SERIAL PRIMARY KEY,
              tier_key VARCHAR(32) NOT NULL,
              prize_id INTEGER NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
              weight_bp INTEGER NOT NULL DEFAULT 0,
              enabled BOOLEAN NOT NULL DEFAULT TRUE
            );""")
            _run_safe(conn, "CREATE INDEX IF NOT EXISTS ix_pd_tier  ON prize_distributions(tier_key);")
            _run_safe(conn, "CREATE INDEX IF NOT EXISTS ix_pd_prize ON prize_distributions(prize_id);")

            # FK: prize_distributions.tier_key -> prize_tiers.key
            _run_safe(conn, """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name='prize_distributions'
                  AND constraint_type='FOREIGN KEY'
                  AND constraint_name='fk_pd_tier'
              ) THEN
                ALTER TABLE prize_distributions
                ADD CONSTRAINT fk_pd_tier
                FOREIGN KEY (tier_key) REFERENCES prize_tiers(key)
                ON UPDATE CASCADE ON DELETE RESTRICT;
              END IF;
            END $$;""")

    # Seed örnekleri (uygulama önce ayağa kalksın)
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

    # prize_distributions hızlı başlangıç (varsa atla)
    if _is_postgres():
        with engine.begin() as conn:
            _run_safe(conn, """
            INSERT INTO prize_distributions(tier_key, prize_id, weight_bp, enabled)
            SELECT pt.key,
                   (SELECT id FROM prizes ORDER BY wheel_index ASC LIMIT 1) AS prize_id,
                   10000, TRUE
            FROM prize_tiers pt
            WHERE pt.enabled = TRUE
              AND NOT EXISTS (
                  SELECT 1 FROM prize_distributions pd WHERE pd.tier_key = pt.key
              );""")

# ----------------------------- run dev -----------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
