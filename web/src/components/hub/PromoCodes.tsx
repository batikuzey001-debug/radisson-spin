// web/src/components/hub/PromoCodes.tsx
"use client";
import React from "react";
import Card, { SectionTitle } from "@/components/ui/Card";

function CopyCode({ code }: { code: string }) {
  const [ok, setOk] = React.useState(false);
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(()=>setOk(false), 1200);} catch {}
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/10 border border-white/10 px-4 py-3">
      <code className="text-white tracking-wider text-sm">{code}</code>
      <button onClick={onCopy} className="text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0ea5e9] to-[#22d3ee] text-black font-semibold hover:brightness-110 active:scale-95 transition">
        {ok ? "Kopyalandı" : "Kopyala"}
      </button>
    </div>
  );
}

export default function LeftColumn(props: {
  promoCodes: string[];
  bonusText: string;
  upcoming: { title: string; when: string }[];
  scores: { home: string; away: string; score: string }[];
}) {
  return (
    <aside className="space-y-6">
      <Card className="p-5">
        <SectionTitle>Promo Kodları</SectionTitle>
        <div className="space-y-3">
          {props.promoCodes.map((c) => <CopyCode key={c} code={c} />)}
        </div>
      </Card>

      <Card className="p-5 bg-gradient-to-r from-[#ff6b35] to-[#ff8c4a]">
        <div className="text-white/90 text-sm">Günün Bonusu</div>
        <div className="text-3xl font-extrabold leading-tight">{props.bonusText}</div>
        <div className="mt-2 text-white/90 text-sm">Şimdi katıl, otomatik tanımlansın.</div>
      </Card>

      <Card className="p-5">
        <SectionTitle>Yaklaşan Etkinlik</SectionTitle>
        {props.upcoming.map((u) => (
          <div key={u.title} className="flex items-center justify-between text-white/90">
            <div className="font-semibold">{u.title}</div>
            <div className="text-sm text-[#8ecaff]">{u.when}</div>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <SectionTitle>Canlı Skor</SectionTitle>
        <div className="space-y-3">
          {props.scores.map((s, i) => (
            <div key={i} className="flex items-center justify-between text
