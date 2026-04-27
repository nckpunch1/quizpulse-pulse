const PULSE_WEIGHTS = {
  0: 1,
  1: 2,
  2: 4,
  3: 7,
  4: 12,
}

export function pickWinner(teams) {
  if (!teams || teams.length === 0) {
    throw new Error('Cannot pick a winner from an empty team list.')
  }
  const pool = teams.flatMap(team => {
    const entries = PULSE_WEIGHTS[team.pulseScore] ?? PULSE_WEIGHTS[0]
    return Array(entries).fill(team)
  })
  const index = Math.floor(Math.random() * pool.length)
  return pool[index]
}

export function calculateOdds(teams) {
  if (!teams || teams.length === 0) return []
  const totalEntries = teams.reduce((sum, team) => {
    return sum + (PULSE_WEIGHTS[team.pulseScore] ?? PULSE_WEIGHTS[0])
  }, 0)
  return teams.map(team => {
    const entries = PULSE_WEIGHTS[team.pulseScore] ?? PULSE_WEIGHTS[0]
    return {
      id: team.id,
      name: team.name,
      entries,
      probability: Math.round((entries / totalEntries) * 100),
    }
  })
}
