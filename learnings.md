# Storybook Initialization - Learnings

## Date: 2026-06-03

### Task
Initialize Storybook with Vite builder in the desktop app for overlay development.

### What was done
- Created `apps/desktop/.storybook/main.ts` with `@storybook/react-vite` builder
- Created `apps/desktop/.storybook/preview.ts` with Tailwind styles and overlay viewport settings
- Added `storybook` and `build-storybook` scripts to `apps/desktop/package.json`
- Installed Storybook v8 packages: `storybook`, `@storybook/react`, `@storybook/react-vite`, `@storybook/addon-essentials`

### Key findings

1. **Storybook version**: Used v8.6.x because `@storybook/addon-essentials` has no v10 release yet. The v10 packages (`@storybook/react@10`, `storybook@10`) were incompatible with `@storybook/addon-essentials@8.6.14` due to peer dependency conflicts.

2. **CSS entry**: The app's global CSS is at `apps/desktop/src/renderer/styles/globals.css`. It imports Tailwind via `@import "tailwindcss"` and defines a `.glass-panel` utility class.

3. **Path aliases**: The desktop app's `vite.config.ts` only defines `@shared` alias. Storybook's `viteFinal` adds:
   - `@` → `../src/renderer`
   - `@vantare/ui-core` → `../../../packages/ui-core/src`
   - `@vantare/sim-core` → `../../../packages/sim-core/src`

4. **Build warnings**: 
   - `WARN No story files found` — expected, no stories created yet (Task 9)
   - `Unknown input options: platform` — from vite-plugin-electron during Storybook build, non-blocking
   - Chunk size warning for DocsRenderer — normal for Storybook's doc rendering

5. **Build output**: `pnpm build-storybook` exits 0 and produces `storybook-static/index.html` successfully.

### Next steps
- Task 9: Create overlay stories in `apps/desktop/src/renderer/overlays/**/*.stories.@(ts|tsx)`
- Consider adding `@storybook/addon-backgrounds` explicitly if backgrounds toggle is needed in Storybook UI
