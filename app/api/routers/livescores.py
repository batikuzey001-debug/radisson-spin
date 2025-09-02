# app/api/routers/livescores.py
# Sportmonks canlı skor kart verisi (in-play + GÜNÜN FİKSTÜRÜ fallback)
# Uçlar:
#   GET /livescores/list   -> [{league, home, away, score, time, odds, prob}]
#   GET /livescores        -> ticker string listesi
#   GET /livescores/sample -> ilk kayıt + teşhis
#
# ENV (Railway → API Service → Variables):
#   SPORTMONKS_TOKEN=...                         (zorunlu)
#   SPORTMONKS_BASE=https://api.sportmonks.com   (opsiyonel)
#   SPORTMONKS_TTL=8                             (opsiyonel)
#   SPORTMONKS_LIVE_PATH=/v3/football/livescores/inplay?per_page=50&include=participants;time;scores;periods;league
#   SPORTMONKS_FIXTURES_PATH=/v3/football/fixtures?per_page=50&include=participants;league
#   SPORTMONKS_ODDS_PATH=...                     (opsiyonel; 1X2 market listesi, fixture_id içermeli)
#   SPORTMONKS_STATS_PATH=...                    (opsiyonel; xG / FULLTIME_RESULT_PROBABILITY listesi)
#
# Not: In-play boşsa, bugünün (UTC) maçlarını FIXTURES ile KO saatiyle döndürür.

import os, json, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple, Optional
from fastapi import APIRouter, HTTPException

router = APIRouter()

TOKEN = os.getenv("SPORTMONKS_TOKEN", "").strip()
BASE  = (os.getenv("SPORTMONKS_BASE") or "https://api.sportmonks.com").rstrip("/")
TTL   = int(os.getenv("SPORTMONKS_TTL", "8"))

LIVE_PATH     = (os.getenv("SPORTMONKS_LIVE_PATH")     or "/v3/football/livescores/inplay?per_page=50&include=participants;time;scores;periods;league").lstrip("/")
FIXTURES_PATH = (os.getenv("SPORTMONKS_FIXTURES_PATH") or "/v3/football/fixtures?per_page=50&include=participants;league").lstrip("/")
ODDS_PATH     = (os.getenv("SPORTMONKS_ODDS_PATH")     or "").lstrip("/") or None
STATS_PATH    = (os.getenv("SPORTMONKS_STATS_PATH")    or "").lstrip("/") or None

UA = {"User-Agent": "Mozilla/5.0"}
_CACHE = {"t": 0.0, "norm": [], "sample": [], "diag": []}

def _http_get(url: str) -> Any:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read()
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return raw.decode("utf-8")

def _q(url: str, kv: Dict[str, str]) -> str:
    sep = "&" if ("?" in url) else "?"
    return url + sep + urllib.parse.urlencode(kv)

def _as_list(data: Any) -> List[dict]:
    if isinstance(data, list): return data
    if isinstance(data, dict):
        for k in ("data", "response", "results", "events", "matches"):
            v = data.get(k)
            if isinstance(v, list): return v
    return []

def _dig(d: dict, path: str):
    cur = d
    for p in path.split("."):
        if isinstance(cur, dict): cur = cur.get(p)
        else: return None
    return cur

def _teams_from_participants(rec: dict) -> Tuple[Dict, Dict]:
    home = {"name": "", "logo": None, "xg": None}
    away = {"name": "", "logo": None, "xg": None}
    for p in rec.get("participants") or []:
        loc = ((p.get("meta") or {}).get("location") or p.get("location") or "").lower()
        nm  = p.get("name") or p.get("short_name") or p.get("short_code") or ""
        lg  = p.get("image_path")
        if loc.startswith("home") and not home["name"]:
            home.update({"name": nm, "logo": lg})
        elif loc.startswith("away") and not away["name"]:
            away.update({"name": nm, "logo": lg})
    return home, away

