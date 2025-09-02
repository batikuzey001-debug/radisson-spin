// web/src/app/livescores/board/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/** API base: Farklı origin ise NEXT_PUBLIC_API_BASE ver; aynı origin'de boş bırak. */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

/** ------- Tipler (backend sözleşmesi) ------- */
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

/** ------- Yardımcılar ------- */
const todayISO = () => new Date().toISOString().slice(0, 10);
const yearEndISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), 11, 31).toISOString().slice(0, 10);
};

function toLocalDateTime(utcIso?: string | null) {
  if (!utcIso) return "";
  try {
    const d = new Date(utcIso);
    const day = d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${day} ${time}`;
  } catch {
    return String(utcIso);
  }
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

type LeagueFacet = { id: string; name: string; count: number; country?: string | null; logo?: string | null; flag?: string | null };

function buildFacets(rows: Row[]): LeagueFacet[] {
  const counts = new Map<string, LeagueFacet>();
  for (const r of rows) {
    const id = String(r.league?.id ?? "");
    const name = r.league?.name ?? "Lig";
    const flag = r.league?.country?.flag ?? null;
    const country = r.league?.country?.name ?? null;
    const logo = r.league?.logo ?? null;
    const key = `${id}::${name}`;
    const cur = counts.get(key) || { id, name, count: 0, country, logo, flag };
    cur.count += 1;
    counts.set(key, cur);
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** ------- Sayfa ------- */
export default function LivescoreBoard() {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(yearEndISO());
  const [data, setData] = useState<BulletinRes | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Seçilen ligler (id listesi)
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams({ from, to });
      if (selected.length) params.set("leagues", selected.join(","));
      const url = `${API_BASE}/api/livescores/bulletin?${params.toString()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${t ? ` – ${t}` : ""}`);
      }
      const json: BulletinRes = await res.json();
      setData(json);
    } catch (e: any) {
      setErr(`Failed to fetch: ${e?.message || e}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => groupByLeague(data?.items || []), [data]);
  const facets = useMemo(() => buildFacets(data?.items || []), [data]);

  const filteredFacets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facets;
    return facets.filter((f) => (f.name.toLowerCase().includes(q) || (f.country || "").toLowerCase().includes(q)));
  }, [facets, search]);

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function selectAllVisible() {
    setSelected(Array.from(new Set([...selected, ...filteredFacets.map((f) => f.id)])));
  }
  function clearSelection() {
    setSelected([]);
  }

  return (
    <main style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, padding: 16, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      {/* Sol: Lig Facet Panel */}
      <aside style={{ position: "sticky", top: 16, alignSelf: "start", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        <h2 style={{ margin: "0 0 8px 0" }}>Ligler</h2>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12 }}>Arama</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Lig veya ülke ara…"
              style={{ padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={selectAllVisible} style={{ padding: "6px 8px" }}>Görünenleri Seç</button>
            <button onClick={clearSelection} style={{ padding: "6px 8px" }}>Seçimi Temizle</button>
          </div>

          <div style={{ fontSize: 12, color: "#555" }}>
            Toplam lig: {facets.length} {selected.length ? `• Seçili: ${selected.length}` : ""}
          </div>

          <div style={{ maxHeight: 420, overflow: "auto", borderTop: "1px solid #eee", paddingTop: 8 }}>
            {filteredFacets.map((f) => (
              <label key={f.id + ":" + f.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selected.includes(f.id)}
                  onChange={() => toggle(f.id)}
                />
                {f.flag ? <img src={f.flag} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} /> : null}
                {f.logo ? <img src={f.logo} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} /> : null}
                <span style={{ flex: 1 }}>{f.name}</span>
                <span style={{ color: "#666", fontSize: 12 }}>({f.count})</span>
              </label>
            ))}
            {!filteredFacets.length && <div style={{ color: "#666", fontSize: 12 }}>Sonuç yok.</div>}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <button onClick={load} disabled={loading} style={{ padding: "8px 10px" }}>
              {loading ? "Yükleniyor..." : "Uygula / Yenile"}
            </button>
            <small style={{ color: "#666" }}>
              Aralık varsayılan: {todayISO()} → {yearEndISO()}
            </small>
          </div>
        </div>
      </aside>

      {/* Sağ: İçerik */}
      <section>
        <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
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
          <button onClick={load} disabled={loading} style={{ padding: "8px 12px" }}>
            {loading ? "Yükleniyor..." : "Yenile"}
          </button>
          <span style={{ color: "#666", fontSize: 12 }}>
            {data ? `Aralık: ${data.range.from} → ${data.range.to} · Toplam ${data.count} maç` : ""}
          </span>
        </header>

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
                  <img src={league.country.flag!} alt={league.country?.name || ""} style={{ width: 20, height: 20, objectFit: "contain" }} />
                ) : null}
                {league.logo ? (
                  <img src={league.logo!} alt={league.name || ""} style={{ width: 20, height: 20, objectFit: "contain" }} />
                ) : null}
                <span>{league.name || "Lig"}{league.country?.name ? ` · ${league.country.name}` : ""}</span>
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thtd}>Tarih/Saat</th>
                    <th style={thtd}>Ev Sahibi</th>
                    <th style={{ ...thtd, textAlign: "center" }}>Skor</th>
                    <th style={thtd}>Deplasman</th>
                    <th style={{ ...thtd, fontSize: 12, color: "#444" }}>Durum</th>
                    <th style={{ ...thtd, textAlign: "right" }}>Oran (H/D/A)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.fixture_id}>
                      <td style={{ ...thtd, fontSize: 12 }}>{toLocalDateTime(r.kickoff_utc)}</td>
                      <td style={thtd}>
                        {r.home.logo ? <img src={r.home.logo!} alt="" style={{ width: 18, height: 18, objectFit: "contain", verticalAlign: "middle", marginRight: 6 }} /> : null}
                        {r.home.name || ""}
                      </td>
                      <td style={{ ...thtd, textAlign: "center" }}>
                        {(r.score.home ?? "")}-{(r.score.away ?? "")}
                      </td>
                      <td style={thtd}>
                        {r.away.logo ? <img src={r.away.logo!} alt="" style={{ width: 18, height: 18, objectFit: "contain", verticalAlign: "middle", marginRight: 6 }} /> : null}
                        {r.away.name || ""}
                      </td>
                      <td style={{ ...thtd, fontSize: 12 }}>{r.time || ""}</td>
                      <td style={{ ...thtd, textAlign: "right" }}>
                        {[
                          r.odds?.H ?? "",
                          r.odds?.D ?? "",
                          r.odds?.A ?? "",
                        ].map((x) => (x === null ? "" : x)).join(" / ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

const thtd: React.CSSProperties = { border: "1px solid #eee", padding: "6px 8px", textAlign: "left" };
