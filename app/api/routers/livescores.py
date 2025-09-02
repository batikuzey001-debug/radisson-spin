# app/api/routers/livescores.py
import os, json, urllib.request
from typing import List
from fastapi import APIRouter, HTTPException

router = APIRouter()

API_KEY = os.getenv("THESPORTSDB_API_KEY", "1")  # "1" = demo/free key

def _http_get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=6) as resp:
        raw = resp.read()
    return json.loads(raw.decode("utf-8"))

@router.get("/livescores", response_model=List[str])
def livescores():
    """
    TheSportsDB free endpoint: https://www.thesportsdb.com/api/v1/json/1/livescore.php
    """
    url = f"https://www.thesportsdb.com/api/v1/json/{API_KEY}/livescore.php"
    try:
        data = _http_get(url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"API hatası: {e}")

    events = (data or {}).get("events")
    if not events:
        return ["(Canlı maç bulunamadı)"]

    out: List[str] = []
    for ev in events:
        sport = ev.get("strSport", "⚽")
        home = ev.get("strHomeTeam", "Home")
        away = ev.get("strAwayTeam", "Away")
        hs = ev.get("intHomeScore") or "0"
        as_ = ev.get("intAwayScore") or "0"
        time = ev.get("strTime") or ""
        league = ev.get("strLeague") or ""
        out.append(f"{sport} {home} {hs}-{as_} {away} • {time} • {league}")
    return out
