// web/src/components/LiveScoreDetailPanel.tsx
'use client';

import { DemoItem } from '@/lib/demoLive'
import LiveScoreCardDemo from './LiveScoreCardDemo'

export default function LiveScoreDetailPanel({
  open,
  onClose,
  item,
}: {
  open: boolean
  onClose: () => void
  item?: DemoItem
}) {
  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* sağ panel */}
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-[480px] transform bg-[#0a0f22] border-l border-white/10 transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/10">
          <div className="text-sm font-semibold text-white/80">Maç Detayı</div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-sm"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="p-3">
          {item ? (
            <LiveScoreCardDemo
              league={item.league}
              home={item.home}
              away={item.away}
              score={item.score}
              time={item.time}
              odds={item.odds}
              prob={item.prob}
            />
          ) : (
            <div className="text-white/60 text-sm">Seçili maç yok.</div>
          )}
        </div>
      </aside>
    </div>
  )
}
