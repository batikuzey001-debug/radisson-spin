// web/src/app/page.tsx
"use client";

import React from "react";
import HeaderBar from "@/components/hub/Header";
import LeftColumn from "@/components/hub/LeftColumn";
import CenterColumn from "@/components/hub/CenterColumn";
import RightColumn from "@/components/hub/RightColumn";

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #0f1c42 0%, #1a2851 45%, #162c5a 100%)" }}>
      <HeaderBar />
      <main className="max-w-[1440px] mx-auto px-4 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-3"><LeftColumn /></div>
          <div className="md:col-span-6"><CenterColumn /></div>
          <div className="md:col-span-3"><RightColumn /></div>
        </div>
      </main>
    </div>
  );
}
