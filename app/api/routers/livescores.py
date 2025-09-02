# app/api/routers/livescores.py
# Tüm kapsamdaki ligler için gelecek fikstürleri (bu yıl) + opsiyonel oranlar
# Uçlar:
#   GET /livescores/bulletin?from=YYYY-MM-DD&to=YYYY-MM-DD[&leagues=1,2,...]
#   GET /livescores/year?year=YYYY[&leagues=...]      -> yıl başlangıcı..yıl sonu
#   GET /livescores/sample                             -> kısa örnek + diag

import os, json, time, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta, date as Date
from typing import Any, Dict, List, Tuple, Optional
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

# ---------------- ENV ----------------
def _clean_path(p: Optional[str]) -> Optional[str]:
    if not p: return None
    s = str(p).replace("\r","").replace("\n","").strip()
    return s.lstrip("/") or None

TOKEN  = (os.getenv("SPORTMONKS_TOKEN") or "").strip()
BASE   = ((os.getenv("SPORTMONKS_BASE") or "https://api.sportmonks.com").strip()).rstrip("/")
TTL    = int(os.getenv("SPORTMONKS_TTL", "8"))

LIVE_PATH     = _clean_path(os.getenv("SPORTMONKS_LIVE_PATH")     or "/v3/football/livescores/inplay?per_page=50&include=participants;time;scores;periods;league.country")
FIXTURES_PATH = _clean_path(os.getenv("SPORTMONKS_FIXTURES_PATH") or "/v3/football/fixtures?per_page=100&include=participants;league.country;scores;venue")
ODDS_PATH     = _clean_path(os.getenv("SPORTMONKS_ODDS_PATH")     or "")   # Örn: /v3/football/odds/pre-match?per_page=50&include=market;bookmaker;fixture

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
        for k in ("data","response","results","events","matches","odds"):
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
_FX_QS = FIXTURES_PATH.split("?", 1)[1] if (FIXTURES_PATH and "?" in FIXTURES_PATH) else ""

def _fx_date_url(day: str) -> str:
    base = f"{BASE}/v3/football/fixtures/date/{day}"
    return base + (("?" + _FX_QS) if _FX_QS else "")

def _fx_between_url(start: str, end: str) -> str:
    base = f"{BASE}/v3/football/fixtures/between/{start}/{end}"
    return base + (("?" + _FX_QS) if _FX_QS else "")

# ------------- Pagination -------------
def _paged_collect(url: str, per_page_hint: int = 100, max_pages: int = 40) -> Tuple[List[dict], int]:
    """Sayfaları takip ederek tüm veriyi toplar (üst sınır güvenliği)."""
    items: List[dict] = []
    pages = 0
    next_url = _q(url, {"per_page": str(per_page_hint)}) if "per_page=" not in url else url
    while next_url and pages < max_pages:
        pages += 1
        data = _http_get(next_url)
        items.extend(_as_list(data))
        # next_page alanını destekle
        next_url = (data.get("pagination") or {}).get("next_page") if isinstance(data, dict) else None
    return items, pages

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
    t = _minute_from_periods(rec);  ti = rec.get("time") or {}
    if t: return t
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
            "odds": {"H": None, "D": None, "A": None, "bookmaker": None},
            "prob": {"H": None, "D": None, "A": None},
        }
    return out

# -------- Odds merge (genişletilmiş) --------
def _is_ft_market_text(name: str) -> bool:
    n = (name or "").upper().replace(" ", "")
    return any(tag in n for tag in ("FULLTIMERESULT","MATCHODDS","MATCHWINNER","1X2","RESULT","FT"))

def _is_ft_market_id(mid: Optional[int]) -> bool:
    # Match Winner (2-way) sıklıkla id=1; 3-way 1X2 farklı olabilir (gerekirse genişletilir).
    return mid in {1}

def _label_to_hda(label: str) -> Optional[str]:
    s = (label or "").strip().lower()
    m = {"1":"H","h":"H","home":"H","home team":"H","localteam":"H",
         "x":"D","d":"D","draw":"D",
         "2":"A","a":"A","away":"A","away team":"A","visitorteam":"A"}
    return m.get(s)

def _parse_odd_value(it: dict) -> Optional[float]:
    for k in ("value","decimal","price","odd"):
        if k in it and it[k] not in (None,""):
            try: return float(str(it[k]).replace(",","."))
            except: continue
    v = _dig(it,"data.value")
    if v not in (None,""):
        try: return float(str(v).replace(",","."))
        except: return None
    return None

