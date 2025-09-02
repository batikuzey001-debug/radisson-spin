// web/src/app/livescores/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import LiveScoreCardCompact from '@/components/LiveScoreCardCompact'
import LiveScoreDetailPanel from '@/components/LiveScoreDetailPanel'
import { getDemoItems, findDemoItem, DemoItem } from '@/lib/demoLive'
import { useRouter } from 'next/navigation'

export default function LiveScoresPage() {
  const router = useRouter()
  const items = useMemo(() => getDemoItems(), [])
  const [openId, setOpenId] = useState<number | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  // breakpoint: lg and up -> sağ panel; altı -> sayfaya git
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = () => setIsDesktop(mq.matches)
    h()
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  function handleClick(id: number) {
    if (isDesktop) {
      setOpenId(id) // sağ panel
    } else {
      router.push(`/livescores/${id}`) // mobil: detay sayfası
    }
  }

  const selected: DemoItem | undefined = openId ? findDemoItem(openId) : undefined

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-bold mb-3">Canlı Maçlar</h1>

      {/* Grid: mobil 1 / web 3 sütun */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        {items.map((it) => (
          <LiveScoreCardCompact
            key={it.id}
            id={it.id}
            league={it.league}
            home={it.home}
            away={it.away}
            score={it.score}
            time={it.time}
            odds={it.odds}
            prob={it.prob}
            onClick={handleClick}
          />
        ))}
      </div>

      {/* Desktop sağ panel */}
      <LiveScoreDetailPanel
        open={Boolean(openId && isDesktop)}
        onClose={() => setOpenId(null)}
        item={selected}
      />
    </main>
  )
}
