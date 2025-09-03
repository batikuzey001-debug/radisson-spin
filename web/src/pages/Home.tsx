// web/src/pages/Home.tsx
import LiveFeatured from "../components/LiveFeatured";

export default function Home() {
  return (
    <main>
      {/* Header uygulama genelindeyse App.tsx'te zaten var. Bu bölüm sadece anasayfada kartları gösterir. */}
      <LiveFeatured />
    </main>
  );
}
