import { mergeConfig } from 'vite';
import path from 'path';

export default {
  stories: [
    '../src/renderer/{overlays,bundles,hub}/**/*.stories.@(ts|tsx)',
    '../../../packages/ui-core/src/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    // Strip Electron plugins — they're irrelevant to Storybook and break the build
    // because the project vite.config.ts is auto-detected by @storybook/react-vite.
    config.plugins = config.plugins?.filter(
      (p) =>
        p &&
        'name' in p &&
        !['vite-plugin-electron', 'vite-plugin-electron-renderer'].includes(p.name as string),
    );
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src/renderer'),
          '@vantare/ui-core': path.resolve(__dirname, '../../../packages/ui-core/src'),
          '@vantare/sim-core': path.resolve(__dirname, '../../../packages/sim-core/src'),
        },
      },
    });
  },
};
