// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useState } from "react";

type Team = { name?: string; logo?: string };
type Row = {
  id: string;
  kickoff: string;             // ISO
  league: string;
  leagueLogo?: string;
  leagueFlag?: string;
  home: Team;
  away: Team;
};

const API = import.meta.env.VITE_API_BASE_URL;

export default function AnaSayfaDemo() {
  // Varsayılan: YARIN + 7 gün penceresi (FE filtre)
  const [start, setStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // yarın
    return toYMD(d);
  });
  const [windowDays, setWindowDays] = useState<number>(7);
  const [league, setLeague] = useState<string>(""); // opsiyonel
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const qs = new URLSearchParams({ start });
      if (league.trim()) qs.set("league", league.trim());
      const res = await fetch(`${API}/api/fixtures?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = (await res.json()) as Row[];
      setData(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      setErr(e?.message ?? "Bağlantı hatası");
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  // FE filtre: start'tan itibaren seçilen gün penceresi
  const filtered = useMemo(() => {
    const minTs = new Date(start + "T00:00:00Z").getTime();
    const maxTs = minTs + windowDays * 24 * 60 * 60 * 1000;
    return (data || []).filter((r) => {
      const t = Date.parse(r.kickoff);
      return t >= minTs && t < maxTs;
    });
  }, [data, start, windowDays]);

  // Grupta tarihe göre ayır
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of filtered) {
      const key = toYMD(new Date(r.kickoff));
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    // sıralı idd
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, v.sort((x, y) => +new Date(x.kickoff) - +new Date(y.kickoff))] as const);
  }, [filtered]);

  return (
    <main className="sched">
      <header className="head">
        <h1>📅 Yaklaşan Maçlar (Demo)</h1>
        <div className="filters">
          <label className="f">
            <span>Başlangıç</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="f">
            <span>Pencere</span>
            <select value={windowDays} onChange={(e) => setWindowDays(parseInt(e.target.value, 10))}>
              <option value={1}>1 gün</option>
              <option value={3}>3 gün</option>
              <option value={7}>7 gün</option>
              <option value={14}>14 gün</option>
            </select>
          </label>
          <label className="f">
            <span>Lig ID (ops.)</span>
            <input
              type="text"
              placeholder="örn. 206"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Yükleniyor…" : "Listele"}
          </button>
        </div>
      </header>

      {err && <div className="msg error">Hata: {err}</div>}
      {!err && !loading && filtered.length === 0 && (
        <div className="msg">Seçilen aralıkta maç bulunamadı.</div>
      )}

      {/* Tarihe göre gruplu liste */}
      {groups.map(([day, rows]) => (
        <section key={day} className="day">
          <h2 className="dayTitle">{formatDateTR(day)}</h2>
          <ul className="list">
            {rows.map((r) => (
              <li key={r.id} className="card">
                <div className="left">
                  <div className="time">{formatTimeTR(r.kickoff)}</div>
                  <div className="league">
                    {r.leagueFlag && <img className="flag" src={r.leagueFlag} alt="" />}
                    {r.league}
                  </div>
                </div>
                <div className="teams">
                  <Team name={r.home?.name} logo={r.home?.logo} align="right" />
                  <span className="vs">vs</span>
                  <Team name={r.away?.name} logo={r.away?.logo} align="left" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <style>{css}</style>
    </main>
  );
}

function Team({ name, logo, align }: { name?: string; logo?: string; align: "left" | "right" }) {
  return (
    <div className={`team ${align}`}>
      {logo ? <img className="logo" src={logo} alt="" /> : <span className="ph" />}
      <div className="tname">{name || "-"}</div>
    </div>
  );
}

/* -------- helpers -------- */
function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatTimeTR(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
function formatDateTR(ymd: string) {
  try {
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    return date.toLocaleDateString("tr-TR", { weekday: "long", day: "2-digit", month: "long" });
  } catch {
    return ymd;
  }
}

/* -------- styles -------- */
const css = `
.sched{max-width:1000px;margin:16px auto;padding:0 16px;color:#eaf2ff}
.head{display:flex;flex-direction:column;gap:10px;margin-bottom:10px}
.head h1{margin:0;font-size:20px;font-weight:800}
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:#9fb1cc}
.f input,.f select{background:#0d1528;border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;padding:8px 10px}
.btn{background:linear-gradient(90deg,#00e5ff,#4aa7ff);border:none;border-radius:10px;color:#001018;padding:8px 12px;font-weight:900;cursor:pointer}
.btn:disabled{opacity:.7;cursor:not-allowed}

.msg{margin-top:12px;color:#9fb1cc}
.msg.error{color:#ffb3c0}

.day{margin-top:14px}
.dayTitle{margin:0 0 8px;font-size:14px;color:#cfe0ff}

.list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.card{
  display:flex;justify-content:space-between;align-items:center;gap:12px;
  background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px;
}
.left{display:flex;align-items:center;gap:10px}
.time{font-weight:900;color:#ffd966}
.league{display:flex;align-items:center;gap:6px;color:#9fb1cc}
.flag{width:18px;height:12px;object-fit:cover;border-radius:2px}

.teams{display:flex;align-items:center;gap:10px}
.team{display:flex;align-items:center;gap:8px;max-width:180px}
.team.right{justify-content:flex-end;text-align:right}
.logo{width:22px;height:22px;border-radius:999px;object-fit:cover}
.tname{white-space:normal;word-break:normal;overflow-wrap:break-word;line-height:1.2;font-weight:700}
.vs{opacity:.8}

@media (max-width:600px){
  .team{max-width:120px}
}
`;
