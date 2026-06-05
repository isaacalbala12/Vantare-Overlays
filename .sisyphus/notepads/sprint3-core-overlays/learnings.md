# Task: Fix dev URL in overlay-manager.ts and register overlay IPC handlers

## Changes Made

### 1. Fixed dev URL in overlay-manager.ts
- **File**: `apps/desktop/src/main/windows/overlay-manager.ts`
- **Change**: Line 61 — changed `http://localhost:3000?overlay=${id}` to `http://localhost:3000/?overlay=${id}`
- **Reason**: Missing trailing slash before query string caused dev server to not recognize the route properly

### 2. Registered overlay IPC handlers in handlers.ts
- **File**: `apps/desktop/src/main/ipc/handlers.ts`
- **Pattern**: Followed existing `simManagerRef` pattern (lines 42-45) for overlay manager reference
- **Added**:
  - `let overlayManagerRef: OverlayManager | null = null;`
  - `export function setOverlayManager(mgr: OverlayManager | null): void { overlayManagerRef = mgr; }`
- **Registered 5 IPC handlers**:
  - `overlays:get-windows` → returns `overlayManagerRef.getAll()` or `[]` if null
  - `overlays:show` → calls `overlayManagerRef.show(id)` if ref exists
  - `overlays:hide` → calls `overlayManagerRef.hide(id)` if ref exists
  - `overlays:set-position` → calls `overlayManagerRef.setPosition(id, x, y)` if ref exists
  - `overlays:set-size` → calls `overlayManagerRef.setSize(id, w, h)` if ref exists
- **Null safety**: All handlers check `if (!overlayManagerRef) return;` to handle app startup race

### 3. Wired overlay manager ref in main index.ts
- **File**: `apps/desktop/src/main/index.ts`
- **Change**: Added `setOverlayManager(overlayManager);` after overlay manager instantiation
- **Import**: Added `setOverlayManager` to the imports from `./ipc/handlers`

### 4. TDD Tests
- **File**: `apps/desktop/src/main/ipc/__tests__/handlers.test.ts`
- **15 tests** covering:
  - Handler registration verification
  - Method call verification with correct arguments
  - Null ref graceful handling (returns empty/default values)
- **All 15 tests pass** ✅

## Test Results
- New handlers.test.ts: 15/15 passing
- Existing sim-manager.test.ts: 6/6 passing
- Other pre-existing failures (http-server, hooks, components) are unrelated to this task

## Pattern Notes
- The `simManagerRef` pattern is a simple module-level variable with a setter function
- No Mutex needed — Electron's single-threaded main process makes simple null-check sufficient
- Each handler captures `overlayManagerRef` in a closure, checking for null before calling methods
