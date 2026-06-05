import { SCENARIO_CONFIGS } from './scenarios';
import { SeededRandom } from './random';
const DRIVERS = [
    'John Smith', 'Carlos Mendez', 'Liam OConnor', 'Max Verstappen',
    'Lewis Hamilton', 'Charles Leclerc', 'Lando Norris', 'George Russell',
    'Fernando Alonso', 'Sergio Perez', 'Oscar Piastri', 'Pierre Gasly',
    'Alex Albon', 'Esteban Ocon', 'Lance Stroll', 'Yuki Tsunoda',
    'Valtteri Bottas', 'Kevin Magnussen', 'Daniel Ricciardo', 'Nico Hulkenberg',
    'Zhou Guanyu', 'Logan Sargeant', 'Nyck de Vries', 'Mick Schumacher',
    'Robert Shwartzman',
];
const TEAMS = [
    'Red Bull Racing', 'Mercedes-AMG', 'Ferrari', 'McLaren',
    'Aston Martin', 'Alpine', 'AlphaTauri', 'Williams',
    'Alfa Romeo', 'Haas F1', 'Chip Ganassi', 'Penske',
    'Andretti', 'WTR', 'Action Express', 'RLL Racing',
    'BMW M Team', 'Porsche Penske', 'Toyota Gazoo', 'Peugeot',
    'Ferrari AF', 'Lamborghini', 'Aston Martin TH', 'Corvette',
    'Mercedes AMG GT',
];
const TRACKS = [
    'Spa-Francorchamps', 'Monza', 'Silverstone', 'Nürburgring',
    'Le Mans', 'Daytona', 'Sebring', 'Road Atlanta',
    'Watkins Glen', 'Circuit of the Americas',
];
const IRACING_TRACKS = TRACKS.map((t) => "iRacing " + t);
export class IRacingMock {
    name = 'iRacing';
    simType = 'iracing';
    scenario = 'practice';
    rng;
    tickCount = 0;
    lapCount = 0;
    fuelLevel;
    fuelCapacity = 100;
    position = 1;
    trackIndex;
    constructor() {
        this.rng = new SeededRandom();
        this.fuelLevel = this.fuelCapacity;
        this.trackIndex = this.rng.nextInt(0, IRACING_TRACKS.length - 1);
        this.position = 1;
    }
    setScenario(scenario) {
        this.scenario = scenario;
        this.tickCount = 0;
        this.lapCount = 0;
        this.rng.reset();
        const cfg = this.getConfig();
        if (cfg.fuelBehavior === 'full' || cfg.fuelBehavior === 'decreasing') {
            this.fuelLevel = this.fuelCapacity;
        }
        else if (cfg.fuelBehavior === 'low') {
            this.fuelLevel = 15;
        }
        else if (cfg.fuelBehavior === 'increasing') {
            this.fuelLevel = 10;
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
        return [{ id: 'iracing', name: 'iRacing', available: true }];
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
        return {
            sim: 'iracing',
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
                lapDistance: this.generateLapDistance(cfg),
                lapCount: this.lapCount,
                driverName: 'Driver',
                carNumber: '1',
                teamName: 'Team',
            },
            engine: {
                rpm,
                maxRpm: 9500,
                fuelLevel: this.fuelLevel,
                fuelCapacity: this.fuelCapacity,
                fuelPressure: this.rng.nextFloat(3.5, 5.0),
                waterTemp: this.rng.nextFloat(80, 100),
                oilTemp: this.rng.nextFloat(90, 110),
                oilPressure: this.rng.nextFloat(2.5, 5.5),
                engineWarnings: cfg.fuelBehavior === 'empty' ? 1 : 0,
            },
            tyres: {
                fl: { temp: this.rng.nextInt(80, 110), pressure: this.rng.nextFloat(22, 26), wear: this.rng.nextFloat(0, 0.3) },
                fr: { temp: this.rng.nextInt(82, 112), pressure: this.rng.nextFloat(22, 26), wear: this.rng.nextFloat(0, 0.3) },
                rl: { temp: this.rng.nextInt(78, 108), pressure: this.rng.nextFloat(22, 26), wear: this.rng.nextFloat(0, 0.3) },
                rr: { temp: this.rng.nextInt(80, 110), pressure: this.rng.nextFloat(22, 26), wear: this.rng.nextFloat(0, 0.3) },
            },
            lap: {
                currentLap: this.lapCount,
                totalLaps: cfg.fuelBehavior === 'decreasing' ? 30 : 10,
                lastLaptime: cfg.baseLaptime + this.rng.nextInt(-2000, 3000),
                bestLaptime: cfg.baseLaptime - this.rng.nextInt(1000, 3000),
                sector: this.rng.nextInt(1, 3),
                sector1: this.rng.nextFloat(28_000, 35_000),
                sector2: this.rng.nextFloat(32_000, 40_000),
                sector3: this.rng.nextFloat(30_000, 38_000),
                estimatedLaptime: cfg.baseLaptime + this.rng.nextInt(-1000, 1000),
                delta: this.rng.nextFloat(-2, 2),
                isPersonalBest: this.tickCount % 20 === 0,
                isSessionBest: this.tickCount % 50 === 0,
            },
            session: {
                type: cfg.sessionType,
                state: 'running',
                timeRemaining: cfg.fuelBehavior === 'decreasing' ? 1800 - this.tickCount * 0.016 : 3600,
                timeElapsed: this.tickCount * 0.016,
                totalLaps: cfg.fuelBehavior === 'decreasing' ? 30 : 10,
                flags,
                trackName: IRACING_TRACKS[this.trackIndex],
                trackLength: this.rng.nextFloat(4000, 7000),
                weather: {
                    airTemp: this.rng.nextFloat(15, 35),
                    trackTemp: this.rng.nextFloat(20, 50),
                    humidity: this.rng.nextFloat(30, 80),
                    precipitation: 0,
                    windSpeed: this.rng.nextFloat(0, 10),
                    windDirection: this.rng.nextFloat(0, 360),
                },
            },
            vehicles: this.generateVehicles(cfg),
            track: {
                name: IRACING_TRACKS[this.trackIndex],
                length: this.rng.nextFloat(4000, 7000),
                sectors: [this.rng.nextFloat(0.3, 0.35), this.rng.nextFloat(0.3, 0.35)],
            },
            inputs: {
                throttle: cfg.speedMax > 0 ? this.rng.nextFloat(0.3, 1.0) : 0,
                brake: cfg.speedMax > 0 ? this.rng.nextFloat(0, 0.8) : 1,
                clutch: 0,
                steering: this.rng.nextFloat(-0.5, 0.5),
            },
            weather: {
                airTemp: this.rng.nextFloat(15, 35),
                trackTemp: this.rng.nextFloat(20, 50),
                humidity: this.rng.nextFloat(30, 80),
                precipitation: 0,
                windSpeed: this.rng.nextFloat(0, 10),
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
        const targetRpm = cfg.rpmMin + speedRatio * (cfg.rpmMax - cfg.rpmMin);
        return Math.round(targetRpm + this.rng.nextFloat(-300, 300));
    }
    generateGear(cfg, speed) {
        const [min, max] = cfg.gearRange;
        if (speed === 0)
            return 0;
        const ratio = speed / cfg.speedMax;
        return Math.max(min, Math.min(max, Math.round(min + ratio * (max - min))));
    }
    generateLapDistance(cfg) {
        if (cfg.speedMax === 0)
            return 0;
        return this.rng.nextFloat(0, 7000);
    }
    generateFlags(cfg) {
        return cfg.flags.map((type) => ({
            type,
            active: true,
        }));
    }
    generateVehicles(cfg) {
        const count = cfg.vehicleCount;
        const vehicles = [];
        for (let i = 0; i < count; i++) {
            const driverIdx = (i + this.tickCount) % DRIVERS.length;
            const teamIdx = (i + this.tickCount * 3) % TEAMS.length;
            const pos = i + 1;
            const lastLap = cfg.baseLaptime + this.rng.nextInt(-5000, 5000);
            const bestLap = lastLap - this.rng.nextInt(500, 3000);
            const isPlayer = i === 0;
            vehicles.push({
                id: 1000 + i,
                driverName: DRIVERS[driverIdx],
                carNumber: String(i + 1),
                teamName: TEAMS[teamIdx],
                position: pos,
                classPosition: pos,
                gap: i === 0 ? 0 : this.rng.nextFloat(0.5, 30),
                gapType: 'seconds',
                lastLaptime: lastLap,
                bestLaptime: bestLap,
                sectorTimes: [
                    this.rng.nextFloat(28_000, 38_000),
                    this.rng.nextFloat(30_000, 42_000),
                    this.rng.nextFloat(28_000, 38_000),
                ],
                speed: cfg.speedMax > 0 ? this.rng.nextFloat(cfg.speedMin, cfg.speedMax) : 0,
                isPlayer,
                isPitting: i > 0 && cfg.isPitting ? this.rng.next() > 0.9 : false,
                tyreCompound: 'Medium',
                fuelRemaining: this.rng.nextFloat(0, 100),
                color: this.getDriverColor(i),
            });
        }
        return vehicles;
    }
    getDriverColor(index) {
        const colors = [
            '#e10600', '#00d2be', '#ff8700', '#005aff',
            '#006f62', '#0090ff', '#2b4562', '#005aff',
            '#b6babd', '#787878', '#ff3399', '#ff69b4',
            '#7f4f24', '#222222', '#eeeeee', '#ffd700',
            '#8b0000', '#00008b', '#006400', '#4b0082',
        ];
        return colors[index % colors.length];
    }
    advanceFuel(cfg) {
        if (cfg.fuelBehavior === 'decreasing') {
            this.fuelLevel = Math.max(0, this.fuelLevel - this.rng.nextFloat(0.01, 0.05));
        }
        else if (cfg.fuelBehavior === 'low') {
            this.fuelLevel = Math.max(5, 15 - this.tickCount * 0.01);
        }
        else if (cfg.fuelBehavior === 'increasing') {
            this.fuelLevel = Math.min(this.fuelCapacity, this.fuelLevel + this.rng.nextFloat(0.05, 0.15));
        }
    }
    advanceLap(cfg) {
        if (this.tickCount > 0 && this.tickCount % 200 === 0) {
            this.lapCount++;
        }
    }
    advancePosition(cfg) {
        if (cfg.positionRange && this.tickCount % 50 === 0 && this.rng.next() > 0.6) {
            const delta = this.rng.next() > 0.5 ? 1 : -1;
            this.position = Math.max(cfg.positionRange[0], Math.min(cfg.positionRange[1], this.position + delta));
        }
    }
}
//# sourceMappingURL=iracing-mock.js.map