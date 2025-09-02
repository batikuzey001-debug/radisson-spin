// web/src/components/hub/CenterColumn.tsx
"use client";
import React from "react";
import Card, { SectionTitle, Skeleton } from "@/components/ui/Card";
import { fmtNum, fmtMoney } from "@/lib/format";
import { fetchTournaments, fetchMetrics } from "@/lib/api";

export default function CenterColumn() {
  const [tournaments, setTournaments] = React.useState<any[] | null>(null);
  const [metrics, setMetrics] = React.useState<any | null>(null);

  React.useEffect(() => {
    fetchTournaments(4).then(setTournaments).catch(() => setTournaments([]));
    fetchMetrics().then(setMetrics).catch(() => setMetrics(null));
  }, []);

  const pool = metrics?.pool_amount ?? null;

  return (
    <section className="space-y-6">
      <Card className="p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-white">
            <div className="text-sm text-[#8ecaff] font-semibold">Toplam Havuz</div>
            <div className="text-3xl md:text-4xl font-extrabold tracking-tight">
              TURNUVA KASASI {pool != null ? <span className="text-[#00bfff]">{fmtMoney(pool)}</span> : <span className="text-white/60 text-xl">—</span>}
            </div>
          </div>
          <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#22d3ee] text-black font-extrabold text-lg hover:shadow-[0_0_24px_rgba(0,191,255,0.5)] active:scale-95 transition">
            ÇARKI ÇEVİR
          </button>
        </div>
        <div className="mt-6 h-56 md:h-64 rounded-2xl bg-[radial-gradient(circle_at_center,_#18335e,_#0f1c42)]" />
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <SectionTitle>Aktif Turnuvalar</SectionTitle>
          <a href="/tournaments" className="text-[#00bfff] text-sm hover:underline">Tümünü gör</a>
        </div>

        {tournaments === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({length:4}).map((_,i)=><Card key={i} className="p-4"><Skeleton rows={3}/></Card>)}</div>
        ) : !tournaments.length ? (
          <div className="text-white/70 text-sm">Veri yok</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tournaments.map((t) => (
              <Card key={t.id} className="p-4 hover:scale-[1.01] transition">
                <div className="text-white font-bold text-lg">{t.title}</div>
                <div className="text-[#00bfff] font-extrabold text-xl mt-1">{t.prize_pool != null ? fmtMoney(t.prize_pool) : "—"}</div>
                <div className="text-white/80 text-sm mt-1">{t.participant_count != null ? `${fmtNum(t.participant_count)} katılımcı` : "—"}</div>
                <div className="mt-3">
                  <a href={t.slug ? `/tournaments/${t.slug}` : "#"} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#ff6b35] to-[#ff8c4a] text-black font-semibold hover:brightness-110 active:scale-95 transition">
                    DETAYA GİT
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-center">
        <a href="/tournaments" className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0ea5e9] via-[#22d3ee] to-[#00bfff] text-black font-extrabold text-lg hover:shadow-[0_0_32px_rgba(0,191,255,0.5)] active:scale-95 transition">
          TÜM TURNUVALARI KEŞFET
        </a>
      </div>
    </section>
  );
}
