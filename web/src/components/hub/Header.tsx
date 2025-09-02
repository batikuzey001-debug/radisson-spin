// web/src/components/hub/Header.tsx
"use client";
import React from "react";

export default function HeaderBar() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[#0f1c42]/60">
      <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-white font-extrabold text-2xl tracking-wide">
          Radisson<span className="text-[#00bfff]">Bet</span>
        </div>
        {/* Canlı oyuncu: gerçek metrik gelirse göster, yoksa gizli */}
        <LivePlayers />
      </div>
    </header>
  );
}

function LivePlayers() {
  const [val, setVal] = React.useState<number | null>(null);
  React.useEffect(() => {
    let mounted = true;
    fetch(`${(process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "")}/api/metrics/summary`, { cache: "no-store" })
      .then(async (r) => (r.status === 204 ? null : r.json()))
      .then((j) => { if (mounted) setVal(j?.live_players ?? null); })
      .catch(() => { if (mounted) setVal(null); });
    return () => { mounted = false; };
  }, []);
  if (val == null) return null;
  return (
    <div className="flex items-center gap-2 text-[#8ecaff] font-semibold">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
      </span>
      <span className="text-sm md:text-base">CANLI • {val.toLocaleString("tr-TR")} oyuncu</span>
    </div>
  );
}
