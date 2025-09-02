// web/src/components/NeonCounter.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

function fmtTRY(n: number) {
  return new Intl.NumberFormat('tr-TR').format(n) + ' ₺'
}

export default function NeonCounter({ value }: { value: number }) {
  const [v, setV] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const dur = 1200
    function tick(t: number) {
      const p = Math.min(1, (t - start) / dur)
      setV(Math.round(value * (0.2 + 0.8 * p)))
      ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current)
    }
  }, [value])

  return (
    <div className="text-[34px] md:text-[40px] font-extrabold text-[#00d4ff] drop-shadow-[0_0_14px_rgba(0,212,255,.55)]">
      {fmtTRY(v)}
    </div>
  )
}
