// web/src/utils/visitPing.ts
// Anonim ziyaretçi UUID üretir (localStorage) ve backend'e 1 ping atar.

const STORAGE_KEY = "visitor_uuid";

// Base URL: aynı origin ise boş kalabilir.
// .env'de VITE_API_BASE_URL varsa onu kullanır.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// Endpoint: backend'de kurduğumuz ping rotası.
// Farklı ise sadece bu yolu değiştirin (örn. "/metrics/visit").
const VISIT_PATH = "/api/fe/metrics/visit";

// API Key kullanacak mısınız? SiteConfig.fe_metric_key ile eşleşmeli.
// .env'de VITE_FE_METRIC_KEY tanımlıysa header'a eklenir.
const FE_METRIC_API_KEY = import.meta.env.VITE_FE_METRIC_KEY || "";

function ensureVisitorId(): string {
  let vid = localStorage.getItem(STORAGE_KEY);
  if (!vid) {
    // Modern tarayıcı: crypto.randomUUID
    // Fallback: timestamp + random
    // @ts-ignore
    vid = (globalThis.crypto?.randomUUID?.() as string) ||
          (Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem(STORAGE_KEY, vid);
  }
  return vid;
}

export async function sendVisitPing(): Promise<void> {
  try {
    const vid = ensureVisitorId();
    const url = (API_BASE ? API_BASE : "") + VISIT_PATH;

    const headers: Record<string, string> = { "X-Visitor-Id": vid };
    if (FE_METRIC_API_KEY) headers["X-Api-Key"] = FE_METRIC_API_KEY;

    await fetch(url, { method: "POST", headers });
  } catch {
    // sessizce geç
  }
}
