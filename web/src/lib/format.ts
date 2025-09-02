// web/src/lib/format.ts
// Ortak format yardımcıları (sahte veri ve script yok)

export const apiBase = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

/** Güvenli Date parse. Geçersiz ise null döner. */
function toDate(v?: string | number | Date | null): Date | null {
  if (v == null) return null;
  try {
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** TR yereline göre sayı formatı. */
export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("tr-TR", options).format(Number(n));
}

/** TRY para birimi formatı. (örn. ₺12.345) */
export function formatMoneyTRY(
  n: number,
  options: Intl.NumberFormatOptions = { style: "currency", currency: "TRY", maximumFractionDigits: 0 }
): string {
  return new Intl.NumberFormat("tr-TR", options).format(Number(n));
}

/** Tekil tarih formatı (dd.MM.yyyy HH:mm opsiyonel). */
export function formatDate(d: string | Date, withTime = false): string {
  const dt = toDate(d);
  if (!dt) return "";
  if (withTime) {
    const day = dt.toLocaleDateString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit" });
    const time = dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${day} ${time}`;
  }
  return dt.toLocaleDateString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** Tarih aralığı formatı: "dd.MM.yyyy → dd.MM.yyyy". Eksik uçlar boş bırakılır. */
export function formatDateRange(
  from?: string | Date | null,
  to?: string | Date | null,
  sep = " → ",
  withTime = false
): string {
  const a = from ? formatDate(from, withTime) : "";
  const b = to ? formatDate(to, withTime) : "";
  if (a && b) return `${a}${sep}${b}`;
  return a || b || "";
}

/* İsteğe bağlı kısa takma adlar (mevcut kodla geriye uyumluluk için) */
export const fmtNum = formatNumber;
export const fmtMoney = formatMoneyTRY;
