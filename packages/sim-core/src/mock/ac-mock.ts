import type { Telemetry, VehicleData } from '../types';
import type { MockProvider, MockScenario, SimInfo } from './mock-provider';
import { SCENARIO_CONFIGS, type ScenarioConfig } from './scenarios';
import { SeededRandom } from './random';

const DRIVERS = [
  'Luca Rossi', 'Marco Ferrari', 'Giovanni Bianchi', 'Alessandro Romano',
  'Francesco Conti', 'Paolo Marino', 'Roberto Costa', 'Antonio Gallo',
  'Dario Lombardi', 'Enzo Barbieri', 'Andrea Moretti', 'Stefano Fontana',
  'Fabio Mancini', 'Massimo Rizzo', 'Claudio Ferri', 'Alberto Villa',
  'Gianni Sala', 'Michele Bellini', 'Pietro DAngelo', 'Matteo Guerra',
];

const TEAMS = [
  'Maranello Motorsport', 'Autodelta', 'Scuderia Touring',
  'Lamborghini Corse', 'Maserati Racing', 'Pagani Automobili',
  'Abarth Competizioni', 'Alfa Romeo Racing', 'Ferrari Club',
  'Lancia Corse', 'De Tomaso', 'Zagato Racing',
  'Nardi Sport', 'ISO Racing', 'Bandini',
  'Osella Racing', 'Dallara', 'Fioravanti', 'Vignale', 'Touring Superleggera',
];

const AC_TRACKS = [
  'AC Nordschleife', 'AC Monza', 'AC Mugello', 'AC Imola',
  'AC Silverstone', 'AC Spa', 'AC Barcelona', 'AC Zandvoort',
  'AC Brands Hatch', 'AC Laguna Seca',
];

export class ACMock implements MockProvider {
  readonly name = 'Assetto Corsa';
  readonly simType = 'ac' as const;

  private scenario: MockScenario = 'practice';
  private rng: SeededRandom;
  private tickCount = 0;
  private lapCount = 0;
  private fuelLevel: number;
  private fuelCapacity = 60;
  private position = 1;
  private trackIndex: number;

  constructor() {
    this.rng = new SeededRandom(77);
    this.fuelLevel = this.fuelCapacity;
    this.trackIndex = this.rng.nextInt(0, AC_TRACKS.length - 1);
    this.position = 1;
  }

  setScenario(scenario: MockScenario): void {
    this.scenario = scenario;
    this.tickCount = 0;
    this.lapCount = 0;
    this.rng.reset(77);

    const cfg = this.getConfig();
    if (cfg.fuelBehavior === 'full' || cfg.fuelBehavior === 'decreasing') {
      this.fuelLevel = this.fuelCapacity;
    } else if (cfg.fuelBehavior === 'low') {
      this.fuelLevel = 10;
    } else if (cfg.fuelBehavior === 'increasing') {
      this.fuelLevel = 5;
    } else {
      this.fuelLevel = this.fuelCapacity;
    }

    if (cfg.positionRange) {
      this.position = this.rng.nextInt(cfg.positionRange[0], cfg.positionRange[1]);
    } else {
      this.position = 1;
    }
  }

  getAvailableSims(): SimInfo[] {
    return [{ id: 'ac', name: 'Assetto Corsa', available: true }];
  }

