// web/src/pages/Home.tsx
import Hero from "../components/Hero";
import QuickBonus from "../components/QuickBonus";
import EventsGrid from "../components/EventsGrid";

export default function Home() {
  return (
    <main className="home">
      <section className="heroSection">
        <Hero />
      </section>
      <QuickBonus />
      <EventsGrid />

      <style>{css}</style>
    </main>
  );
}

const css = `
.home{
  max-width:1200px;
  margin:0 auto;
  padding:16px;
}

/* Hero boyutunu standartla */
.heroSection{
  margin-bottom:24px;
}
.heroSection .heroSplit{
  min-height:300px;        /* fazla büyümeyi engeller */
  height:auto;             /* esnek kalsın */
  border-radius:16px;
}
@media(max-width:900px){
  .heroSection .heroSplit{ min-height:240px; }
