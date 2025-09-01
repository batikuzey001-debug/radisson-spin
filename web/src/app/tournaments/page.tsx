// web/src/app/tournaments/page.tsx
import { api, Tournament } from "@/lib/api";
export const dynamic = "force-dynamic";

export default async function Tournaments() {
  let items: Tournament[] = [];
  try { items = await api.tournaments(); } catch { items = []; }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Turnuvalar</h1>
      {items.length === 0 ? (
        <div className="text-white/70">Şu an listelenecek turnuva yok.</div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {items.map(t => (
            <li key={t.id} className="rounded-xl border border-[#1b1d26] bg-[#111114]">
              <div className="h-40 rounded-t-xl bg-[#151824] overflow-hidden">
                {t.image_url && <img src={t.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-white/60">
                  {(t.category || "genel").toUpperCase()} • {t.status === "published" ? "Yayında" : "Taslak"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
