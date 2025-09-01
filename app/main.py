# app/services/main.py
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse, HTMLResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from urllib.parse import quote
from sqlalchemy import text

from app.core.config import settings
from app.api.routers.health import router as health_router
from app.api.routers.spin import router as spin_router
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

# Session
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    same_site="lax",
    https_only=False,
)

# Static
PROJECT_ROOT = Path(__file__).resolve().parents[2]
STATIC_DIR = PROJECT_ROOT / "static"
(STATIC_DIR / "uploads").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Routers
app.include_router(health_router)
app.include_router(spin_router, prefix="/api")

from app.api.routers.content import router as content_router
app.include_router(content_router)

from app.api.routers.admin_mod import admin_router as admin_mod_router
app.include_router(admin_mod_router)

# Admin auth redirect
@app.exception_handler(StarletteHTTPException)
async def _admin_auth_redirect(request: Request, exc: StarletteHTTPException):
    path = request.url.path or ""
    is_html = "text/html" in (request.headers.get("accept") or "")
    is_admin_area = path.startswith("/admin")
    is_login_page = path.startswith("/admin/login")
    if exc.status_code in (401, 403) and is_html and is_admin_area and not is_login_page:
        qs = ("?" + request.url.query) if request.url.query else ""
        next_param = quote(path + qs, safe="/:=&?")
        return RedirectResponse(url=f"/admin/login?next={next_param}", status_code=303)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

@app.get("/admin", response_class=HTMLResponse)
def admin_root():
    return RedirectResponse(url="/admin/panel", status_code=303)

# Startup
@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(engine)

    if engine.dialect.name.lower() in ("postgresql", "postgres"):
        with engine.begin() as conn:
            # admin_users token rename
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
            # admin_users.password_hash
            conn.execute(text("""
                ALTER TABLE IF EXISTS admin_users
                ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
            """))
            # prizes.image_url
            conn.execute(text("""
                ALTER TABLE IF EXISTS prizes
                ADD COLUMN IF NOT EXISTS image_url VARCHAR(512)
            """))
            # tournaments.* (idempotent kolon eklemeleri)
            conn.execute(text("""ALTER TABLE IF EXISTS tournaments ADD COLUMN IF NOT EXISTS prize_pool INTEGER"""))
            conn.execute(text("""ALTER TABLE IF NOT EXISTS tournaments ADD COLUMN IF NOT EXISTS subtitle VARCHAR(200)"""))
            conn.execute(text("""ALTER TABLE IF NOT EXISTS tournaments ADD COLUMN IF NOT EXISTS short_desc TEXT"""))
            conn.execute(text("""ALTER TABLE IF NOT EXISTS tournaments ADD COLUMN IF NOT EXISTS long_desc TEXT"""))
            conn.execute(text("""ALTER TABLE IF NOT EXISTS tournaments ADD COLUMN IF NOT EXISTS banner_url VARCHAR(512)"""))
            conn.execute(text("""ALTER TABLE IF NOT EXISTS tournaments ADD COLUMN IF NOT EXISTS participant_count INTEGER"""))
            conn.execute(text("""ALTER TABLE IF NOT EXISTS tournaments ADD COLUMN IF NOT EXISTS cta_url VARCHAR(512)"""))
            conn.execute(text("""ALTER TABLE IF NOT EXISTS tournaments ADD COLUMN IF NOT EXISTS rank_visible BOOLEAN"""))
            conn.execute(text("""ALTER TABLE IF NOT EXISTS tournaments ADD COLUMN IF NOT EXISTS slug VARCHAR(200)"""))
            conn.execute(text("""CREATE UNIQUE INDEX IF NOT EXISTS ix_tournaments_slug ON tournaments (slug)"""))
            conn.execute(text("""ALTER TABLE IF NOT EXISTS tournaments ADD COLUMN IF NOT EXISTS i18n JSONB"""))

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.services.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
