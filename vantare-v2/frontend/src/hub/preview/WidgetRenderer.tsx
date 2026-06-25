import type { ComponentType, CSSProperties } from "react";
import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import { enrichWidgetPropsWithVariant } from "../../lib/widget-variants";
import { DeltaWidget } from "../../overlay/widgets/DeltaWidget";
import { RelativeWidget } from "../../overlay/widgets/RelativeWidget";
import { StandingsWidget } from "../../overlay/widgets/StandingsWidget";
import { TelemetryWidget } from "../../overlay/widgets/TelemetryWidget";
import { TelemetryVerticalWidget } from "../../overlay/widgets/TelemetryVerticalWidget";
import { PedalsWidget } from "../../overlay/widgets/PedalsWidget";
import { EngineerNotificationsWidget } from "../../overlay/widgets/EngineerNotificationsWidget";
import type { WidgetTelemetryMode } from "../../overlay/widgets/use-widget-telemetry";
import type { MockSessionScenario } from "../../overlay/widgets/mock-telemetry";

type InnerWidgetProps = {
  editMode: boolean;
  telemetryMode?: WidgetTelemetryMode;
  mockSessionScenario?: MockSessionScenario;
  updateHz?: number;
  props?: Record<string, unknown>;
};

const WIDGETS: Record<string, ComponentType<InnerWidgetProps>> = {
  delta: DeltaWidget,
  relative: RelativeWidget,
  standings: StandingsWidget,
  telemetry: TelemetryWidget,
  "telemetry-vertical": TelemetryVerticalWidget,
  pedals: PedalsWidget,
  "engineer-notifications": EngineerNotificationsWidget,
};

export type WidgetTelemetryModeProp = WidgetTelemetryMode;

export type WidgetRendererProps = {
  profile?: ProfileConfig | null;
  widget: WidgetConfig;
  editMode?: boolean;
  telemetryMode?: WidgetTelemetryMode;
  mockSessionScenario?: MockSessionScenario;
  updateHz?: number;
  disabled?: boolean;
  fillHost?: boolean;
  className?: string;
  style?: CSSProperties;
  testId?: string;
};

export function WidgetRenderer({
  profile,
  widget,
  editMode = false,
  telemetryMode = "mock",
  mockSessionScenario,
  updateHz,
  disabled = false,
  fillHost = true,
  className = "",
  style,
  testId = "widget-renderer",
}: WidgetRendererProps) {
  const Component = WIDGETS[widget.type];
  const props = enrichWidgetPropsWithVariant(profile ?? undefined, widget);
  const renderedProps = { ...props, __previewFillHost: fillHost, __engineerTransport: "none" as const };

  return (
    <div
      data-testid={testId}
      className={`${fillHost ? "w-full" : ""} h-full ${disabled ? "pointer-events-none" : ""} ${className}`.trim()}
      style={{ width: fillHost ? undefined : "fit-content", ...(style ?? {}) }}
    >
      {Component ? (
        <Component
          editMode={editMode}
          telemetryMode={telemetryMode}
          mockSessionScenario={mockSessionScenario}
          updateHz={updateHz ?? widget.updateHz}
          props={renderedProps}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
          {widget.type}
        </div>
      )}
    </div>
  );
}
