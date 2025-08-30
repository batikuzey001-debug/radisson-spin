from fastapi import HTTPException, Request, Depends
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db

def admin_guard(request: Request):
    token = request.headers.get("x-admin") or request.query_params.get("admin")
    if not token or token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")

# Re-export for convenience
DBSessionDep = Depends(get_db)
