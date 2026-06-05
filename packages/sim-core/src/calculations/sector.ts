/**
 * Determine the current sector (1-indexed) based on lap distance
 */
export function getCurrentSector(lapDistance: number, trackLength: number, sectorCount: number): number {
  if (trackLength <= 0 || sectorCount <= 0) return 1;
  if (lapDistance < 0) return 1;

  const sectorSize = trackLength / sectorCount;
  const sector = Math.floor(lapDistance / sectorSize) + 1;
  return Math.min(sector, sectorCount);
}

/**
 * Calculate delta in a sector comparing to best sector time
 */
export function calculateSectorDelta(sectorTime: number, bestSectorTime: number): number {
  return sectorTime - bestSectorTime;
}

/**
 * Calculate best combined sectors (ideal lap) from multiple laps.
 * Returns a tuple of [bestSector1, bestSector2, bestSector3].
 * Skips zero/negative sector times (incomplete laps).
 */
export function calculateBestSectors(sectors: Array<[number, number, number]>): [number, number, number] {
  let best1 = Infinity;
  let best2 = Infinity;
  let best3 = Infinity;

  for (const [s1, s2, s3] of sectors) {
    if (s1 > 0 && s1 < best1) best1 = s1;
    if (s2 > 0 && s2 < best2) best2 = s2;
    if (s3 > 0 && s3 < best3) best3 = s3;
  }

  return [
    best1 === Infinity ? 0 : best1,
    best2 === Infinity ? 0 : best2,
    best3 === Infinity ? 0 : best3,
  ];
}

/**
 * Estimate the current lap's total time based on completed sectors and last lap
 */
export function calculateEstimatedLaptime(
  currentSector: number,
  completedSectors: number[],
  lastLapTime: number,
): number {
  if (currentSector <= 1) return lastLapTime;
  if (completedSectors.length === 0) return lastLapTime;

  const completedSum = completedSectors.reduce((sum, t) => sum + t, 0);
  const completedCount = completedSectors.length;

  // Average sector time from last lap
  const avgSectorTime = lastLapTime / 3;
  const remainingSectors = 3 - completedCount;

  return completedSum + remainingSectors * avgSectorTime;
}
