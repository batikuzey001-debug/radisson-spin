// web/src/lib/format.ts
export const fmtNum = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
export const fmtMoney = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

export const apiBase =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

// Basit jitter sayacı (UI script simülasyonu)
export function ticker(initial: number, jitter = 25, interval = 2000) {
  let val = initial;
  let t: any;
  const listeners = new Set<(v: number) => void>();
  const start = () => {
    stop();
    t = setInterval(() => {
      val = Math.max(0, val + (Math.random() * jitter - jitter / 2));
      listeners.forEach((fn) => fn(Math.round(val)));
    }, interval);
  };
  const stop = () => t && clearInterval(t);
  const subscribe = (fn: (v: number) => void) => {
    listeners.add(fn);
    fn(Math.round(val));
    return () => listeners.delete(fn);
  };
  return { start, stop, subscribe };
}
