# app/api/routers/admin_mod/__init__.py
from fastapi import APIRouter

from .sayfalar.kod_yonetimi import router as kod_router
from .sayfalar.turnuva_bonus import router as tb_router

admin_router = APIRouter()
admin_router.include_router(kod_router)     # /admin/kod
admin_router.include_router(tb_router)      # /admin/turnuva-bonus
