// web/src/app/api/ls/bulletin/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Neden: Tarayıcı CORS/mixed-content sorunlarını aşmak için
 * backend'e fetch'i Next.js server tarafında yapıyoruz.
 *
 * ENV:
 * - BACKEND_BASE: https://<backend-domain>  (sonunda / yok)
 * Örn: BACKEND_BASE="https://your-backend.example.com"
 *
 * Not: Revalidate kapalı tutulur (no-store).
 */
const BACKEND_BASE = (process.env.BACKEND_BASE || "").replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  if (!BACKEND_BASE) {
    return NextResponse.json(
      { error: "BACKEND_BASE env eksik" },
      { status: 500 }
    );
  }

  const { search } = new URL(req.url);
  const url = `${BACKEND_BASE}/api/livescores/bulletin${search}`;

  try {
    const res = await fetch(url, {
      // server-side fetch — CORS/mixed-content yok
      cache: "no-store",
      headers: { "accept": "application/json" },
    });

    const text = await res.text(); // içeriği aynen geçir
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Proxy fetch failed: ${e?.message || String(e)}`, target: url },
      { status: 502 }
    );
  }
}
