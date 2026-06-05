import type { VantareBridge } from '../../shared/types/bridge';

declare global {
  interface Window {
    vantare: VantareBridge;
  }
}