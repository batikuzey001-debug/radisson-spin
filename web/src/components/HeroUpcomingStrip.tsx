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
  kickoff?: string;
};

type FeaturedResp = {
  live?: any[];
  upcoming?: MatchCard[];
  debug?: any;
};

export default function HeroUpcomingStrip({
  days = 15,
  limit = 16,
  showAll = true,
}: {
  days?: number;
  limit?: number;
  showAll?: boolean;
}) {
  const [items, setItems] = useState<MatchCard[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `${API}/api/live/featured?days=${days}&limit=${limit}&show_all=${showAll ? 1 : 0}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const js: FeaturedResp = await r.json();
        const up = Array.isArray(js?.upcoming) ? js!.upcoming! : [];
        if (alive) {
          setItems(up);
          setErr(up.length ? "" : "Yakında maç bulunamadı");
        }
      } catch (e: any) {
        if (alive) {
          setErr(e?.message || "Bağlantı hatası");
          setItems([]);
        }
      }
    })();
    const t = setInterval(() => {
      // kickoff’a göre geri sayım tazeleme amaçlı hafif polling
      // (neden: client saat farklarını kompanse etmek)
      setItems((v) => v.slice());
    }, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [days, limit, showAll]);

  if (err && !items.length) {
    return (
      <div className="heroUpWrap">
        <div className="heroLane">
          <span className="muted">{err}</span>
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
          <span className="title">YAKINDAKİ MAÇLAR</span>
          <span className="sub">15 gün içinde</span>
        </div>

        <div className="scroller" role="list">
          {items.map((m) => (
            <a key={m.id} className="mcard" href="#" role="listitem" onClick={(e) => e.preventDefault()}>
              <div className="mcard__top">
                <div className="lg">
                  {m.leagueLogo ? <img src={m.leagueLogo} alt="" /> : <span className="lgPh" />}
                  <span className="lgName" title={m.league}>{m.league}</span>
                </div>
                <div className="flag">{m.leagueFlag ? <img src={m.leagueFlag} alt="" /> : null}</div>
              </div>

              <div className="mcard__teams">
                <TeamBadge name={m.home.name} logo={m.home.logo} />
                <span className="vs">vs</span>
                <TeamBadge name={m.away.name} logo={m.away.logo} />
              </div>

              <div className="mcard__kick">
                <span className="kickLabel">Başlangıç</span>
                <span className="kickVal">{fmtLocal(m.kickoff)}</span>
              </div>

              <div className="mcard__count">
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

/* =============== Subcomponents =============== */
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
  const parts = d > 0 ? [`${d}g`, pad2(h), pad2(m), pad2(sec)] : [pad2(h), pad2(m), pad2(sec)];
  return <span className="cd">{parts.join(":")}</span>;
}

/* =============== Utils =============== */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function fmtLocal(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* =============== Styles =============== */
const css = `
.heroUpWrap{
  width: 100%;
  padding: 14px 0;
  background: linear-gradient(180deg, rgba(10,16,28,.72), rgba(10,16,28,.45) 60%, rgba(10,16,28,0));
  backdrop-filter: blur(2px) saturate(1.05);
}
.heroLane{
  max-width: 1280px; margin: 0 auto; padding: 0 14px;
}
.laneHead{
  display:flex; align-items:center; gap:10px; margin: 2px 0 8px;
  color:#dfe8ff;
}
.laneHead .dot{
  width:8px;height:8px;border-radius:50%; background:#00ffa6; box-shadow:0 0 10px rgba(0,255,166,.8);
}
.laneHead .title{ font-weight:1000; letter-spacing:.6px; font-size:13px }
.laneHead .sub{ color:#9fb1cc; font-size:12px }

.scroller{
  display:flex; gap:10px; overflow:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch;
  padding-bottom: 6px;
}
.scroller::-webkit-scrollbar{ display:none }

.mcard{
  flex:0 0 auto; width: 280px;
  display:flex; flex-direction:column; gap:8px;
  text-decoration:none; color:#eaf2ff;
  background:linear-gradient(180deg, rgba(6,10,22,.88), rgba(6,12,24,.86));
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px; padding:10px;
  box-shadow: 0 8px 16px rgba(0,0,0,.28);
  transition: transform .15s ease, box-shadow .2s ease, filter .2s ease;
}
.mcard:hover{ transform: translateY(-2px); filter:brightness(1.05); box-shadow:0 10px 20px rgba(0,0,0,.32) }

.mcard__top{
  display:flex; align-items:center; justify-content:space-between; gap:8px;
}
.lg{ display:flex; align-items:center; gap:8px; min-width:0 }
.lg img{ width:18px; height:18px; object-fit:contain }
.lgName{ font-size:13px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.lgPh{ width:18px; height:18px; border-radius:4px; background:rgba(255,255,255,.1) }
.flag img{ width:18px; height:12px; object-fit:cover; border-radius:2px; box-shadow:0 0 6px rgba(0,0,0,.3) }

.mcard__teams{
  display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px;
}
.vs{
  font-weight:1000; letter-spacing:.2px; color:#cceaff; opacity:.9;
}
.tb{ display:flex; flex-direction:column; align-items:center; gap:6px; min-width:0 }
.tbImg{ width:40px; height:40px; border-radius:999px; object-fit:cover; box-shadow:0 6px 12px rgba(0,0,0,.28) }
.tbPh{ width:40px; height:40px; border-radius:999px; display:grid; place-items:center; background:rgba(255,255,255,.12); color:#001018; font-weight:1000 }
.tbName{ text-align:center; font-size:13px; font-weight:800; color:#eef4ff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px }

.mcard__kick{
  display:flex; align-items:center; justify-content:center; gap:8px;
  font-size:12px; color:#cfe0ff;
}
.kickLabel{ opacity:.75 }
.kickVal{ font-weight:900 }

.mcard__count{
  display:grid; place-items:center;
}
.cd{
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  min-width:120px; height:28px; padding:0 10px; border-radius:8px;
  font-size:12px; font-weight:1000; letter-spacing:.3px; text-transform:uppercase;
  color:#001018; background:linear-gradient(90deg,#ffd36a,#ffebad);
  box-shadow: 0 6px 14px rgba(255,211,106,.28);
}
.cd.live{
  color:#fff; background:linear-gradient(90deg,#ff3b3b,#ff6b6b);
  box-shadow: 0 6px 14px rgba(255,59,59,.35);
}
.muted{ color:#9fb1cc }
@media (max-width: 480px){
  .mcard{ width: 240px }
  .tbName{ max-width:92px }
}
`;