  getData(): Telemetry {
    const cfg = this.getConfig();
    this.tickCount++;

    this.advanceFuel(cfg);
    this.advanceLap(cfg);
    this.advancePosition(cfg);

    const speed = this.generateSpeed(cfg);
    const rpm = this.generateRpm(cfg, speed);
    const gear = this.generateGear(cfg, speed);
    const flags = this.generateFlags(cfg);
    const trackLength = 4500 + this.trackIndex * 300;

    return {
      sim: 'ac',
      timestamp: Date.now() + this.tickCount * 16,
      isConnected: true,
      player: {
        speed,
        rpm,
        gear,
        isOnTrack: cfg.isOnTrack,
        isInPit: cfg.isPit,
        isPitting: cfg.isPitting,
        position: this.position,
        classPosition: this.position,
        lapDistance: cfg.speedMax > 0 ? this.rng.nextFloat(0, trackLength) : 0,
        lapCount: this.lapCount,
        driverName: 'Driver',
        carNumber: '1',
        teamName: 'Team',
      },
      engine: {
        rpm,
        maxRpm: 8500,
        fuelLevel: this.fuelLevel,
        fuelCapacity: this.fuelCapacity,
        fuelPressure: this.rng.nextFloat(2.5, 4.5),
        waterTemp: this.rng.nextFloat(72, 95),
        oilTemp: this.rng.nextFloat(82, 108),
        oilPressure: this.rng.nextFloat(2.0, 5.0),
        engineWarnings: 0,
      },
      tyres: {
        fl: { temp: this.rng.nextInt(70, 100), pressure: this.rng.nextFloat(24, 28), wear: this.rng.nextFloat(0, 0.4) },
        fr: { temp: this.rng.nextInt(72, 102), pressure: this.rng.nextFloat(24, 28), wear: this.rng.nextFloat(0, 0.4) },
        rl: { temp: this.rng.nextInt(68, 98), pressure: this.rng.nextFloat(24, 28), wear: this.rng.nextFloat(0, 0.4) },
        rr: { temp: this.rng.nextInt(70, 100), pressure: this.rng.nextFloat(24, 28), wear: this.rng.nextFloat(0, 0.4) },
      },
      lap: {
        currentLap: this.lapCount,
        totalLaps: cfg.fuelBehavior === 'decreasing' ? 15 : 5,
        lastLaptime: cfg.baseLaptime + this.rng.nextInt(-3000, 3000),
        bestLaptime: cfg.baseLaptime - this.rng.nextInt(1000, 5000),
        sector: this.rng.nextInt(1, 3),
        sector1: this.rng.nextFloat(26_000, 34_000),
        sector2: this.rng.nextFloat(30_000, 38_000),
        sector3: this.rng.nextFloat(28_000, 36_000),
        estimatedLaptime: cfg.baseLaptime + this.rng.nextInt(-2000, 2000),
        delta: this.rng.nextFloat(-2.5, 2.5),
        isPersonalBest: this.tickCount % 18 === 0,
        isSessionBest: this.tickCount % 45 === 0,
      },
      session: {
        type: cfg.sessionType,
        state: 'running',
        timeRemaining: cfg.fuelBehavior === 'decreasing' ? 1200 - this.tickCount * 0.016 : 2400,
        timeElapsed: this.tickCount * 0.016,
        totalLaps: cfg.fuelBehavior === 'decreasing' ? 15 : 5,
        flags,
        trackName: AC_TRACKS[this.trackIndex],
        trackLength,
        weather: {
          airTemp: this.rng.nextFloat(10, 38),
          trackTemp: this.rng.nextFloat(15, 55),
          humidity: this.rng.nextFloat(25, 90),
          precipitation: cfg.flags.includes('rain') ? this.rng.nextFloat(0.1, 1) : 0,
          windSpeed: this.rng.nextFloat(0, 12),
          windDirection: this.rng.nextFloat(0, 360),
        },
      },
      vehicles: this.generateVehicles(cfg),
      track: {
        name: AC_TRACKS[this.trackIndex],
        length: trackLength,
        sectors: [0.28, 0.35],
      },
      inputs: {
        throttle: cfg.speedMax > 0 ? this.rng.nextFloat(0.25, 1.0) : 0,
        brake: cfg.speedMax > 0 ? this.rng.nextFloat(0, 0.85) : 1,
        clutch: this.rng.nextFloat(0, 0.3),
        steering: this.rng.nextFloat(-0.6, 0.6),
      },
      weather: {
        airTemp: this.rng.nextFloat(10, 38),
        trackTemp: this.rng.nextFloat(15, 55),
        humidity: this.rng.nextFloat(25, 90),
        precipitation: cfg.flags.includes('rain') ? this.rng.nextFloat(0.1, 1) : 0,
        windSpeed: this.rng.nextFloat(0, 12),
        windDirection: this.rng.nextFloat(0, 360),
      },
    };
  }

  private getConfig(): ScenarioConfig {
    return SCENARIO_CONFIGS[this.scenario];
  }

  private generateSpeed(cfg: ScenarioConfig): number {
    if (cfg.speedMin === 0 && cfg.speedMax === 0) return 0;
    const variance = (cfg.speedMax - cfg.speedMin) * 0.12;
    const base = this.rng.nextFloat(cfg.speedMin, cfg.speedMax);
    const jitter = this.rng.nextFloat(-variance, variance);
    return Math.max(cfg.speedMin, Math.min(cfg.speedMax, Math.round(base + jitter)));
  }

