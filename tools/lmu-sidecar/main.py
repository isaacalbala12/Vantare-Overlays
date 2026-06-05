import mmap
import struct
import socket
import json
import sys
import time
from dataclasses import dataclass, asdict

SHM_NAME = r"\\.\pipe\LMUSDK"
PIPE_NAME = r"\\.\pipe\LMUSDK"
TELEMETRY_SIZE = 262144
POLL_HZ = 60

@dataclass
class LMUTelemetry:
    sessionTime: float = 0.0
    lap: int = 0
    speed: float = 0.0
    rpm: float = 0.0
    gear: int = 0
    throttle: float = 0.0
    brake: float = 0.0
    clutch: float = 0.0
    steer: float = 0.0
    position: int = 0
    classPosition: int = 0
    lapDistance: float = 0.0
    fuel: float = 0.0
    fuelMax: float = 0.0
    driverName: str = ""
    isOnTrack: bool = False

def parse_lmu_telemetry(data: bytes) -> LMUTelemetry | None:
    try:
        if len(data) < 64:
            return None
        mVersion = struct.unpack_from('<I', data, 4)[0]
        mIsValid = struct.unpack_from('<I', data, 8)[0]
        if not mIsValid or mVersion < 1:
            return None
        telemOffset = 64
        if len(data) < telemOffset + 256:
            return None
        t = LMUTelemetry()
        t.sessionTime = struct.unpack_from('<f', data, telemOffset + 0)[0]
        t.lap = int(struct.unpack_from('<f', data, telemOffset + 8)[0])
        t.speed = struct.unpack_from('<f', data, telemOffset + 16)[0]
        t.rpm = struct.unpack_from('<f', data, telemOffset + 20)[0]
        t.gear = struct.unpack_from('<b', data, telemOffset + 24)[0]
        t.throttle = struct.unpack_from('<f', data, telemOffset + 32)[0]
        t.brake = struct.unpack_from('<f', data, telemOffset + 36)[0]
        t.clutch = struct.unpack_from('<f', data, telemOffset + 40)[0]
        t.steer = struct.unpack_from('<f', data, telemOffset + 28)[0]
        t.position = struct.unpack_from('<i', data, telemOffset + 44)[0]
        t.classPosition = struct.unpack_from('<i', data, telemOffset + 48)[0]
        t.lapDistance = struct.unpack_from('<f', data, telemOffset + 52)[0]
        t.fuel = struct.unpack_from('<f', data, telemOffset + 96)[0]
        t.fuelMax = struct.unpack_from('<f', data, telemOffset + 100)[0]
        nameOffset = telemOffset + 272
        nameBytes = data[nameOffset:nameOffset + 64]
        t.driverName = nameBytes.decode('utf-16le', errors='ignore').split('\x00')[0]
        t.isOnTrack = True
        return t
    except Exception as e:
        print(f'Parse error: {e}', file=sys.stderr)
        return None

def main():
    print(f'LMU sidecar starting (poll {POLL_HZ}Hz)...', file=sys.stderr)
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(('127.0.0.1', 0))
    server.listen(1)
    port = server.getsockname()[1]
    print(json.dumps({'port': port}), flush=True)
    conn, _ = server.accept()
    print('Connected to sim-core', file=sys.stderr)
    buf = mmap.mmap(-1, TELEMETRY_SIZE, tagname=SHM_NAME)
    last = time.perf_counter()
    while True:
        now = time.perf_counter()
        elapsed = now - last
        if elapsed >= 1.0 / POLL_HZ:
            last = now
            try:
                telemetry = parse_lmu_telemetry(bytes(buf))
                if telemetry:
                    payload = json.dumps(asdict(telemetry)) + '\n'
                    conn.sendall(payload.encode('utf-8'))
            except Exception as e:
                print(f'Error: {e}', file=sys.stderr)
        time.sleep(0.001)

if __name__ == '__main__':
    main()
