# app/api/routers/live.py
from typing import Annotated, Dict, List, Optional
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db

"""
Canlı veriler (API-FOOTBALL v3)
ENV: API_FOOTBALL_KEY
Uçlar:
  - GET /api/live/matches                    -> canlı maç listesi (kart için temel alanlar)
  - GET /api/live/stats?fixture={id}         -> xG (yoksa 0)
  - GET /api/live/odds?fixture={id}&market=1 -> 1X2 vb. oranlar (H/D/A)
"""

router = APIRouter(prefix="/live", tags=["live"])
API_BASE = "https://v3.football.api-sports.io"


# ------------------------------
# Helpers
# ------------------------------
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


def _to_float(v) -> float:
    try:
        if v is None:
            return 0.0
        if isinstance(v, str):
            v = v.replace(",", ".")
        return float(v)
    except (TypeError, ValueError):
        return 0.0


# ------------------------------
# Matches (live)
# ------------------------------
@router.get("/matches")
async def list_live_matches(
    db: Annotated[Session, Depends(get_db)],
    league: Optional[str] = Query(None, description="Lig adı filtresi (örn: 'Süper Lig')"),
    limit: int = Query(50, ge=1, le=200, description="Maksimum maç sayısı"),
) -> List[Dict]:
    headers = {"x-apisports-key": _api_key()}
    url = f"{API_BASE}/fixtures"
    params = {"live": "all"}

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


# ------------------------------
# Fixture Statistics -> xG
# ------------------------------
@router.get("/stats")
async def fixture_stats(
    fixture: int = Query(..., description="Fixture (maç) ID"),
) -> Dict[str, float]:
    """
    xG değerleri yoksa 0 döner.
    Kaynak: /v3/fixtures/statistics?fixture={id}
    """
    headers = {"x-apisports-key": _api_key()}
    url = f"{API_BASE}/fixtures/statistics"
    params = {"fixture": str(fixture)}

    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            resp = await client.get(url, headers=headers, params=params)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Upstream request failed: {e}") from e

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    js = resp.json() or {}
    rows = js.get("response", []) or []

    # response genellikle 2 satır (home/away) içerir
    xg_home = 0.0
    xg_away = 0.0

    # type alanı bazı liglerde "expected_goals", bazılarında "Expected Goals" benzeri olabilir.
    def _find_xg(stats_list: List[Dict]) -> float:
        for s in stats_list or []:
            t = (s.get("type") or "").strip().lower().replace(" ", "_")
            if t in ("expected_goals", "xg", "expected_goal"):
                return _to_float(s.get("value"))
        return 0.0

    # Takım sırası: genelde home sonra away; ama emniyet için team.id/name kontrol edilebilir.
    if len(rows) >= 1:
        xg_home = _find_xg(rows[0].get("statistics") or [])
    if len(rows) >= 2:
        xg_away = _find_xg(rows[1].get("statistics") or [])

    return {"fixture": fixture, "xgH": round(xg_home, 2), "xgA": round(xg_away, 2)}


# ------------------------------
# Odds (bookmakers / markets)
# ------------------------------
@router.get("/odds")
async def fixture_odds(
    fixture: int = Query(..., description="Fixture (maç) ID"),
    market: int = Query(1, description="Market ID (1 = 1X2 / Match Winner)"),
    bookmaker: Optional[int] = Query(None, description="Bookmaker ID (opsiyonel)"),
) -> Dict[str, Optional[float]]:
    """
    1X2 varsayılan: H/D/A oranları döner.
    Kaynak: /v3/odds?fixture={id}&market={market}[&bookmaker={id}]
    Dönüş: { H: 1.85, D: 3.40, A: 4.20 }
    """
    headers = {"x-apisports-key": _api_key()}
    url = f"{API_BASE}/odds"
    params = {"fixture": str(fixture), "market": str(market)}
    if bookmaker:
        params["bookmaker"] = str(bookmaker)

    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            resp = await client.get(url, headers=headers, params=params)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Upstream request failed: {e}") from e

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    js = resp.json() or {}
    items = js.get("response", []) or []

    # Varsayılan: boş dönerse None
    result: Dict[str, Optional[float]] = {"H": None, "D": None, "A": None}

    if not items:
        return result

    # response[0].bookmakers[].bets[] içinde market çeşitli isimlerde olabilir; ID ile filtreledik.
    # İlk bookmaker/bet alınır; spesifik bookmaker istenirse parametre geçilebilir.
    for bm in items[0].get("bookmakers", []) or []:
        for bet in bm.get("bets", []) or []:
            try:
                bet_id = int(bet.get("id"))
            except Exception:
                bet_id = None
            if bet_id != market:
                continue
            for v in bet.get("values", []) or []:
                label = (v.get("value") or "").strip().lower()
                odd = _to_float(v.get("odd"))
                if label in ("home", "1"):
                    result["H"] = odd
                elif label in ("draw", "x"):
                    result["D"] = odd
                elif label in ("away", "2"):
                    result["A"] = odd
            return result  # marketi bulduk, çık
    return result
