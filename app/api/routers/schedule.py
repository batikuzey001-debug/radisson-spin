# app/api/routers/schedule.py
from typing import Annotated, Dict, List, Optional, Tuple
import os
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db

# DIKKAT: prefix artık /fixtures  ->  /api/fixtures/upcoming
router = APIRouter(prefix="/fixtures", tags=["fixtures"])
API_BASE = "https://v3.football.api-sports.io"

def _api_key() -> str:
    key = os.getenv("API_FOOTBALL_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=500, detail="API_FOOTBALL_KEY missing in environment")
    return key

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

@router.get("/upcoming")
async def list_upcoming_matches(
    db: Annotated[Session, Depends(get_db)],
    days: int = Query(7, ge=1, le=30, description="Önümüzdeki X gün"),
    limit: int = Query(200, ge=1, le=500, description="Maksimum maç sayısı"),
    league: Optional[int] = Query(None, description="Opsiyonel lig ID (örn: 206)"),
) -> List[Dict]:
    """
    Önümüzdeki X gün içindeki fikstürler.
    Sağlayıcı bazen from/to boş döndüğü için next=500 alıp 7 güne lokalde filtreliyoruz.
    """
    headers = {"x-apisports-key": _api_key()}

    now = _now_utc()
    until_ts = int((now + timedelta(days=days)).timestamp())

    params: Dict[str, str | int] = {"next": 500}
    if league:
        params["league"] = league

    js = await _fetch_json(f"{API_BASE}/fixtures", headers, params)
    items = js.get("response", []) or []

    out: List[Dict] = []
    for it in items:
        fixture = it.get("fixture") or {}
        lg = it.get("league") or {}
        tms = it.get("teams") or {}
        iso = fixture.get("date") or ""
        try:
            kick = datetime.fromisoformat(iso.replace("Z", "+00:00"))
            kick_ts = int(kick.timestamp())
        except Exception:
            continue
        if not (int(now.timestamp()) <= kick_ts <= until_ts):
            continue
        out.append({
            "id": str(fixture.get("id") or ""),
            "kickoff": iso,
            "league": lg.get("name") or "",
            "leagueLogo": lg.get("logo") or "",
            "leagueFlag": lg.get("flag") or "",
            "home": {"name": (tms.get("home") or {}).get("name"), "logo": (tms.get("home") or {}).get("logo")},
            "away": {"name": (tms.get("away") or {}).get("name"), "logo": (tms.get("away") or {}).get("logo")},
        })
        if len(out) >= limit:
            break
    out.sort(key=lambda x: x.get("kickoff") or "")
    return out