def _scores(rec: dict) -> Tuple[Optional[int], Optional[int]]:
    s = rec.get("scores") or {}
    hs = s.get("home_score");  as_ = s.get("away_score")
    if hs is None: hs = s.get("localteam_score")
    if as_ is None: as_ = s.get("visitorteam_score")
    try:  hs_i = int(hs) if hs not in (None, "") else None
    except: hs_i = None
    try:  as_i = int(as_) if as_ not in (None, "") else None
    except: as_i = None
    return hs_i, as_i

def _minute_from_periods(rec: dict) -> str:
    prds = rec.get("periods") or []
    if not prds: return ""
    last = prds[-1]
    mm = last.get("minutes"); ss = last.get("seconds")
    try:
        mm_i = int(mm) if mm is not None else None
        ss_i = int(ss) if ss is not None else None
    except:
        mm_i = ss_i = None
    if mm_i is None: return (last.get("description") or "")
    if ss_i is None: return f"{mm_i}'"
    return f"{mm_i}'{ss_i:02d}\""

def _minute_or_status(rec: dict) -> str:
    txt = _minute_from_periods(rec)
    if txt: return txt
    t = rec.get("time") or {}
    minute = t.get("minute") or t.get("elapsed") or t.get("minute_extra") or ""
    status = t.get("status") or rec.get("status") or ""
    return f"{minute}'" if minute else str(status or "")

def _league_info(rec: dict) -> Dict:
    return {"name": _dig(rec, "league.name") or rec.get("league_name") or "", "logo": _dig(rec, "league.image_path")}

