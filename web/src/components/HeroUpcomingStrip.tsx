// web/src/components/HeroUpcomingStrip.tsx
import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL;

type Team = { name: string; logo?: string };
type MatchCard = {
  id: string;
  league: string;
  leagueLogo?: string;
  leagueFlag?: string;
  home: Team;
  away: Team;
  kickoff?: string; // ISO
};
type FeaturedResp = { live?: any[]; upcoming?: MatchCard[]; debug?: any };

/* ---- Öncelikli lig ID'leri ---- */
const UCL = 2;
const UEL = 3;
const UECL = 848;
const WCQ_UEFA = [32, 29, 34, 31, 30, 33]; // A..F

/* ---- Yarın (UTC) zaman sınırları ---- */
function utcTomorrowBounds() {
  const now = new Date();
  const utc0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(utc0); start.setUTCDate(start.getUTCDate() + 1);
  const end = new Date(start);  end.setUTCDate(end.getUTCDate() + 1);
  return { startUTC: start.getTime(), endUTC: end.getTime() };
}

/* ---- Lig adı öncelik sıralaması (eşit saatte) ---- */
function priorityRank(name: string) {
  const n = (name || "").toLowerCase();
  if (n.includes("champions league")) return 0;
  if (n.includes("europa league") && !n.includes("conference")) return 1;
  if (n.includes("europa conference")) return 2;
  if (n.includes("world cup") && n.includes("qual") && (n.includes("uefa") || n.includes("europe"))) return 3;
  return 9;
}

export default function HeroUpcomingStrip({ limit = 24 }: { limit?: number }) {
  const [items, setItems] = useState<MatchCard[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const safeLimit = Math.min(Math.max(limit, 1), 50); // API ≤ 50
        // BE: sadece öncelikli ligleri iste
        const include = [UCL, UEL, UECL, ...WCQ_UEFA].join(",");
        const q = new URLSearchParams({
          days: "15",
          limit: String(safeLimit),
          show_all: "0",                 // whitelist açık kalsın (sadece seçili ligler)
          include_leagues: include,
        });
        const r = await fetch(`${API}/api/live/featured?${q.toString()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const js: FeaturedResp = await r.json();
        const up = Array.isArray(js?.upcoming) ? js.upcoming : [];

        // FE: yalnız YARIN (UTC)
        const { startUTC, endUTC } = utcTomorrowBounds();
        const tomorrow = up.filter((m) => {
          const ts = m.kickoff ? Date.parse(m.kickoff) : NaN;
          return Number.isFinite(ts) && ts >= startUTC && ts < endUTC;
        });

        // Sırala: kickoff ↑, sonra lig önceliği
        const sorted = tomorrow.sort((a, b) => {
          const ta = a.kickoff ? Date.parse(a.kickoff) : Number.POSITIVE_INFINITY;
          const tb = b.kickoff ? Date.parse(b.kickoff) : Number.POSITIVE_INFINITY;
          if (ta !== tb) return ta - tb;
          return priorityRank(a.league) - priorityRank(b.league);
        });

        if (alive) {
          setItems(sorted.slice(0, safeLimit));
          setErr(sorted.length ? "" : "Yarın için UCL/UEL/UECL/WCQ (UEFA) maçı bulunamadı.");
        }
      } catch (e: any) {
        if (alive) {
          setErr(e?.message || "Bağlantı hatası");
          setItems([]);
        }
      }
    })();

    const t = setInterval(() => setItems((v) => v.slice()), 30_000); // countdown refresh
    return () => { alive = false; clearInterval(t); };
  }, [limit]);

  if (err && !items.length) {
    return (
      <div className="heroUpWrap">
        <div className="heroLane">
          <div className="laneHead">
            <span className="dot" />
            <span className="title">YARIN – ÖNCELİKLİ MAÇLAR</span>
            <span className="sub muted">{err}</span>
          </div>
        </div>
        <style>{css}</style>
      </div>
    );
  }
  if (!items.length) return null;

  return (
    <div className="heroUpWrap" aria-label="Yakındaki maçlar">
      <div className="heroLane">
        <div className="laneHead">
          <span className="dot" />
          <span className="title">YARIN – ÖNCELİKLİ MAÇLAR</span>
          <span className="sub">UCL • UEL • UECL • WC Qual. UEFA</span>
        </div>

        <div className="scroller" role="list">
          {items.map((m) => (
            <a
              key={m.id}
              className="mcard"
              href="#"
              role="listitem"
              onClick={(e) => e.preventDefault()}
              style={
                m.leagueFlag
                  ? ({ ["--bgimg" as any]: `url('${m.leagueFlag}')` } as any)
                  : undefined
              }
              title={`${m.league} • ${m.home.name} vs ${m.away.name}`}
            >
              {/* Üst (lig) */}
              <div className="mcard__top">
                <div className="lg">
                  {m.leagueLogo ? <img className="lgImg" src={m.leagueLogo} alt="" /> : <span className="lgPh" />}
                  <span className="lgName" title={m.league}>{m.league}</span>
                </div>
              </div>

              {/* Takımlar */}
              <div className="mcard__teams">
                <TeamBadge name={m.home.name} logo={m.home.logo} />
                <span className="vs">vs</span>
                <TeamBadge name={m.away.name} logo={m.away.logo} />
              </div>

              {/* Başlangıç & Geri sayım */}
              <div className="mcard__meta">
                <span className="kickVal">{fmtLocal(m.kickoff)}</span>
                <Countdown iso={m.kickoff} />
              </div>
            </a>
          ))}
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ===== Subcomponents ===== */
function TeamBadge({ name, logo }: { name: string; logo?: string }) {
  const initials = useMemo(() => {
    const parts = (name || "").split(" ").filter(Boolean);
    const a = parts[0]?.[0] ?? "?";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }, [name]);

  return (
    <div className="tb">
      {logo ? <img className="tbImg" src={logo} alt="" referrerPolicy="no-referrer" /> : <span className="tbPh">{initials}</span>}
      <div className="tbName" title={name}>{name}</div>
    </div>
  );
}

function Countdown({ iso }: { iso?: string }) {
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!iso) return <span className="cd muted">—</span>;
  const target = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((target - now) / 1000));
  if (s <= 0) return <span className="cd live">BAŞLIYOR</span>;
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const label = d > 0 ? `T-${d}g ${pad2(h)}:${pad2(m)}:${pad2(sec)}` : `T-${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  return <span className="cd strong">{label}</span>;
}

/* ===== Utils ===== */
function pad2(n: number) { return String(n).padStart(2, "0"); }
function fmtLocal(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

/* ===== Styles ===== */
const css = `
.heroUpWrap{
  width: 100%;
  padding: 10px 0;
  background: linear-gradient(180deg, rgba(10,16,28,.68), rgba(10,16,28,.40) 60%, rgba(10,16,28,0));
  backdrop-filter: blur(2px) saturate(1.05);
}
.heroLane{ max-width: 1280px; margin: 0 auto; padding: 0 14px; }
.laneHead{ display:flex; align-items:center; gap:10px; margin: 0 0 8px; color:#dfe8ff; }
.laneHead .dot{ width:8px;height:8px;border-radius:50%; background:#00ffa6; box-shadow:0 0
