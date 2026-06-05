/**
 * Calculate delta to personal best lap time.
 * Positive = slower, Negative = faster
 */
export function calculateDeltaToBest(lapTime: number, bestLapTime: number): number {
  return lapTime - bestLapTime;
}

/**
 * Calculate delta to race leader, accounting for laps down.
 * Positive = behind, Negative = ahead (on same lap)
 */
export function calculateDeltaToLeader(lapTime: number, leaderLapTime: number, lapsDown: number): number {
  const currentDelta = lapTime - leaderLapTime;
  return currentDelta + lapsDown * leaderLapTime;
}

/**
 * Calculate delta to a specific car's lap time
 */
export function calculateDeltaToCar(lapTime: number, otherCarLapTime: number): number {
  return lapTime - otherCarLapTime;
}

/**
 * Calculate delta in a specific sector
 */
export function calculateDeltaSector(sectorTime: number, bestSectorTime: number): number {
  return sectorTime - bestSectorTime;
}
