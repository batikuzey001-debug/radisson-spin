from typing import Optional, Callable
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from starlette.status import HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN
from passlib.context import CryptContext

from app.db.models import AdminUser, AdminRole

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_ctx.verify(password, password_hash)

def login_with_credentials(db: Session, username: str, password: str) -> AdminUser:
    user = db.query(AdminUser).filter(AdminUser.username == username, AdminUser.is_active == True).first()  # noqa: E712
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Geçersiz kullanıcı adı veya şifre.")
    return user

def login_session(request: Request, user: AdminUser) -> None:
    request.session["admin_user_id"] = user.id

def logout_session(request: Request) -> None:
    request.session.clear()

def get_current_admin(request: Request, db: Session) -> AdminUser:
    uid = request.session.get("admin_user_id")
    if not uid:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Oturum bulunamadı. Lütfen giriş yapın.")
    user = db.get(AdminUser, uid)
    if not user or not user.is_active:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Oturum geçersiz veya kullanıcı pasif.")
    return user

def require_role(min_role: AdminRole) -> Callable:
    def _dep(request: Request, db: Session):
        user = get_current_admin(request, db)
        if min_role == AdminRole.super_admin and user.role != AdminRole.super_admin:
            raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Bu işlem için süper admin yetkisi gerekir.")
        return user
    return _dep
