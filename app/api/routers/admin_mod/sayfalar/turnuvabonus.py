# app/api/routers/admin_mod/sayfalar/turnuvabonus.py
from typing import Annotated
from html import escape as _e
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import AdminUser, AdminRole
from app.services.auth import require_role
from app.api.routers.admin_mod.yerlesim import _layout

router = APIRouter()

@router.get("/admin/turnuvabonus", response_class=HTMLResponse)
def turnuva_bonus_sayfasi(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[AdminUser, Depends(require_role(AdminRole.super_admin))],
    tab: str = "turnuvalar",
):
    tabs = [
        ("turnuvalar", "Turnuvalar"),
        ("bonuslar", "Güne Özel Bonuslar"),
        ("promokod", "Promosyon Kodları"),
        ("etkinlikler", "Etkinlikler"),
    ]
    t_html = ["<div class='tabs'>"]
    for key, label in tabs:
        cls = "tab active" if tab == key else "tab"
        t_html.append(f"<a class='{cls}' href='/admin/turnuvabonus?tab={key}'>{_e(label)}</a>")
    t_html.append("</div>")

    body = f"""
    {''.join(t_html)}
    <div class='card'>
      <h1>{_e(dict(tabs)[tab])}</h1>
      <p>Bu sekmenin içeriğini burada yöneteceğiz.</p>
    </div>
    """
    html = _layout("Turnuva / Bonus", body, active="tb", is_super=(current.role == AdminRole.super_admin))
    return HTMLResponse(html)
