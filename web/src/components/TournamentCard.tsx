// web/src/components/TournamentCard.tsx
'use client';

import Countdown from './Countdown';
import { formatDateRange, formatMoneyTRY, formatNumber } from '@/lib/format';

type UITheme = { label: string; badgeColor: string; ribbonBg: string; ctaBg: string };
type Item = {
  id: number;
  title: string;
  status?: string | null;
  category?: string | null;
  image_url?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  ui?: UITheme;
  prize_pool?: number | null;
  participant_count?: number | null;
};

export default function TournamentCard({ item }: { item: Item }) {
  const active = (item.status || '').toLowerCase() === 'published';
  const ui = item.ui || { label: (item.category || 'DİĞER').toUpperCase(), badgeColor: '#22c55e', ribbonBg: '#F59E0B', ctaBg: '#F59E0B' };

  return (
    <article className="relative rounded-2xl border border-[#242633] bg-[#0f1117] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,.35)]">
      {/* Sol neon çizgi */}
      <div className="absolute left-0 top-0 h-full w-[6px]" style={{ background: 'linear-gradient(180deg,#22c55e,transparent)' }} />

      {/* Üst kapak */}
      <div className="relative h-44 bg-[#151824]">
        {item.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" />}
        {/* Üst-sol: AKTİF/PASİF rozet */}
        <div className="absolute left-3 top-3">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-black shadow"
            style={{ background: active ? ui.badgeColor : '#6b7280' }}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-black/40" />
            {active ? 'AKTİF' : 'PASİF'}
          </span>
        </div>
        {/* Üst-sağ: Köşe şerit */}
        <div
          className="absolute -right-10 -top-3 rotate-45 text-[11px] font-bold text-black px-10 py-2 shadow"
          style={{ background: ui.ribbonBg }}
        >
          {ui.label}
        </div>
        {/* Sağ-üst: üç nokta (dekor) */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-70">
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
        </div>
      </div>

      {/* İçerik */}
      <div className="p-4">
        <h3 className="text-[15px] font-semibold mb-1">{item.title}</h3>

        {/* Büyük ödül rakamı */}
        {item.prize_pool != null && (
          <div className="text-[28px] font-extrabold text-[#FBBF24] drop-shadow-[0_0_12px_rgba(251,191,36,.35)]">
            {formatMoneyTRY(item.prize_pool)}
          </div>
        )}

        {/* Katılımcı sayısı */}
        {item.participant_count != null && (
          <div className="mt-1 text-white/80 text-sm flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>
            {formatNumber(item.participant_count)}
          </div>
        )}

        {/* Geri sayım */}
        {item.end_at && (
          <div className="mt-2 text-[15px] font-bold text-white/90">
            <Countdown endAt={item.end_at} />
          </div>
        )}

        {/* Progress (kalan süre oranından basit bir çubuk) */}
        {item.start_at && item.end_at && (
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: (() => {
                  const now = Date.now();
                  const s = +new Date(item.start_at!);
                  const e = +new Date(item.end_at!);
                  if (e <= s) return '100%';
                  const p = Math.max(0, Math.min(1, (now - s) / (e - s)));
                  return `${Math.round(p * 100)}%`;
                })(),
                background: 'linear-gradient(90deg,#FBBF24,#fde68a)',
              }}
            />
          </div>
        )}

        {/* Tarih aralığı */}
        <div className="mt-3 text-xs text-white/70 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm14 8H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10z"/></svg>
          {formatDateRange(item.start_at, item.end_at)}
        </div>

        {/* CTA */}
        <div className="mt-4">
          <button
            className="w-full rounded-xl py-2.5 font-bold text-black shadow hover:opacity-95 transition"
            style={{ background: ui.ctaBg, boxShadow: '0 6px 24px rgba(245, 158, 11, .35)' }}
          >
            KATIL →
          </button>
        </div>
      </div>
    </article>
  );
}
