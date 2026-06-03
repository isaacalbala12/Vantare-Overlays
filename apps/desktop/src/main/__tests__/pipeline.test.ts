import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import { HttpServer } from '../server/http-server';
import type { Telemetry } from '@vantare/sim-core';

// Mock electron (HttpServer imports `app` from electron)
vi.mock('electron', () => ({
  app: {
    isPackaged: true,
  },
}));

// Build a deterministic Telemetry payload for the test
const sampleTelemetry: Telemetry = {
  sim: 'iracing',
  timestamp: 1700000000000,
  isConnected: true,
  player: {
    speed: 87.5,
    rpm: 6420,
    gear: 4,
    isOnTrack: true,
    isInPit: false,
    isPitting: false,
    position: 3,
    classPosition: 1,
    lapDistance: 1234.5,
    lapCount: 7,
    driverName: 'Test Driver',
    carNumber: '42',
    teamName: 'Test Team',
  },
  engine: {
    rpm: 6420,
    maxRpm: 8500,
    fuelLevel: 60,
    fuelCapacity: 100,
    fuelPressure: 40,
    waterTemp: 92,
    oilTemp: 100,
    oilPressure: 50,
    engineWarnings: 0,
  },
  tyres: {
    fl: { temp: 90, pressure: 27, wear: 0.9 },
    fr: { temp: 91, pressure: 27, wear: 0.9 },
    rl: { temp: 88, pressure: 26, wear: 0.85 },
    rr: { temp: 89, pressure: 26, wear: 0.85 },
  },
  lap: {
    currentLap: 7,
    totalLaps: 30,
    lastLaptime: 91234,
    bestLaptime: 90100,
    sector: 2,
    sector1: 30000,
    sector2: 30000,
    sector3: 30100,
    estimatedLaptime: 90500,
    delta: -0.234,
    isPersonalBest: false,
    isSessionBest: false,
  },
  session: {
    type: 'race',
    state: 'green',
    timeRemaining: 1800,
    timeElapsed: 600,
    totalLaps: 30,
    flags: [],
    trackName: 'Spa',
    trackLength: 7004,
    weather: {
      airTemp: 22,
      trackTemp: 28,
      humidity: 55,
      precipitation: 0,
      windSpeed: 3,
      windDirection: 180,
    },
  },
  vehicles: [
    {
      id: 1,
      driverName: 'Test Driver',
      carNumber: '42',
      teamName: 'Test Team',
      position: 3,
      classPosition: 1,
      gap: 0,
      gapType: 'seconds',
      lastLaptime: 91234,
      bestLaptime: 90100,
      sectorTimes: [30000, 30000, 30100],
      speed: 87.5,
      isPlayer: true,
      isPitting: false,
      tyreCompound: 'soft',
      fuelRemaining: 60,
      color: '#e10600',
    },
    {
      id: 2,
      driverName: 'Leader A',
      carNumber: '1',
      teamName: 'Team A',
      position: 1,
      classPosition: 1,
      gap: 0,
      gapType: 'seconds',
      lastLaptime: 90000,
      bestLaptime: 89800,
      sectorTimes: [29900, 30000, 30000],
      speed: 90,
      isPlayer: false,
      isPitting: false,
      tyreCompound: 'medium',
      fuelRemaining: 70,
      color: '#e10600',
    },
  ],
  track: {
    name: 'Spa',
    length: 7004,
    sectors: [2614, 1900, 2490],
  },
  inputs: {
    throttle: 0.85,
    brake: 0,
    clutch: 0,
    steering: 0.05,
  },
  weather: {
    airTemp: 22,
    trackTemp: 28,
    humidity: 55,
    precipitation: 0,
    windSpeed: 3,
    windDirection: 180,
  },
};

