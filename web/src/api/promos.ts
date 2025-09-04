// web/src/api/promos.ts
export type PromoActive = {
  id: number | string;
  title: string;
  image_url?: string | null;
  coupon_code?: string | null;
  cta_url?: string | null;
  start_at?: string | null;  // ISO
  end_at?: string | null;    // ISO
  seconds_left?: number | null;
  accent_color?: string | null;
  bg_color?: string | null;
  priority?: number;
  is_pinned?: boolean;
};

const API = import.meta.env.VITE_API_BASE_URL;

/**
 * Aktif promosyon kartları (Hızlı Bonus alanı).
 * Backend: GET /api/promos/active?limit=6
 */
export async function getActivePromos(limit = 6): Promise<PromoActive[]> {
  const url = `${API}/api/promos/active?limit=${encodeURIComponent(String(limit))}`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error(`Promos error: HTTP ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}
