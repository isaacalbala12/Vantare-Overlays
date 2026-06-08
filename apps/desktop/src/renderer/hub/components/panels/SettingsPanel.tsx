import { useSettingsStore } from '../../../shared/stores/settings-store';
import { useAppStore } from '../../../shared/stores/app-store';

export default function SettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const { demoMode, setDemoMode } = useAppStore();

  return (
    <div className="space-y-3">
      {/* Demo Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">Demo Mode</span>
        <button
          onClick={(e) => { e.stopPropagation(); setDemoMode(!demoMode); }}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            demoMode ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-elevated)]'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[var(--color-text)] transition-transform ${
              demoMode ? 'translate-x-[18px]' : 'translate-x-[2px]'
            }`}
          />
        </button>
      </div>

      {/* HTTP Port */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">HTTP Port</span>
        <span className="text-xs font-mono text-[var(--color-text)]">
          {settings?.httpServerPort ?? '—'}
        </span>
      </div>

      {/* Overlay Key */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">Visibility Key</span>
        <span className="text-xs font-mono text-[var(--color-text)]">
          {settings?.overlayVisibilityKey ?? '—'}
        </span>
      </div>
    </div>
  );
}