def _ko_hhmm_utc(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z","+00:00")).astimezone(timezone.utc)
        return "KO " + dt.strftime("%H:%M")
    except Exception:
        return "KO"

def _normalize_live_rows(live_rows: List[dict]) -> Dict[int, dict]:
    out: Dict[int, dict] = {}
    for rec in live_rows:
        fid = rec.get("id") or rec.get("fixture_id") or _dig(rec, "fixture_id")
        if fid is None: continue
        home, away = _teams_from_participants(rec)
        hs, as_ = _scores(rec)
        out[int(fid)] = {
            "fixture_id": int(fid),
            "league": _league_info(rec),
            "home": home,
            "away": away,
            "score": {"home": hs, "away": as_},
            "time": _minute_or_status(rec),
            "odds": {"H": None, "D": None, "A": None, "bookmaker": None},
            "prob": {"H": None, "D": None, "A": None},
        }
    return out

def _normalize_fixtures_rows(fix_rows: List[dict]) -> Dict[int, dict]:
    # Bugünün maçlarını canlı değilse KO saatiyle göster
    out: Dict[int, dict] = {}
    for rec in fix_rows:
        fid = rec.get("id") or rec.get("fixture_id")
        if fid is None: continue
        home, away = _teams_from_participants(rec)
        ko = _dig(rec, "starting_at") or _dig(rec, "starting_at_iso") or ""
        out[int(fid)] = {
            "fixture_id": int(fid),
            "league": _league_info(rec),
            "home": home,
            "away": away,
            "score": {"home": None, "away": None},
            "time": _ko_hhmm_utc(str(ko)),
            "odds": {"H": None, "D": None, "A": None, "bookmaker": None},
            "prob": {"H": None, "D": None, "A": None},
        }
    return out

def _merge_odds(base: Dict[int, dict], odds_rows: List[dict]) -> None:
    for it in odds_rows or []:
        fid = it.get("fixture_id")
        if fid is None or int(fid) not in base: continue
        dev = (it.get("market") or {}).get("developer_name") or (it.get("market") or {}).get("name") or ""
        if "FULLTIME_RESULT" not in str(dev).upper(): continue
        label = (it.get("label") or "").strip().lower()
        try: val = float(str(it.get("value"))); 
        except: val = None
        bm = (it.get("bookmaker") or {}).get("name")
        card = base[int(fid)]
        if card["odds"]["bookmaker"] is None and bm: card["odds"]["bookmaker"] = bm
        if label.startswith("home"): card["odds"]["H"] = val
        elif label.startswith("draw"): card["odds"]["D"] = val
        elif label.startswith("away"): card["odds"]["A"] = val

def _merge_stats(base: Dict[int, dict], stats_rows: List[dict]) -> None:
    for it in stats_rows or []:
        fid = it.get("fixture_id")
        if fid is None or int(fid) not in base: continue
        tname = str((it.get("type") or {}).get("developer_name") or (it.get("type") or {}).get("name") or "").upper()
        if "EXPECTED_GOALS" in tname:
            loc = (it.get("location") or "").lower()
            try: val = float(str(_dig(it, "data.value"))); 
            except: val = None
            if loc.startswith("home"): base[int(fid)]["home"]["xg"] = val
            elif loc.startswith("away"): base[int(fid)]["away"]["xg"] = val
        elif "FULLTIME_RESULT_PROBABILITY" in tname:
            label = (it.get("label") or "").strip().lower()
            raw = _dig(it, "data.value")
            try:
                s = str(raw).strip().replace("%","")
                val = float(s); 
                if val <= 1.0: val *= 100.0
            except: val = None
            if label.startswith("home"): base[int(fid)]["prob"]["H"] = val
            elif label.startswith("draw"): base[int(fid)]["prob"]["D"] = val
            elif label.startswith("away"): base[int(fid)]["prob"]["A"] = val

def _pull_all() -> Tuple[List[dict], List[str]]:
    diag: List[str] = []

    # 1) In-play
    live_url = _q(f"{BASE}/{LIVE_PATH}", {"api_token": TOKEN})
    live_data = _http_get(live_url); live_rows = _as_list(live_data)
    diag.append(f"inplay:{len(live_rows)}")

    base = _normalize_live_rows(live_rows)

    # 2) Fallback: bugünün fikstürü (in-play yok/azsa)
    if len(base) == 0:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        fx_url = _q(f"{BASE}/{FIXTURES_PATH}", {"api_token": TOKEN, "date": today})
        fx_data = _http_get(fx_url); fx_rows = _as_list(fx_data)
        diag.append(f"fixtures[{today}]:{len(fx_rows)}")
        if fx_rows:
            base = _normalize_fixtures_rows(fx_rows)

    # 3) Opsiyonel birleşimler
    if ODDS_PATH:
        odds_url = _q(f"{BASE}/{ODDS_PATH}", {"api_token": TOKEN})
        odds_data = _http_get(odds_url); odds_rows = _as_list(odds_data)
        diag.append(f"odds:{len(odds_rows)}")
        _merge_odds(base, odds_rows)

    if STATS_PATH:
        stats_url = _q(f"{BASE}/{STATS_PATH}", {"api_token": TOKEN})
        stats_data = _http_get(stats_url); stats_rows = _as_list(stats_data)
        diag.append(f"stats:{len(stats_rows)}")
        _merge_stats(base, stats_rows)

    return list(base.values()), diag

def _ensure_data():
    if not TOKEN:
        raise HTTPException(status_code=500, detail="SPORTMONKS_TOKEN eksik.")
    now = time.time()
    if now - _CACHE["t"] < TTL and _CACHE["norm"]:
        return
    try:
        norm, diag = _pull_all()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Sportmonks hata: {e}")
    _CACHE.update(t=now, norm=norm, sample=(norm[:1] if norm else []), diag=diag)

def _fmt_ticker(row: dict) -> str:
    h, a = row["home"]["name"], row["away"]["name"]
    hs, as_ = row["score"]["home"], row["score"]["away"]
    sc = f"{hs}-{as_}" if (hs is not None or as_ is not None) else "vs"
    return f"⚽ {h} {sc} {a} • {row['time']} • {row['league']['name']}".strip()

@router.get("/livescores/list")
def livescores_list():
    _ensure_data()
    return _CACHE["norm"]

@router.get("/livescores")
def livescores_ticker():
    _ensure_data()
    return ([_fmt_ticker(r) for r in _CACHE["norm"]] or ["(Bugün için veri bulunamadı)"])[:40]

@router.get("/livescores/sample")
def livescores_sample():
    _ensure_data()
    return {"sample": _CACHE["sample"], "diag": _CACHE["diag"], "live": LIVE_PATH, "fixtures": FIXTURES_PATH, "odds": ODDS_PATH, "stats": STATS_PATH}
