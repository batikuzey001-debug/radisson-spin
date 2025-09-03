# app/api/routers/live.py
from typing import Annotated, Dict, List, Optional
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db

"""
Canlı maçlar (API-FOOTBALL v3)
- ENV: API_FOOTBALL_KEY=<your-key>
- Endpoint: /api/live/matches
- Çıktı: { id, league, home{name,logo}, away{name,logo}, minute, scoreH, scoreA }
"""

router = APIRouter(prefix="/live", tags=["live"])
API_BASE = "https://v3.football.api-sports.io"


@router.get("/matches")
async def list_live_matches(
    db: Annotated[Session, Depends(get_db)],
    league: Optional[str] = Query(None, description="Lig adı filtresi (örn: 'Süper Lig')"),
    limit: int = Query(50, ge=1, le=200, description="Maksimum maç sayısı"),
) -> List[Dict]:
    api_key = os.getenv("API_FOOTBALL_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="API_FOOTBALL_KEY missing in environment")

    headers = {"x-apisports-key": api_key}
    url = f"{API_BASE}/fixtures"
    params = {"live": "all"}  # tüm canlı maçlar

    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            resp = await client.get(url, headers=headers, params=params)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Upstream request failed: {e}") from e

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json() or {}
    items = data.get("response", []) or []

    out: List[Dict] = []
    for it in items:
        fixture = it.get("fixture") or {}
        league_obj = it.get("league") or {}
        teams = it.get("teams") or {}
        goals = it.get("goals") or {}

        # dakika
        status = fixture.get("status") or {}
        minute = _to_int(status.get("elapsed"))

        league_name = league_obj.get("name") or ""
        if league and league_name != league:
            continue

        home = teams.get("home") or {}
        away = teams.get("away") or {}

        out.append(
            {
                "id": str(fixture.get("id") or ""),
                "league": league_name,
                "leagueLogo": league_obj.get("logo") or "",
                "home": {"name": home.get("name") or "Home", "logo": home.get("logo") or ""},
                "away": {"name": away.get("name") or "Away", "logo": away.get("logo") or ""},
                "minute": minute,
                "scoreH": _to_int(goals.get("home")),
                "scoreA": _to_int(goals.get("away")),
            }
        )
        if len(out) >= limit:
            break

    return out


def _to_int(v) -> int:
    try:
        return int(v) if v is not None else 0
    except (TypeError, ValueError):
        return 0
