# app/api/routers/admin_mod/__init__.py
from fastapi import APIRouter

from .sayfalar.login_sayfasi import router as login_router          # /admin/login, /admin/logout
from .sayfalar.kod_yonetimi import router as kod_router             # /admin/kod
from .sayfalar.turnuva_bonus import router as tb_router             # /admin/turnuva-bonus  (varsa)

admin_router = APIRouter()
admin_router.include_router(login_router)
admin_router.include_router(kod_router)
admin_router.include_router(tb_router)

from .sayfalar.admin_yonetim import router as admin_yonetim_router
admin_router.include_router(admin_yonetim_router)
