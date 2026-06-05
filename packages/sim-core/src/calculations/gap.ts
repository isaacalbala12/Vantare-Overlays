/**
 * Calculate time gap in seconds based on track distance difference.
 * Positive = behind, Negative = ahead
 */
export function calculateGapSeconds(distanceOnTrack: number, otherDistance: number, speed: number): number {
  if (speed <= 0) return 0;
  return (otherDistance - distanceOnTrack) / speed;
}

/**
 * Calculate gap in laps. Positive = behind, Negative = ahead
 */
export function calculateGapLaps(playerLaps: number, otherLaps: number): number {
  return otherLaps - playerLaps;
}

/**
 * Calculate gap within class based on position and class leader gap.
 * Returns 0 for class leader, proportional gap for other positions.
 */
export function calculateClassGap(classPosition: number, totalClassCars: number, classLeaderGap: number): number {
  if (classPosition <= 1) return 0;
  const denominator = Math.max(1, totalClassCars - 1);
  return classLeaderGap * ((classPosition - 1) / denominator);
}

/**
 * Format a time gap as a display string.
 * Shows "+1.234" for sub-lap gaps, or "+1 LAP"/"+2 LAPS" for large gaps.
 * The lap threshold is 3600 seconds (1 hour).
 */
export function formatGap(gapSeconds: number): string {
  const lapThreshold = 3600;
  const sign = gapSeconds >= 0 ? "+" : "-";
  const abs = Math.abs(gapSeconds);

  if (abs >= lapThreshold) {
    const laps = Math.floor(abs / lapThreshold);
    const lapLabel = laps === 1 ? "LAP" : "LAPS";
    return sign + laps + " " + lapLabel;
  }

  return sign + abs.toFixed(3);
}
