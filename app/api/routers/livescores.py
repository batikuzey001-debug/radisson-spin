# app/api/routers/livescores.py
# Sportmonks canlı veri proxysi
# Uçlar:
#   GET /livescores/list
#   GET /livescores/bulletin?from=YYYY-MM-DD&to=YYYY-MM-DD[&leagues=1,2,3]
#   GET /livescores/sample

import os, json, time, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta, date as Date
from typing import Any, Dict, List, Tuple, Optional
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

# ---------------- ENV ----------------
def _clean_path(p: Optional[str]) -> Optional[str]:
    # Neden: ENV içine kopyalanan path'lerde \n,\r, boşluk hatası olabiliyor.
    if not p:
        return None
    s = str(p).replace("\r", "").replace("\n", "").strip()
    s = s.lstrip("/")
    return s or None

TOKEN  = (os.getenv("SPORTMONKS_TOKEN") or "").strip()
BASE   = ((os.getenv("SPORTMONKS_BASE") or "https://api.sportmonks.com").strip()).rstrip("/")
TTL    = int(os.getenv("SPORTMONKS_TTL", "8"))

# Doğru V3 path'ler
LIVE_PATH     = _clean_path(os.getenv("SPORTMONKS_LIVE_PATH")     or "/v3/football/livescores/inplay?per_page=50&include=participants;time;scores;periods;league.country")
FIXTURES_PATH = _clean_path(os.getenv("SPORTMONKS_FIXTURES_PATH") or "/v3/football/fixtures?per_page=100&include=participants;league.country;scores;venue")
ODDS_PATH     = _clean_path(os.getenv("SPORTMONKS_ODDS_PATH")     or "")   # Örn: /v3/football/odds/pre-match?per_page=50&include=market;bookmaker
PRED_PATH     = _clean_path(os.getenv("SPORTMONKS_PRED_PATH")     or "")   # Pakette yoksa boş bırak

UA = {"User-Agent": "Mozilla/5.0"}
_CACHE: Dict[str, Any] = {"t": 0.0, "norm": [], "sample": [], "diag": []}

# ------------- HTTP helpers -------------
def _http_get(url: str) -> Any:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        return {"__error__": f"HTTP {e.code} {e.reason} -> {url}"}
    except Exception as e:
        return {"__error__": f"ERR {e} -> {url}"}
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
        for k in ("data","response","results","events","matches"):
            v = data.get(k)
            if isinstance(v, list): return v
    return []

def _dig(d: dict, path: str):
    cur = d
    for p in path.split("."):
        if isinstance(cur, dict): cur = cur.get(p)
        else: return None
    return cur

# ------------ Fixtures URL helpers ------------
# FIXTURES_PATH içindeki query parçalarını koru (include, per_page, vb.)
_FX_QS = FIXTURES_PATH.split("?", 1)[1] if (FIXTURES_PATH and "?" in FIXTURES_PATH) else ""

def _fx_date_url(day: str) -> str:
    base = f"{BASE}/v3/football/fixtures/date/{day}"
    return base + (("?" + _FX_QS) if _FX_QS else "")

def _fx_between_url(start: str, end: str) -> str:
    base = f"{BASE}/v3/football/fixtures/between/{start}/{end}"
    return base + (("?" + _FX_QS) if _FX_QS else "")

# ------------- Normalization -------------
def _teams_from_participants(rec: dict) -> Tuple[Dict, Dict]:
    home = {"name":"", "logo":None}
    away = {"name":"", "logo":None}
    for p in rec.get("participants") or []:
        loc  = ((p.get("meta") or {}).get("location") or p.get("location") or "").lower()
        name = p.get("name") or p.get("short_name") or p.get("short_code") or ""
        logo = p.get("image_path")
        if loc.startswith("home") and not home["name"]: home.update({"name":name, "logo":logo})
        elif loc.startswith("away") and not away["name"]: away.update({"name":name, "logo":logo})
    return home, away

