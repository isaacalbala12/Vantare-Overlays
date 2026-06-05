import { SCENARIO_CONFIGS } from './scenarios';
import { SeededRandom } from './random';
const DRIVERS = [
    'Marco Bianchi', 'Jean-Luc Bernard', 'Hans Mueller', 'Sebastian Vettel',
    'Kimi Raikkonen', 'Romain Grosjean', 'Esteban Gutierrez', 'Olivier Panis',
    'Alain Prost', 'Ayrton Senna', 'Nelson Piquet', 'Emerson Fittipaldi',
    'Jackie Stewart', 'Nigel Mansell', 'Damon Hill', 'Jenson Button',
    'Rubens Barrichello', 'Felipe Massa', 'Mark Webber', 'Jochen Rindt',
];
const TEAMS = [
    'Porsche Motorsport', 'Ferrari Competizione', 'Toyota Gazoo Racing',
    'Peugeot Sport', 'Alpine Endurance', 'BMW M Motorsport',
    'Cadillac Racing', 'Lamborghini Squadra', 'Aston Martin Racing',
    'Corvette Racing', 'Ford Performance', 'McLaren Automotive',
    'Mercedes-AMG GT', 'Audi Sport', 'Honda Racing',
    'Nismo', 'Mazda Speed', 'Acura', 'Brabham', 'Glickenhaus',
];
const LMU_TRACKS = [
    'LMU Fuji Speedway', 'LMU Sebring', 'LMU Monza',
    'LMU Circuit de la Sarthe', 'LMU Spa-Francorchamps',
    'LMU Bahrain', 'LMU Interlagos', 'LMU Portimao',
    'LMU Road Atlanta', 'LMU Silverstone',
];
export class LMUMock {
    name = 'LMU';
    simType = 'lmu';
    scenario = 'practice';
    rng;
    tickCount = 0;
    lapCount = 0;
    fuelLevel;
    fuelCapacity = 100;
    position = 1;
    trackIndex;
    constructor() {
        this.rng = new SeededRandom(99);
        this.fuelLevel = this.fuelCapacity;
        this.trackIndex = this.rng.nextInt(0, LMU_TRACKS.length - 1);
        this.position = 1;
    }
    setScenario(scenario) {
        this.scenario = scenario;
        this.tickCount = 0;
        this.lapCount = 0;
        this.rng.reset(99);
        const cfg = this.getConfig();
        if (cfg.fuelBehavior === 'full' || cfg.fuelBehavior === 'decreasing') {
            this.fuelLevel = this.fuelCapacity;
        }
        else if (cfg.fuelBehavior === 'low') {
            this.fuelLevel = 12;
        }
        else if (cfg.fuelBehavior === 'increasing') {
            this.fuelLevel = 8;
        }
        else {
            this.fuelLevel = this.fuelCapacity;
        }
        if (cfg.positionRange) {
            this.position = this.rng.nextInt(cfg.positionRange[0], cfg.positionRange[1]);
        }
        else {
            this.position = 1;
        }
    }
    getAvailableSims() {
        return [{ id: 'lmu', name: 'LMU', available: true }];
    }
    getData() {
        const cfg = this.getConfig();
        this.tickCount++;
        this.advanceFuel(cfg);
        this.advanceLap(cfg);
        this.advancePosition(cfg);
        const speed = this.generateSpeed(cfg);
        const rpm = this.generateRpm(cfg, speed);
        const gear = this.generateGear(cfg, speed);
        const flags = this.generateFlags(cfg);
        const trackLength = 5000 + this.trackIndex * 200;
        return {
            sim: 'lmu',
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
                maxRpm: 9200,
                fuelLevel: this.fuelLevel,
                fuelCapacity: this.fuelCapacity,
                fuelPressure: this.rng.nextFloat(3.0, 4.8),
                waterTemp: this.rng.nextFloat(78, 98),
                oilTemp: this.rng.nextFloat(85, 115),
                oilPressure: this.rng.nextFloat(2.8, 5.2),
                engineWarnings: 0,
            },
            tyres: {
                fl: { temp: this.rng.nextInt(75, 105), pressure: this.rng.nextFloat(23, 27), wear: this.rng.nextFloat(0, 0.35) },
                fr: { temp: this.rng.nextInt(77, 108), pressure: this.rng.nextFloat(23, 27), wear: this.rng.nextFloat(0, 0.35) },
                rl: { temp: this.rng.nextInt(73, 103), pressure: this.rng.nextFloat(23, 27), wear: this.rng.nextFloat(0, 0.35) },
                rr: { temp: this.rng.nextInt(75, 105), pressure: this.rng.nextFloat(23, 27), wear: this.rng.nextFloat(0, 0.35) },
            },
            lap: {
                currentLap: this.lapCount,
                totalLaps: cfg.fuelBehavior === 'decreasing' ? 24 : 8,
                lastLaptime: cfg.baseLaptime + this.rng.nextInt(-2000, 4000),
                bestLaptime: cfg.baseLaptime - this.rng.nextInt(1000, 4000),
                sector: this.rng.nextInt(1, 3),
                sector1: this.rng.nextFloat(30_000, 38_000),
                sector2: this.rng.nextFloat(34_000, 42_000),
                sector3: this.rng.nextFloat(30_000, 38_000),
                estimatedLaptime: cfg.baseLaptime + this.rng.nextInt(-1000, 2000),
                delta: this.rng.nextFloat(-3, 3),
                isPersonalBest: this.tickCount % 15 === 0,
                isSessionBest: this.tickCount % 40 === 0,
            },
            session: {
                type: cfg.sessionType,
                state: 'running',
                timeRemaining: cfg.fuelBehavior === 'decreasing' ? 3600 - this.tickCount * 0.016 : 7200,
                timeElapsed: this.tickCount * 0.016,
                totalLaps: cfg.fuelBehavior === 'decreasing' ? 24 : 8,
                flags,
                trackName: LMU_TRACKS[this.trackIndex],
                trackLength,
                weather: {
                    airTemp: this.rng.nextFloat(12, 32),
                    trackTemp: this.rng.nextFloat(18, 48),
                    humidity: this.rng.nextFloat(35, 85),
                    precipitation: 0,
                    windSpeed: this.rng.nextFloat(0, 8),
                    windDirection: this.rng.nextFloat(0, 360),
                },
            },
            vehicles: this.generateVehicles(cfg),
            track: {
                name: LMU_TRACKS[this.trackIndex],
                length: trackLength,
                sectors: [0.32, 0.33],
            },
            inputs: {
                throttle: cfg.speedMax > 0 ? this.rng.nextFloat(0.2, 1.0) : 0,
                brake: cfg.speedMax > 0 ? this.rng.nextFloat(0, 0.9) : 1,
                clutch: 0,
                steering: this.rng.nextFloat(-0.4, 0.4),
            },
            weather: {
                airTemp: this.rng.nextFloat(12, 32),
                trackTemp: this.rng.nextFloat(18, 48),
                humidity: this.rng.nextFloat(35, 85),
                precipitation: 0,
                windSpeed: this.rng.nextFloat(0, 8),
                windDirection: this.rng.nextFloat(0, 360),
            },
        };
    }
    getConfig() {
        return SCENARIO_CONFIGS[this.scenario];
    }
    generateSpeed(cfg) {
        if (cfg.speedMin === 0 && cfg.speedMax === 0)
            return 0;
        const variance = (cfg.speedMax - cfg.speedMin) * 0.15;
        const base = this.rng.nextFloat(cfg.speedMin, cfg.speedMax);
        const jitter = this.rng.nextFloat(-variance, variance);
        return Math.max(cfg.speedMin, Math.min(cfg.speedMax, Math.round(base + jitter)));
    }
    generateRpm(cfg, speed) {
        if (speed === 0)
            return this.rng.nextInt(cfg.rpmMin, cfg.rpmMax);
        const speedRatio = (speed - cfg.speedMin) / (cfg.speedMax - cfg.speedMin || 1);
        return Math.round(cfg.rpmMin + speedRatio * (cfg.rpmMax - cfg.rpmMin) + this.rng.nextFloat(-300, 300));
    }
    generateGear(cfg, speed) {
        const [min, max] = cfg.gearRange;
        if (speed === 0)
            return 0;
        const ratio = speed / cfg.speedMax;
        return Math.max(min, Math.min(max, Math.round(min + ratio * (max - min))));
    }
    generateFlags(cfg) {
        return cfg.flags.map((type) => ({ type, active: true }));
    }
    generateVehicles(cfg) {
        const count = cfg.vehicleCount;
        const vehicles = [];
        for (let i = 0; i < count; i++) {
            const driverIdx = (i + this.tickCount) % DRIVERS.length;
            const teamIdx = (i + this.tickCount * 3) % TEAMS.length;
            const pos = i + 1;
            const lastLap = cfg.baseLaptime + this.rng.nextInt(-4000, 5000);
            const bestLap = lastLap - this.rng.nextInt(500, 3000);
            vehicles.push({
                id: 2000 + i,
                driverName: DRIVERS[driverIdx],
                carNumber: String(i + 1),
                teamName: TEAMS[teamIdx],
                position: pos,
                classPosition: pos,
                gap: i === 0 ? 0 : this.rng.nextFloat(0.3, 35),
                gapType: 'seconds',
                lastLaptime: lastLap,
                bestLaptime: bestLap,
                sectorTimes: [
                    this.rng.nextFloat(30_000, 40_000),
                    this.rng.nextFloat(32_000, 44_000),
                    this.rng.nextFloat(30_000, 40_000),
                ],
                speed: cfg.speedMax > 0 ? this.rng.nextFloat(cfg.speedMin, cfg.speedMax) : 0,
                isPlayer: i === 0,
                isPitting: i > 0 && cfg.isPitting ? this.rng.next() > 0.9 : false,
                tyreCompound: 'Hard',
                fuelRemaining: this.rng.nextFloat(0, 100),
                color: this.getDriverColor(i),
            });
        }
        return vehicles;
    }
    getDriverColor(index) {
        const colors = [
            '#ff2800', '#0060ff', '#00a650', '#ffd700',
            '#8b4513', '#ff69b4', '#00ced1', '#ff4500',
            '#9400d3', '#2e8b57', '#dc143c', '#000080',
            '#808000', '#ff1493', '#00bfff', '#c0c0c0',
            '#800000', '#008080', '#800080', '#008000',
        ];
        return colors[index % colors.length];
    }
    advanceFuel(cfg) {
        if (cfg.fuelBehavior === 'decreasing') {
            this.fuelLevel = Math.max(0, this.fuelLevel - this.rng.nextFloat(0.008, 0.04));
        }
        else if (cfg.fuelBehavior === 'low') {
            this.fuelLevel = Math.max(3, 12 - this.tickCount * 0.01);
        }
        else if (cfg.fuelBehavior === 'increasing') {
            this.fuelLevel = Math.min(this.fuelCapacity, this.fuelLevel + this.rng.nextFloat(0.04, 0.12));
        }
    }
    advanceLap(cfg) {
        if (this.tickCount > 0 && this.tickCount % 180 === 0) {
            this.lapCount++;
        }
    }
    advancePosition(cfg) {
        if (cfg.positionRange && this.tickCount % 60 === 0 && this.rng.next() > 0.65) {
            const delta = this.rng.next() > 0.5 ? 1 : -1;
            this.position = Math.max(cfg.positionRange[0], Math.min(cfg.positionRange[1], this.position + delta));
        }
    }
}
//# sourceMappingURL=lmu-mock.js.map