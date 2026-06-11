import { useEffect, useRef, useState, useCallback } from "react";
import { Events } from "@wailsio/runtime";
import type {
  ProfileConfig,
  LayoutOrigin,
  DisplayMode,
  WidgetConfig,
  Rect,
} from "../lib/profile";
import { toWindowLocal } from "../lib/profile";
import { WidgetHost } from "./WidgetHost";
import { DeltaWidget } from "./widgets/DeltaWidget";
import { RelativeWidget } from "./widgets/RelativeWidget";
import { StandingsWidget } from "./widgets/StandingsWidget";
import type { ComponentType } from "react";

// Widget registry — maps widget type to component
type WidgetProps = { editMode: boolean; props?: Record<string, unknown> };
const WIDGETS: Record<string, ComponentType<WidgetProps>> = {
  delta: DeltaWidget,
  relative: RelativeWidget,
  standings: StandingsWidget,
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function emitLayoutSave(widgets: WidgetConfig[]) {
  try {
    Events.Emit("layout:save", { widgets });
  } catch {
    // @ts-expect-error Wails runtime binding
    window.go?.ProfileService?.SaveLayout?.(widgets);
  }
}

function saveLayout(widgets: WidgetConfig[], immediate = false) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (immediate) {
    emitLayoutSave(widgets);
    return;
  }
  saveTimer = setTimeout(() => emitLayoutSave(widgets), 300);
}

export function CompositeApp() {
  const [profile, setProfile] = useState<ProfileConfig | null>(null);
  const [layoutOrigin, setLayoutOrigin] = useState<LayoutOrigin>({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Ctrl+S save in edit mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (editMode && widgets.length > 0) {
          saveLayout(widgets, true);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editMode, widgets]);

  useEffect(() => {
    const unsub = Events.On("profile:loaded", (event: { data: unknown }) => {
      try {
        const data = event.data as {
          profile: ProfileConfig;
          layoutOrigin: LayoutOrigin;
          windowMode: DisplayMode;
        };
        setProfile(data.profile);
        setLayoutOrigin(data.layoutOrigin);
        setEditMode(data.windowMode === "edit");
        setWidgets(data.profile.widgets.filter((w) => w.enabled));
      } catch (err) {
        console.error("profile:loaded parse failed", err);
      }
    });

    return () => {
      unsub?.();
    };
  }, []);

  const handleDragEnd = useCallback(
    (id: string, newPos: Rect) => {
      setWidgets((prev) => {
        const updated = prev.map((w) =>
          w.id === id
            ? { ...w, position: { x: newPos.x + layoutOrigin.x, y: newPos.y + layoutOrigin.y, w: newPos.w, h: newPos.h } }
            : w,
        );
        saveLayout(updated);
        return updated;
      });
    },
    [layoutOrigin],
  );

  if (!profile) {
    return (
      <div className="flex items-center justify-center w-full h-full text-white/40 text-sm font-mono">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {widgets.map((w) => {
        const Component = WIDGETS[w.type];
        if (!Component) {
          console.warn(`unknown widget type: ${w.type}`);
          return null;
        }
        const localPos = toWindowLocal(w.position, layoutOrigin);
        return (
          <WidgetHost
            key={w.id}
            id={w.id}
            position={localPos}
            editMode={editMode}
            onDragEnd={handleDragEnd}
          >
            <Component editMode={editMode} props={w.props} />
          </WidgetHost>
        );
      })}
    </div>
  );
}