def _scores(rec: dict) -> Tuple[Optional[int], Optional[int]]:
    s = rec.get("scores")
    hs = as_ = None
    if isinstance(s, dict):
        hs = s.get("home_score") or s.get("localteam_score")
        as_ = s.get("away_score") or s.get("visitorteam_score")
    elif isinstance(s, list):
        src = None
        for it in s:
            if not isinstance(it, dict): continue
            label = (it.get("description") or it.get("type") or "").lower()
            if label in ("ft","fulltime","full time","current","live"):
                src = it; break
        if src is None and s and isinstance(s[0], dict):
            src = s[0]
        if isinstance(src, dict):
            hs = src.get("home_score") or src.get("localteam_score")
            as_ = src.get("away_score") or src.get("visitorteam_score")
    try: hs_i = int(hs) if hs not in (None,"") else None
    except: hs_i = None
    try: as_i = int(as_) if as_ not in (None,"") else None
    except: as_i = None
    return hs_i, as_i

def _minute_from_periods(rec: dict) -> str:
    pr = rec.get("periods") or []
    last = None
    if isinstance(pr, list) and pr:
        last = pr[-1] if isinstance(pr[-1], dict) else None
    elif isinstance(pr, dict):
        last = pr
    if not isinstance(last, dict): return ""
    mm = last.get("minutes"); ss = last.get("seconds")
    try: mm_i = int(mm) if mm is not None else None
    except: mm_i = None
    try: ss_i = int(ss) if ss is not None else None
    except: ss_i = None
    if mm_i is None: return (last.get("description") or "")
    if ss_i is None: return f"{mm_i}'"
    return f"{mm_i}'{ss_i:02d}\""

def _minute_or_status(rec: dict) -> str:
    t = _minute_from_periods(rec)
    if t: return t
    ti = rec.get("time") or {}
    minute = ti.get("minute") or ti.get("elapsed") or ti.get("minute_extra") or ""
    status = ti.get("status") or rec.get("status") or ""
    return f"{minute}'" if minute else str(status or "")

def _league_info(rec: dict) -> Dict:
    return {
        "id":   _dig(rec,"league.id") or rec.get("league_id"),
        "name": _dig(rec,"league.name") or rec.get("league_name") or "",
        "logo": _dig(rec,"league.image_path"),
        "country": {
            "id": _dig(rec,"league.country.id"),
            "name": _dig(rec,"league.country.name"),
            "flag": _dig(rec,"league.country.image_path"),
        }
    }

def _ko_utc_and_date(iso: str | None) -> Tuple[Optional[str], Optional[str]]:
    if not iso: return None, None
    try:
        dt = datetime.fromisoformat(str(iso).replace("Z","+00:00")).astimezone(timezone.utc)
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ"), dt.strftime("%Y-%m-%d")
    except Exception:
        return None, None

def _normalize_live_rows(rows: List[dict]) -> Dict[int, dict]:
    out: Dict[int, dict] = {}
    for rec in rows:
        fid = rec.get("id") or rec.get("fixture_id") or _dig(rec,"fixture_id")
        if fid is None: continue
        home, away = _teams_from_participants(rec)
        hs, as_ = _scores(rec)
        ko_iso = _dig(rec,"starting_at") or _dig(rec,"starting_at_iso")
        ko_utc, date_only = _ko_utc_and_date(ko_iso)
        out[int(fid)] = {
            "fixture_id": int(fid),
            "date": date_only,
            "kickoff_utc": ko_utc,
            "league": _league_info(rec),
            "home": home,
            "away": away,
            "score": {"home": hs, "away": as_},
            "time": _minute_or_status(rec),
            "odds": {"H": None, "D": None, "A": None, "bookmaker": "RadissonBet"},
            "prob": {"H": None, "D": None, "A": None},
        }
    return out

def _normalize_fixture_rows(rows: List[dict]) -> Dict[int, dict]:
    out: Dict[int, dict] = {}
    for rec in rows:
        fid = rec.get("id") or rec.get("fixture_id")
        if fid is None: continue
        home, away = _teams_from_participants(rec)
        hs, as_ = _scores(rec)
        ko_iso = _dig(rec,"starting_at") or _dig(rec,"starting_at_iso")
        ko_utc, date_only = _ko_utc_and_date(ko_iso)
        out[int(fid)] = {
            "fixture_id": int(fid),
            "date": date_only,
            "kickoff_utc": ko_utc,
            "league": _league_info(rec),
            "home": home,
            "away": away,
            "score": {"home": hs, "away": as_},
            "time": f"KO {ko_utc[11:16]}" if ko_utc else "KO",
            "odds": {"H": None, "D": None, "A": None, "bookmaker": "RadissonBet"},
            "prob": {"H": None, "D": None, "A": None},
        }
    return out

