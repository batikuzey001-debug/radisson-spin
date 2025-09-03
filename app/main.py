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
from app.api.routers.home import router as home_router  # <-- eklendi
from app.api.routers.admin_mod import admin_router
from app.db.session import SessionLocal, engine
from app.db.models import Base, Prize, Code


def _normalize_origins(val: Union[str, List[str]]) -> List[str]:
    """
    Why: Railway/ENV'de virgüllü string ya da JSON dizi gelebilir; hepsini listeye çevir.
    """
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
# Session (admin için gerekli)
# -----------------------------
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    same_site="lax",
    https_only=False,  # Why: Railway önizleme/HTTP için esnek; prod HTTPS'e geçince True yap.
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
app.include_router(health_router, prefix="/api")  # /api/health
app.include_router(spin_router, prefix="/api")    # /api/spin/...
app.include_router(home_router, prefix="/api")    # /api/home/...  <-- eklendi
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
# Admin yönlendirmeleri
# -----------------------------
@app.get("/admin", response_class=HTMLResponse, include_in_schema=False)
def admin_root():
    # /admin -> /admin/panel
    return RedirectResponse(url="/admin/panel", status_code=303)

@app.exception_handler(StarletteHTTPException)
async def _admin_auth_redirect(request: Request, exc: StarletteHTTPException):
    """
    Why: HTML isteklerinde /admin altında 401/403'de login sayfasına yönlendirme.
    """
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

    # Seed (spin için)
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
