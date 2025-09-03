# app/api/routers/live.py
from typing import Annotated, Dict, List, Optional
import os
import json
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import SiteConfig

"""
Canlı veriler (API-FOOTBALL v3)
ENV: API_FOOTBALL_KEY

Uçlar:
  - GET /api/live/matches
  - GET /api/live/stats?fixture={id}
  - GET /api/live/odds?fixture={id}&market=1[&bookmaker=...][&minute=...]
  - GET /api/live/featured?limit=12
      * Sadece popüler ligler (major + TR lig/kupalar + Avrupa/ulusal)
      * Canlı maçları önem puanına göre sırala
      * Canlı yoksa 15 güne kadar (next=300) popüler maçları getir
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


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def _fetch_json(url: str, headers: Dict[str, str], params: Dict[str, str | int]) -> Dict:
    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            resp = await client.get(url, headers=headers, params=params)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Upstream request failed: {e}") from e
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json() or {}


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

    js = await _fetch_json(url, headers, params)
    items = js.get("response", []) or []

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
                "kickoff": fixture.get("date") or "",  # ISO
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
    headers = {"x-apisports-key": _api_key()}
    url = f"{API_BASE}/fixtures/statistics"
    params = {"fixture": str(fixture)}

    js = await _fetch_json(url, headers, params)
    rows = js.get("response", []) or []

    xg_home = 0.0
    xg_away = 0.0

    def _find_xg(stats_list: List[Dict]) -> float:
        for s in stats_list or []:
            t = (s.get("type") or "").strip().lower().replace(" ", "_")
            if t in ("expected_goals", "xg", "expected_goal"):
                return _to_float(s.get("value"))
        return 0.0

    if len(rows) >= 1:
        xg_home = _find_xg(rows[0].get("statistics") or [])
    if len(rows) >= 2:
        xg_away = _find_xg(rows[1].get("statistics") or [])

    return {"fixture": fixture, "xgH": round(xg_home, 2), "xgA": round(xg_away, 2)}


# ------------------------------
# Odds (akıllı: canlı/prematch + fallback)
# ------------------------------
@router.get("/odds")
async def fixture_odds(
    fixture: int = Query(..., description="Fixture (maç) ID"),
    market: int = Query(1, description="Market ID (1 = 1X2 / Match Winner)"),
    bookmaker: Optional[int] = Query(None, description="Bookmaker ID (opsiyonel)"),
    minute: Optional[int] = Query(None, description="Dakika (opsiyonel) — verilmezse fixture'tan alınır"),
) -> Dict[str, Optional[float]]:
    headers = {"x-apisports-key": _api_key()}

    if minute is None:
        # fixture detayından dakika tespit
        f_js = await _fetch_json(f"{API_BASE}/fixtures", headers, {"id": str(fixture)})
        f_rows = f_js.get("response", []) or []
        if f_rows:
            status = (f_rows[0].get("fixture") or {}).get("status") or {}
            minute = _to_int(status.get("elapsed"))
        else:
            minute = 0

    # minute >0 canlı; aksi prematch; boşta fallback
    paths = [f"{API_BASE}/odds/live", f"{API_BASE}/odds"] if (minute or 0) > 0 else [f"{API_BASE}/odds", f"{API_BASE}/odds/live"]
    params = {"fixture": str(fixture), "market": str(market)}
    if bookmaker:
        params["bookmaker"] = str(bookmaker)

    for url in paths:
        js = await _fetch_json(url, headers, params)
        parsed = _parse_odds_response(js, market)
        if any(v is not None for v in parsed.values()):
            return parsed
    return {"H": None, "D": None, "A": None}


def _parse_odds_response(js: Dict, market: int) -> Dict[str, Optional[float]]:
    result: Dict[str, Optional[float]] = {"H": None, "D": None, "A": None}
    items = js.get("response", []) or []
    if not items:
        return result
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
            return result
    return result


# ------------------------------
# Featured: Popüler maçlar (live / upcoming)
# ------------------------------
@router.get("/featured")
async def featured_matches(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(12, ge=1, le=50, description="Toplam kart sayısı"),
) -> Dict[str, List[Dict]]:
    headers = {"x-apisports-key": _api_key()}
    weights = _popular_weights(db)

    live_cards = await _fetch_live(headers, weights)
    live_scored = sorted(live_cards, key=lambda x: x["_score"], reverse=True)
    live_out = [strip_score(x) for x in live_scored[:limit]]

    upcoming_out: List[Dict] = []
    if len(live_out) < limit:
        need = limit - len(live_out)
        # 15 güne kadar: next=300
        upcoming_cards = await _fetch_upcoming(headers, weights, next_count=300)
        up_sorted = sorted(upcoming_cards, key=lambda x: x["_score"], reverse=True)
        upcoming_out = [strip_score(x) for x in up_sorted[:need]]

    return {"live": live_out, "upcoming": upcoming_out}


# ---- internal funcs ----
def strip_score(item: Dict) -> Dict:
    item.pop("_score", None)
    return item


def _popular_weights(db: Session) -> Dict[int, float]:
    DEFAULT_LIST: Dict[int, float] = {
        39: 1.00,   # EPL
        140: 1.00,  # La Liga
        135: 1.00,  # Serie A
        78: 0.95,   # Bundesliga
        61: 0.90,   # Ligue 1
        203: 1.00,  # TR Süper Lig
        204: 0.80,  # TR 1. Lig
        286: 0.90,  # Türkiye Kupası
        2: 1.20,    # UCL
        3: 1.05,    # UEL
        848: 0.95,  # UECL (yaygın id)
        1: 1.30,    # Dünya Kupası
        4: 1.10,    # EURO
        5: 0.90,    # UNL
    }
    try:
        row = db.get(SiteConfig, "popular_leagues")
        if row and row.value_text:
            arr = json.loads(row.value_text)
            for it in arr:
                lid = int(it.get("id"))
                w = float(it.get("w", 1.0))
                DEFAULT_LIST[lid] = w
    except Exception:
        pass
    return DEFAULT_LIST


def _excluded_league_name(name: str) -> bool:
    n = (name or "").lower()
    bad = ("u17", "u18", "u19", "u20", "u21", "u23", "women", "kadın", "youth", "reserve", "friendly youth")
    return any(b in n for b in bad)


async def _fetch_live(headers: Dict[str, str], weights: Dict[int, float]) -> List[Dict]:
    url = f"{API_BASE}/fixtures"
    params = {"live": "all"}
    out: List[Dict] = []

    js = await _fetch_json(url, headers, params)
    rows = js.get("response", []) or []
    for it in rows:
        fixture = it.get("fixture") or {}
        league = it.get("league") or {}
        teams = it.get("teams") or {}
        goals = it.get("goals") or {}

        lid = _to_int(league.get("id"))
        lname = league.get("name") or ""
        if lid not in weights or _excluded_league_name(lname):
            continue

        minute = _to_int((fixture.get("status") or {}).get("elapsed"))
        h = teams.get("home") or {}
        a = teams.get("away") or {}
        gh = _to_int(goals.get("home"))
        ga = _to_int(goals.get("away"))

        score = _live_score(lig_w=weights.get(lid, 0.5), minute=minute, diff=abs(gh - ga), total=gh + ga)

        out.append(
            {
                "id": str(fixture.get("id") or ""),
                "league": lname,
                "leagueLogo": league.get("logo") or "",
                "home": {"name": h.get("name") or "Home", "logo": h.get("logo") or ""},
                "away": {"name": a.get("name") or "Away", "logo": a.get("logo") or ""},
                "minute": minute,
                "scoreH": gh,
                "scoreA": ga,
                "kickoff": fixture.get("date") or "",
                "_score": score + 0.5,
            }
        )

    return out


def _live_score(lig_w: float, minute: int, diff: int, total: int) -> float:
    s = lig_w
    if 70 <= minute <= 90:
        s += 0.45
    elif 45 <= minute <= 60:
        s += 0.20
    elif 1 <= minute <= 15:
        s += 0.10
    if diff == 0:
        s += 0.30
    elif diff == 1:
        s += 0.15
    if total >= 3:
        s += 0.10
    return s


async def _fetch_upcoming(headers: Dict[str, str], weights: Dict[int, float], next_count: int = 300) -> List[Dict]:
    """
    Yaklaşan popüler maçlar (15 güne kadar): /fixtures?next=300
    """
    url = f"{API_BASE}/fixtures"
    params = {"next": next_count}
    out: List[Dict] = []

    js = await _fetch_json(url, headers, params)
    now = _now_utc()
    rows = js.get("response", []) or []
    for it in rows:
        fixture = it.get("fixture") or {}
        league = it.get("league") or {}
        teams = it.get("teams") or {}

        lid = _to_int(league.get("id"))
        lname = league.get("name") or ""
        if lid not in weights or _excluded_league_name(lname):
            continue

        dt_str = fixture.get("date")
        try:
            kick = datetime.fromisoformat((dt_str or "").replace("Z", "+00:00"))
        except Exception:
            continue

        hours_to_kick = max(0.0, (kick - now).total_seconds() / 3600.0)
        time_score = max(0.0, 24.0 - hours_to_kick) / 24.0  # daha yakınsa yüksek

        s = weights.get(lid, 0.5) + time_score

        h = teams.get("home") or {}
        a = teams.get("away") or {}

        out.append(
            {
                "id": str(fixture.get("id") or ""),
                "league": lname,
                "leagueLogo": league.get("logo") or "",
                "home": {"name": h.get("name") or "Home", "logo": h.get("logo") or ""},
                "away": {"name": a.get("name") or "Away", "logo": a.get("logo") or ""},
                "minute": 0,
                "scoreH": 0,
                "scoreA": 0,
                "kickoff": dt_str or "",
                "_score": s,
            }
        )

    return out
