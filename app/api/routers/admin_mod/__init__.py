# app/api/routers/admin_mod/__init__.py
from fastapi import APIRouter

# Alt sayfalar (zorunlu)
from .sayfalar import loginpage, panel, kodyonetimi, turnuvabonus

# Not:
# Eğer alt router'larda yollar zaten '/admin/...' ile başlıyorsa,
# burada prefix vermeyin. Aksi halde '/admin/admin/...' olur.
# Ortak prefix kullanmak isterseniz aşağıyı açın:
# admin_router = APIRouter(prefix="/admin", tags=["admin"])
admin_router = APIRouter(tags=["admin"])

# Login & oturum
admin_router.include_router(loginpage.router)       # /admin/login, /admin/logout

# Dashboard (/admin)
admin_router.include_router(panel.router)

# Kod yönetimi (/admin/kod-yonetimi)
admin_router.include_router(kodyonetimi.router)

# Turnuva / Bonus (/admin/turnuvabonus)
admin_router.include_router(turnuvabonus.router)

# Admin kullanıcı yönetimi (/admin/users) — dosya varsa ekle
try:
    from .sayfalar import admin_yonetim
    admin_router.include_router(admin_yonetim.router)
except ImportError:
    # Opsiyonel modül yoksa sessiz geç
    pass

# Dışa aktarım
__all__ = ["admin_router"]
