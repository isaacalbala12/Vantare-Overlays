import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Events } from '@wailsio/runtime';
import { ScrollableMain } from './components/ScrollableMain';
import { Topbar } from './components/Topbar';
import { UpdateBanner } from './components/UpdateBanner';
import { DashboardPage } from './pages/DashboardPage';
import { OverlaysStudioPage } from './pages/OverlaysStudioPage';
import { SettingsPage } from './pages/SettingsPage';
import { EngineerPage } from './pages/EngineerPage';
import { LicenseProvider, useLicense } from '../lib/license';
import { LoginScreen } from './auth/LoginScreen';
import { PaywallScreen } from './auth/PaywallScreen';
import { LicenseBanner } from './auth/LicenseBanner';
import { getSession } from '../lib/supabase-auth';

type Section = 'dashboard' | 'profiles' | 'telemetry' | 'setup' | 'engineer';

type SourceStatus = {
  kind: string;
  name: string;
  live: boolean;
  available: boolean;
};

// LicenseGate is the production blocker for the beta pública: no se permite
// uso normal de la app sin sesión válida. Google OAuth es el acceso mínimo
// recomendado y está promovido a botón principal en LoginScreen.
function LicenseGate({ children }: { children: ReactNode }) {
  const { result, loading } = useLicense();
  if (loading) {
    return (
      <div
        data-testid="license-loading"
        className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-vantare-textDim">
          Cargando licencia...
        </p>
      </div>
    );
  }
  if (!result || result.state === 'anonymous') {
    return (
      <LoginScreen
        onLoggedIn={(accessToken) => {
          if (accessToken) {
            Events.Emit('license:validate', { sessionToken: accessToken });
          } else {
            Events.Emit('license:validate', {});
          }
        }}
      />
    );
  }
  if (
    result.state === 'authenticated-no-entitlement' ||
    result.state === 'expired' ||
    result.state === 'device-limit'
  ) {
    return <PaywallScreen email={result.email} result={result} />;
  }
  return (
    <>
      <LicenseBanner />
      {children}
    </>
  );
}

// LicenseBridge reenvía el access_token de Supabase al servicio Go. Si no hay
// sesión (build sin env vars, mocks, offline), refresca el estado local sin
// bloquear la UI.
function LicenseBridge() {
  const { refresh } = useLicense();
  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((session) => {
        if (cancelled) return;
        if (session?.access_token) {
          Events.Emit('license:validate', {
            sessionToken: session.access_token,
          });
        } else {
          refresh();
        }
      })
      .catch(() => {
        if (!cancelled) refresh();
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);
  return null;
}

function HubShell() {
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

export function HubApp() {
  return (
    <LicenseProvider>
      <LicenseBridge />
      <LicenseGate>
        <HubShell />
      </LicenseGate>
    </LicenseProvider>
  );
}