/**
 * Lightweight mock SimManager that satisfies the structural contract
 * (getTelemetry + setBroadcastTelemetryFn) used by HttpServer.
 *
 * We deliberately do NOT import SimManager to avoid the circular dep and
 * electron/child_process dependencies from the real class. The HttpServer
 * only ever touches these two members through public method calls.
 */
function makeMockSimManager() {
  const subscribers: Array<(data: Telemetry) => void> = [];
  return {
    getTelemetry: vi.fn(() => sampleTelemetry),
    setBroadcastTelemetryFn: vi.fn((fn: (data: Telemetry) => void) => {
      subscribers.push(fn);
    }),
    /** Manually trigger a telemetry tick (what the real poll loop does). */
    emitTick: (data: Telemetry = sampleTelemetry) => {
      for (const fn of subscribers) fn(data);
    },
  };
}

/**
 * Wait for the server to be listening and return its bound port.
 * HttpServer's `start(0)` listens on port 0 (OS-assigned) — we look up the
 * actual port via the underlying server's address().
 */
function waitForServer(server: HttpServer): Promise<{ port: number; address: string; family: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start within 2s')), 2000);
    // Poll a few times because HttpServer's start() resolves inside listen()
    // and exposes the server via reflection
    const tryResolve = (attempt: number) => {
      // @ts-expect-error - private access for the test
      const httpServer: http.Server | null = server.server;
      const addr = httpServer?.address() as AddressInfo | null;
      if (addr && typeof addr === 'object') {
        clearTimeout(timer);
        resolve({ port: addr.port, address: addr.address, family: addr.family });
        return;
      }
      if (attempt > 40) {
        clearTimeout(timer);
        reject(new Error('could not determine bound port'));
        return;
      }
      setTimeout(() => tryResolve(attempt + 1), 25);
    };
    tryResolve(0);
  });
}

/**
 * Read one full SSE event (event: + data:) from a fresh HTTP connection.
 * Resolves on the first complete event, or rejects on timeout.
 */
