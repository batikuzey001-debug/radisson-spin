// web/src/components/hub/LeftColumn.tsx
"use client";
import React from "react";
import Card, { SectionTitle, Skeleton } from "@/components/ui/Card";
import { fetchPromos, fetchEvents, fetchScoresTicker } from "@/lib/api";

export default function LeftColumn() {
  const [promos, setPromos] = React.useState<string[] | null>(null);
  const [events, setEvents] = React.useState<{ title: string; starts_at?: string }[] | null>(null);
  const [scores, setScores] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    fetchPromos().then(setPromos).catch(() => setPromos([]));
    fetchEvents(1).then(setEvents).catch(() => setEvents([]));
    fetchScoresTicker().then(setScores).catch(() => setScores([]));
  }, []);

  return (
    <aside className="space-y-6">
      <Card className="p-5">
        <SectionTitle>Promo Kodları</SectionTitle>
        {promos === null ? <Skeleton rows={3} /> : !promos.length ? <div className="text-white/70 text-sm">Veri yok</div> : (
          <div className="space-y-3">{promos.map((c) => <PromoRow key={c} code={c} />)}</div>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle>Yaklaşan Etkinlik</SectionTitle>
        {events === null ? <Skeleton rows={2} /> : !events.length ? <div className="text-white/70 text-sm">Veri yok</div> : (
          events.map((e) => (
            <div key={e.title} className="flex items-center justify-between text-white/90">
              <div className="font-semibold">{e.title}</div>
              <div className="text-sm text-[#8ecaff]">{e.starts_at ? new Date(e.starts_at).toLocaleString() : ""}</div>
            </div>
          ))
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle>Canlı Skor</SectionTitle>
        {scores === null ? <Skeleton rows={3} /> : !scores.length ? <div className="text-white/70 text-sm">Veri yok</div> : (
          <ul className="text-white/90 space-y-2 text-sm">{scores.map((t, i) => <li key={i}>{t}</li>)}</ul>
        )}
      </Card>
    </aside>
  );
}

function PromoRow({ code }: { code: string }) {
  const onCopy = async () => { try { await navigator.clipboard.writeText(code); } catch {} };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/10 border border-white/10 px-4 py-3">
      <code className="text-white tracking-wider text-sm">{code}</code>
      <button onClick={onCopy} className="text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0ea5e9] to-[#22d3ee] text-black font-semibold hover:brightness-110 active:scale-95 transition">
        Kopyala
      </button>
    </div>
  );
}