def _merge_odds(base: Dict[int, dict], rows: List[dict]) -> None:
    for it in rows or []:
        fid = it.get("fixture_id")
        if fid is None or int(fid) not in base: continue
        dev = (it.get("market") or {}).get("developer_name") or (it.get("market") or {}).get("name") or ""
        if "FULLTIME_RESULT" not in str(dev).upper(): continue
        label = (it.get("label") or "").strip().lower()
        try: val = float(str(it.get("value")))
        except: val = None
        if label.startswith("home"): base[int(fid)]["odds"]["H"] = val
        elif label.startswith("draw"): base[int(fid)]["odds"]["D"] = val
        elif label.startswith("away"): base[int(fid)]["odds"]["A"] = val

def _merge_predictions(base: Dict[int, dict], rows: List[dict]) -> None:
    for it in rows or []:
        fid = it.get("fixture_id")
        if fid is None or int(fid) not in base: continue
        probs = it.get("probabilities") or {}
        if isinstance(probs, dict) and any(k in probs for k in ("home","draw","away")):
            try: base[int(fid)]["prob"]["H"] = float(probs.get("home")) if probs.get("home") is not None else None
            except: pass
            try: base[int(fid)]["prob"]["D"] = float(probs.get("draw")) if probs.get("draw") is not None else None
            except: pass
            try: base[int(fid)]["prob"]["A"] = float(probs.get("away")) if probs.get("away") is not None else None
            except: pass
            continue
        label = (it.get("label") or "").strip().lower()
        raw   = _dig(it,"data.value")
        try:
            s = str(raw).replace("%","").strip()
            val = float(s)
            if val <= 1.0: val *= 100.0
        except: val = None
        if label.startswith("home"): base[int(fid)]["prob"]["H"] = val
        elif label.startswith("draw"): base[int(fid)]["prob"]["D"] = val
        elif label.startswith("away"): base[int(fid)]["prob"]["A"] = val

# --------- Filters / diagnostics ----------
def _filter_upcoming(rows: List[dict]) -> List[dict]:
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    out = []
    for r in rows:
        iso = r.get("kickoff_utc")
        try:
            if iso:
                dt = datetime.fromisoformat(iso.replace("Z","+00:00"))
                if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
                if dt >= now:
                    out.append(r)
        except Exception:
            continue
    return out

def _league_distribution(rows: List[dict]) -> Dict[str, int]:
    dist: Dict[str, int] = {}
    for r in rows:
        name = (r.get("league") or {}).get("name") or "?"
        dist[name] = dist.get(name, 0) + 1
    return dict(sorted(dist.items(), key=lambda kv: (-kv[1], kv[0])))

# ------------- Pullers -------------
def _pull_list() -> Tuple[List[dict], List[str]]:
    diag: List[str] = []
    base: Dict[int, dict] = {}

    # Inplay
    try:
        live_url = _q(f"{BASE}/{LIVE_PATH}", {"api_token": TOKEN})
        live_data = _http_get(live_url)
        if isinstance(live_data, dict) and live_data.get("__error__"): diag.append(live_data["__error__"])
        live_rows = _as_list(live_data)
        diag.append(f"inplay:{len(live_rows)}")
        base = _normalize_live_rows(live_rows)
    except Exception as e:
        diag.append(f"inplay:ERR {e}")

    # Fallback: bugün
    if not base:
        try:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            fx_url = _q(_fx_date_url(today), {"api_token": TOKEN})
            fx_data = _http_get(fx_url)
            if isinstance(fx_data, dict) and fx_data.get("__error__"): diag.append(fx_data["__error__"])
            fx_rows = _as_list(fx_data)
            diag.append(f"fixtures.date[{today}]:{len(fx_rows)}")
            if fx_rows:
                base = _normalize_fixture_rows(fx_rows)
        except Exception as e:
            diag.append(f"fixtures.date:ERR {e}")

    items = _filter_upcoming(list(base.values()))
    if items:
        dist = _league_distribution(items)
        diag.append(f"leagues:{len(dist)} {dist}")
    return items, diag

