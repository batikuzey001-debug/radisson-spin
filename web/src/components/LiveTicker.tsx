// web/src/components/LiveTicker.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

export default function LiveTicker({ endpoint }: { endpoint: string }) {
  const [items, setItems] = useState<string[]>([
    "⚽ ManCity 2-1 Arsenal 85'",
    "🏀 Lakers 95-88 Warriors Q4",
    "⚽ Galatasaray 1-0 Fenerbahçe 67'",
  ])
  const timer = useRef<number | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const r = await fetch(endpoint, { cache: 'no-store' })
        if (r.ok) {
          const data = await r.json()
          if (mounted && Array.isArray(data) && data.length) setItems(data)
        }
      } catch {}
    }
    load()
    timer.current = window.setInterval(load, 5000)
    return () => {
      if (timer.current) clearInterval(timer.current)
      mounted = false
    }
  }, [endpoint])

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0a0a0f] via-transparent to-[#0a0a0f] [mask-image:linear-gradient(to_right,black,transparent,black)]" />
      <div className="whitespace-nowrap py-3 px-4 text-[#00ff88] text-sm flex items-center gap-8 animate-marquee hover:[animation-play-state:paused]">
        {items.map((t, i) => (
          <span key={i}>• {t}</span>
        ))}
      </div>
    </div>
  )
}
