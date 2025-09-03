// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL;

type Team = { name: string; logo?: string };
type Match = {
  id: string;
  league: string;
  leagueLogo?: string;
  leagueFlag?: string;
  home: Team;
  away: Team;
  kickoff: string; // ISO
};

export default function AnaSayfaDemo() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/api/live/featured?days=1`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMatches(data?.upcoming || []);
      } catch (e: any) {
        setErr(e?.message ?? "Bağlantı hatası");
      }
    }
    load();
  }, []);

  if (err) return <div className="demo"><p>Hata: {err}</p></div>;
  if (!matches.length) return <div className="demo"><p>Yarın için maç bulunamadı.</p></div>;

  return (
    <main className="demo">
      <h2>📅 Yarınki Popüler Maçlar</h2>
      <ul className="match-list">
        {matches.map((m) => (
          <li key={m.id} className="match">
            <div className="time">{formatTime(m.kickoff)}</div>
            <div className="league">
              {m.leagueFlag && <img src={m.leagueFlag} alt="" className="flag" />}
              {m.league}
            </div>
            <div className="teams">
              <span>{m.home.name}</span> vs <span>{m.away.name}</span>
            </div>
          </li>
        ))}
      </ul>

      <style>{css}</style>
    </main>
  );
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

const css = `
.demo{max-width:800px;margin:20px auto;padding:16px;color:#eaf2ff}
h2{margin-bottom:16px;font-size:20px;font-weight:800}
.match-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px}
.match{background:rgba(255,255,255,.05);padding:12px;border-radius:10px;display:flex;flex-direction:column;gap:6px}
.time{font-weight:700;color:#ffd966}
.league{font-size:14px;color:#9fb1cc;display:flex;align-items:center;gap:6px}
.flag{width:18px;height:12px;object-fit:cover;border-radius:2px}
.teams{font-size:16px;font-weight:600}
@media(max-width:600px){.match{padding:10px}.teams{font-size:14px}}
`;
