from fastapi import APIRouter

from .sayfalar.login_sayfasi import router as login_router
from .sayfalar.kod_yonetimi import router as kod_router
from .sayfalar.turnuva_bonus import router as tb_router        # varsa
from .sayfalar.admin_yonetim import router as admin_yn_router  # varsa
from .sayfalar.panel import router as panel_router             # ← YENİ

admin_router = APIRouter()
admin_router.include_router(login_router)      # /admin/login, /admin/logout
admin_router.include_router(panel_router)      # /admin (Dashboard)
admin_router.include_router(kod_router)        # /admin/kod
admin_router.include_router(tb_router)         # /admin/turnuva-bonus
admin_router.include_router(admin_yn_router)   # /admin/users
