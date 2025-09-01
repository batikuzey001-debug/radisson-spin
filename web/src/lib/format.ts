// web/src/lib/format.ts
export function formatNumber(n?: number | null) {
  if (n == null) return '';
  return new Intl.NumberFormat('tr-TR').format(n);
}
export function formatMoneyTRY(n?: number | null) {
  if (n == null) return '';
  return `${formatNumber(n)} ₺`;
}
export function formatDateRange(start?: string | null, end?: string | null) {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (s && e) return `${s.toLocaleDateString('tr-TR', opts)} – ${e.toLocaleDateString('tr-TR', opts)}`;
  if (s) return s.toLocaleDateString('tr-TR', opts);
  if (e) return e.toLocaleDateString('tr-TR', opts);
  return '';
}
