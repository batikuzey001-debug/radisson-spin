// web/src/components/ui/Card.tsx
import React from "react";
export default function Card({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-2xl border border-[#1c3b70]/40 bg-white/5 backdrop-blur-sm ${className || ""}`}>{children}</div>
  );
}
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-white font-bold text-lg mb-3">{children}</h3>;
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-white/10 rounded" />
      ))}
    </div>
  );
}