  private generateRpm(cfg: ScenarioConfig, speed: number): number {
    if (speed === 0) return this.rng.nextInt(cfg.rpmMin, cfg.rpmMax);
    const speedRatio = (speed - cfg.speedMin) / (cfg.speedMax - cfg.speedMin || 1);
    return Math.round(cfg.rpmMin + speedRatio * (cfg.rpmMax - cfg.rpmMin) + this.rng.nextFloat(-400, 400));
  }

  private generateGear(cfg: ScenarioConfig, speed: number): number {
    const [min, max] = cfg.gearRange;
    if (speed === 0) return 0;
    const ratio = speed / cfg.speedMax;
    return Math.max(min, Math.min(max, Math.round(min + ratio * (max - min))));
  }

  private generateFlags(cfg: ScenarioConfig) {
    return cfg.flags.map((type) => ({ type, active: true }));
  }

  private generateVehicles(cfg: ScenarioConfig): VehicleData[] {
    const count = cfg.vehicleCount;
    const vehicles: VehicleData[] = [];

    for (let i = 0; i < count; i++) {
      const driverIdx = (i + this.tickCount) % DRIVERS.length;
      const teamIdx = (i + this.tickCount * 3) % TEAMS.length;
      const pos = i + 1;
      const lastLap = cfg.baseLaptime + this.rng.nextInt(-3000, 5000);
      const bestLap = lastLap - this.rng.nextInt(500, 4000);

      vehicles.push({
        id: 3000 + i,
        driverName: DRIVERS[driverIdx],
        carNumber: String(i + 1),
        teamName: TEAMS[teamIdx],
        position: pos,
        classPosition: pos,
        gap: i === 0 ? 0 : this.rng.nextFloat(0.5, 25),
        gapType: 'seconds' as const,
        lastLaptime: lastLap,
        bestLaptime: bestLap,
        sectorTimes: [
          this.rng.nextFloat(26_000, 36_000),
          this.rng.nextFloat(28_000, 40_000),
          this.rng.nextFloat(26_000, 36_000),
        ],
        speed: cfg.speedMax > 0 ? this.rng.nextFloat(cfg.speedMin, cfg.speedMax) : 0,
        isPlayer: i === 0,
        isPitting: i > 0 && cfg.isPitting ? this.rng.next() > 0.9 : false,
        tyreCompound: 'Street',
        fuelRemaining: this.rng.nextFloat(0, 100),
        color: this.getDriverColor(i),
      });
    }

    return vehicles;
  }

  private getDriverColor(index: number): string {
    const colors = [
      '#cc0000', '#003399', '#009933', '#ffcc00',
      '#993300', '#ff66cc', '#33cccc', '#ff3300',
      '#660099', '#006633', '#cc0033', '#000066',
      '#666600', '#ff3399', '#0099ff', '#999999',
      '#660000', '#006666', '#660066', '#336600',
    ];
    return colors[index % colors.length];
  }

  private advanceFuel(cfg: ScenarioConfig): void {
    if (cfg.fuelBehavior === 'decreasing') {
      this.fuelLevel = Math.max(0, this.fuelLevel - this.rng.nextFloat(0.02, 0.08));
    } else if (cfg.fuelBehavior === 'low') {
      this.fuelLevel = Math.max(2, 10 - this.tickCount * 0.02);
    } else if (cfg.fuelBehavior === 'increasing') {
      this.fuelLevel = Math.min(this.fuelCapacity, this.fuelLevel + this.rng.nextFloat(0.06, 0.18));
    }
  }

  private advanceLap(cfg: ScenarioConfig): void {
    if (this.tickCount > 0 && this.tickCount % 150 === 0) {
      this.lapCount++;
    }
  }

  private advancePosition(cfg: ScenarioConfig): void {
    if (cfg.positionRange && this.tickCount % 40 === 0 && this.rng.next() > 0.55) {
      const delta = this.rng.next() > 0.5 ? 1 : -1;
      this.position = Math.max(
        cfg.positionRange[0],
        Math.min(cfg.positionRange[1], this.position + delta),
      );
    }
  }
}
