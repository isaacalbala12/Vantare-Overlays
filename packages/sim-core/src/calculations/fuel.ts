/**
 * Calculate average fuel consumption per lap
 */
export function calculateFuelPerLap(fuelUsed: number, lapsCompleted: number): number {
  if (lapsCompleted <= 0) return 0;
  if (fuelUsed < 0) return 0;
  return fuelUsed / lapsCompleted;
}

/**
 * Calculate how many laps can be completed with remaining fuel
 */
export function calculateLapsRemaining(fuelLevel: number, fuelPerLap: number): number {
  if (fuelPerLap <= 0) return 0;
  if (fuelLevel <= 0) return 0;
  return fuelLevel / fuelPerLap;
}

/**
 * Calculate additional fuel needed to complete the race
 */
export function calculateFuelToEnd(fuelLevel: number, fuelPerLap: number, lapsRemainingTotal: number): number {
  if (lapsRemainingTotal <= 0) return 0;
  if (fuelPerLap <= 0) return 0;
  const needed = fuelPerLap * lapsRemainingTotal - fuelLevel;
  return needed > 0 ? needed : 0;
}

/**
 * Calculate recommended fuel save per lap.
 * Negative means driver needs to save fuel; positive means surplus.
 */
export function calculateRecommendedFuelSave(fuelLevel: number, fuelPerLap: number, lapsRemaining: number): number {
  if (lapsRemaining <= 0) return 0;
  return (fuelLevel - fuelPerLap * lapsRemaining) / lapsRemaining;
}

/**
 * Calculate maximum stint length (laps) given fuel capacity and consumption
 */
export function calculateStintLength(fuelCapacity: number, fuelPerLap: number): number {
  if (fuelPerLap <= 0) return 0;
  return fuelCapacity / fuelPerLap;
}
