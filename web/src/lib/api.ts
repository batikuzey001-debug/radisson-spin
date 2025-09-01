// web/src/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE!.replace(/\/+$/,'');
const CONTENT = (process.env.NEXT_PUBLIC_CONTENT_PREFIX || '').replace(/\/+$/,'');
const SPIN = (process.env.NEXT_PUBLIC_SPIN_PREFIX || '').replace(/\/+$/,'');

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers||{}) },
    cache: 'no-store',
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export type Tournament = {
  id: number; title: string;
  image_url?: string|null; category?: string|null;
  status: 'published'|'draft'; start_at?: string|null; end_at?: string|null;
};

export const api = {
  tournaments: (limit?: number) =>
    j<Tournament[]>(`${CONTENT}/content/tournaments${limit ? `?limit=${limit}` : ''}`),

  prizes: () =>
    j<{ id:number; label:string }[]>(`${SPIN}/spin/prizes`),

  redeem: (code: string) =>
    j<{ status:string; prize?:string }>(`${SPIN}/spin/redeem`, {
      method: 'POST', body: JSON.stringify({ code })
    }),
};
