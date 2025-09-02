// web/src/app/livescores/demo/page.tsx
import LiveScoreCardDemo from '@/components/LiveScoreCardDemo'

export const dynamic = 'force-dynamic'

const RB_LOGO = 'https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png'

export default function LiveScoreDemoPage() {
  const items = [
    {
      league: { logo: null, name: 'Premier League' },
      home: { name: 'Manchester United', logo: 'https://cdn.sportmonks.com/images/soccer/teams/14/14.png', xg: 1.85 },
      away: { name: 'Chelsea',            logo: 'https://cdn.sportmonks.com/images/soccer/teams/18/18.png', xg: 1.10 },
      score: { home: 2, away: 1 }, time: 67,
      odds: { H: 1.70, D: 3.40, A: 4.50, bookmakerLogo: RB_LOGO },
      prob: { H: 59, D: 25, A: 16 },
    },
    {
      league: { logo: 'https://cdn.sportmonks.com/images/soccer/leagues/564/564.png' }, // LaLiga
      home: { name: 'Barcelona', logo: 'https://cdn.sportmonks.com/images/soccer/teams/26/26.png', xg: 1.62 },
      away: { name: 'Real Madrid', logo: 'https://cdn.sportmonks.com/images/soccer/teams/27/27.png', xg: 1.48 },
      score: { home: 1, away: 1 }, time: 54,
      odds: { H: 2.10, D: 3.20, A: 2.75, bookmakerLogo: RB_LOGO },
      prob: { H: 42, D: 28, A: 30 },
    },
    {
      league: { logo: null, name: 'Süper Lig' },
      home: { name: 'Galatasaray',  logo: 'https://cdn.sportmonks.com/images/soccer/teams/6/198.png', xg: 1.30 },
      away: { name: 'Fenerbahçe',   logo: 'https://cdn.sportmonks.com/images/soccer/teams/23/215.png', xg: 1.05 },
      score: { home: 0, away: 0 }, time: 23,
      odds: { H: 2.00, D: 3.10, A: 3.10, bookmakerLogo: RB_LOGO },
      prob: { H: 45, D: 30, A: 25 },
    },
    {
      league: { logo: null, name: 'Serie A' },
      home: { name: 'Inter',        logo: 'https://cdn.sportmonks.com/images/soccer/teams/18/318.png', xg: 0.95 },
      away: { name: 'Juventus',     logo: 'https://cdn.sportmonks.com/images/soccer/teams/21/341.png', xg: 0.88 },
      score: { home: 1, away: 0 }, time: 39,
      odds: { H: 1.90, D: 3.30, A: 3.60, bookmakerLogo: RB_LOGO },
      prob: { H: 51, D: 27, A: 22 },
    },
    {
      league: { logo: null, name: 'Bundesliga' },
      home: { name: 'Bayern',       logo: 'https://cdn.sportmonks.com/images/soccer/teams/7/135.png', xg: 2.05 },
      away: { name: 'Dortmund',     logo: 'https://cdn.sportmonks.com/images/soccer/teams/5/101.png', xg: 1.35 },
      score: { home: 3, away: 2 }, time: 75,
      odds: { H: 1.65, D: 4.10, A: 4.40, bookmakerLogo: RB_LOGO },
      prob: { H: 62, D: 17, A: 21 },
    },
    {
      league: { logo: null, name: 'Ligue 1' },
      home: { name: 'PSG',          logo: 'https://cdn.sportmonks.com/images/soccer/teams/15/143.png', xg: 1.72 },
      away: { name: 'Marseille',    logo: 'https://cdn.sportmonks.com/images/soccer/teams/14/142.png', xg: 0.98 },
      score: { home: 2, away: 0 }, time: 58,
      odds: { H: 1.55, D: 4.20, A: 5.20, bookmakerLogo: RB_LOGO },
      prob: { H: 66, D: 18, A: 16 },
    },
  ]

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">CANLI SKOR • Demo Kartlar</h1>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {items.map((it, i) => (
          <LiveScoreCardDemo
            key={i}
            league={it.league}
            home={it.home}
            away={it.away}
            score={it.score}
            time={it.time}
            odds={it.odds}
            prob={it.prob}
          />
        ))}
      </div>
    </main>
  )
}
