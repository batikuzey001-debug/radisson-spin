# app/api/routers/livescores.py
# Sportmonks canlı veri proxysi (inplay + fixtures fallback + odds + predictions)
# Uçlar:
#   GET /livescores/list   -> kart/satır verisi [{league, home, away, score, time, odds, prob}]
#   GET /livescores        -> ticker stringleri (kısa)
#   GET /livescores/sample -> örnek + teşhis bilgisi (hangi URL’den kaç kayıt geldi)
#
# ENV (Railway → API Variables) — hepsini string olarak gir:
#   SPORTMONKS_TOKEN=...                               (zorunlu)
#   SPORTMONKS_BASE=https://api.sportmonks.com         (opsiyonel, vars: bu)
#   SPORTMONKS_TTL=8                                   (opsiyonel, sn)
#   SPORTMONKS_LIVE_PATH=/v3/football/livescores/inplay?per_page=50&include=participants;time;scores;periods;league
#   SPORTMONKS_FIXTURES_PATH=/v3/football/fixtures?per_page=50&include=participants;league
#   SPORTMONKS_ODDS_PATH=/v3/football/odds/pre-match/fixtures?per_page=50&include=market;bookmaker          (opsiyonel)
#   SPORTMONKS_PRED_PATH=/v3/football/predictions/fixtures?per_page=50                                      (opsiyonel)
#   LIVESCORE_MOCK=0  (tasarım için sahte veri açmak istersen 1 yap)
#
import os, json, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple, Optional
from fastapi import APIRouter, HTTPException

router = APIRouter()

TOKEN  = os.getenv("SPORTMONKS_TOKEN", "").strip()
BASE   = (os.getenv("SPORTMONKS_BASE") or "https://api.sportmonks.com").rstrip("/")
TTL    = int(os.getenv("SPORTMONKS_TTL", "8"))

LIVE_PATH     = (os.getenv("SPORTMONKS_LIVE_PATH")     or "/v3/football/livescores/inplay?per_page=50&include=participants;time;scores;periods;league").lstrip("/")
FIXTURES_PATH = (os.getenv("SPORTMONKS_FIXTURES_PATH") or "/v3/football/fixtures?per_page=50&include=participants;league").lstrip("/")
ODDS_PATH     = (os.getenv("SPORTMONKS_ODDS_PATH")     or "").lstrip("/") or None
PRED_PATH     = (os.getenv("SPORTMONKS_PRED_PATH")     or "").lstrip("/") or None

UA = {"User-Agent": "Mozilla/5.0"}
_CACHE = {"t": 0.0, "norm": [], "sample": [], "diag": []}

# --- MOCK (tasarım için) -----------------------------------------------------
MOCK_ENABLE = os.getenv("LIVESCORE_MOCK", "0").lower() in ("1","true","on")
def _mock_items() -> List[dict]:
    demo = [
        ("Premier League","Manchester United","https://cdn.sportmonks.com/images/soccer/teams/14/14.png","Chelsea","https://cdn.sportmonks.com/images/soccer/teams/18/18.png",2,1,67,1.7,3.4,4.5,59,25,16),
        ("LaLiga","Barcelona","https://cdn.sportmonks.com/images/soccer/teams/26/26.png","Real Madrid","https://cdn.sportmonks.com/images/soccer/teams/27/27.png",1,1,54,2.1,3.2,2.75,42,28,30),
        ("Süper Lig","Galatasaray","https://cdn.sportmonks.com/images/soccer/teams/6/198.png","Fenerbahçe","https://cdn.sportmonks.com/images/soccer/teams/23/215.png",0,0,23,2.0,3.1,3.1,45,30,25),
    ]
    out=[]
    for i,(lig,hn,hl,an,al,hs,as_,tm,oh,od,oa,pH,pD,pA) in enumerate(demo, start=1):
        out.append({
            "fixture_id": 100000+i,
            "league": {"name": lig, "logo": None},
            "home": {"name": hn, "logo": hl},
            "away": {"name": an, "logo": al},
            "score": {"home": hs, "away": as_},
            "time": f"{tm}'",
            "odds": {"H": oh, "D": od, "A": oa, "bookmaker": "RadissonBet"},
            "prob": {"H": pH, "D": pD, "A": pA},
        })
    return out
# ----------------------------------------------------------------------------

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
    s = rec.get("scores") or {}
    hs = s.get("home_score");  as_ = s.get("away_score")
    if hs is None: hs = s.get("localteam_score")
    if as_ is None: as_ = s.get("visitorteam_score")
    try:  hs_i = int(hs) if hs not in (None,"") else None
    except: hs_i = None
    try:  as_i = int(as_) if as_ not in (None,"") else None
    except: as_i = None
    return hs_i, as_i

def _minute_from_periods(rec: dict) -> str:
    pr = rec.get("periods") or []
    if not pr: return ""
    last = pr[-1]
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
    return {"name": _dig(rec,"league.name") or rec.get("league_name") or "", "logo": _dig(rec,"league.image_path")}

