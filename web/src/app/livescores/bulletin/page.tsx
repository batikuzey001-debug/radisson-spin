// web/src/app/livescores/bulletin/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * Neden: API base'i env ile yönetmek için.
 * - Farklı origin kullanıyorsan NEXT_PUBLIC_API_BASE="https://api.domain.com" ver.
 * - Aynı origin ise boş bırak (relative).
 */
const RAW_API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").trim().replace(/\/+$/, "");

/** Güvenli join; base boşsa relative path döner. */
function apiUrl(path: string, qs?: Record<string, string | number | boolean | null | undefined>) {
  const rel = path.startsWith("/") ? path : `/${path}`;
  const base = RAW_API_BASE;
  const query = qs
    ? "?" +
      Object.entries(qs)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  return `${base}${rel}${query}`;
}

/* ---------------- Types (backend sözleşmesi) ---------------- */
type Team = { name: string; logo?: string | null };
type League = {
  id?: number | string | null;
  name?: string | null;
  logo?: string | null;
  country?: { id?: number | string | null; name?: string | null; flag?: string | null } | null;
};
type Row = {
  fixture_id: number;
  date?: string | null;
  kickoff_utc?: string | null;
  league: League;
  home: Team;
  away: Team;
  score: { home: number | null; away: number | null };
  time?: string | null;
  odds?: { H: number | null; D: number | null; A: number | null; bookmaker?: string | null } | null;
  prob?: { H: number | null; D: number | null; A: number | null } | null;
};
type BulletinRes = {
  range: { from: string; to: string };
  count: number;
  items: Row[];
  diag?: string[];
};

