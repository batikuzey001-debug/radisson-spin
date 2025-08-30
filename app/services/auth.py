import hashlib
from typing import Optional
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from app.db.models import AdminUser, AdminRole

def sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def extract_admin_token(req: Request) -> Optional[str]:
    return req.headers.get("x-admin") or req.query_params.get("admin")

def get_current_admin(req: Request, db: Session) -> AdminUser:
    token = extract_admin_token(req)
    if not token:
        raise HTTPException(status_code=401, detail="Yetkisiz: admin token eksik.")
    user = db.query(AdminUser).filter_by(token_hash=sha256(token), is_active=True).first()
    if not user:
        raise HTTPException(status_code=401, detail="Yetkisiz veya pasif admin.")
    return user

def require_role(min_role: AdminRole):
    def _dep(req: Request, db: Session):
        user = get_current_admin(req, db)
        if min_role == AdminRole.super_admin and user.role != AdminRole.super_admin:
            raise HTTPException(status_code=403, detail="Bu işlem için süper admin yetkisi gerekir.")
        return user
    return _dep
