import { useState, useEffect, useCallback } from 'react';
import { Events } from '@wailsio/runtime';
import { ScrollableMain } from './components/ScrollableMain';
import { Topbar } from './components/Topbar';
import { UpdateBanner } from './components/UpdateBanner';
import { DashboardPage } from './pages/DashboardPage';
import { OverlaysStudioPage } from './pages/OverlaysStudioPage';
import { SettingsPage } from './pages/SettingsPage';
import { EngineerPage } from './pages/EngineerPage';

type Section = 'dashboard' | 'profiles' | 'telemetry' | 'setup' | 'engineer';

type SourceStatus = {
  kind: string;
  name: string;
  live: boolean;
  available: boolean;
};

export function HubApp() {
  const [section, setSection] = useState<Section>('dashboard');
  const [version, setVersion] = useState<string | null>(null);
  const [sourceStatus, setSourceStatus] = useState<SourceStatus | null>(null);

  useEffect(() => {
    document.body.classList.add('hub');
    const unsub = Events.On('app:version', (event: { data: { version?: string } }) => {
      setVersion(event.data.version ?? null);
    });
    const unsubSource = Events.On('telemetry:source-status', (event: { data: SourceStatus }) => {
      setSourceStatus(event.data);
    });
    Events.Emit('app:version:get');
    Events.Emit('telemetry:source-status:get');
    return () => {
      document.body.classList.remove('hub');
      unsub?.();
      unsubSource?.();
    };
  }, []);

  const handleNavigate = useCallback((id: string) => {
    setSection(id as Section);
  }, []);

  return (
    <div className="h-screen premium-bg relative flex flex-col">
      <Topbar activeSection={section} onNavigate={handleNavigate} version={version} sourceStatus={sourceStatus} />
      <UpdateBanner />
      <ScrollableMain className="flex-1 pt-0">
        {section === "dashboard" && <DashboardPage />}
        {section === "profiles" && <OverlaysStudioPage />}
        {section === "setup" && <SettingsPage />}
        {section === "engineer" && <EngineerPage />}
        {section === "telemetry" && (
          <div className="flex items-center justify-center h-[60vh] text-vantare-textMuted text-sm font-mono">
            Telemetría — próxima actualización
          </div>
        )}
      </ScrollableMain>
    </div>
  );
}
