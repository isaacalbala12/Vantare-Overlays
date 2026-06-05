import { useState, useEffect, useCallback } from 'react';
import {
  SettingsForm,
  StandingsConfigSchema,
  RelativeConfigSchema,
  DeltaBarConfigSchema,
  StreamAlertsConfigSchema,
} from '@vantare/ui-core';
import type { z } from 'zod';
import { useOverlayConfigStore } from '../../shared/stores/overlay-config-store';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type OverlayId = 'standings' | 'relative' | 'delta' | 'stream-alerts';

interface OverlayTab {
  id: OverlayId;
  label: string;
  schema: z.ZodType<any, any, any>;
}

// ──────────────────────────────────────────────
// Overlay tab definitions
// ──────────────────────────────────────────────

const overlayTabs: OverlayTab[] = [
  { id: 'standings', label: 'Standings', schema: StandingsConfigSchema as any },
  { id: 'relative', label: 'Relative', schema: RelativeConfigSchema as any },
  { id: 'delta', label: 'Delta Bar', schema: DeltaBarConfigSchema as any },
  { id: 'stream-alerts', label: 'Stream Alerts', schema: StreamAlertsConfigSchema as any },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function OverlaySettingsPage() {
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayId>('standings');
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const draftConfigs = useOverlayConfigStore((s) => s.draftConfigs);
  const loadOverlayConfig = useOverlayConfigStore((s) => s.loadOverlayConfig);
  const updateOverlayConfig = useOverlayConfigStore((s) => s.updateOverlayConfig);
  const saveOverlayConfig = useOverlayConfigStore((s) => s.saveOverlayConfig);
  const discardChanges = useOverlayConfigStore((s) => s.discardChanges);
  const saving = useOverlayConfigStore((s) => s.saving);

  // Load config when tab switches
  useEffect(() => {
    loadOverlayConfig(selectedOverlay);
  }, [selectedOverlay, loadOverlayConfig]);

  const handleSave = useCallback(async () => {
    await saveOverlayConfig(selectedOverlay);
    setConfirmation('Settings saved');
    setTimeout(() => setConfirmation(null), 2000);
  }, [selectedOverlay, saveOverlayConfig]);

  const handleDiscard = useCallback(async () => {
    await discardChanges(selectedOverlay);
  }, [selectedOverlay, discardChanges]);

  const currentTab = overlayTabs.find((t) => t.id === selectedOverlay)!;

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Nav tabs */}
      <nav data-testid="overlay-settings-nav" className="flex gap-1 mb-6 border-b border-white/10">
        {overlayTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedOverlay(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              selectedOverlay === tab.id
                ? 'bg-white/10 text-white border-b-2 border-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Settings form */}
      <div data-testid="overlay-settings-form" className="flex-1 overflow-auto">
        <SettingsForm
          schema={currentTab.schema as any}
          values={draftConfigs[selectedOverlay] ?? {}}
          onChange={(partial) => updateOverlayConfig(selectedOverlay, partial)}
          testId="settings"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
        <button
          onClick={handleSave}
          data-testid="settings-save"
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleDiscard}
          data-testid="settings-discard"
          className="rounded bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
        >
          Discard
        </button>
        {confirmation && (
          <span data-testid="settings-confirmation" className="text-sm text-green-400">
            {confirmation}
          </span>
        )}
      </div>
    </div>
  );
}
