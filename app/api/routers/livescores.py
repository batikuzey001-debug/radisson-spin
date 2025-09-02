# app/api/routers/livescores.py
# Sportmonks canlı skor kart verisi (tek JSON)
# Sağladığı uçlar:
#   GET /livescores/list   -> {league, home, away, score, time, odds, prob}[]  (kartlar için)
#   GET /livescores        -> "⚽ A 1-0 B • 67' • Premier League" string listesi (isteğe bağlı)
#   GET /livescores/sample -> teşhis: ilk normalize + ham örnek(ler)
#
# ENV (Railway → API Service → Variables):
#   SPORTMONKS_TOKEN=...                         (zorunlu)
#   SPORTMONKS_BASE=https://api.sportmonks.com   (opsiyonel, varsayılan)
#   SPORTMONKS_TTL=8                             (opsiyonel, saniye)
#   SPORTMONKS_LIVE_PATH=/v3/football/livescores/inplay?per_page=50&include=participants;time;scores;periods;league
#     (opsiyonel, boşsa yukarıdaki varsayılan kullanılır)
#   SPORTMONKS_ODDS_PATH=/v3/football/odds/...   (opsiyonel; liste dönmeli, her kayıtta fixture_id olmalı)
#     Beklenen alanlar (örnek): { fixture_id, label:"Home|Draw|Away", value:"1.70", market:{developer_name:"FULLTIME_RESULT"}, bookmaker:{name:"bet365"} }
#   SPORTMONKS_STATS_PATH=/v3/football/...       (opsiyonel; xG ve/veya probability dönen liste)
#     Beklenen alanlar (örnek xG): { fixture_id, location:"home|away", data:{value:4.44}, type:{developer_name:"EXPECTED_GOALS"} }
#     Beklenen alanlar (örnek prob): { fixture_id, label:"Home|Draw|Away", data:{value:"58.82%"}, type:{developer_name:"FULLTIME_RESULT_PROBABILITY"} }
#
# Notlar:
# - Odds/xG/Probability yolları opsiyoneldir; verilmemişse ilgili alanlar boş (null) döner.
# - Birleştirme anahtarı: fixture_id
# - Hata durumunda 502 ile açık mesaj döner; TTL cache ile istek azaltılır.

import os, json, time, urllib.parse, urllib.request
from typing import Any, Dict, List, Tuple, Optional
from fastapi import APIRouter, HTTPException

router = APIRouter()

TOKEN = os.getenv("SPORTMONKS_TOKEN", "").strip()
BASE  = (os.getenv("SPORTMONKS_BASE") or "https://api.sportmonks.com").rstrip("/")
TTL   = int(os.getenv("SPORTMONKS_TTL", "8"))

LIVE_PATH  = (os.getenv("SPORTMONKS_LIVE_PATH") or "/v3/football/livescores/inplay?per_page=50&include=participants;time;scores;periods;league").lstrip("/")
ODDS_PATH  = (os.getenv("SPORTMONKS_ODDS_PATH") or "").lstrip("/") or None
STATS_PATH = (os.getenv("SPORTMONKS_STATS_PATH") or "").lstrip("/") or None

UA = {"User-Agent": "Mozilla/5.0"}
_CACHE = {"t": 0.0, "rows": [], "norm": [], "diag": []}

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
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for k in ("data", "response", "results", "events", "matches"):
            v = data.get(k)
            if isinstance(v, list):
                return v
    return []

def _dig(d: dict, path: str):
    cur = d
    for p in path.split("."):
        if isinstance(cur, dict):
            cur = cur.get(p)
        else:
            return None
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
    desc = last.get("description") or ""
    mm = last.get("minutes"); ss = last.get("seconds")
    try:
        mm_i = int(mm) if mm is not None else None
        ss_i = int(ss) if ss is not None else None
    except:
        mm_i = ss_i = None
    if mm_i is None:
        return desc
    if ss_i is None:
        return f"{mm_i}'"
    return f"{mm_i}'{ss_i:02d}\""

def _minute_or_status(rec: dict) -> str:
    txt = _minute_from_periods(rec)
    if txt: return txt
    t = rec.get("time") or {}
    minute = t.get("minute") or t.get("elapsed") or t.get("minute_extra") or ""
    status = t.get("status") or rec.get("status") or ""
    return f"{minute}'" if minute else str(status or "")

def _league_info(rec: dict) -> Dict:
    return {
        "name": _dig(rec, "league.name") or rec.get("league_name") or "",
        "logo": _dig(rec, "league.image_path")
    }

def _fmt_ticker(row: dict) -> str:
    h, a = row["home"]["name"], row["away"]["name"]
    hs, as_ = row["score"]["home"], row["score"]["away"]
    sc = f"{hs}-{as_}" if (hs is not None or as_ is not None) else "vs"
    lg = row["league"]["name"]
    tm = row["time"] or ""
    return f"⚽ {h} {sc} {a} • {tm} • {lg}".strip()

def _normalize_live_rows(live_rows: List[dict]) -> Dict[int, dict]:
    out: Dict[int, dict] = {}
    for rec in live_rows:
        fid = rec.get("id") or rec.get("fixture_id") or _dig(rec, "fixture_id")
        if fid is None:
            continue
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

