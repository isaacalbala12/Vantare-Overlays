import { useEffect, useState, useRef, useCallback } from 'react';
import DashboardPanel from '../components/DashboardPanel';
import CanvasParticles from '../components/CanvasParticles';
import SimStatusPanel from '../components/panels/SimStatusPanel';
import OverlaysPanel from '../components/panels/OverlaysPanel';
import ThemesPanel from '../components/panels/ThemesPanel';
import AccountPanel from '../components/panels/AccountPanel';
import SettingsPanel from '../components/panels/SettingsPanel';
import { useThemePreview } from '../hooks/useThemePreview';
import { useOverlayWindows } from '../hooks/useOverlayWindows';
import { useAccountStatus } from '../hooks/useAccountStatus';
import '../styles/dashboard.css';

// Panel config array for stagger animation
const PANELS = [
  { id: 'overlays', title: 'Overlays', to: '/overlays', testId: 'dashboard-panel-overlays', variant: 'hero' as const, area: 'overlays' as const },
  { id: 'sim', title: 'SIM Status', to: '/overlays', testId: 'dashboard-panel-sim', variant: 'medium' as const, area: 'sim' as const },
  { id: 'themes', title: 'Themes', to: '/themes', testId: 'dashboard-panel-themes', variant: 'small' as const, area: 'themes' as const },
  { id: 'account', title: 'Account', to: '/account', testId: 'dashboard-panel-account', variant: 'small' as const, area: 'account' as const },
  { id: 'settings', title: 'Settings', to: '/settings', testId: 'dashboard-panel-settings', variant: 'small' as const, area: 'settings' as const },
] as const;

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useRef(false);

  // Load async data
  useThemePreview();       // triggers theme fetch
  useOverlayWindows();     // triggers overlay windows fetch
  useAccountStatus();      // triggers auth session load

  // Check prefers-reduced-motion on mount
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Small delay to trigger stagger after layout paint
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Panel inline style for stagger delay — only on initial mount
  const panelStyle = useCallback((index: number) => {
    if (!mounted || prefersReducedMotion.current) return {};
    return {
      animationDelay: `${index * 0.1}s`,
      animationFillMode: 'backwards' as const,
    };
  }, [mounted]);

  return (
    <div className="relative w-full h-full min-h-0 overflow-auto" data-testid="dashboard-page">
      <CanvasParticles />

      <div className="dashboard-layout-desktop dashboard-layout-tablet dashboard-layout-mobile p-4 relative" style={{ zIndex: 1 }}>
        {PANELS.map((panel, index) => (
          <DashboardPanel
            key={panel.id}
            title={panel.title}
            to={panel.to}
            testId={panel.testId}
            variant={panel.variant}
            area={panel.area}
            style={panelStyle(index)}
            className={mounted && !prefersReducedMotion.current ? 'dashboard-panel-enter' : ''}
          >
            {panel.id === 'overlays' && <OverlaysPanel />}
            {panel.id === 'sim' && <SimStatusPanel />}
            {panel.id === 'themes' && <ThemesPanel />}
            {panel.id === 'account' && <AccountPanel />}
            {panel.id === 'settings' && <SettingsPanel />}
          </DashboardPanel>
        ))}
      </div>
    </div>
  );
}