def _merge_odds(base: Dict[int,dict], rows: List[dict]) -> Dict[str,int]:
    hist: Dict[str,int] = {}
    for it in rows or []:
        if not isinstance(it, dict): continue
        fid  = it.get("fixture_id")
        lab  = it.get("label")
        mobj = it.get("market") or {}
        mname= mobj.get("developer_name") or mobj.get("name") or ""
        mdesc= it.get("market_description") or ""
        mid  = it.get("market_id")
        is_ft = _is_ft_market_text(mname) or _is_ft_market_text(mdesc) or _is_ft_market_id(int(mid) if mid is not None else None)
        if fid is None or lab is None or not is_ft: 
            continue
        hda = _label_to_hda(lab) or _label_to_hda(lab.upper()) or _label_to_hda(lab.title())
        if not hda: 
            continue
        val = _parse_odd_value(it)
        if val is None: 
            continue
        if hda == "H": base[int(fid)]["odds"]["H"] = val
        elif hda == "D": base[int(fid)]["odds"]["D"] = val
        elif hda == "A": base[int(fid)]["odds"]["A"] = val
        hist[mname or mdesc or f"id:{mid}"] = hist.get(mname or mdesc or f"id:{mid}", 0) + 1
    return hist

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
                if dt >= now: out.append(r)
        except: continue
    return out

def _league_distribution(rows: List[dict]) -> Dict[str,int]:
    dist: Dict[str,int] = {}
    for r in rows:
        name = (r.get("league") or {}).get("name") or "?"
        dist[name] = dist.get(name,0)+1
    return dict(sorted(dist.items(), key=lambda kv:(-kv[1],kv[0])))

# ------------- Pullers -------------
def _pull_bulletin(start: Date, end: Date, leagues_csv: Optional[str]) -> Tuple[List[dict], List[str]]:
    diag: List[str] = []
    # fixtures between (tüm sayfaları topla)
    url = _fx_between_url(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
    q: Dict[str,str] = {"api_token": TOKEN}
    if leagues_csv: q["leagues"] = leagues_csv
    url = _q(url, q)
    rows, pages = _paged_collect(url, per_page_hint=100, max_pages=60)
    diag.append(f"fixtures.between[{start}..{end}]:{len(rows)} pages:{pages}")
    base_map = _normalize_fixture_rows(rows)

    # Odds (varsayılan includes: market;bookmaker;fixture ile ayarlanmış olmalı)
    if base_map and ODDS_PATH:
        try:
            o_url = _q(f"{BASE}/{ODDS_PATH}", {"api_token": TOKEN})
            odds_rows, o_pages = _paged_collect(o_url, per_page_hint=50, max_pages=40)
            markets = _merge_odds(base_map, odds_rows)
            if markets:
                used = ", ".join(f"{k}:{v}" for k,v in list(markets.items())[:5])
                diag.append(f"odds:ok rows:{len(odds_rows)} pages:{o_pages} markets[{used}]")
            else:
                diag.append(f"odds:empty rows:{len(odds_rows)} pages:{o_pages}")
        except Exception as e:
            diag.append(f"odds:ERR {e}")

    items = sorted(base_map.values(), key=lambda r: (r.get("date") or "", r["fixture_id"]))
    items = _filter_upcoming(items)
    if items:
        dist = _league_distribution(items)
        diag.append(f"leagues:{len(dist)} {dist}")
    return items, diag

def _ensure_list_cache():
    if not TOKEN:
        raise HTTPException(status_code=500, detail="SPORTMONKS_TOKEN eksik.")
    now = time.time()
    if now - _CACHE["t"] < TTL and _CACHE["norm"]:
        return
    # kısa liste: bugün – ama ihtiyacımız yıl aralığı, o yüzden sadece sample dolduruyoruz
    today = datetime.utcnow().date()
    week_end = today + timedelta(days=6)
    norm, diag = _pull_bulletin(today, week_end, leagues_csv=None)
    _CACHE.update(t=now, norm=norm, sample=(norm[:1] if norm else []), diag=diag)

# ------------- Routes -------------
@router.get("/livescores/sample")
def livescores_sample():
    _ensure_list_cache()
    return {"sample": _CACHE["sample"], "diag": _CACHE["diag"], "live": LIVE_PATH, "fixtures": FIXTURES_PATH, "odds": ODDS_PATH}

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
        end   = datetime.strptime(date_to, "%Y-%m-%d").date()   if date_to   else Date(today.year, 12, 31)
    except Exception:
        raise HTTPException(status_code=400, detail="from/to formatı YYYY-MM-DD olmalı.")
    items, diag = _pull_bulletin(start, end, leagues_csv=(leagues or None))
    return {"range": {"from": start.strftime("%Y-%m-%d"), "to": end.strftime("%Y-%m-%d")}, "count": len(items), "items": items, "diag": diag}

@router.get("/livescores/year")
def livescores_year(
    year: int = Query(..., ge=2000, le=2100),
    leagues: Optional[str] = Query(default=None),
):
    if not TOKEN:
        raise HTTPException(status_code=500, detail="SPORTMONKS_TOKEN eksik.")
    start = Date(year, 1, 1)
    end   = Date(year, 12, 31)
    items, diag = _pull_bulletin(start, end, leagues_csv=(leagues or None))
    return {"range": {"from": start.strftime("%Y-%m-%d"), "to": end.strftime("%Y-%m-%d")}, "count": len(items), "items": items, "diag": diag}
