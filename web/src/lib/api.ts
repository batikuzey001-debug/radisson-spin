// web/src/lib/api.ts
export type Tournament = { id: string; title: string; prize_pool?: number; participant_count?: number; banner_url?: string; slug?: string };
export type EventRow = { id: string; title: string; starts_at: string; description?: string };

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (r.status === 204) return [] as unknown as T;
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const fetchPromos = () => getJSON<string[]>("/api/promos/today");
export const fetchEvents = (limit = 4) => getJSON<EventRow[]>(`/api/events/upcoming?limit=${limit}`);
export const fetchTournaments = (limit = 4) => getJSON<Tournament[]>(`/api/tournaments/active?limit=${limit}`);
export const fetchMetrics = async () => {
  const r = await fetch(`${BASE}/api/metrics/summary`, { cache: "no-store" });
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};
export const fetchScoresTicker = () => getJSON<string[]>(`/api/livescores`); // metin ticker
