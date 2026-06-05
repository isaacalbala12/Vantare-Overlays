import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusIndicator } from '../../shared/components/StatusIndicator';
import { useAppStore } from '../../shared/stores/app-store';
import { useSettingsStore } from '../../shared/stores/settings-store';
import { useProfileStore } from '../../shared/stores/profile-store';
import { useSimState } from '@vantare/ui-core';

export default function DashboardPage() {
  const { connected: simConnected, simName } = useSimState();
  const { demoMode, setDemoMode } = useAppStore();
  const settings = useSettingsStore((s) => s.settings);
  const activeProfile = useProfileStore((s) => s.activeProfile);
  const [themeName, setThemeName] = useState('Default');

  useEffect(() => {
    window.vantare
      .getActiveTheme()
      .then((theme) => {
        if (theme?.name) setThemeName(theme.name);
      })
      .catch(() => {
        setThemeName('Default');
      });
  }, []);

  const simStatus = simConnected ? 'connected' : 'disconnected';

  return (
    <div className="p-6 space-y-6">
      {/* Section title */}
      <h1 className="text-lg font-semibold text-white/80">Dashboard</h1>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sim Status */}
        <div
          data-testid="dashboard-sim-status"
          className="glass-panel p-4 space-y-2"
        >
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wide">
            Sim Status
          </h2>
          <div className="flex items-center gap-2">
            <StatusIndicator status={simStatus} />
            <span className="text-sm text-white/70">
              {simConnected && simName
                ? simName
                : 'No sim detected'}
            </span>
          </div>
        </div>

        {/* Quick Settings */}
        <div
          data-testid="dashboard-quick-settings"
          className="glass-panel p-4 space-y-2"
        >
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wide">
            Quick Settings
          </h2>
          <div className="space-y-3">
            {/* Demo Mode Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Demo Mode</span>
              <button
                data-testid="demo-mode-toggle"
                onClick={() => setDemoMode(!demoMode)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  demoMode ? 'bg-blue-600' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    demoMode ? 'translate-x-[18px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>

            {/* HTTP Server Port */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">HTTP Server Port</span>
              <span className="text-sm text-white/90 font-mono">
                {settings?.httpServerPort ?? '—'}
              </span>
            </div>

            {/* Overlay Visibility Key */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">
                Overlay Visibility Key
              </span>
              <span className="text-sm text-white/90 font-mono">
                {settings?.overlayVisibilityKey ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Active Profile */}
        <div
          data-testid="dashboard-active-profile"
          className="glass-panel p-4 space-y-2"
        >
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wide">
            Active Profile
          </h2>
          <p className="text-sm text-white/90">
            {activeProfile?.name ?? 'No profile selected'}
          </p>
          {activeProfile && (
            <Link
              to="/profiles"
              className="inline-block text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Manage
            </Link>
          )}
        </div>

        {/* Active Theme */}
        <div
          data-testid="dashboard-active-theme"
          className="glass-panel p-4 space-y-2"
        >
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wide">
            Active Theme
          </h2>
          <p className="text-sm text-white/90">{themeName}</p>
          <p className="text-xs text-white/40">Read-only</p>
        </div>
      </div>
    </div>
  );
}
