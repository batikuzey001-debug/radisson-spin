// web/src/components/HeroUpcomingStrip.tsx
import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL;

type Team = { name: string; logo?: string };
type LiveCard = {
  id: string;
  league: string;
  leagueLogo?: string;
  leagueFlag?: string;
  home: Team;
  away: Team;
  minute?: number;
  scoreH?: number;
  scoreA?: number;
  kickoff?: string; // backend dönüyor olabilir, ama göstermeyeceğiz
};
type FeaturedResp = { live?: LiveCard[]; upcoming?: any[]; debug?: any };

export default function HeroUpcomingStrip({ limit = 24 }: { limit?: number }) {
  const [items, setItems] = useState<LiveCard[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const safeLimit = Math.min(Math.max(limit, 1), 50); // API ≤ 50
        // Canlı + whitelist açık (popüler lig öncelikli). İstersen show_all=1 yapabilirsin.
        const q = new URLSearchParams({
          limit: String(safeLimit),
          days: "1",         // gerekmiyor ama endpoint kabul ediyor
          show_all: "0",
        });
        const r = await fetch(`${API}/api/live/featured?${q.toString()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const js: FeaturedResp = await r.json();
        const live = Array.isArray(js?.live) ? js.live : [];

        // Sadece canlı (minute>0) ve skor alanları normalize
        const normalized = live
          .filter((m) => (m.minute ?? 0) > 0)
          .map((m) => ({
            ...m,
            scoreH: typeof m.scoreH === "number" ? m.scoreH : 0,
            scoreA: typeof m.scoreA === "number" ? m.scoreA : 0,
          }))
          // Sırala: dakika ↓, toplam gol ↓
          .sort((a, b) => {
            const mdiff = (b.minute ?? 0) - (a.minute ?? 0);
            if (mdiff !== 0) return mdiff;
            const ga = (a.scoreH ?? 0) + (a.scoreA ?? 0);
            const gb = (b.scoreH ?? 0) + (b.scoreA ?? 0);
            return gb - ga;
          });

        if (alive) {
          setItems(normalized.slice(0, safeLimit));
          setErr(normalized.length ? "" : "Şu an canlı maç bulunamadı.");
        }
      } catch (e: any) {
        if (alive) {
          setErr(e?.message || "Bağlantı hatası");
          setItems([]);
        }
      }
    }

    load();
    const t = setInterval(load, 15000); // 15 sn’de bir güncelle
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
            <span className="title">CANLI MAÇLAR</span>
            <span className="sub muted">{err}</span>
          </div>
        </div>
        <style>{css}</style>
      </div>
    );
  }
  if (!items.length) return null;

  return (
    <div className="heroUpWrap" aria-label="Canlı maçlar">
      <div className="heroLane">
        <div className="laneHead">
          <span className="dot" />
          <span className="title">CANLI MAÇLAR</span>
          <span className="sub">anlık skorlar</span>
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
                  <span className="lgName" title={m.league}>
                    {m.league}
                  </span>
                </div>
              </div>

              {/* Orta: Takımlar + SKOR (vs yerine) */}
              <div className="mcard__teams">
                <TeamBadge name={m.home.name} logo={m.home.logo} />
                <div className="score">
                  <span className="h">{m.scoreH ?? 0}</span>
                  <span className="sep">:</span>
                  <span className="a">{m.scoreA ?? 0}</span>
                </div>
                <TeamBadge name={m.away.name} logo={m.away.logo} />
              </div>

              {/* Alt satır kaldırıldı (tarih/geri sayım yok) */}
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
      {logo ? (
        <img className="tbImg" src={logo} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="tbPh">{initials}</span>
      )}
      <div className="tbName" title={name}>
        {name}
      </div>
    </div>
  );
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
.laneHead .dot{ width:8px;height:8px;border-radius:50%; background:#00ffa6; box-shadow:0 0 10px rgba(0,255,166,.8); }
.laneHead .title{ font-weight:1000; letter-spacing:.6px; font-size:13px }
.laneHead .sub{ color:#9fb1cc; font-size:12px }
.muted{ color:#9fb1cc }

.scroller{
  display:flex; gap:10px; overflow:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch;
  padding-bottom: 6px;
}
.scroller::-webkit-scrollbar{ display:none }

/* Kartlar (mevcut düzen korunur) */
.mcard{
  flex:0 0 auto; width: 230px; min-height: 150px;
  display:grid; grid-template-rows: auto 1fr; /* alt satırı kaldırdık */
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

/* Takımlar – ortada SKOR */
.mcard__teams{
  display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px;
  min-height: 68px;
}
.tb{ display:flex; flex-direction:column; align-items:center; gap:4px; min-width:0 }
.tbImg{ width:34px; height:34px; border-radius:999px; object-fit:cover; box-shadow:0 6px 12px rgba(0,0,0,.22) }
.tbPh{ width:34px; height:34px; border-radius:999px; display:grid; place-items:center; background:rgba(255,255,255,.12); color:#001018; font-weight:1000 }
.tbName{
  text-align:center; font-size:12px; font-weight:800; color:#eef4ff;
  line-height:1.15; max-height: 2.3em;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden; text-overflow:clip; white-space:normal; word-break:break-word; overflow-wrap:anywhere;
}

/* Skor görünümü */
.score{
  display:flex; align-items:center; gap:8px;
  font-weight:1000; font-size:20px; letter-spacing:.3px;
  color:#fff; text-shadow:0 0 10px rgba(255,255,255,.25), 0 0 18px rgba(160,220,255,.20);
}
.score .sep{ opacity:.9 }
.score .h{ color:#b9f0ff; text-shadow:0 0 12px rgba(120,220,255,.45) }
.score .a{ color:#ffd9d9; text-shadow:0 0 12px rgba(255,120,120,.45) }

@media (max-width: 520px){
  .mcard{ width: 210px; min-height: 146px; }
  .lgName{ max-width: 130px; }
}
`;
