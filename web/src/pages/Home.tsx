// web/src/pages/Home.tsx
import HeroUpcomingStrip from "../components/HeroUpcomingStrip";
import Hero from "../components/Hero";
import QuickBonus from "../components/QuickBonus";
import TournamentsGrid from "../components/TournamentsGrid";  // ✅ yeni ekleme
import EventsGrid from "../components/EventsGrid";

export default function Home() {
  return (
    <main>
      {/* Header'ın hemen altında, Hero'nun üzerinde canlı maç şeridi */}
      <HeroUpcomingStrip />

      {/* Ana görsel/hero */}
      <Hero />

      {/* Diğer bölümler */}
      <QuickBonus />
      <TournamentsGrid />   {/* ✅ promosyon kodlarının altına */}
      <EventsGrid />
    </main>
  );
}
