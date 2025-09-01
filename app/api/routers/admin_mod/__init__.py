# app/api/routers/admin_mod/__init__.py
from fastapi import APIRouter

from .sayfalar.login_sayfasi import router as login_router
from .sayfalar.kod_yonetimi import router as kod_router
from .sayfalar.turnuvabonus import router as tb_router       # /admin/turnuvabonus
from .sayfalar.admin_yonetim import router as admin_yn_router
from .sayfalar.panel import router as panel_router

admin_router = APIRouter()
admin_router.include_router(login_router)     # /admin/login, /admin/logout
admin_router.include_router(panel_router)     # /admin (Dashboard)
admin_router.include_router(kod_router)       # /admin/kod
admin_router.include_router(tb_router)        # /admin/turnuvabonus
admin_router.include_router(admin_yn_router)  # /admin/users
