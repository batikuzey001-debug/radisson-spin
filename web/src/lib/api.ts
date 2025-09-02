// web/src/lib/api.ts
// Tek yerden veri akışı (şimdilik sahte). Gerçek backend endpointlerini buraya yazacağız.
export type ScoreRow = { home: string; away: string; score: string };
export type Tournament = { id: string; title: string; prize: number; players: number };

export async function fetchLivePlayers(): Promise<number> {
  // TODO: backend'den: GET /metrics/live-players
  return 2847;
}

export async function fetchDailyWinnings(): Promise<number> {
  // TODO: backend'den: GET /metrics/daily-winnings
  return 15000;
}

export async function fetchPromoCodes(): Promise<string[]> {
  // TODO: backend'den: GET /promos/today
  return ["BUGÜN50", "FLASH25", "PREMIER75"];
}

export async function fetchUpcomingEvents(): Promise<{ title: string; when: string }[]> {
  // TODO: backend'den: GET /events/upcoming?limit=1
  return [{ title: "Premier League Night", when: "Yarın 21:00" }];
}

export async function fetchLiveScores(): Promise<ScoreRow[]> {
  // TODO: backend'den: GET /api/livescores/list (özet)
  return [
    { home: "Arsenal", away: "Chelsea", score: "2 - 1" },
    { home: "Man City", away: "Spurs", score: "1 - 0" },
    { home: "Liverpool", away: "Newcastle", score: "3 - 2" },
  ];
}

export async function fetchActiveTournaments(): Promise<Tournament[]> {
  // TODO: backend'den: GET /api/tournaments/active?limit=4
  return [
    { id: "t1", title: "Hafta Sonu Sprint", prize: 75000, players: 842 },
    { id: "t2", title: "Mega Kombine", prize: 120000, players: 1234 },
    { id: "t3", title: "Kasım Maratonu", prize: 300000, players: 2012 },
    { id: "t4", title: "Premier Stars", prize: 180000, players: 956 },
  ];
}
