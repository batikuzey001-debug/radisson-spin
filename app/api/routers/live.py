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
      (akıllı: minute>0 canlı; değilse prematch; boşsa fallback)
  - GET /api/live/featured?limit=12[&include_leagues=32,29][&show_all=1][&debug=1]
      * Popüler lig whitelist + önem puanı
      * Canlı yoksa 15 güne kadar (next=300) popüler maçlarla tamamlar
      * include_leagues: anlık whitelist’e ek (virgülle ayır)
      * show_all=1: whitelist’i kapat (U17/Women/Youth/Reserve yine hariç)
      * debug=1: istatistik döndürür
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


def _excluded_league_name(name: str) -> bool:
    """
    U17/U19/U21/U23/Women/Youth/Reserve gibi alt yaş/rezerv/ kadın ligleri hariç.
    """
    n = (name or "").lower()
    bad = ("u17", "u18", "u19", "u20", "u21", "u23", "women", "kadın", "youth", "reserve", "friendly youth")
    return any(b in n for b in bad)


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
    js = await _fetch_json(f"{API_BASE}/fixtures", headers, {"live": "all"})
    items = js.get("response", []) or []
    out: List[Dict] = []
    for it in items:
        fixture = it.get("fixture") or {}
        league_obj = it.get("league") or {}
        teams = it.get("teams") or {}
        goals = it.get("goals") or {}

        minute = _to_int((fixture.get("status") or {}).get("elapsed"))
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
                "kickoff": fixture.get("date") or "",
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
    js = await _fetch_json(f"{API_BASE}/fixtures/statistics", headers, {"fixture": str(fixture)})
    rows = js.get("response", []) or []

    def _find_xg(stats_list: List[Dict]) -> float:
        for s in stats_list or []:
            t = (s.get("type") or "").strip().lower().replace(" ", "_")
            if t in ("expected_goals", "xg", "expected_goal"):
                return _to_float(s.get("value"))
        return 0.0

    xg_home = _find_xg((rows[0] or {}).get("statistics") or []) if len(rows) >= 1 else 0.0
    xg_away = _find_xg((rows[1] or {}).get("statistics") or []) if len(rows) >= 2 else 0.0
    return {"fixture": fixture, "xgH": round(xg_home, 2), "xgA": round(xg_away, 2)}


# ------------------------------
# Odds (smart prematch/live + fallback)
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
        f_js = await _fetch_json(f"{API_BASE}/fixtures", headers, {"id": str(fixture)})
        f_rows = f_js.get("response", []) or []
        minute = _to_int(((f_rows[0] or {}).get("fixture") or {}).get("status", {}).get("elapsed"))

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
    include_leagues: Optional[str] = Query(None, description="Virgüllü lig ID'leri (ör: 32,29)"),
    show_all: int = Query(0, ge=0, le=1, description="1=whitelist kapalı (sadece alt yaş/kadın/rezerv hariç)"),
    debug: int = Query(0, ge=0, le=1, description="1=debug sayıları döndür"),
) -> Dict[str, List[Dict] | Dict]:
    headers = {"x-apisports-key": _api_key()}
    weights = _popular_weights(db, include_leagues, show_all)

    # CANLI
    live_cards, dbg_live = await _fetch_live(headers, weights, show_all=bool(show_all))
    live_scored = sorted(live_cards, key=lambda x: x["_score"], reverse=True)
    live_out = [strip_score(x) for x in live_scored[:limit]]

    # UPCOMING (15 güne kadar, next=300)
    upcoming_out: List[Dict] = []
    dbg_up: Dict[str, int] = {"raw": 0, "filtered": 0}
    if len(live_out) < limit:
        need = limit - len(live_out)
        up_cards, dbg_up = await _fetch_upcoming(headers, weights, show_all=bool(show_all), next_count=300)
        up_sorted = sorted(up_cards, key=lambda x: x["_score"], reverse=True)
        upcoming_out = [strip_score(x) for x in up_sorted[:need]]

    resp: Dict[str, List[Dict] | Dict] = {"live": live_out, "upcoming": upcoming_out}
    if debug:
        resp["debug"] = {
            "whitelist_on": not bool(show_all),
            "whitelist_size": len(weights),
            "include_leagues": include_leagues,
            "live_counts": dbg_live,
            "upcoming_counts": dbg_up,
        }
    return resp