def _ko_hhmm_utc(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(str(iso).replace("Z","+00:00")).astimezone(timezone.utc)
        return "KO " + dt.strftime("%H:%M")
    except Exception:
        return "KO"

def _normalize_live_rows(rows: List[dict]) -> Dict[int, dict]:
    out: Dict[int, dict] = {}
    for rec in rows:
        fid = rec.get("id") or rec.get("fixture_id") or _dig(rec,"fixture_id")
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
        ko = _dig(rec,"starting_at") or _dig(rec,"starting_at_iso") or ""
        out[int(fid)] = {
            "fixture_id": int(fid),
            "league": _league_info(rec),
            "home": home,
            "away": away,
            "score": {"home": None, "away": None},
            "time": _ko_hhmm_utc(str(ko)),
            "odds": {"H": None, "D": None, "A": None, "bookmaker": "RadissonBet"},
            "prob": {"H": None, "D": None, "A": None},
        }
    return out

def _merge_odds(base: Dict[int, dict], rows: List[dict]) -> None:
    # Beklenen: market.developer_name == "FULLTIME_RESULT", label in {"Home","Draw","Away"}, value "1.70"
    for it in rows or []:
        fid = it.get("fixture_id")
        if fid is None or int(fid) not in base: continue
        dev = (it.get("market") or {}).get("developer_name") or (it.get("market") or {}).get("name") or ""
        if "FULLTIME_RESULT" not in str(dev).upper(): continue
        label = (it.get("label") or "").strip().lower()
        try: val = float(str(it.get("value")))
        except: val = None
        # bookmaker adı varsa basabilirsin; biz RadissonBet gösteriyoruz.
        if label.startswith("home"): base[int(fid)]["odds"]["H"] = val
        elif label.startswith("draw"): base[int(fid)]["odds"]["D"] = val
        elif label.startswith("away"): base[int(fid)]["odds"]["A"] = val

def _merge_predictions(base: Dict[int, dict], rows: List[dict]) -> None:
    # Sportmonks "Predictions" add-on farklı şekillerde dönebiliyor.
    # Desteklenen iki yaygın şekil:
    #  a) { fixture_id, probabilities: { home: 58.2, draw: 23.1, away: 18.7 } }
    #  b) satır bazında { fixture_id, label: "Home|Draw|Away", data:{value:"58.82%"} }
    for it in rows or []:
        fid = it.get("fixture_id")
        if fid is None or int(fid) not in base: continue
        # (a) blok halinde
        probs = it.get("probabilities") or {}
        if isinstance(probs, dict) and any(k in probs for k in ("home","draw","away")):
            try: base[int(fid)]["prob"]["H"] = float(probs.get("home")) if probs.get("home") is not None else None
            except: pass
            try: base[int(fid)]["prob"]["D"] = float(probs.get("draw")) if probs.get("draw") is not None else None
            except: pass
            try: base[int(fid)]["prob"]["A"] = float(probs.get("away")) if probs.get("away") is not None else None
            except: pass
            continue
        # (b) satır bazında
        label = (it.get("label") or "").strip().lower()
        raw   = _dig(it,"data.value")
        try:
            s = str(raw).replace("%","").strip()
            val = float(s)
            if val <= 1.0: val *= 100.0
        except:
            val = None
        if label.startswith("home"): base[int(fid)]["prob"]["H"] = val
        elif label.startswith("draw"): base[int(fid)]["prob"]["D"] = val
        elif label.startswith("away"): base[int(fid)]["prob"]["A"] = val

def _pull_all() -> Tuple[List[dict], List[str]]:
    diag: List[str] = []

    # 1) Inplay
    live_url = _q(f"{BASE}/{LIVE_PATH}", {"api_token": TOKEN})
    live_data = _http_get(live_url); live_rows = _as_list(live_data)
    diag.append(f"inplay:{len(live_rows)}")
    base = _normalize_live_rows(live_rows)

    # 2) Fallback fixtures (bugün)
    if len(base) == 0:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        fx_url = _q(f"{BASE}/{FIXTURES_PATH}", {"api_token": TOKEN, "date": today})
        fx_data = _http_get(fx_url); fx_rows = _as_list(fx_data)
        diag.append(f"fixtures[{today}]:{len(fx_rows)}")
        if fx_rows:
            base = _normalize_fixture_rows(fx_rows)

    # 3) Odds (ops)
    if ODDS_PATH:
        odds_url = _q(f"{BASE}/{ODDS_PATH}", {"api_token": TOKEN})
        odds_data = _http_get(odds_url); odds_rows = _as_list(odds_data)
        diag.append(f"odds:{len(odds_rows)}")
        _merge_odds(base, odds_rows)

    # 4) Predictions (ops)
    if PRED_PATH:
        pred_url = _q(f"{BASE}/{PRED_PATH}", {"api_token": TOKEN})
        pred_data = _http_get(pred_url); pred_rows = _as_list(pred_data)
        diag.append(f"pred:{len(pred_rows)}")
        _merge_predictions(base, pred_rows)

    return list(base.values()), diag

def _ensure():
    if not TOKEN:
        raise HTTPException(status_code=500, detail="SPORTMONKS_TOKEN eksik.")
    now = time.time()
    if now - _CACHE["t"] < TTL and _CACHE["norm"]:
        return
    try:
        norm, diag = _pull_all()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Sportmonks hata: {e}")
    if not norm and MOCK_ENABLE:
        diag = [*diag, "mock:on"]
        norm = _mock_items()
    _CACHE.update(t=now, norm=norm, sample=(norm[:1] if norm else []), diag=diag)

def _fmt_ticker(r: dict) -> str:
    h, a = r["home"]["name"], r["away"]["name"]
    hs, as_ = r["score"]["home"], r["score"]["away"]
    sc = f"{hs}-{as_}" if (hs is not None or as_ is not None) else "vs"
    return f"⚽ {h} {sc} {a} • {r['time']} • {r['league']['name']}"

@router.get("/livescores/list")
def livescores_list():
    _ensure()
    return _CACHE["norm"]

@router.get("/livescores")
def livescores_ticker():
    _ensure()
    return ([_fmt_ticker(x) for x in _CACHE["norm"]] or ["(Bugün için veri yok)"])[:40]

@router.get("/livescores/sample")
def livescores_sample():
    _ensure()
    return {"sample": _CACHE["sample"], "diag": _CACHE["diag"], "live": LIVE_PATH, "fixtures": FIXTURES_PATH, "odds": ODDS_PATH, "pred": PRED_PATH}
