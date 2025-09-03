// web/src/pages/Home.tsx
import { useEffect, useState } from "react";
import { getHomeBanners, type HomeBanner } from "../api/home";

export default function Home() {
  const [items, setItems] = useState<HomeBanner[] | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    getHomeBanners().then(setItems).catch((e) => setErr(e?.message ?? "Hata"));
  }, []);

  if (err) return <div style={{ padding: 16 }}>Hata: {err}</div>;
  if (!items) return <div style={{ padding: 16 }}>Yükleniyor…</div>;
  if (!items.length) return <div style={{ padding: 16 }}>Henüz banner eklenmemiş.</div>;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      {items.map((b) => (
        <div key={b.id} style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
          <img src={b.image_url} alt="" style={{ width: "100%", display: "block" }} loading="lazy" />
          {(b.title || b.subtitle) && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "flex-end",
              background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.6))", color: "white", padding: 16
            }}>
              <div>
                {b.title && <div style={{ fontSize: 20, fontWeight: 700 }}>{b.title}</div>}
                {b.subtitle && <div style={{ fontSize: 14, opacity: 0.9 }}>{b.subtitle}</div>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