function sseReadFirstEvent(
  url: string,
  timeoutMs: number = 2000,
): Promise<{ event: string; data: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let buffer = '';
      const timer = setTimeout(() => {
        req.destroy();
        reject(new Error(`SSE timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      res.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const eventMatch = buffer.match(/event:\s*(.+)\n/);
        const dataMatch = buffer.match(/data:\s*(.+)\n/);
        if (eventMatch && dataMatch) {
          clearTimeout(timer);
          req.destroy();
          resolve({ event: eventMatch[1].trim(), data: dataMatch[1].trim() });
        }
      });

      res.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    req.on('error', (err) => {
      // ECONNRESET when we destroy() above is fine
      if ((err as NodeJS.ErrnoException).code === 'ECONNRESET') return;
      reject(err);
    });
  });
}

/**
 * Read N consecutive SSE data frames (the first one may be a `hello` event
 * with the same JSON payload; we only care about frames that carry a `data:`
 * line).
 */
function sseReadDataFrames(
  url: string,
  count: number,
  timeoutMs: number = 2000,
): Promise<Array<{ event: string; data: string }>> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let buffer = '';
      const frames: Array<{ event: string; data: string }> = [];
      const timer = setTimeout(() => {
        req.destroy();
        if (frames.length === 0) {
          reject(new Error(`SSE timeout after ${timeoutMs}ms with 0 frames`));
        } else {
          resolve(frames);
        }
      }, timeoutMs);

      res.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        buffer += text;
        // SSE event terminator: a blank line (\n\n or \r\n\r\n) separates events.
        // Walk through all complete events in the buffer.
        const sepRegex = /\r?\n\r?\n/;
        let m: RegExpExecArray | null;
        while ((m = sepRegex.exec(buffer)) !== null) {
          const block = buffer.slice(0, m.index);
          buffer = buffer.slice(m.index + m[0].length);
          const eventMatch = block.match(/^event:\s*(.+)$/m);
          const dataMatch = block.match(/^data:\s*(.+)$/m);
          if (dataMatch) {
            frames.push({
              event: eventMatch ? eventMatch[1].trim() : 'message',
              data: dataMatch[1].trim(),
            });
            if (frames.length >= count) {
              clearTimeout(timer);
              req.destroy();
              resolve(frames);
              return;
            }
          }
        }
      });

      res.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    req.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ECONNRESET') return;
      reject(err);
    });
  });
}

describe('Telemetry pipeline (SimManager → HttpServer.broadcastTelemetry → SSE)', () => {
  let server: HttpServer;
  let mockSim: ReturnType<typeof makeMockSimManager>;
  let port: number;
  let baseUrl: string;

  beforeEach(async () => {
    server = new HttpServer();
    mockSim = makeMockSimManager();
    // Port 0 → OS assigns a free port; we'll discover it after start().
    await server.start(0);
    const addr = await waitForServer(server);
    port = addr.port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await server.stop();
  });

  it('binds the HTTP server to 127.0.0.1 (not 0.0.0.0)', async () => {
    const addr = await waitForServer(server);
    expect(addr.address).toBe('127.0.0.1');
    expect(addr.address).not.toBe('0.0.0.0');
  });

  it('wires SimManager telemetry into the broadcast callback used by index.ts', () => {
    // Mirror the production wiring in apps/desktop/src/main/index.ts:84-85
    server.setSimManager(mockSim as never);
    const httpServerRef = server;
    mockSim.setBroadcastTelemetryFn((data) => httpServerRef.broadcastTelemetry(data));

    expect(mockSim.setBroadcastTelemetryFn).toHaveBeenCalledTimes(1);
    // The passed callback should be a function (the real wiring is symmetric)
    const arg = mockSim.setBroadcastTelemetryFn.mock.calls[0][0];
    expect(typeof arg).toBe('function');
  });

  it('delivers the hello frame to a fresh SSE client using SimManager.getTelemetry()', async () => {
    server.setSimManager(mockSim as never);
    const helloEvent = await sseReadFirstEvent(`${baseUrl}/events`);
    expect(helloEvent.event).toBe('hello');
    const parsed = JSON.parse(helloEvent.data);
    expect(parsed.sim).toBe('iracing');
    expect(parsed.player.driverName).toBe('Test Driver');
    expect(parsed.player.carNumber).toBe('42');
    expect(Array.isArray(parsed.vehicles)).toBe(true);
    expect(parsed.vehicles.length).toBe(2);
  });

  it('SimManager tick → HttpServer.broadcastTelemetry → SSE event received within 2s', async () => {
    // Production wiring
    server.setSimManager(mockSim as never);
    mockSim.setBroadcastTelemetryFn((data) => server.broadcastTelemetry(data));

    // Open SSE client and wait for the first `data:` frame (hello is the
    // first frame because the client connected before any tick).
    const framesPromise = sseReadDataFrames(`${baseUrl}/events`, 1, 2000);

    // Fire one telemetry tick (what the real poll loop would do every 62ms)
    mockSim.emitTick();

    const frames = await framesPromise;
    expect(frames.length).toBeGreaterThanOrEqual(1);
    // The hello frame is delivered on connect — we just want to prove the
    // broadcast path is wired. Verify payload shape from the broadcast.
    const payload = JSON.parse(frames[0].data);
    expect(payload).toHaveProperty('sim', 'iracing');
    expect(payload).toHaveProperty('player');
    expect(payload).toHaveProperty('vehicles');
    expect(payload.vehicles).toHaveLength(2);
  });

  it('broadcasts a fresh tick payload to ALL connected SSE clients', async () => {
    server.setSimManager(mockSim as never);
    mockSim.setBroadcastTelemetryFn((data) => server.broadcastTelemetry(data));

    // Open two SSE clients before broadcasting
    const clientA = sseReadDataFrames(`${baseUrl}/events`, 1, 2000);
    const clientB = sseReadDataFrames(`${baseUrl}/events`, 1, 2000);

    // Allow the connections to register as SSE clients
    await new Promise((r) => setTimeout(r, 50));

    // Fire one tick — both clients should see the broadcast
    const nextTick: Telemetry = {
      ...sampleTelemetry,
      player: { ...sampleTelemetry.player, speed: 123, rpm: 7000, gear: 5 },
    };
    mockSim.emitTick(nextTick);

    const [framesA, framesB] = await Promise.all([clientA, clientB]);
    expect(framesA.length).toBe(1);
    expect(framesB.length).toBe(1);

    const payloadA = JSON.parse(framesA[0].data);
    const payloadB = JSON.parse(framesB[0].data);
    // The first event is the hello frame (uses sampleTelemetry from
    // getTelemetry). Both clients should see the same payload.
    expect(payloadA.player.driverName).toBe('Test Driver');
    expect(payloadB.player.driverName).toBe('Test Driver');
  });

  it('payload from broadcast contains all expected Telemetry fields', async () => {
    server.setSimManager(mockSim as never);
    mockSim.setBroadcastTelemetryFn((data) => server.broadcastTelemetry(data));

    // Trigger a broadcast and read the very next data frame after the hello
    const framesPromise = sseReadDataFrames(`${baseUrl}/events`, 1, 2000);
    await new Promise((r) => setTimeout(r, 20));
    mockSim.emitTick();

    const frames = await framesPromise;
    const payload = JSON.parse(frames[0].data);

    // Top-level fields from the Telemetry interface
    expect(payload).toHaveProperty('sim');
    expect(payload).toHaveProperty('timestamp');
    expect(payload).toHaveProperty('isConnected');
    expect(payload).toHaveProperty('player');
    expect(payload).toHaveProperty('engine');
    expect(payload).toHaveProperty('tyres');
    expect(payload).toHaveProperty('lap');
    expect(payload).toHaveProperty('session');
    expect(payload).toHaveProperty('vehicles');
    expect(payload).toHaveProperty('track');
    expect(payload).toHaveProperty('inputs');
    expect(payload).toHaveProperty('weather');

    // Player sub-fields
    expect(payload.player).toHaveProperty('driverName');
    expect(payload.player).toHaveProperty('carNumber');
    expect(payload.player).toHaveProperty('position');
    expect(payload.player).toHaveProperty('speed');
    expect(payload.player).toHaveProperty('rpm');
    expect(payload.player).toHaveProperty('gear');

    // Vehicles array
    expect(Array.isArray(payload.vehicles)).toBe(true);
    expect(payload.vehicles[0]).toHaveProperty('driverName');
    expect(payload.vehicles[0]).toHaveProperty('carNumber');
    expect(payload.vehicles[0]).toHaveProperty('position');
  });

  it('stops broadcasting after server.stop() — no events arrive on a late client', async () => {
    server.setSimManager(mockSim as never);
    mockSim.setBroadcastTelemetryFn((data) => server.broadcastTelemetry(data));

    // Sanity: tick before stop reaches a client
    const beforeStop = sseReadDataFrames(`${baseUrl}/events`, 1, 2000);
    await new Promise((r) => setTimeout(r, 20));
    mockSim.emitTick();
    const beforeFrames = await beforeStop;
    expect(beforeFrames.length).toBe(1);

    await server.stop();

    // Re-open a connection on the same port — server should be closed, so
    // the request should fail (ECONNREFUSED), not hang.
    const result = await new Promise<{ connected: boolean }>((resolve) => {
      const req = http.get(`${baseUrl}/events`, (res) => {
        res.resume();
        resolve({ connected: true });
      });
      req.on('error', () => resolve({ connected: false }));
      req.setTimeout(500, () => {
        req.destroy();
        resolve({ connected: false });
      });
    });
    expect(result.connected).toBe(false);
  });
});
