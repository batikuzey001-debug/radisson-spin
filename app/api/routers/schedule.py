# app/api/routers/schedule.py
from typing import Annotated, Dict, List, Optional
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db

# NOT: Artık prefix /fixtures → /api/fixtures
router = APIRouter(prefix="/fixtures", tags=["fixtures"])
API_BASE = "https://v3.football.api-sports.io"


# ------------- helpers -------------
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


def _parse_iso_to_ts(iso: str) -> Optional[int]:
    try:
        # provider ISO: "2025-09-04T14:00:00+00:00"
        return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp())
    except Exception:
        return None


# ------------- fixtures (raw list from a start date) -------------
@router.get("")
async def list_fixtures_from(
    db: Annotated[Session, Depends(get_db)],
    start: str = Query(..., description="Başlangıç tarihi (YYYY-MM-DD)"),
    league: Optional[int] = Query(None, description="Opsiyonel lig ID (örn: 206 Türkiye Kupası)"),
    limit: int = Query(500, ge=1, le=1000, description="Döndürülecek maksimum maç sayısı"),
) -> List[Dict]:
    """
    Sağlayıcıdan geniş bir pencere (next=800) alınır; 'start' tarihinden
    itibaren olan fikstürler FRONTEND için sadeleştirilmiş şekilde döndürülür.
    Filtreleme (örn. 7 gün) FE'de yapılacaktır.

    Dönüş şeması:
    [
      {
        "id": "...",
        "kickoff": "2025-09-04T14:00:00+00:00",
        "league": "Cup",
        "leagueLogo": "...",
        "leagueFlag": "...",
        "home": {"name":"...", "logo":"..."},
        "away": {"name":"...", "logo":"..."}
      },
      ...
    ]
    """
    # start -> UTC 00:00 ts
    try:
        start_dt = datetime.fromisoformat(start).replace(tzinfo=timezone.utc)
        start_ts = int(start_dt.timestamp())
    except Exception:
        raise HTTPException(status_code=400, detail="start formatı YYYY-MM-DD olmalı")

    headers = {"x-apisports-key": _api_key()}

    # Geniş pencere: sıradaki 800 fikstürü al (opsiyonel lig daraltması)
    params: Dict[str, str | int] = {"next": 800}
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
        kick_ts = _parse_iso_to_ts(iso)
        if kick_ts is None or kick_ts < start_ts:
            continue  # sadece başlangıç tarihinden SONRAKİ maçları al

        out.append(
            {
                "id": str(fixture.get("id") or ""),
                "kickoff": iso,
                "league": lg.get("name") or "",
                "leagueLogo": lg.get("logo") or "",
                "leagueFlag": lg.get("flag") or "",
                "home": {"name": (tms.get("home") or {}).get("name"), "logo": (tms.get("home") or {}).get("logo")},
                "away": {"name": (tms.get("away") or {}).get("name"), "logo": (tms.get("away") or {}).get("logo")},
            }
        )

        if len(out) >= limit:
            break

    # kickoff'a göre artan sırala
    out.sort(key=lambda x: x.get("kickoff") or "")
    return out
