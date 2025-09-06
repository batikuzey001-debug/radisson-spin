// web/src/utils/visitPing.ts
// Ziyaretçi ID'yi localStorage'da saklar, backend'e 1 ping atar.

const STORAGE_KEY = "visitor_uuid";

// TODO: Backend base URL doğru mu? (genelde VITE_API_BASE_URL)
// Örn: http://localhost:8000  veya prod domaininiz
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// TODO: Backend endpoint yolu doğru mu? Ben varsayılan /api/fe/metrics/visit bıraktım.
// Eğer farklıysa bana yazın veya burada güncelleyin.
const VISIT_PATH = "/api/fe/metrics/visit";

// TODO: API key kullanacak mıyız?
// - SiteConfig.fe_metric_key kullanıyorsanız, FE de aynı key'i header'a koymalı.
// - Eğer key yoksa boş bırakın; header eklenmez.
const FE_METRIC_API_KEY = ""; // Örn: "MY_PUBLIC_FE_KEY" (yoksa boş bırakın)

function ensureVisitorId(): string {
  let vid = localStorage.getItem(STORAGE_KEY);
  if (!vid) {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      // @ts-ignore
      vid = crypto.randomUUID();
    } else {
      vid = Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
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
    // sessiz yut
  }
}
