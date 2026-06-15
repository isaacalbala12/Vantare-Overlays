import type { TelemetryRefState } from "../../lib/telemetry-ref";

export function getMockTelemetry(): TelemetryRefState {
  return {
    seq: 1,
    connected: true,
    speed: 245,
    gear: 4,
    rpm: 8750,
    fuel: 68,
    deltaBest: -0.150,
    trackName: "Circuit de Barcelona",
    throttle: 78,
    brake: 12,
    clutch: 0,
    vehicles: [
      { id: 0, driverName: "ALPINE", driverNumber: "36", place: 1, isPlayer: false, inPits: false, timeBehindLeader: 0, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#0055A4", tireCompound: "M", fastestLap: false },
      { id: 1, driverName: "PORSCHE PENSKE", driverNumber: "5", place: 2, isPlayer: false, inPits: false, timeBehindLeader: 1.43, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#FFFFFF", tireCompound: "M", fastestLap: false },
      { id: 2, driverName: "FERRARI AF", driverNumber: "51", place: 3, isPlayer: false, inPits: false, timeBehindLeader: 2.152, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#E32636", tireCompound: "S", fastestLap: true },
      { id: 3, driverName: "CADILLAC RACING", driverNumber: "2", place: 4, isPlayer: false, inPits: false, timeBehindLeader: 3.88, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#F2A900", tireCompound: "M", fastestLap: false },
      { id: 4, driverName: "TOYOTA GAZOO", driverNumber: "8", place: 5, isPlayer: true, inPits: false, timeBehindLeader: 4.55, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#FFFFFF", tireCompound: "M", fastestLap: false },
      { id: 5, driverName: "PEUGEOT", driverNumber: "94", place: 6, isPlayer: false, inPits: false, timeBehindLeader: 5.55, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#00A3E0", tireCompound: "S", fastestLap: false },
      { id: 6, driverName: "AF CORSE", driverNumber: "83", place: 7, isPlayer: false, inPits: false, timeBehindLeader: 6.12, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#FFD700", tireCompound: "H", fastestLap: false },
      { id: 7, driverName: "HERTZ TEAM JOTA", driverNumber: "12", place: 8, isPlayer: false, inPits: false, timeBehindLeader: 7.4, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#C9B074", tireCompound: "M", fastestLap: false },
      { id: 8, driverName: "BMW M TEAM", driverNumber: "20", place: 9, isPlayer: false, inPits: false, timeBehindLeader: 8.9, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#000000", tireCompound: "M", fastestLap: false },
      { id: 9, driverName: "LAMBORGHINI", driverNumber: "63", place: 10, isPlayer: false, inPits: true, timeBehindLeader: 9.25, totalLaps: 33, vehicleClass: "HYPERCAR", teamBrandColor: "#78B833", tireCompound: "", fastestLap: false },
      { id: 10, driverName: "ISOTTA FRASCHINI", driverNumber: "11", place: 11, isPlayer: false, inPits: false, timeBehindLeader: 11.1, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#FF0000", tireCompound: "H", fastestLap: false },
      { id: 11, driverName: "PROTON COMP", driverNumber: "99", place: 12, isPlayer: false, inPits: false, timeBehindLeader: 12.45, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#FFFFFF", tireCompound: "M", fastestLap: false },
    ],
  };
}
