// web/src/app/page.tsx
"use client";

import React from "react";

/* Neden: Tasarım eskizi; tüm veriler backend'den geleceği için burada placeholder + script simülasyonu var. */

type Tournament = { id: string; title: string; prize: string; players: number };

function useTicker(initial: number, jitter = 25, interval = 2000) {
  const [val, setVal] = React.useState(initial);
  React.useEffect(() => {
    const t = setInterval(() => {
      setVal((v) => Math.max(0, v + (Math.random() * jitter - jitter / 2)));
    }, interval);
    return () => clearInterval(t);
  }, [jitter, interval]);
  return Math.round(val);
}

function Card(props: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-2xl border border-[#1c3b70]/40 bg-white/5 backdrop-blur-sm shadow-[0_0_0_1px_rgba(0,191,255,0.05)] hover:shadow-[0_0_0_2px_rgba(0,191,255,0.25)] transition-transform duration-200 hover:-translate-y-0.5 ${props.className || ""}`}
    >
      {props.children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-white font-bold text-lg mb-3">{children}</h3>;
}

function CopyCode({ code }: { code: string }) {
  const [ok, setOk] = React.useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    } catch {}
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/10 border border-white/10 px-4 py-3">
      <code className="text-white tracking-wider text-sm">{code}</code>
      <button
        onClick={onCopy}
        className="text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0ea5e9] to-[#22d3ee] text-black font-semibold hover:brightness-110 active:scale-95 transition"
      >
        {ok ? "Kopyalandı" : "Kopyala"}
      </button>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse grid grid-cols-3 gap-3">
      <div className="h-4 bg-white/10 rounded"></div>
      <div className="h-4 bg-white/10 rounded"></div>
      <div className="h-4 bg-white/10 rounded"></div>
    </div>
  );
}

