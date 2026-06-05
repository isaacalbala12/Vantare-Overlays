# Vantare Overlays — Foundation Sprint Complete

> Date: 2026-06-02 | Status: COMPLETE | Tests: 194/194 | Build: 5/5

## Modules Built
| Module | Tests |
|---|---|
| Calculations (fuel, delta, gap, sector) | 83 |
| SimNormalizer (Zod) | 17 |
| Mock System (3 sims, 6 scenarios) | 85 |
| AuthService (login, register, feature gating) | 8 |
| Themes: Dark, Blood, Midnight (44 tokens each) | — |
| Renderer shared (4 components, 2 hooks, 1 store) | — |
| SimManager + IPC handlers + demo flow | — |

## Pre-existing Fixes
1. isQuitting -> module-level variable
2. http.Response -> http.ServerResponse
3. window.vantare -> global.d.ts in ui-core
4. tsconfig paths -> centralized in base config
5. vite.config.ts -> created with vite-plugin-electron
6. turbo.json -> pipeline to tasks (v2 API)

## How to Run
pnpm build   # 5/5 packages
pnpm test    # 194 tests

## Known Limitations
- ESM direct import: dist cannot be require() directly (bundler runtime only)
- Desktop vite build: minor warnings (no impact)

## Next: Sprint 2 — Telemetry Pipeline
LMU Adapter -> shared memory reader
iRacing Adapter -> N-API C++ addon
AC Adapter -> UDP telemetry reader
Pipeline: SimManager.detectSim() real process detection
