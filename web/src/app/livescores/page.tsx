// web/src/app/livescores/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import LiveRowItem from '@/components/LiveRowItem'
import LiveScoreDetailPanel from '@/components/LiveScoreDetailPanel'
import { getDemoItems, findDemoItem, DemoItem } from '@/lib/demoLive'
import { useRouter } from 'next/navigation'

export default function LiveScoresPage() {
  const router = useRouter()
  const all = useMemo(() => getDemoItems(), [])
  const [openId, setOpenId] = useState<number | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  // major liglere göre grupla
  const groups = useMemo(() => {
    const byLeague = new Map<string, DemoItem[]>()
    for (const it of all) {
      const key = it.league.name || 'Other'
      if (!byLeague.has(key)) byLeague.set(key, [])
      byLeague.get(key)!.push(it)
    }
    return Array.from(byLeague.entries())
  }, [all])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = () => setIsDesktop(mq.matches)
    h()
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  function handleClick(id: number) {
    if (isDesktop) setOpenId(id)
    else router.push(`/livescores/${id}`)
  }

  const selected = openId ? findDemoItem(openId) : undefined

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-bold mb-4">Canlı Maçlar (Demo)</h1>

      <div className="space-y-6">
        {groups.map(([leagueName, items]) => (
          <section key={leagueName} className="rounded-xl border border-white/10 bg-[#0a0f1a]">
            {/* Lig başlığı */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
              {/* Lig logosu yoksa isim gözüksün */}
              <span className="text-sm font-semibold text-white/90">{leagueName}</span>
            </div>

            {/* Satırlar */}
            <div className="p-2 space-y-2">
              {items.map((it) => (
                <LiveRowItem
                  key={it.id}
                  id={it.id}
                  league={it.league}
                  home={it.home}
                  away={it.away}
                  score={it.score}
                  time={it.time}
                  odds={{ H: it.odds?.H, D: it.odds?.D, A: it.odds?.A }}
                  prob={it.prob}
                  onClick={handleClick}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Masaüstü: sağ detay panel (SofaScore tarzı) */}
      <LiveScoreDetailPanel
        open={Boolean(openId && isDesktop)}
        onClose={() => setOpenId(null)}
        item={selected}
      />
    </main>
  )
}