export default function TournamentHome() {
  // Script simülasyonları (backend bağlanınca kaldırılacak)
  const livePlayers = useTicker(2847, 60, 1800);
  const dailyWon = useTicker(15000, 400, 2200);
  const [showWheel, setShowWheel] = React.useState(false);
  const [loading] = React.useState(false); // backend için skeleton anahtarı

  const tournaments: Tournament[] = [
    { id: "t1", title: "Hafta Sonu Sprint", prize: "₺75.000", players: 842 },
    { id: "t2", title: "Mega Kombine", prize: "₺120.000", players: 1_234 },
    { id: "t3", title: "Kasım Maratonu", prize: "₺300.000", players: 2_012 },
    { id: "t4", title: "Premier Stars", prize: "₺180.000", players: 956 },
  ];

  const upcoming = [
    { title: "Premier League Night", when: "Yarın 21:00" },
  ];

  const scores = [
    { h: "Arsenal", a: "Chelsea", sc: "2 - 1" },
    { h: "Man City", a: "Spurs", sc: "1 - 0" },
    { h: "Liverpool", a: "Newcastle", sc: "3 - 2" },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(160deg, #0f1c42 0%, #1a2851 45%, #162c5a 100%)",
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#0f1c42]/60">
        <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-white font-extrabold text-2xl tracking-wide">
              Radisson<span className="text-[#00bfff]">Bet</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#8ecaff] font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-sm md:text-base">CANLI • {livePlayers.toLocaleString("tr-TR")} oyuncu</span>
          </div>
        </div>
      </header>

      {/* Container */}
      <main className="max-w-[1440px] mx-auto px-4 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-6">
          {/* Sol 25% */}
          <aside className="md:col-span-3 space-y-6">
            <Card className="p-5">
              <SectionTitle>Promo Kodları</SectionTitle>
              <div className="space-y-3">
                {["BUGÜN50", "FLASH25", "PREMIER75"].map((c) => (
                  <CopyCode key={c} code={c} />
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-r from-[#ff6b35] to-[#ff8c4a]">
              <div className="text-white/90 text-sm">Günün Bonusu</div>
              <div className="text-3xl font-extrabold leading-tight">₺500 Bonus</div>
              <div className="mt-2 text-white/90 text-sm">Şimdi katıl, otomatik tanımlansın.</div>
            </Card>

            <Card className="p-5">
              <SectionTitle>Yaklaşan Etkinlik</SectionTitle>
              {upcoming.map((u) => (
                <div key={u.title} className="flex items-center justify-between text-white/90">
                  <div className="font-semibold">{u.title}</div>
                  <div className="text-sm text-[#8ecaff]">{u.when}</div>
                </div>
              ))}
            </Card>

            <Card className="p-5">
              <SectionTitle>Canlı Skor</SectionTitle>
              <div className="space-y-3">
                {scores.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-white/90">
                    <div className="text-sm">{s.h} vs {s.a}</div>
                    <div className="font-bold">{s.sc}</div>
                  </div>
                ))}
              </div>
            </Card>
          </aside>

          {/* Orta 50% */}
          <section className="md:col-span-6 space-y-6">
            {/* Hero */}
            <Card className="p-6 md:p-8">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-white">
                  <div className="text-sm text-[#8ecaff] font-semibold">Toplam Havuz</div>
                  <div className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    TURNUVA KASASI <span className="text-[#00bfff]">₺2.547.890</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowWheel(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#22d3ee] text-black font-extrabold text-lg hover:shadow-[0_0_24px_rgba(0,191,255,0.5)] active:scale-95 transition"
                >
                  ÇARKI ÇEVİR
                </button>
              </div>
              {/* Çark görseli (placeholder) */}
              <div className="mt-6 h-56 md:h-64 rounded-2xl bg-[radial-gradient(circle_at_center,_#18335e,_#0f1c42)] relative overflow-hidden">
                <div className="absolute inset-0 grid place-items-center">
                  <div className="w-40 h-40 md:w-56 md:h-56 rounded-full border-8 border-[#00bfff] animate-spin-slow shadow-[0_0_40px_rgba(0,191,255,0.25)]" />
                </div>
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.25)_100%)]" />
              </div>
            </Card>

            {/* Aktif Turnuvalar */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionTitle>Aktif Turnuvalar</SectionTitle>
                <a
                  href="/tournaments"
                  className="text-[#00bfff] text-sm hover:underline"
                >
                  Tümünü gör
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="p-4">
                        <div className="space-y-3">
                          <SkeletonRow />
                          <SkeletonRow />
                        </div>
                      </Card>
                    ))
                  : tournaments.map((t) => (
                      <Card key={t.id} className="p-4 hover:scale-[1.01] transition">
                        <div className="text-white font-bold text-lg">{t.title}</div>
                        <div className="text-[#00bfff] font-extrabold text-xl mt-1">{t.prize}</div>
                        <div className="text-white/80 text-sm mt-1">{t.players.toLocaleString("tr-TR")} katılımcı</div>
                        <div className="mt-3">
                          <a
                            href={`/tournaments/${t.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#ff6b35] to-[#ff8c4a] text-black font-semibold hover:brightness-110 active:scale-95 transition"
                          >
                            DETAYA GİT
                          </a>
                        </div>
                      </Card>
                    ))}
              </div>
            </Card>

            {/* Ana CTA */}
            <div className="flex justify-center">
              <a
                href="/tournaments"
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0ea5e9] via-[#22d3ee] to-[#00bfff] text-black font-extrabold text-lg hover:shadow-[0_0_32px_rgba(0,191,255,0.5)] active:scale-95 transition"
              >
                TÜM TURNUVALARI KEŞFET
              </a>
            </div>
          </section>

          {/* Sağ 25% */}
          <aside className="md:col-span-3 space-y-6">
            <Card className="p-5">
              <SectionTitle>Bugün Kazanılanlar</SectionTitle>
              <div className="text-3xl font-extrabold text-[#00bfff]">₺{dailyWon.toLocaleString("tr-TR")}</div>
              <div className="text-white/80 text-sm mt-1">toplamda kazanıldı</div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionTitle>Popüler Turnuva</SectionTitle>
                <span className="text-xs px-2 py-1 rounded-full bg-rose-500 text-white/90">Trending</span>
              </div>
              <div className="text-white font-semibold">Premier Stars</div>
              <div className="text-[#8ecaff] text-sm">Yüksek ödül havuzu</div>
              <div className="mt-3">
                <a
                  href="/tournaments/premier-stars"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#ff6b35] to-[#ff8c4a] text-black font-semibold hover:brightness-110 active:scale-95 transition"
                >
                  DETAYA GİT
                </a>
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle>Bonus Fırsatı</SectionTitle>
              <div className="text-white">İlk katılımında <span className="text-[#ff6b35] font-bold">%100 bonus</span></div>
            </Card>

            <Card className="p-5">
              <SectionTitle>Premier League</SectionTitle>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/90" />
                <div className="text-white/90">Resmi Sponsor</div>
              </div>
            </Card>
          </aside>
        </div>
      </main>

      {/* Çark Modal */}
      {showWheel && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setShowWheel(false)}>
          <div
            className="max-w-lg w-full rounded-2xl bg-[#0f1c42] border border-[#1c3b70] p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowWheel(false)}
              className="absolute right-3 top-3 text-white/70 hover:text-white"
              aria-label="Kapat"
            >
              ✕
            </button>
            <div className="text-white font-extrabold text-xl mb-4">RadissonBet Çarkı</div>
            <div className="h-64 rounded-2xl bg-[radial-gradient(circle_at_center,_#18335e,_#0f1c42)] relative overflow-hidden grid place-items-center">
              <div className="w-56 h-56 rounded-full border-8 border-[#00bfff] animate-spin-slow shadow-[0_0_40px_rgba(0,191,255,0.25)]" />
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-[14px] border-transparent border-b-[#ff6b35]" />
            </div>
            <div className="mt-4 flex justify-center">
              <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ff8c4a] text-black font-bold hover:brightness-110 active:scale-95 transition">
                ÇEVİR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global styles for custom animations */}
      <style jsx global>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
}
