
// web/src/components/Countdown.tsx
'use client';

import { useEffect, useState } from 'react';

type T = { d: string; h: string; m: string; s: string };

function calc(endAt?: string | null): T {
  if (!endAt) return { d: '00', h: '00', m: '00', s: '00' };
  const ms = Math.max(0, +new Date(endAt) - Date.now());
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const pad = (x: number) => String(x).padStart(2, '0');
  return { d: pad(d), h: pad(h), m: pad(m), s: pad(s) };
}

export default function Countdown({ endAt }: { endAt?: string | null }) {
  const [v, setV] = useState<T>(calc(endAt));
  useEffect(() => {
    setV(calc(endAt));
    const id = setInterval(() => setV(calc(endAt)), 1000);
    return () => clearInterval(id);
  }, [endAt]);

  return <span className="font-mono tracking-wider">{v.d}:{v.h}:{v.m}:{v.s}</span>;
}
