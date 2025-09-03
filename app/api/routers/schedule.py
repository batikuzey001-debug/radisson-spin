# app/api/routers/schedule.py
from typing import Annotated, Dict, List, Optional, Tuple
import os
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter(prefix="/schedule", tags=["schedule"])
API_BASE = "https://v3.football.api-sports.io"


# ---------------- helpers ----------------
def _api_key() -> str:
    key = os.getenv("API_FOOTBALL_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=500, detail="API_FOOTBALL_KEY missing in environment")
    return key


def _to_int(v) -> int:
    try:
        return int(v) if v is not None else 0
    except (TypeError, ValueError):
        return 0


async def _fetch_json(url: str, headers: Dict[str, str], params: Dict[str, str | int]) -> Dict:
    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            resp = await client.get(url, headers=headers, params=params)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Upstream request failed: {e}") from e
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json() or {}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------------- upcoming matches ----------------
@router.get("/upcoming")
async def list_upcoming_matches(
    db: Annotated[Session, Depends(get_db)],
    days: int = Query(7, ge=1, le=30, description="Kaç gün sonrasına bakılsın"),
    limit: int = Query(100, ge=1, le=500, description="Maksimum maç sayısı"),
) -> List[Dict]:
    """
    Önümüzdeki X gün içindeki maçları getirir (canlı değil, program).
    """
    headers = {"x-apisports-key": _api_key()}

    now = _now_utc()
    from_date = now.strftime("%Y-%m-%d")
    to_date = (now + timedelta(days=days)).strftime("%Y-%m-%d")

    js = await _fetch_json(
        f"{API_BASE}/fixtures",
        headers,
        {"from": from_date, "to": to_date},
    )

    items = js.get("response", []) or []
    out: List[Dict] = []

    for it in items:
        fixture = it.get("fixture") or {}
        league = it.get("league") or {}
        teams = it.get("teams") or {}

        out.append(
            {
                "id": str(fixture.get("id") or ""),
                "kickoff": fixture.get("date") or "",
                "league": league.get("name") or "",
                "leagueLogo": league.get("logo") or "",
                "leagueFlag": league.get("flag") or "",
                "home": {"name": teams.get("home", {}).get("name"), "logo": teams.get("home", {}).get("logo")},
                "away": {"name": teams.get("away", {}).get("name"), "logo": teams.get("away", {}).get("logo")},
            }
        )

        if len(out) >= limit:
            break

    return out