# ---- internal funcs ----
def strip_score(item: Dict) -> Dict:
    item.pop("_score", None)
    return item


def _popular_weights(
    db: Session,
    include_leagues: Optional[str],
    show_all: bool,
) -> Dict[int, float]:
    """
    Varsayılan popüler lig listesi (koddan, CMS gerekmeden).
    Türkiye Kupası **206** olarak sabit.
    include_leagues ile anlık ekleme yapılabilir.
    show_all=True ise bu whitelist sadece 'weight lookup' için kalır; filtre uygulamayız.
    """
    DEFAULT_LIST: Dict[int, float] = {
        # Avrupa büyük 5
        39: 1.00, 140: 1.00, 135: 1.00, 78: 0.95, 61: 0.90,
        # Türkiye
        203: 1.00, 204: 0.80, 206: 0.95,  # 206 DOĞRU ID (Türkiye Kupası)
        # Avrupa kupaları
        2: 1.20, 3: 1.05, 848: 0.95,
        # Ulusal/elemeler
        32: 1.20, 29: 1.10, 34: 1.10, 31: 1.00,
    }
    # CMS override (varsa)
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
    # URL ile ekleme
    if include_leagues:
        try:
            for s in include_leagues.split(","):
                lid = int(s.strip())
                if lid:
                    DEFAULT_LIST.setdefault(lid, 0.8)
        except Exception:
            pass
    return DEFAULT_LIST


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


async def _fetch_live(
    headers: Dict[str, str],
    weights: Dict[int, float],
    show_all: bool = False,
) -> (List[Dict], Dict[str, int]):
    js = await _fetch_json(f"{API_BASE}/fixtures", headers, {"live": "all"})
    rows = js.get("response", []) or []
    out: List[Dict] = []
    raw = len(rows)
    kept = 0

    for it in rows:
        fixture = it.get("fixture") or {}
        league = it.get("league") or {}
        teams = it.get("teams") or {}
        goals = it.get("goals") or {}

        lid = _to_int(league.get("id"))
        lname = league.get("name") or ""
        if not show_all:
            if lid not in weights or _excluded_league_name(lname):
                continue
        else:
            if _excluded_league_name(lname):
                continue

        minute = _to_int((fixture.get("status") or {}).get("elapsed"))
        h = teams.get("home") or {}
        a = teams.get("away") or {}
        gh = _to_int(goals.get("home"))
        ga = _to_int(goals.get("away"))

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
                "_score": _live_score(weights.get(lid, 0.5), minute, abs(gh - ga), gh + ga) + 0.5,
            }
        )
        kept += 1

    return out, {"raw": raw, "filtered": kept}


async def _fetch_upcoming(
    headers: Dict[str, str],
    weights: Dict[int, float],
    show_all: bool = False,
    next_count: int = 300,
) -> (List[Dict], Dict[str, int]):
    js = await _fetch_json(f"{API_BASE}/fixtures", headers, {"next": next_count})
    now = _now_utc()
    rows = js.get("response", []) or []
    out: List[Dict] = []
    raw = len(rows)
    kept = 0

    for it in rows:
        fixture = it.get("fixture") or {}
        league = it.get("league") or {}
        teams = it.get("teams") or {}

        lid = _to_int(league.get("id"))
        lname = league.get("name") or ""
        if not show_all:
            if lid not in weights or _excluded_league_name(lname):
                continue
        else:
            if _excluded_league_name(lname):
                continue

        dt_str = fixture.get("date")
        try:
            kick = datetime.fromisoformat((dt_str or "").replace("Z", "+00:00"))
        except Exception:
            continue

        hours_to_kick = max(0.0, (kick - now).total_seconds() / 3600.0)
        time_score = max(0.0, 24.0 - hours_to_kick) / 24.0

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
                "_score": weights.get(lid, 0.5) + time_score,
            }
        )
        kept += 1

    return out, {"raw": raw, "filtered": kept}
