# Widgets Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the widgets/preview tab into a full-height 3-pane layout, featuring an updated sidebar widget list, accordion-style settings inspector, and centered canvas preview, all matching the Vantare V5 style guidelines.

**Architecture:** We will adjust the main viewport container of the preview page to have a fixed height with scrollable panels inside. We'll add filter tabs and a search query to the left column (`WidgetList.tsx`), group the inspector fields (`PreviewInspector.tsx`) into collapsible sections, and center-align the canvas with a control toolbar.

**Tech Stack:** React 19, Tailwind CSS v4, Vitest, Wails events.

---

### Task 1: Refactor Left Column Sidebar (`WidgetList.tsx`)

**Files:**
- Modify: `vantare-v2/frontend/src/hub/preview/WidgetList.tsx`
- Test: `vantare-v2/frontend/src/hub/preview/WidgetList.test.tsx`

- [ ] **Step 1: Update code structure to support search and tabs filters**

Modify `vantare-v2/frontend/src/hub/preview/WidgetList.tsx` to add a search input and tab filter selectors, keeping existing functions and parameters.

```tsx
import { useRef, useState, useMemo } from "react";
import type { WidgetConfig } from "../../lib/profile";
import { getWidgetStyle } from "../../lib/profile";
import { getStylesForType } from "../state/style-catalog";

type WidgetListProps = {
  widgets: WidgetConfig[];
  selectedWidgetId: string | null;
  onSelectWidget: (id: string) => void;
  onAddWidget?: (type: string) => void;
};

const WIDGET_TYPES = ["delta", "relative", "standings", "telemetry", "telemetry-vertical", "pedals"];

// Map widget types to specific icon SVG paths
function getWidgetIcon(type: string) {
  switch (type) {
    case "delta":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "relative":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "standings":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      );
    case "pedals":
    case "telemetry":
    case "telemetry-vertical":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
}

export function WidgetList({ widgets, selectedWidgetId, onSelectWidget, onAddWidget }: WidgetListProps) {
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const selectRef = useRef<HTMLSelectElement>(null);

  function handleAdd() {
    const type = selectRef.current?.value;
    if (!type) return;
    onAddWidget?.(type);
    setAdding(false);
  }

  const filteredWidgets = useMemo(() => {
    return widgets.filter((widget) => {
      const matchesFilter = filter === "all" ? true : widget.enabled;
      const matchesSearch = widget.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (widget.name && widget.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [widgets, filter, searchQuery]);

  return (
    <aside className="glass-panel rounded-xl p-4 h-full flex flex-col overflow-hidden">
      {/* Header section with counts */}
      <div className="mb-3 flex items-center justify-between flex-shrink-0">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">Widgets</h2>
        <span className="font-mono text-[10px] text-vantare-textDim">{widgets.length}</span>
      </div>

      {/* Tabs Filter */}
      <div className="p-1 mb-3 flex items-center gap-1 bg-black/40 rounded-lg flex-shrink-0 border border-white/5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`flex-1 py-1 text-[10px] font-bold uppercase rounded tracking-wide transition-colors ${
            filter === "all"
              ? "bg-vantare-red-900/30 text-white border border-vantare-red-500/30 shadow-inner"
              : "text-vantare-textMuted hover:text-white"
          }`}
        >
          TODOS
        </button>
        <button
          type="button"
          onClick={() => setFilter("active")}
          className={`flex-1 py-1 text-[10px] font-bold uppercase rounded tracking-wide transition-colors ${
            filter === "active"
              ? "bg-vantare-red-900/30 text-white border border-vantare-red-500/30 shadow-inner"
              : "text-vantare-textMuted hover:text-white"
          }`}
        >
          ACTIVOS
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-3 flex-shrink-0">
        <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-vantare-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder-vantare-textDim focus:outline-none focus:border-vantare-red-500 transition-colors"
        />
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
        {filteredWidgets.map((widget) => {
          const currentStyle = getWidgetStyle(widget);
          const styles = getStylesForType(widget.type);
          const styleName = styles.find((s) => s.id === currentStyle)?.name ?? currentStyle;
          const isSelected = selectedWidgetId === widget.id;
          return (
            <button
              key={widget.id}
              type="button"
              data-testid={`widget-list-${widget.id}`}
              onClick={() => onSelectWidget(widget.id)}
              className={`rounded-lg border-l-2 py-2.5 px-3 text-left transition-all flex flex-col ${
                isSelected
                  ? "border-l-vantare-red-500 bg-gradient-to-r from-vantare-red-500/15 to-transparent border-t border-b border-r border-white/5 shadow-inner"
                  : "border-l-transparent border-t border-b border-r border-white/5 bg-black/25 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className={isSelected ? "text-vantare-red-400" : "text-vantare-textMuted"}>
                    {getWidgetIcon(widget.type)}
                  </span>
                  <span className={`font-mono text-xs font-bold ${isSelected ? "text-white" : "text-vantare-text"}`}>
                    {widget.id}
                  </span>
                </div>
                <span className={`text-[10px] font-bold ${widget.enabled ? "text-emerald-400" : "text-vantare-textDim"}`}>
                  {widget.enabled ? "Visible" : "Oculto"}
                </span>
              </div>
              <span className="mt-1 block font-mono text-[10px] text-vantare-textDim pl-6">
                {widget.type} · {styleName} · {widget.position.w}×{widget.position.h}
              </span>
            </button>
          );
        })}
        {filteredWidgets.length === 0 && (
          <div className="text-center py-4 text-xs text-vantare-textDim font-mono">
            Sin widgets
          </div>
        )}
      </div>

      {adding ? (
        <div className="mt-3 flex items-center gap-2 flex-shrink-0 pt-2 border-t border-white/5">
          <select
            ref={selectRef}
            defaultValue="delta"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs"
          >
            {WIDGET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-vantare-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-vantare-red-600 shadow"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-vantare-textMuted hover:text-white"
          >
            X
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 w-full rounded-lg border border-dashed border-white/10 py-2 text-xs text-vantare-textMuted hover:border-white/20 hover:text-white transition-colors flex-shrink-0"
        >
          + Añadir widget
        </button>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Run test suite to verify no regressions**

Run: `pnpm --dir vantare-v2/frontend test`
Expected: PASS

- [ ] **Step 3: Commit changes**

```bash
git add vantare-v2/frontend/src/hub/preview/WidgetList.tsx
git commit -m "feat(hub): redesign widget list sidebar with icons, filters and search"
```

---

### Task 2: Refactor Inspector Panel with Accordions (`PreviewInspector.tsx`)

**Files:**
- Modify: `vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx`
- Test: `vantare-v2/frontend/src/hub/preview/PreviewInspector.test.tsx`

- [ ] **Step 1: Write accordion wrapper and structure accordion layout**

Rewrite `vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx` using collapsable sections, ensuring name/hz inputs and action buttons remain intact.

```tsx
import { useState } from "react";
import type { ProfileConfig, WidgetConfig, WidgetAppearance, VisibleWhen } from "../../lib/profile";
import {
  setWidgetEnabled,
  setWidgetStyle,
  updateWidgetAppearance,
  updateWidgetPosition,
  setWidgetVisibleWhen,
} from "./profile-editor";
import { StyleSelector } from "./StyleSelector";
import { AppearanceEditor } from "./AppearanceEditor";
import { getDefaultAppearance } from "../state/style-catalog";
import { getWidgetStyle } from "../../lib/profile";

type PreviewInspectorProps = {
  profile: ProfileConfig;
  widget: WidgetConfig | null;
  onChangeProfile: (profile: ProfileConfig) => void;
  onDuplicate?: (widget: WidgetConfig) => void;
  onReset?: (widget: WidgetConfig) => void;
  onDelete?: (id: string) => void;
  disabled?: boolean;
};

export function PreviewInspector({ profile, widget, onChangeProfile, onDuplicate, onReset, onDelete, disabled = false }: PreviewInspectorProps) {
  const [openSections, setOpenSections] = useState({
    overview: true,
    position: true,
    appearance: true,
    visibility: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!widget) {
    return (
      <aside className="glass-panel rounded-xl p-5 text-sm text-vantare-textMuted h-full flex items-center justify-center font-mono">
        Selecciona un widget en el preview.
      </aside>
    );
  }

  const selectedWidget = widget;
  const appearance: WidgetAppearance = selectedWidget.props?.appearance ?? {};
  const currentStyle = getWidgetStyle(widget);
  const visibleWhen: VisibleWhen | undefined = selectedWidget.visibleWhen;
  const widgetName = selectedWidget.name || selectedWidget.id;

  function updateWidget(next: Partial<WidgetConfig>) {
    onChangeProfile({
      ...profile,
      widgets: profile.widgets.map((w) => (w.id === selectedWidget.id ? { ...w, ...next } : w)),
    });
  }

  function updateVisibleWhen(next: VisibleWhen) {
    onChangeProfile(setWidgetVisibleWhen(profile, selectedWidget.id, next));
  }

  function clearVisibleWhen() {
    onChangeProfile(setWidgetVisibleWhen(profile, selectedWidget.id, undefined));
  }

  function updateRect(next: Partial<typeof selectedWidget.position>) {
    onChangeProfile(updateWidgetPosition(profile, selectedWidget.id, { ...selectedWidget.position, ...next }));
  }

  function updateAppearance(next: WidgetAppearance) {
    onChangeProfile(updateWidgetAppearance(profile, selectedWidget.id, next));
  }

  function numericProps(
    value: number,
    onChange: (v: number) => void,
  ) {
    return {
      value,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value)),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 8;
          const dir = event.key === "ArrowUp" ? 1 : -1;
          onChange(Math.round((value + dir * step) / 8) * 8);
        }
      },
    };
  }

  return (
    <aside className="glass-panel rounded-xl p-0 h-full flex flex-col overflow-hidden">
      
      {/* Top Title Pane */}
      <div className="p-5 border-b border-white/5 bg-vantare-surface flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[10px] font-semibold text-vantare-textMuted tracking-wider uppercase">Controles del Widget</h2>
          <span className="text-[9px] font-mono text-white/40">{widget.type}</span>
        </div>
        <div className="mt-2 flex gap-3">
          <div className="w-12 h-10 bg-black/50 border border-white/10 rounded flex items-center justify-center">
            <svg className="w-5 h-5 text-vantare-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white leading-tight">{widget.id}</h3>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${widget.enabled ? "text-emerald-400 bg-emerald-500/10" : "text-vantare-textDim bg-white/5"}`}>
              {widget.enabled ? "ACTIVO" : "INACTIVO"}
            </span>
          </div>
        </div>
      </div>

      {/* Accordions Content Area */}
      <div className="flex-grow overflow-y-auto pb-4">
        
        {/* Accordion 1: Overview */}
        <div 
          onClick={() => toggleSection("overview")}
          className="border-b border-white/5 bg-white/2 hover:bg-white/4 px-5 py-3 cursor-pointer flex justify-between items-center select-none"
        >
          <span className="text-xs font-semibold text-vantare-text tracking-wide">VISTA GENERAL</span>
          <svg className={`w-4 h-4 text-vantare-textDim transform transition-transform ${openSections.overview ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {openSections.overview && (
          <div className="px-5 py-4 bg-vantare-panel space-y-4">
            <div>
              <label className="block text-xs text-vantare-textMuted">
                Nombre
                <input
                  className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-white disabled:opacity-40 text-sm focus:outline-none focus:border-vantare-red-500/50"
                  value={widgetName}
                  disabled={disabled}
                  onChange={(e) => updateWidget({ name: e.target.value })}
                />
              </label>
            </div>
            <div>
              <label className="block text-xs text-vantare-textMuted">
                Actualización (Hz)
                <input
                  className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-white disabled:opacity-40 text-sm focus:outline-none focus:border-vantare-red-500/50"
                  type="number"
                  min={1}
                  max={120}
                  value={widget.updateHz ?? 60}
                  disabled={disabled}
                  onChange={(e) => updateWidget({ updateHz: Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-white select-none cursor-pointer">
              <input
                type="checkbox"
                checked={widget.enabled}
                disabled={disabled}
                onChange={(event) => onChangeProfile(setWidgetEnabled(profile, widget.id, event.target.checked))}
                className="rounded text-vantare-red-500"
              />
              Visible
            </label>
          </div>
        )}

        {/* Accordion 2: Position & Size */}
        <div 
          onClick={() => toggleSection("position")}
          className="border-b border-white/5 bg-white/2 hover:bg-white/4 px-5 py-3 cursor-pointer flex justify-between items-center select-none"
        >
          <span className="text-xs font-semibold text-vantare-text tracking-wide">POSICIÓN Y TAMAÑO</span>
          <svg className={`w-4 h-4 text-vantare-textDim transform transition-transform ${openSections.position ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {openSections.position && (
          <div className="px-5 py-4 bg-vantare-panel space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-vantare-textMuted">
                X (px)
                <input className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white disabled:opacity-40" type="number" step={8} disabled={disabled} {...numericProps(widget.position.x, (x) => updateRect({ x }))} />
              </label>
              <label className="text-xs text-vantare-textMuted">
                Y (px)
                <input className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white disabled:opacity-40" type="number" step={8} disabled={disabled} {...numericProps(widget.position.y, (y) => updateRect({ y }))} />
              </label>
              <label className="text-xs text-vantare-textMuted">
                Ancho (W)
                <input className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white disabled:opacity-40" type="number" step={8} disabled={disabled} {...numericProps(widget.position.w, (w) => updateRect({ w }))} />
              </label>
              <label className="text-xs text-vantare-textMuted">
                Alto (H)
                <input className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white disabled:opacity-40" type="number" step={8} disabled={disabled} {...numericProps(widget.position.h, (h) => updateRect({ h }))} />
              </label>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDuplicate?.(widget)}
                className="flex-1 rounded-lg border border-white/10 bg-black/25 py-2 text-xs text-white hover:border-white/20 disabled:opacity-40 transition-colors"
              >
                Duplicar
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onReset?.(widget)}
                className="flex-1 rounded-lg border border-white/10 bg-black/25 py-2 text-xs text-white hover:border-white/20 disabled:opacity-40 transition-colors"
              >
                Reset posicion
              </button>
            </div>
          </div>
        )}

        {/* Accordion 3: Appearance */}
        <div 
          onClick={() => toggleSection("appearance")}
          className="border-b border-white/5 bg-white/2 hover:bg-white/4 px-5 py-3 cursor-pointer flex justify-between items-center select-none"
        >
          <span className="text-xs font-semibold text-vantare-text tracking-wide">APARIENCIA</span>
          <svg className={`w-4 h-4 text-vantare-textDim transform transition-transform ${openSections.appearance ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {openSections.appearance && (
          <div className="px-5 py-4 bg-vantare-panel space-y-4">
            <StyleSelector
              widgetType={widget.type}
              currentStyle={currentStyle}
              disabled={disabled}
              onStyleChange={(styleId) => {
                const withStyle = setWidgetStyle(profile, widget.id, styleId);
                const defaults = getDefaultAppearance(widget.type, styleId);
                onChangeProfile(updateWidgetAppearance(withStyle, widget.id, defaults));
              }}
            />
            <AppearanceEditor
              widgetType={widget.type}
              appearance={appearance}
              disabled={disabled}
              onChange={(next) => onChangeProfile(updateWidgetAppearance(profile, widget.id, next))}
            />
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-vantare-textMuted">Opacidad</label>
                <span className="text-[10px] font-mono text-white/60">{Math.round((appearance.opacity ?? 1) * 100)}%</span>
              </div>
              <input
                className="w-full disabled:opacity-40 accent-vantare-red-500 h-1 rounded bg-white/10 appearance-none cursor-pointer"
                type="range"
                disabled={disabled}
                min="0.2"
                max="1"
                step="0.05"
                value={appearance.opacity ?? 1}
                onChange={(event) => updateAppearance({ opacity: Number(event.target.value) })}
              />
            </div>
          </div>
        )}

        {/* Accordion 4: Visibility */}
        <div 
          onClick={() => toggleSection("visibility")}
          className="border-b border-white/5 bg-white/2 hover:bg-white/4 px-5 py-3 cursor-pointer flex justify-between items-center select-none"
        >
          <span className="text-xs font-semibold text-vantare-text tracking-wide">VISIBILIDAD CONDICIONAL</span>
          <svg className={`w-4 h-4 text-vantare-textDim transform transition-transform ${openSections.visibility ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {openSections.visibility && (
          <div className="px-5 py-4 bg-vantare-panel space-y-4">
            <label className="flex flex-col gap-1 text-xs text-vantare-textMuted">
              Visible en boxes
              <select
                className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white disabled:opacity-40 text-sm focus:outline-none focus:border-vantare-red-500"
                disabled={disabled}
                value={visibleWhen?.inPit === undefined ? "" : visibleWhen.inPit ? "true" : "false"}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    const { inPit: _, ...rest } = visibleWhen ?? {};
                    if (Object.keys(rest).length > 0) {
                      updateVisibleWhen(rest);
                    } else {
                      clearVisibleWhen();
                    }
                  } else {
                    updateVisibleWhen({ ...visibleWhen, inPit: v === "true" });
                  }
                }}
              >
                <option value="">Sin regla</option>
                <option value="true">Solo en boxes</option>
                <option value="false">Solo fuera de boxes</option>
              </select>
            </label>

            <fieldset className="text-xs text-vantare-textMuted">
              <legend className="mb-2">Tipo de sesión</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["practice", "qual", "race", "warmup"] as const).map((st) => {
                  const current = visibleWhen?.sessionType ?? [];
                  const checked = current.includes(st);
                  return (
                    <label key={st} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? current.filter((s) => s !== st)
                            : [...current, st];
                          if (next.length === 0) {
                            const { sessionType: _, ...rest } = visibleWhen ?? {};
                            if (Object.keys(rest).length > 0) {
                              updateVisibleWhen(rest);
                            } else {
                              clearVisibleWhen();
                            }
                          } else {
                            updateVisibleWhen({ ...visibleWhen, sessionType: next });
                          }
                        }}
                      />
                      <span>
                        {st === "practice" ? "Práctica" :
                         st === "qual" ? "Clasif" :
                         st === "race" ? "Carrera" : "Warm-up"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

      </div>

      {/* Delete button footer */}
      <div className="p-4 border-t border-white/5 bg-vantare-surface flex-shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (window.confirm("¿Eliminar este widget?")) onDelete?.(widget.id);
          }}
          className="w-full rounded-lg border border-vantare-red-500/30 bg-vantare-red-950/20 px-3 py-2 text-xs font-bold text-vantare-red-400 hover:bg-vantare-red-950/40 disabled:opacity-40 transition-colors"
        >
          Eliminar
        </button>
      </div>

    </aside>
  );
}
```

- [ ] **Step 2: Run test suite to verify no regressions**

Run: `pnpm --dir vantare-v2/frontend test`
Expected: PASS

- [ ] **Step 3: Commit changes**

```bash
git add vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx
git commit -m "feat(hub): style inspector panel with collapsible accordion sections"
```

---

### Task 3: Restructure Viewport Layout (`PreviewPage.tsx` & `PreviewCanvas.tsx`)

**Files:**
- Modify: `vantare-v2/frontend/src/hub/pages/PreviewPage.tsx`
- Modify: `vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx`
- Test: `vantare-v2/frontend/src/hub/pages/PreviewPage.test.tsx`
- Test: `vantare-v2/frontend/src/hub/preview/PreviewCanvas.test.tsx`

- [ ] **Step 1: Set Full-Height Layout on page wrapper**

Modify the outermost container class of `PreviewPage.tsx` to handle calc-height and flex alignment.

```tsx
// Around line 268 of PreviewPage.tsx:
  return (
    <div className="flex flex-col px-6 py-4 2xl:h-[calc(100vh-3.5rem)] 2xl:overflow-hidden">
      <div className="mb-4 flex flex-col gap-4 flex-shrink-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl text-white mb-1">Preview</h1>
            <p className="text-vantare-textMuted text-xs">
              Elige un perfil, ajusta widgets, guarda y arranca el overlay.
            </p>
          </div>
          {/* Mueve el botón de OBS URL (líneas 278-290) hacia abajo, déjalo aquí solo para Guardar/Start/Demo */}
          <div className="flex items-center gap-3">
             {/* ... otros botones (Guardar, Detener, Demo) se mantienen ... */}
          </div>
        </div>
        {/* ... */}
      </div>

      {profile && (
        <div className="flex-grow grid grid-cols-1 2xl:grid-cols-[220px_1fr_320px] gap-6 2xl:min-h-0 pb-2">
          <WidgetList
            widgets={profile.widgets}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={setSelectedWidgetId}
            onAddWidget={addWidget}
          />
          <div className="flex flex-col gap-4 h-full 2xl:min-h-0">
            <PreviewCanvas
              profile={profile}
              selectedWidgetId={selectedWidgetId}
              onSelectWidget={setSelectedWidgetId}
              onChangeProfile={updateDraft}
              disabled={overlayRunning}
            />
            {selectedEntry?.displayMode === "streaming" && (
              <div className="h-16 flex-shrink-0 flex items-center justify-center gap-4 bg-vantare-surface border border-white/5 rounded-xl px-4 shadow-lg">
                <button
                  type="button"
                  onClick={copyObsUrl}
                  className="btn-primary px-5 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2"
                  title={obsUrl}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {copiedUrl ? "¡URL Copiada!" : "Copiar URL (Para OBS)"}
                </button>
              </div>
            )}
          </div>
          <PreviewInspector
            profile={profile}
            widget={selectedWidget}
            onChangeProfile={updateDraft}
            onDuplicate={duplicateWidget}
            onReset={resetWidget}
            onDelete={deleteWidget}
            disabled={overlayRunning}
          />
        </div>
      )}
```

- [ ] **Step 3: Update PreviewCanvas styling**

Modify `vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx` (around line 175) to configure the canvas wrapper to expand to fill parent height, display track design background, and integrate the bottom toolbar.

```tsx
  return (
    <div ref={shellRef} className="glass-panel rounded-xl p-4 overflow-hidden h-full flex flex-col relative justify-between" style={{ backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
      {/* Top canvas info bar */}
      <div className="flex justify-between items-center w-full mb-3 flex-shrink-0 z-10">
        <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded text-[10px] font-mono text-white/80 border border-white/10">
          Resolución: {LOGICAL_WIDTH}×{LOGICAL_HEIGHT}
        </div>
        <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded text-[10px] text-white/80 border border-white/10">
          Vista Previa Interactiva
        </div>
      </div>

      {/* Main interactive area */}
      <div className="flex-1 min-h-0 flex items-center justify-center relative">
        <div
          ref={canvasRef}
          onKeyDown={onKeyDown}
          tabIndex={0}
          className="relative bg-black/40 border border-white/5 select-none focus:outline-none focus:border-vantare-red-500/30 transition-colors"
          style={{
            width: `${LOGICAL_WIDTH * scale}px`,
            height: `${LOGICAL_HEIGHT * scale}px`,
          }}
        >
          {profile.widgets.map((widget) => {
            const isSelected = widget.id === selectedWidgetId;
            return (
              <PreviewWidgetFrame
                key={widget.id}
                widget={widget}
                scale={scale}
                isSelected={isSelected}
                onSelect={(event) => {
                  event.stopPropagation();
                  onSelectWidget(widget.id);
                }}
                onMouseDown={(event) => onMouseDown(event, widget.id)}
                onChangePosition={handleChangePosition}
                disabled={disabled}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom control toolbar */}
      <div className="flex items-center justify-center gap-3 mt-3 flex-shrink-0 z-10 pt-2 border-t border-white/5">
        <div className="text-[10px] text-vantare-textMuted font-mono bg-black/30 border border-white/5 px-3 py-1 rounded">
          Arrastra para mover · Flechas para ajustar · Shift+Flecha para redimensionar
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 4: Run test suite to verify no regressions**

Run: `pnpm --dir vantare-v2/frontend test`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add vantare-v2/frontend/src/hub/pages/PreviewPage.tsx vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx
git commit -m "feat(hub): redesign preview layout with height limits, toolbar, and track background"
```
