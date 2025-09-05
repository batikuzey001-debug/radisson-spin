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
  kickoff?: string; // ISO (+00:00)
  // Backend ileride eklerse otomatik kullanılır
  // leagueId?: number;
};
type FeaturedResp = { live?: any[]; upcoming?: MatchCard[]; debug?: any };

/** Öncelikli ligler – yalnız bunlar listelenecek */
const UCL_ID = 2;
const UEL_ID = 3;
const UECL_ID = 848;
const WCQ_UEFA_IDS = [32, 29, 34, 31, 30, 33]; // A..F grupları

/** İsim bazlı emniyet şeridi (backend ID göndermese de eşleştir) */
function isPriorityByName(name: string) {
  const n = (name || "").toLowerCase();
  return (
    n.includes("champions league") ||
    n.includes("europa league") ||
    n.includes("europa conference") ||
    n.includes("world cup - qualification europe") ||
    n.includes("world cup - qual. uefa")
  );
}

export default function HeroUpcomingStrip({
  limit = 24,
}: {
  limit?: number;
}) {
  const [items, setItems] = useState<MatchCard[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Yalnızca öncelikli ligleri iste – 15 gün penceresi backend’de (gerekirse daraltırız)
        const includeLeagues = [
          UCL_ID,
          UEL_ID,
          UECL_ID,
          ...WCQ_UEFA_IDS,
        ];
        const q = new URLSearchParams({
          days: "15",
          limit: String(limit),
          show_all: "0",
          include_leagues: includeLeagues.join(","),
        });
        const r = await fetch(`${API}/api/live/featured?${q.toString()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const js: FeaturedResp = await r.json();

        const up = Array.isArray(js?.upcoming) ? js.upcoming : [];

        // ---- FE güvence: sadece yarın (UTC) + sadece öncelikli ligler ----
        const { startUTC, endUTC } = utcTomorrowBounds();
        const filtered = up.filter((m) => {
          const ts = m.kickoff ? Date.parse(m.kickoff) : NaN;
          if (!Number.isFinite(ts) || ts < startUTC || ts >= endUTC) return false;

          // Eğer backend ileride leagueId gönderirse burada ID ile doğrulanır;
          // şu an isimle emniyet şeridi de var.
          return isPriorityByName(m.league);
        });

        // Sırala: en yakın maç önce, sonra lig önceliği (UCL > UEL > UECL > WCQ)
        const sorted = filtered.sort((a, b) => {
          const ta = a.kickoff ? Date.parse(a.kickoff) : Number.POSITIVE_INFINITY;
          const tb = b.kickoff ? Date.parse(b.kickoff) : Number.POSITIVE_INFINITY;
          if (ta !== tb) return ta - tb;
          return priorityRank(a.league) - priorityRank(b.league);
        });

        if (alive) {
          setItems(sorted);
          setErr(sorted.length ? "" : "Yarın için öncelikli liglerde maç bulunamadı.");
        }
      } catch (e: any) {
        if (alive) {
          setErr(e?.message || "Bağlantı hatası");
          setItems([]);
        }
      }
    })();

    // countdown tazeleme
    const t = setInterval(() => setItems((v) => v.slice()), 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
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
                  {m.leagueLogo ? (
                    <img className="lgImg" src={m.leagueLogo} alt="" />
                  ) : (
                    <span className="lgPh" />
                  )}
                  <span className="lgName" title={m.league}>{m.league}</span>
                </div>
              </div>

              {/* Takımlar */}
              <div className="mcard__teams">
                <TeamBadge name={m.home.name} logo={m.home.logo} />
                <span className="vs">vs</span>
                <TeamBadge name={m.away.name} logo={m.away.logo} />
              </div>

              {/* Başlangıç & Geri sayım – sabit yerde */}
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

/* ===== helpers ===== */
function utcTomorrowBounds() {
  const now = new Date();
  const utc0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(utc0); // bugün 00:00 UTC
  start.setUTCDate(start.getUTCDate() + 1); // yarın 00:00 UTC
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1); // ertesi gün 00:00 UTC
  return { startUTC: start.getTime(), endUTC: end.getTime() };
}
function priorityRank(leagueName: string) {
  const n = (leagueName || "").toLowerCase();
  if (n.includes("champions league")) return 0;
  if (n.includes("europa league") && !n.includes("conference")) return 1;
  if (n.includes("europa conference")) return 2;
  if (n.includes("world cup - qualification europe") || n.includes("world cup - qual. uefa")) return 3;
  return 9;
}

/* ===== subcomponents ===== */
function TeamBadge({ name, logo }: { name: string; logo?: string }) {
  const initials = useMemo(() => {
    const parts = (name || "").split(" ").filter(Boolean);
    const a = parts[0]?.[0] ?? "?";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }, [name]);

  return (
    <div className="tb">
      {logo ? (
        <img className="tbImg" src={logo} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="tbPh">{initials}</span>
      )}
      <div className="tbName" title={name}>{name}</div>
    </div>
  );
}

function Countdown({ iso }: { iso?: string }) {
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return <span className="cd muted">—</span>;
  const target = new Date(iso).getTime();
  const diff = Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  if (s <= 0) return <span className="cd live">BAŞLIYOR</span>;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = d > 0 ? `T-${d}g ${pad2(h)}:${pad2(m)}:${pad2(sec)}` : `T-${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  return <span className="cd strong">{label}</span>;
}

/* ===== utils ===== */
function pad2(n: number) { return String(n).padStart(2, "0"); }
function fmtLocal(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

/* ===== styles ===== */
const css = `
.heroUpWrap{
  width: 100%;
  padding: 10px 0;
  background: linear-gradient(180deg, rgba(10,16,28,.68), rgba(10,16,28,.40) 60%, rgba(10,16,28,0));
  backdrop-filter: blur(2px) saturate(1.05);
}
.heroLane{ max-width: 1280px; margin: 0 auto; padding: 0 14px; }
.laneHead{ display:flex; align-items:center; gap:10px; margin: 0 0 8px; color:#dfe8ff; }
.laneHead .dot{ width:8px;height:8px;border-radius:50%; background:#00ffa6; box-shadow:0 0 10px rgba(0,255,166,.8); }
.laneHead .title{ font-weight:1000; letter-spacing:.6px; font-size:13px }
.laneHead .sub{ color:#9fb1cc; font-size:12px }
.muted{ color:#9fb1cc }

.scroller{
  display:flex; gap:10px; overflow:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch;
  padding-bottom: 6px;
}
.scroller::-webkit-scrollbar{ display:none }

/* Kartlar (kompakt) */
.mcard{
  flex:0 0 auto; width: 230px; min-height: 150px;
  display:grid; grid-template-rows: auto 1fr auto;
  gap:6px;
  text-decoration:none; color:#eaf2ff; position:relative;
  background:linear-gradient(180deg, rgba(6,10,22,.82), rgba(6,12,24,.82));
  border:1px solid rgba(255,255,255,.08);
  border-radius:12px; padding:8px 10px;
  box-shadow: 0 8px 16px rgba(0,0,0,.26);
  transition: transform .15s ease, box-shadow .2s ease, filter .2s ease;
  overflow:hidden;
}
.mcard::before{
  content:""; position:absolute; inset:0;
  background-image: var(--bgimg); background-size:cover; background-position:center;
  filter: saturate(1.05) contrast(1.05) opacity(.28);
}
.mcard::after{
  content:""; position:absolute; inset:0;
  background: radial-gradient(60% 50% at 50% 0%, rgba(4,8,18,.32), rgba(4,8,18,.6));
}
.mcard > *{ position:relative; z-index:1 }
.mcard:hover{ transform: translateY(-2px); filter:brightness(1.05); box-shadow:0 10px 20px rgba(0,0,0,.30) }

/* Lig alanı */
.mcard__top{ display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:22px; }
.lg{ display:flex; align-items:center; gap:8px; min-width:0 }
.lgImg{ width:22px; height:22px; object-fit:contain; filter: drop-shadow(0 2px 8px rgba(0,229,255,.35)); }
.lgName{ font-size:12px; font-weight:900; color:#e7f3ff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; }
.lgPh{ width:22px; height:22px; border-radius:6px; background:rgba(255,255,255,.12) }

/* Takımlar – isimler 2 satır, countdown sabit */
.mcard__teams{
  display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px;
  min-height: 68px;
}
.vs{ font-weight:1000; color:#cceaff; opacity:.9; }
.tb{ display:flex; flex-direction:column; align-items:center; gap:4px; min-width:0 }
.tbImg{ width:34px; height:34px; border-radius:999px; object-fit:cover; box-shadow:0 6px 12px rgba(0,0,0,.22) }
.tbPh{ width:34px; height:34px; border-radius:999px; display:grid; place-items:center; background:rgba(255,255,255,.12); color:#001018; font-weight:1000 }
.tbName{
  text-align:center; font-size:12px; font-weight:800; color:#eef4ff;
  line-height:1.15; max-height: 2.3em; /* ~2 satır */
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden; text-overflow:clip;
  white-space:normal; word-break:break-word; overflow-wrap:anywhere;
}

/* Alt: tarih + countdown (sabit) */
.mcard__meta{
  display:flex; align-items:center; justify-content:space-between; gap:8px;
  min-height: 28px;
}
.kickVal{ font-size:12px; font-weight:900; color:#cfe0ff; white-space:nowrap }

/* Countdown rozet */
.cd{
  display:inline-flex; align-items:center; justify-content:center;
  height:26px; padding:0 10px; border-radius:9px;
  font-size:12px; font-weight:1000; letter-spacing:.3px; text-transform:uppercase;
  color:#001018; background:linear-gradient(90deg,#ffd36a,#ffebad);
  box-shadow: 0 6px 14px rgba(255,211,106,.26);
  min-width: 110px; font-variant-numeric: tabular-nums;
}
.cd.strong{ filter:saturate(1.05) }
.cd.live{
  color:#fff; background:linear-gradient(90deg,#ff3b3b,#ff6b6b);
  box-shadow: 0 6px 14px rgba(255,59,59,.32);
}

@media (max-width: 520px){
  .mcard{ width: 210px; min-height: 146px; }
  .lgName{ max-width: 130px; }
}
`;
