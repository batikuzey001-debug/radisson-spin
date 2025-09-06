// web/src/api/promos.ts

/** FE'nin ihtiyaç duyduğu promo kart alanları (QuickBonus ile uyumlu) */
export type PromoActive = {
  id: number | string;
  title: string;
  image_url?: string | null;

  /** Kupon/kod */
  coupon_code?: string | null;   // BE ham alan
  promo_code?: string | null;    // BE alias (QuickBonus bunu da okur)
  code?: string | null;          // bazı BE sürümleri için ek tolerans

  /** Durum & zamanlama */
  state?: "active" | "upcoming";
  start_at?: string | null;      // ISO
  end_at?: string | null;        // ISO
  seconds_left?: number | null;
  seconds_to_start?: number | null;

  /** CTA */
  cta_text?: string | null;
  cta_url?: string | null;

  /** Görsel/etiketleme */
  category?: string | null;
  accent_color?: string | null;
  bg_color?: string | null;

  /** Sıralama/flaglar */
  priority?: number;
  is_pinned?: boolean;

  /** Opsiyonel: Max kişi sayısı (varsa) */
  participant_count?: number | null;
};

const API = import.meta.env.VITE_API_BASE_URL;

/**
 * Aktif (ve opsiyonel: yakında başlayacak) promosyon kartları — Hızlı Bonus alanı.
 * Backend: GET /api/promos/active?limit=6&include_future=1&window_hours=48
 */
export async function getActivePromos(
  limit = 6,
  opts?: { includeFuture?: boolean; windowHours?: number }
): Promise<PromoActive[]> {
  const includeFuture = opts?.includeFuture ?? true;
  const windowHours = opts?.windowHours ?? 48;

  const q = new URLSearchParams({
    limit: String(limit),
    include_future: includeFuture ? "1" : "0",
    window_hours: String(windowHours),
  });

  const url = `${API}/api/promos/active?${q.toString()}`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error(`Promos error: HTTP ${r.status}`);
  const data = await r.json();

  // Basit güvenli dönüş
  return Array.isArray(data) ? (data as PromoActive[]) : [];
}