/* ---------------- Helpers ---------------- */
function weekRangeOf(d = new Date()) {
  // Neden: Haftayı Mon..Sun hesaplamak; backend tarihle uyumlu aralık sağlamak.
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = (dt.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const start = new Date(dt); start.setUTCDate(dt.getUTCDate() - dow);
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

function toLocalDateTime(utcIso?: string | null) {
  if (!utcIso) return "";
  try {
    const d = new Date(utcIso);
    const day = d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${day} ${time}`;
  } catch { return String(utcIso); }
}

function groupByLeague(rows: Row[]) {
  const map = new Map<string, { league: League; rows: Row[] }>();
  for (const r of rows || []) {
    const lg = r.league || {};
    const key = `${lg.id ?? ""}::${lg.name ?? "Lig"}`;
    if (!map.has(key)) map.set(key, { league: lg, rows: [] });
    map.get(key)!.rows.push(r);
  }
  for (const g of map.values()) {
    g.rows.sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.fixture_id - b.fixture_id);
  }
  return Array.from(map.values()).sort((a, b) => (a.league.name || "").localeCompare(b.league.name || ""));
}

const cell = { border: "1px solid #eee", padding: "6px 8px", textAlign: "left" as const };

/* ---------------- Page ---------------- */
export default function BulletinPage() {
  const { start, end } = useMemo(() => weekRangeOf(new Date()), []);
  const [from, setFrom] = useState(fmtDate(start));
  const [to, setTo] = useState(fmtDate(end));
  const [data, setData] = useState<BulletinRes | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const url = apiUrl("/api/livescores/bulletin", { from, to });
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: BulletinRes = await res.json();
      setData(json);
    } catch (e: any) {
      setErr(`Failed to fetch: ${e?.message || e}`);
      setData(null);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let t: any;
    if (auto) t = setInterval(load, 30_000);
    return () => t && clearInterval(t);
  }, [auto, from, to]);

  useEffect(() => { load(); /* ilk yükleme */ }, []);

  const groups = useMemo(() => groupByLeague(data?.items || []), [data]);

  return (
    <main style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h1 style={{ marginBottom: 12 }}>Bülten (Lig Bazlı · Bu Hafta)</h1>

      <section style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <fieldset style={{ border: "1px solid #ddd", padding: "6px 10px", borderRadius: 8 }}>
          <legend>Tarih aralığı</legend>
          <label style={{ marginRight: 8 }}>
            Başlangıç:&nbsp;
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Bitiş:&nbsp;
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </fieldset>
        <button onClick={load} disabled={loading} style={{ padding: "8px 12px", cursor: "pointer" }}>
          {loading ? "Yükleniyor..." : "Yenile"}
        </button>
        <label style={{ fontSize: 12 }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Otomatik (30s)
        </label>
        <span style={{ color: "#666", fontSize: 12 }}>
          {data ? `Aralık: ${data.range.from} → ${data.range.to} · Toplam ${data.count} maç` : ""}
        </span>
      </section>

      {err && (
        <div style={{ background: "#fbeaea", color: "#b10000", border: "1px solid #f2b3b3", padding: 10, borderRadius: 6, marginBottom: 12 }}>
          {err}
        </div>
      )}

      {data?.diag?.length ? (
        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 12, color: "#666", marginBottom: 8 }}>
          diag: {data.diag.join(" | ")}
        </div>
      ) : null}

      {!groups.length && !loading && <div>Veri yok.</div>}

      <div style={{ display: "grid", gap: 16 }}>
        {groups.map(({ league, rows }) => (
          <section key={`${league.id ?? ""}-${league.name ?? ""}`} style={{ marginTop: 8 }}>
            <h2 style={{ margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 18 }}>
              {league.country?.flag ? (
                // Bayrak küçük boyutta
                <img src={league.country.flag} alt={league.country?.name || ""} style={{ width: 20, height: 20, objectFit: "contain" }} />
              ) : null}
              {league.logo ? (
                <img src={league.logo} alt={league.name || ""} style={{ width: 20, height: 20, objectFit: "contain" }} />
              ) : null}
              <span>{league.name || "Lig"}{league.country?.name ? ` · ${league.country.name}` : ""}</span>
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={cell}>Tarih/Saat</th>
                  <th style={cell}>Ev Sahibi</th>
                  <th style={{ ...cell, textAlign: "center" }}>Skor</th>
                  <th style={cell}>Deplasman</th>
                  <th style={{ ...cell, fontSize: 12, color: "#444" }}>Durum</th>
                  <th style={{ ...cell, textAlign: "right" }}>Oran (H/D/A)</th>
                  <th style={{ ...cell, textAlign: "right" }}>İhtimal % (H/D/A)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.fixture_id}>
                    <td style={{ ...cell, fontSize: 12 }}>{toLocalDateTime(r.kickoff_utc)}</td>
                    <td style={cell}>
                      {r.home.logo ? <img src={r.home.logo} alt="" style={{ width: 18, height: 18, objectFit: "contain", verticalAlign: "middle", marginRight: 6 }} /> : null}
                      {r.home.name || ""}
                    </td>
                    <td style={{ ...cell, textAlign: "center" }}>
                      {(r.score.home ?? "")}-{(r.score.away ?? "")}
                    </td>
                    <td style={cell}>
                      {r.away.logo ? <img src={r.away.logo} alt="" style={{ width: 18, height: 18, objectFit: "contain", verticalAlign: "middle", marginRight: 6 }} /> : null}
                      {r.away.name || ""}
                    </td>
                    <td style={{ ...cell, fontSize: 12 }}>{r.time || ""}</td>
                    <td style={{ ...cell, textAlign: "right" }}>
                      {[
                        r.odds?.H ?? "",
                        r.odds?.D ?? "",
                        r.odds?.A ?? "",
                      ].map((x) => (x === null ? "" : x)).join(" / ")}
                    </td>
                    <td style={{ ...cell, textAlign: "right" }}>
                      {[
                        r.prob?.H ?? "",
                        r.prob?.D ?? "",
                        r.prob?.A ?? "",
                      ].map((x) => (x === null ? "" : x)).join(" / ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </main>
  );
}
