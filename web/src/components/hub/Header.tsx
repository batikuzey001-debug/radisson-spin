// web/src/components/hub/Header.tsx
"use client";
import React from "react";
import { fmtNum, ticker } from "@/lib/format";

export default function HeaderBar() {
  const [players, setPlayers] = React.useState(0);
  React.useEffect(() => {
    const t = ticker(2847, 60, 1800); // canlı oyuncu sayaç simülasyonu
    const unsub = t.subscribe(setPlayers);
    t.start();
    return () => { unsub(); t.stop(); };
  }, []);
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[#0f1c42]/60">
      <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-white font-extrabold text-2xl tracking-wide">
          Radisson<span className="text-[#00bfff]">Bet</span>
        </div>
        <div className="flex items-center gap-2 text-[#8ecaff] font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="text-sm md:text-base">CANLI • {fmtNum(players)} oyuncu</span>
        </div>
      </div>
    </header>
  );
}
