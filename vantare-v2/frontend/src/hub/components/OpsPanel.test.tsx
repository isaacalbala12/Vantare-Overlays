import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OpsPanel } from "./OpsPanel";
import { isOpsMetrics, type OpsMetrics } from "../../lib/ops-metrics";

const metrics: OpsMetrics = {
  timestamp: "2026-06-12T10:00:00Z",
  app: {
    memoryMb: 42.4,
    cpuPercent: null,
    goroutines: 8,
  },
  source: {
    kind: "mock",
    name: "Mock telemetry",
    live: false,
    available: true,
  },
};

describe("OpsPanel", () => {
  it("renders metrics snapshot", () => {
    render(<OpsPanel metrics={metrics} />);

    expect(screen.getByText("Ops")).toBeTruthy();
    expect(screen.getByText("42.4 MB")).toBeTruthy();
    expect(screen.getByText("N/D")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("Mock telemetry")).toBeTruthy();
  });

  it("renders waiting state without metrics", () => {
    render(<OpsPanel metrics={null} />);

    expect(screen.getByText("Esperando métricas")).toBeTruthy();
  });

  it("validates metrics payload shape", () => {
    expect(isOpsMetrics(metrics)).toBe(true);
    expect(isOpsMetrics({ app: { memoryMb: "42" } })).toBe(false);
    expect(isOpsMetrics({ ...metrics, source: { name: 123 } })).toBe(false);
  });
});
