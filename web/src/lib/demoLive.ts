// web/src/lib/demoLive.ts
export const RB_LOGO =
  'https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png'

export type DemoItem = {
  id: number
  league: { name?: string | null; logo?: string | null }
  home: { name: string; logo?: string | null; xg?: number | null }
  away: { name: string; logo?: string | null; xg?: number | null }
  score: { home?: number | null; away?: number | null }
  time: number
  odds?: { H?: number | null; D?: number | null; A?: number | null; bookmakerLogo?: string | null }
  prob?: { H?: number | null; D?: number | null; A?: number | null }
}

export function getDemoItems(): DemoItem[] {
  return [
    {
      id: 1001,
      league: { name: 'Premier League', logo: null },
      home: { name: 'Manchester United', logo: 'https://cdn.sportmonks.com/images/soccer/teams/14/14.png', xg: 1.85 },
      away: { name: 'Chelsea', logo: 'https://cdn.sportmonks.com/images/soccer/teams/18/18.png', xg: 1.1 },
      score: { home: 2, away: 1 },
      time: 67,
      odds: { H: 1.7, D: 3.4, A: 4.5, bookmakerLogo: RB_LOGO },
      prob: { H: 59, D: 25, A: 16 },
    },
    {
      id: 1002,
      league: { name: 'LaLiga', logo: 'https://cdn.sportmonks.com/images/soccer/leagues/564/564.png' },
      home: { name: 'Barcelona', logo: 'https://cdn.sportmonks.com/images/soccer/teams/26/26.png', xg: 1.62 },
      away: { name: 'Real Madrid', logo: 'https://cdn.sportmonks.com/images/soccer/teams/27/27.png', xg: 1.48 },
      score: { home: 1, away: 1 },
      time: 54,
      odds: { H: 2.1, D: 3.2, A: 2.75, bookmakerLogo: RB_LOGO },
      prob: { H: 42, D: 28, A: 30 },
    },
    {
      id: 1003,
      league: { name: 'Süper Lig', logo: null },
      home: { name: 'Galatasaray', logo: 'https://cdn.sportmonks.com/images/soccer/teams/6/198.png', xg: 1.3 },
      away: { name: 'Fenerbahçe', logo: 'https://cdn.sportmonks.com/images/soccer/teams/23/215.png', xg: 1.05 },
      score: { home: 0, away: 0 },
      time: 23,
      odds: { H: 2.0, D: 3.1, A: 3.1, bookmakerLogo: RB_LOGO },
      prob: { H: 45, D: 30, A: 25 },
    },
    {
      id: 1004,
      league: { name: 'Serie A', logo: null },
      home: { name: 'Inter', logo: 'https://cdn.sportmonks.com/images/soccer/teams/18/318.png', xg: 0.95 },
      away: { name: 'Juventus', logo: 'https://cdn.sportmonks.com/images/soccer/teams/21/341.png', xg: 0.88 },
      score: { home: 1, away: 0 },
      time: 39,
      odds: { H: 1.9, D: 3.3, A: 3.6, bookmakerLogo: RB_LOGO },
      prob: { H: 51, D: 27, A: 22 },
    },
    {
      id: 1005,
      league: { name: 'Bundesliga', logo: null },
      home: { name: 'Bayern', logo: 'https://cdn.sportmonks.com/images/soccer/teams/7/135.png', xg: 2.05 },
      away: { name: 'Dortmund', logo: 'https://cdn.sportmonks.com/images/soccer/teams/5/101.png', xg: 1.35 },
      score: { home: 3, away: 2 },
      time: 75,
      odds: { H: 1.65, D: 4.1, A: 4.4, bookmakerLogo: RB_LOGO },
      prob: { H: 62, D: 17, A: 21 },
    },
    {
      id: 1006,
      league: { name: 'Ligue 1', logo: null },
      home: { name: 'PSG', logo: 'https://cdn.sportmonks.com/images/soccer/teams/15/143.png', xg: 1.72 },
      away: { name: 'Marseille', logo: 'https://cdn.sportmonks.com/images/soccer/teams/14/142.png', xg: 0.98 },
      score: { home: 2, away: 0 },
      time: 58,
      odds: { H: 1.55, D: 4.2, A: 5.2, bookmakerLogo: RB_LOGO },
      prob: { H: 66, D: 18, A: 16 },
    },
  ]
}

export function findDemoItem(id: number): DemoItem | undefined {
  return getDemoItems().find((x) => x.id === id)
}
