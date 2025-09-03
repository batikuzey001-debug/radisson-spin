# app/api/routers/live.py
from typing import Annotated, Dict, List, Optional, Tuple
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
      canlı maç listesi (kart için temel alanlar)
  - GET /api/live/stats?fixture={id}
      xG (yoksa 0)
  - GET /api/live/odds?fixture={id}&market=1[&bookmaker=...][&minute=...]
      Akıllı oran: minute>0 ise canlı / değilse prematch; boşsa fallback
      Dönüş: { H, D, A }
  - GET /api/live/featured?limit=12
      * Sadece popüler ligler (major ligler + TR lig/kupalar + Avrupa/ulusal)
      * Canlı maçları önem puanına göre sırala, canlı yoksa en yakın popüler maçları getir
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
    """
    minute > 0  -> /odds/live (canlı)
    minute == 0 -> /odds       (prematch)
    Boşsa fallback diğerine.
    Dönüş: { H: 1.85, D: 3.40, A: 4.20 } (yoksa None)
    """
    headers = {"x-apisports-key": _api_key()}

    # minute yoksa fixture'tan al
    if minute is None:
        minute = await _fetch_fixture_minute(headers, fixture)

    # canlı mı prematch mi?
    paths = []
    if (minute or 0) > 0:
        paths = [f"{API_BASE}/odds/live", f"{API_BASE}/odds"]  # önce canlı, sonra prematch
    else:
        paths = [f"{API_BASE}/odds", f"{API_BASE}/odds/live"]  # önce prematch, sonra canlı

    params = {"fixture": str(fixture), "market": str(market)}
    if bookmaker:
        params["bookmaker"] = str(bookmaker)

    # dene: primary -> fallback
    parsed = {"H": None, "D": None, "A": None}
    for url in paths:
        js = await _fetch_json(url, headers, params)
        tmp = _parse_odds_response(js, market)
        if any(v is not None for v in tmp.values()):
            return tmp
        # değilse fallback'e devam
    return parsed


async def _fetch_fixture_minute(headers: Dict[str, str], fixture_id: int) -> int:
    """ /fixtures?id=... ile dakika tespit et """
    url = f"{API_BASE}/fixtures"
    params = {"id": str(fixture_id)}
    js = await _fetch_json(url, headers, params)
    rows = js.get("response", []) or []
    if not rows:
        return 0
    status = (rows[0].get("fixture") or {}).get("status") or {}
    return _to_int(status.get("elapsed"))


def _parse_odds_response(js: Dict, market: int) -> Dict[str, Optional[float]]:
    result: Dict[str, Optional[float]] = {"H": None, "D": None, "A": None}
    items = js.get("response", []) or []
    if not items:
        return result
    # Genellikle items[0].bookmakers[].bets[] altında market bulunur
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
    """
    KURAL:
      - Sadece popüler ligler (major ligler + Türkiye lig/kupalar + Avrupa/ulusal)
      - Canlı maçlar önem puanına göre sıralanır.
      - Canlı yoksa (veya azsa) en yakın başlayacak popüler maçlarla tamamlanır.

    CMS Override:
      SiteConfig.key = "popular_leagues"
      value_text = JSON: [{"id":203,"w":1.0},{"id":39,"w":1.0},{"id":2,"w":1.2}, ...]
      * Yoksa DEFAULT_LIST kullanılır.
    """
    headers = {"x-apisports-key": _api_key()}
    weights = _popular_weights(db)  # league_id -> weight

    # 1) CANLI
    live_cards = await _fetch_live(headers, weights)
    live_scored = sorted(live_cards, key=lambda x: x["_score"], reverse=True)
    live_out = [strip_score(x) for x in live_scored[:limit]]

    # 2) UPCOMING (gerekirse tamamla)
    upcoming_out: List[Dict] = []
    if len(live_out) < limit:
        need = limit - len(live_out)
        upcoming_cards = await _fetch_upcoming(headers, weights)
        up_sorted = sorted(upcoming_cards, key=lambda x: x["_score"], reverse=True)
        upcoming_out = [strip_score(x) for x in up_sorted[:need]]

    return {"live": live_out, "upcoming": upcoming_out}


# ---- internal funcs ----
def strip_score(item: Dict) -> Dict:
    item.pop("_score", None)
    return item


def _popular_weights(db: Session) -> Dict[int, float]:
    """
    Popüler ligler ve ağırlıkları.
    1) DEFAULT_LIST: Major ligler + TR lig/kupalar + Avrupa/ulusal (UEFA/World)
    2) CMS 'popular_leagues' JSON ile override/ekleme yapılabilir.
    """
    # API-FOOTBALL genel IDs (en yaygın)
    DEFAULT_LIST: Dict[int, float] = {
        # Avrupa büyük 5
        39: 1.00,   # EPL
        140: 1.00,  # La Liga
        135: 1.00,  # Serie A
        78: 0.95,   # Bundesliga
        61: 0.90,   # Ligue 1
        # Türkiye
        203: 1.00,  # Süper Lig
        204: 0.80,  # 1. Lig
        286: 0.90,  # Türkiye Kupası
        # Avrupa kupaları
        2: 1.20,    # UEFA Champions League
        3: 1.05,    # UEFA Europa League
        848: 0.95,  # UEFA Conference League (yaygın id)
        # Ulusal (örnek)
        1: 1.30,    # World Cup
        4: 1.10,    # EURO
        5: 0.90,    # UEFA Nations League
    }
    # CMS override
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
    """
    U17/U19/U21/U23/Women/Youth/Reserve gibi alt yaş/rezerv/y.kadın ligleri hariç.
    """
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
            continue  # popüler listede yoksa gösterme

        minute = _to_int((fixture.get("status") or {}).get("elapsed"))
        h = teams.get("home") or {}
        a = teams.get("away") or {}
        gh = _to_int(goals.get("home"))
        ga = _to_int(goals.get("away"))

        score = _live_score(
            lig_w=weights.get(lid, 0.5),
            minute=minute,
            diff=abs(gh - ga),
            total=gh + ga,
        )

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
                "_score": score + 0.5,  # canlı olduğu için ekstra öncelik
            }
        )

    return out


def _live_score(lig_w: float, minute: int, diff: int, total: int) -> float:
    # Lig ağırlığı
    s = lig_w
    # Dakika etkisi (kritik anlar)
    if 70 <= minute <= 90:
        s += 0.45
    elif 45 <= minute <= 60:
        s += 0.20
    elif 1 <= minute <= 15:
        s += 0.10
    # Skor yakınlığı
    if diff == 0:
        s += 0.30
    elif diff == 1:
        s += 0.15
    # Gol sayısı (tempo göstergesi)
    if total >= 3:
        s += 0.10
    return s


async def _fetch_upcoming(headers: Dict[str, str], weights: Dict[int, float]) -> List[Dict]:
    """
    Yaklaşan popüler maçlar (24-48 saat penceresi).
    /fixtures?next=60 kullanımı ile yakındaki fikstürleri alıyoruz.
    """
    url = f"{API_BASE}/fixtures"
    params = {"next": 60}
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

        dt_str = fixture.get("date")  # ISO
        try:
            kick = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        except Exception:
            continue

        hours_to_kick = max(0.0, (kick - now).total_seconds() / 3600.0)
        # Yakın tarih bonusu (daha erken = daha yüksek)
        time_score = max(0.0, 24.0 - hours_to_kick) / 24.0  # 0..1

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
                "_score": s,
            }
        )

    return out