def _merge_odds(base: Dict[int, dict], odds_rows: List[dict]) -> None:
    # Beklenen: market.developer_name == "FULLTIME_RESULT", label in {"Home","Draw","Away"}, value string
    # Aynı fixture için birden fazla bookmaker varsa; ilk görüleni bırakıyoruz.
    for it in odds_rows or []:
        fid = it.get("fixture_id")
        if fid is None or int(fid) not in base:
            continue
        market = (it.get("market") or {}).get("developer_name") or (it.get("market") or {}).get("name")
        if not market or "FULLTIME_RESULT" not in str(market).upper():
            continue
        label = (it.get("label") or "").strip().lower()  # "home","draw","away"
        try:
            val = float(str(it.get("value")))
        except:
            val = None
        bm = (it.get("bookmaker") or {}).get("name")
        card = base[int(fid)]
        if card["odds"]["bookmaker"] is None and bm:
            card["odds"]["bookmaker"] = bm
        if label.startswith("home"):
            card["odds"]["H"] = val
        elif label.startswith("draw"):
            card["odds"]["D"] = val
        elif label.startswith("away"):
            card["odds"]["A"] = val

def _merge_stats(base: Dict[int, dict], stats_rows: List[dict]) -> None:
    # xG: type.developer_name == "EXPECTED_GOALS", location "home|away", data.value number
    # Prob: type.developer_name == "FULLTIME_RESULT_PROBABILITY", label Home/Draw/Away, data.value "58.82%"
    for it in stats_rows or []:
        fid = it.get("fixture_id")
        if fid is None or int(fid) not in base:
            continue
        tname = (it.get("type") or {}).get("developer_name") or (it.get("type") or {}).get("name") or ""
        tname = str(tname).upper()

        if "EXPECTED_GOALS" in tname:
            loc = (it.get("location") or "").lower()
            try:
                val = float(str(_dig(it, "data.value")))
            except:
                val = None
            if loc.startswith("home"):
                base[int(fid)]["home"]["xg"] = val
            elif loc.startswith("away"):
                base[int(fid)]["away"]["xg"] = val

        elif "FULLTIME_RESULT_PROBABILITY" in tname:
            label = (it.get("label") or "").strip().lower()
            raw = _dig(it, "data.value")
            try:
                # "58.82%" -> 58.82  ;  "0.5882" -> 59  ;  58.82 -> 59
                s = str(raw).strip().replace("%", "")
                val = float(s)
                if val <= 1.0:  # olasılık normalize
                    val *= 100.0
            except:
                val = None
            if label.startswith("home"):
                base[int(fid)]["prob"]["H"] = val
            elif label.startswith("draw"):
                base[int(fid)]["prob"]["D"] = val
            elif label.startswith("away"):
                base[int(fid)]["prob"]["A"] = val

def _pull_all() -> Tuple[List[dict], List[str]]:
    diag: List[str] = []

    # 1) Live rows
    live_url = _q(f"{BASE}/{LIVE_PATH}", {"api_token": TOKEN})
    live_data = _http_get(live_url)
    live_rows = _as_list(live_data)
    diag.append(f"live:{len(live_rows)}")

    # 2) Odds rows (opsiyonel)
    odds_rows: List[dict] = []
    if ODDS_PATH:
        odds_url = _q(f"{BASE}/{ODDS_PATH}", {"api_token": TOKEN})
        odds_data = _http_get(odds_url)
        odds_rows = _as_list(odds_data)
        diag.append(f"odds:{len(odds_rows)}")
    else:
        diag.append("odds:0 (path yok)")

    # 3) Stats rows (xG & probability) (opsiyonel)
    stats_rows: List[dict] = []
    if STATS_PATH:
        stats_url = _q(f"{BASE}/{STATS_PATH}", {"api_token": TOKEN})
        stats_data = _http_get(stats_url)
        stats_rows = _as_list(stats_data)
        diag.append(f"stats:{len(stats_rows)}")
    else:
        diag.append("stats:0 (path yok)")

    # normalize + merge
    base = _normalize_live_rows(live_rows)
    if ODDS_PATH and odds_rows:
        _merge_odds(base, odds_rows)
    if STATS_PATH and stats_rows:
        _merge_stats(base, stats_rows)

    norm_list = list(base.values())
    return norm_list, diag

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
    _CACHE.update(t=now, norm=norm, rows=norm[:1], diag=diag)

@router.get("/livescores/list")
def livescores_list():
    _ensure_data()
    return _CACHE["norm"]

@router.get("/livescores")
def livescores_ticker():
    _ensure_data()
    return [_fmt_ticker(r) for r in _CACHE["norm"]][:40] or ["(Şu anda yayınlanacak canlı maç yok)"]

@router.get("/livescores/sample")
def livescores_sample():
    _ensure_data()
    return {"sample": _CACHE["rows"], "diag": _CACHE["diag"], "live_path": LIVE_PATH, "odds_path": ODDS_PATH, "stats_path": STATS_PATH}
