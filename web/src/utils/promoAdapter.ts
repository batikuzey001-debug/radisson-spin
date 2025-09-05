// web/src/utils/promoAdapter.ts
export type BackendItem = Record<string, any>;

export type PromoCardView = {
  id: string | number;
  title: string;
  imageUrl: string;
  maxText?: string;
  ctaUrl?: string;
  timeText?: string; // "AKTİF" veya "01:23:45" gibi
  live?: boolean;    // true => yeşil yanar
};

const nk = (s: any) =>
  String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const pick = (o: BackendItem, keys: string[], fallback?: any) => {
  for (const k of keys) {
    const hit = Object.keys(o).find((h) => nk(h) === nk(k));
    if (hit) return o[hit];
  }
  return fallback;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export function mapBackendToPromoView(o: BackendItem): PromoCardView | null {
  // id
  const idRaw = pick(o, ["id", "promo_id", "code_id"]);
  const id = idRaw ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

  // title
  const title =
    pick(o, ["code_name", "title", "name", "Ad", "Başlık"], "") || "Promo Kod";

  // image
  const imageUrl =
    pick(o, ["image_url", "image", "img", "Görsel URL", "Görsel"], "") ||
    "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1600&auto=format&fit=crop";

  // max/limit
  const maxVal = pick(o, ["max", "limit", "priority", "Maksimum Katılımcı Sayısı", "Max"]);
  const maxText =
    maxVal == null ? undefined : new Intl.NumberFormat("tr-TR").format(Number(String(maxVal).replace(/\./g, "").replace(",", ".")));

  // cta
  const ctaUrl = pick(o, ["cta_url", "url", "link", "CTA URL"]);

  // durum / zaman metni (backend ne veriyorsa)
  // Öncelik sırası:
  // 1) backend "live" benzeri boolean
  // 2) backend doğrudan "timeText" benzeri bir metin
  // 3) backend saniye (seconds_left / seconds_to_start) → HH:MM:SS üret
  // 4) hiçbir şey yoksa "--:--:--"
  const live = Boolean(pick(o, ["live", "is_live", "active"], false));

  let timeText: string | undefined =
    pick(o, ["timeText", "time_text", "label"]) || undefined;

  if (!timeText) {
    const sec =
      pick(o, ["seconds_left", "seconds_to_start", "remaining_seconds"]) ?? null;
    if (sec != null && Number.isFinite(+sec)) {
      const s = Math.max(0, Math.floor(+sec));
      const hh = Math.floor(s / 3600);
      const mm = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      timeText = `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
    }
  }
  if (!timeText && live) timeText = "AKTİF";
  if (!timeText) timeText = "--:--:--";

  return { id, title, imageUrl, maxText, ctaUrl, timeText, live };
}
