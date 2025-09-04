// web/src/api/events.ts
export type EventItem = {
  id: number | string;
  title: string;
  image_url?: string | null;
  category?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  state?: "active" | "upcoming";
  seconds_left?: number | null;       // active
  seconds_to_start?: number | null;   // upcoming
  accent_color?: string | null;
  bg_color?: string | null;
  priority?: number;
  is_pinned?: boolean;
};

const API = import.meta.env.VITE_API_BASE_URL;

export async function getActiveEvents(limit = 8): Promise<EventItem[]> {
  const url = `${API}/api/events/active?limit=${encodeURIComponent(String(limit))}&include_future=1&window_days=30`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error(`Events error: HTTP ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}
