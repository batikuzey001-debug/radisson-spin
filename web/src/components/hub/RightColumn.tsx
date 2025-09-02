// web/src/components/hub/RightColumn.tsx
"use client";
import React from "react";
import Card, { SectionTitle, Skeleton } from "@/components/ui/Card";
import { fetchMetrics } from "@/lib/api";
import { fmtMoney } from "@/lib/format";

export default function RightColumn() {
  const [metrics, setMetrics] = React.useState<any | null | undefined>(undefined); // undefined=loading, null=204

  React.useEffect(() => {
    fetchMetrics().then(setMetrics).catch(() => setMetrics(null));
  }, []);

  const daily = metrics?.daily_won ?? null;

  return (
    <aside className="space-y-6">
      <Card className="p-5">
        <SectionTitle>Bugün Kazanılanlar</SectionTitle>
        {metrics === undefined ? <Skeleton rows={2}/> : daily != null ? (
          <>
            <div className="text-3xl font-extrabold text-[#00bfff]">{fmtMoney(daily)}</div>
            <div className="text-white/80 text-sm mt-1">toplamda kazanıldı</div>
          </>
        ) : <div className="text-white/70 text-sm">Veri yok</div>}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <SectionTitle>Popüler Turnuva</SectionTitle>
          <span className="text-xs px-2 py-1 rounded-full bg-rose-500 text-white/90">Trending</span>
        </div>
        <div className="text-white/70 text-sm">Veri yok</div>
      </Card>

      <Card className="p-5">
        <SectionTitle>Bonus Fırsatı</SectionTitle>
        <div className="text-white">İlk katılımında <span className="text-[#ff6b35] font-bold">%100 bonus</span></div>
      </Card>

      <Card className="p-5">
        <SectionTitle>Premier League</SectionTitle>
        <div className="text-white/70 text-sm">Veri yok</div>
      </Card>
    </aside>
  );
}
