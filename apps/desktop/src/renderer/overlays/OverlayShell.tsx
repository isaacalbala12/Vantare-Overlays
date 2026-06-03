import React, { useEffect, useState } from 'react';
import { loadBundle } from '../bundles/registry';
import type { Bundle } from '../bundles/types';
import type { OverlayId } from '../bundles/types';

// TODO(sprint-4b): wire IPC theme fetch from electron-store
const THEME_ID = 'default';

const ROUTABLE_OVERLAYS: readonly OverlayId[] = [
  'standings',
  'relative',
  'delta',
  'stream-alerts',
] as const;

function isOverlayId(value: string | null): value is OverlayId {
  return value !== null && (ROUTABLE_OVERLAYS as readonly string[]).includes(value);
}

function getOverlayId(): OverlayId | '' {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const overlay = params.get('overlay');
  return isOverlayId(overlay) ? overlay : '';
}

export default function OverlayShell() {
  const [overlayId, setOverlayId] = useState<OverlayId | ''>(() => getOverlayId());
  const [bundle, setBundle] = useState<Bundle | null>(null);

  // Load the active theme bundle once on mount. The registry caches the
  // resolved Promise, so concurrent mounts (e.g. strict-mode double-render)
  // share the same load.
  useEffect(() => {
    let mounted = true;
    loadBundle(THEME_ID).then((b) => {
      if (mounted) setBundle(b);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Re-resolve the overlay id from the URL on history navigation. The active
  // component is derived in render below.
  useEffect(() => {
    const handlePopState = () => {
      setOverlayId(getOverlayId());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Toggle the body class so the renderer can hide chrome in overlay mode.
  useEffect(() => {
    if (!overlayId) {
      document.body.classList.remove('overlay-mode');
      return;
    }
    document.body.classList.add('overlay-mode');
    return () => {
      document.body.classList.remove('overlay-mode');
    };
  }, [overlayId]);

  if (!overlayId || !bundle) {
    return null;
  }

  const OverlayComponent = bundle.components[overlayId];

  return (
    <div data-testid="overlay-shell" className="overlay-mode">
      <OverlayComponent />
    </div>
  );
}
