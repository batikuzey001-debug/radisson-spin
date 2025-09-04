// web/src/pages/Home.tsx
import Hero from "../components/Hero";
import QuickBonus from "../components/QuickBonus";

export default function Home() {
  return (
    <main className="home">
      <Hero />
      <QuickBonus />

      <style>{css}</style>
    </main>
  );
}

const css = `
.home{max-width:1200px;margin:0 auto;padding:16px}
`;
