// web/src/components/ui/Card.tsx
import React from "react";
export default function Card(props: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-2xl border border-[#1c3b70]/40 bg-white/5 backdrop-blur-sm shadow-[0_0_0_1px_rgba(0,191,255,0.06)] hover:shadow-[0_0_0_2px_rgba(0,191,255,0.25)] transition-transform duration-200 hover:-translate-y-0.5 ${props.className || ""}`}
    >
      {props.children}
    </div>
  );
}
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-white font-bold text-lg mb-3">{children}</h3>;
}
