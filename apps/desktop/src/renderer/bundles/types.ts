import type { ComponentType } from 'react';

/**
 * Identifiers for the four overlay components registered by a Bundle.
 *
 * The list is intentionally stable across bundles (dark / blood / midnight /
 * future themes) so the URL contract `?overlay=...` is decoupled from
 * theme-specific component implementations.
 */
export type OverlayId = 'standings' | 'relative' | 'delta' | 'stream-alerts';

/**
 * A Bundle is a theme-scoped set of overlay components. `loadBundle(themeId)`
 * in `registry.ts` resolves a `Bundle` via dynamic import.
 */
export interface Bundle {
  /** Unique theme identifier (e.g. `'default'`, `'dark'`, `'blood'`). */
  id: string;
  /** Human-readable name for Storybook and the dashboard. */
  name: string;
  /**
   * Concrete React components keyed by the stable `OverlayId` contract.
   * Typed as `ComponentType<any>` because each overlay accepts a different
   * prop shape (`Standings` needs `{ telemetry, maxRows }`, `Relative`
   * needs `{ telemetry }`, the placeholders take nothing). The shell picks
   * the right one and renders it with no props today; T1 keeps the type
   * loose to avoid forcing the shell to forward every variant.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<OverlayId, ComponentType<any>>;
}