def _pull_bulletin(start: Date, end: Date, leagues_csv: Optional[str]) -> Tuple[List[dict], List[str]]:
    diag: List[str] = []
    try:
        url = _fx_between_url(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        q: Dict[str, str] = {"api_token": TOKEN}
        if leagues_csv:  # Neden: Sadece istediğin ligler
            q["leagues"] = leagues_csv
        url = _q(url, q)
        data = _http_get(url)
        if isinstance(data, dict) and data.get("__error__"): diag.append(data["__error__"])
        rows = _as_list(data)
        diag.append(f"fixtures.between[{start}..{end}]:{len(rows)}")
        base_map = _normalize_fixture_rows(rows)
    except Exception as e:
        diag.append(f"fixtures.between:ERR {e}")
        base_map = {}

    # Odds: sadece listemizdeki maçlar için (performans ve doğruluk)
    if base_map and ODDS_PATH:
        try:
            fixture_ids = ",".join(str(fid) for fid in base_map.keys())
            odds_url = f"{BASE}/{ODDS_PATH}"
            odds_url = _q(odds_url, {"api_token": TOKEN, "filters": f"fixtureIds:{fixture_ids}"})
            odds_data = _http_get(odds_url)
            if isinstance(odds_data, dict) and odds_data.get("__error__"): diag.append(odds_data["__error__"])
            _merge_odds(base_map, _as_list(odds_data))
            diag.append(f"odds:ok ids={len(base_map)}")
        except Exception as e:
            diag.append(f"odds:ERR {e}")

    # Predictions (pakette yoksa hiç gelmez)
    if base_map and PRED_PATH:
        try:
            pred_url = _q(f"{BASE}/{PRED_PATH}", {"api_token": TOKEN})
            pred_data = _http_get(pred_url)
            if isinstance(pred_data, dict) and pred_data.get("__error__"): diag.append(pred_data["__error__"])
            _merge_predictions(base_map, _as_list(pred_data))
        except Exception as e:
            diag.append(f"pred:ERR {e}")

    items = sorted(base_map.values(), key=lambda r: (r.get("date") or "", r["fixture_id"]))
    items = _filter_upcoming(items)
    if items:
        dist = _league_distribution(items)
        diag.append(f"leagues:{len(dist)} {dist}")
    return items, diag

# ------------- Cache -------------
def _ensure_list_cache():
    if not TOKEN:
        raise HTTPException(status_code=500, detail="SPORTMONKS_TOKEN eksik.")
    now = time.time()
    if now - _CACHE["t"] < TTL and _CACHE["norm"]:
        return
    norm, diag = _pull_list()
    _CACHE.update(t=now, norm=norm, sample=(norm[:1] if norm else []), diag=diag)

# ------------- Routes -------------
def _fmt_ticker(r: dict) -> str:
    h, a = r["home"]["name"], r["away"]["name"]
    hs, as_ = r["score"]["home"], r["score"]["away"]
    sc = f"{hs}-{as_}" if (hs is not None or as_ is not None) else "vs"
    return f"⚽ {h} {sc} {a} • {r['time']} • {r['league']['name']}"

@router.get("/livescores/list")
def livescores_list():
    _ensure_list_cache()
    return _CACHE["norm"]

@router.get("/livescores")
def livescores_ticker():
    _ensure_list_cache()
    return ([_fmt_ticker(x) for x in _CACHE["norm"]] or [])

@router.get("/livescores/sample")
def livescores_sample():
    _ensure_list_cache()
    return {
        "sample": _CACHE["sample"],
        "diag": _CACHE["diag"],
        "live": LIVE_PATH,
        "fixtures": FIXTURES_PATH,
        "odds": ODDS_PATH,
        "pred": PRED_PATH,
    }

@router.get("/livescores/bulletin")
def livescores_bulletin(
    date_from: str = Query(default=None, alias="from"),
    date_to: str   = Query(default=None, alias="to"),
    leagues: Optional[str] = Query(default=None, description="Virgülle ayrılmış league id listesi (opsiyonel)"),
):
    if not TOKEN:
        raise HTTPException(status_code=500, detail="SPORTMONKS_TOKEN eksik.")
    try:
        today = datetime.utcnow().date()
        start = datetime.strptime(date_from, "%Y-%m-%d").date() if date_from else today
        end   = datetime.strptime(date_to, "%Y-%m-%d").date()   if date_to   else (today + timedelta(days=6))
    except Exception:
        raise HTTPException(status_code=400, detail="from/to formatı YYYY-MM-DD olmalı.")
    items, diag = _pull_bulletin(start, end, leagues_csv=(leagues or None))
    return {
        "range": {"from": start.strftime("%Y-%m-%d"), "to": end.strftime("%Y-%m-%d")},
        "count": len(items),
        "items": items,
        "diag": diag,
    }
