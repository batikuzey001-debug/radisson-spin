// web/src/app/livescores/demo/page.tsx
import LiveScoreCard from '@/components/LiveScoreCard'

export const dynamic = 'force-dynamic'

export default function LiveScoreDemoPage() {
  const item = {
    league: {
      name: 'Premier League',
      logo: 'https://cdn.sportmonks.com/images/soccer/leagues/8/8.png',
    },
    home: {
      name: 'Manchester United',
      logo: 'https://cdn.sportmonks.com/images/soccer/teams/14/14.png',
      xg: 1.85,
    },
    away: {
      name: 'Chelsea',
      logo: 'https://cdn.sportmonks.com/images/soccer/teams/18/18.png',
      xg: 1.10,
    },
    score: { home: 2, away: 1 },
    time: `67'`, // veya "2nd Half"
    odds: { H: 1.70, D: 3.40, A: 4.50, bookmaker: 'bet365' },
    prob: { H: 59, D: 25, A: 16 }, // FULLTIME_RESULT_PROBABILITY
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">CANLI SKOR • Demo Kart</h1>
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
        <LiveScoreCard
          league={item.league}
          home={item.home}
          away={item.away}
          score={item.score}
          time={item.time}
          odds={item.odds}
          prob={item.prob}
        />
      </div>
      <p className="mt-6 text-sm text-white/60">
        Not: Bu sayfa tasarım demo’sudur. Gerçek veri bağlandığında <code>/livescores</code> altındaki kartlar aynı düzenle dolacaktır.
      </p>
    </main>
  )
}
