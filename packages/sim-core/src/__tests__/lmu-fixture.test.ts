import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLMUObjectOut } from '../lmu-parser';

const repoRoot = join(import.meta.dir, '..', '..', '..', '..');
const fixtureBin = join(repoRoot, 'test-data', 'lmu-fixture.bin');
const fixtureJson = join(repoRoot, 'test-data', 'lmu-fixture.json');
const fixtureExists = existsSync(fixtureBin) && existsSync(fixtureJson);

const itIf = fixtureExists ? it : it.skip;

interface FixtureSidecar {
  session: {
    trackName: string;
    sessionType: number;
    numVehicles: number;
    gamePhase: number;
    playerName: string;
  };
  vehicles: Array<{
    driverName: string;
    place: number;
    isPlayer: boolean;
  }>;
}

describe('T17: Integration - real LMU fixture', () => {
  itIf('parses dump and matches JSON sidecar', () => {
    const buffer = readFileSync(fixtureBin);
    const expected = JSON.parse(readFileSync(fixtureJson, 'utf8')) as FixtureSidecar;

    const result = parseLMUObjectOut(buffer);
    expect(result).not.toBeNull();

    expect(result!.session!['trackName']).toBe(expected.session.trackName);
    expect(result!.session!['sessionType']).toBe(expected.session.sessionType);
    expect(result!.session!['gamePhase']).toBe(expected.session.gamePhase);
    expect(result!.session!['numVehicles']).toBe(expected.session.numVehicles);

    const playerVehicle = expected.vehicles.find((v) => v.isPlayer);
    if (playerVehicle) {
      const parsedPlayer = result!.vehicles.find((v) => v['isPlayer'] === true);
      expect(parsedPlayer).toBeDefined();
      expect(parsedPlayer!['driverName']).toBe(playerVehicle.driverName);
      expect(parsedPlayer!['place']).toBe(playerVehicle.place);
    }

    if (expected.vehicles.length > 0) {
      const firstExpected = expected.vehicles[0];
      const firstParsed = result!.vehicles.find((v) => v['place'] === firstExpected.place);
      expect(firstParsed).toBeDefined();
      expect(firstParsed!['driverName']).toBe(firstExpected.driverName);
    }
  });
});
