export type { SimAdapter } from '@vantare/sim-core';

/**
 * Factory that creates the correct SimAdapter for a given sim name.
 * Uses lazy require() to avoid static dependency resolution — adapter
 * files (which import koffi) are only loaded when createAdapter is
 * actually called, not at module import time.
 */
export function createAdapter(simName: string): import('@vantare/sim-core').SimAdapter {
  switch (simName) {
    case 'iracing': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { IRacingAdapter } = require('./iracing-adapter');
      return new IRacingAdapter();
    }
    case 'lmu': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LMUAdapter } = require('./lmu-adapter');
      return new LMUAdapter();
    }
    case 'ac': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ACAdapter } = require('./ac-adapter');
      return new ACAdapter();
    }
    default:
      throw new Error(`Unknown sim type: ${simName}`);
  }
}
