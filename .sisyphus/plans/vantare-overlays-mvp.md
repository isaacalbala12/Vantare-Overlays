# Vantare Overlays — MVP Plan

## TL;DR

> **Quick Summary**: Build a sim racing overlay app for LMU with 3 basic overlays (Standings, Relative, Fuel), streaming overlay (chat/alerts), and a hub UI for configuration. Python sidecar reads LMU shared memory, Bun server pushes via SSE, React frontend renders overlays.
> 
> **Deliverables**:
> - Python sidecar reading LMU shared memory
> - Bun + Fastify server with SSE telemetry streaming
> - 3 racing overlays (Standings, Relative, Fuel)
> - 1 streaming overlay (Chat + Alerts + Custom Text)
> - Hub UI (Sidebar + Live Preview + Drag & Drop Layout Editor)
> - JSON layout export/import
> - OBS browser source compatible URLs
> 
> **Estimated Effort**: 4-5 weeks (solo dev with LLMs)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Project setup → Backend LMU → Overlays → Hub UI → Integration

---

## Context

### Original Request
Build a sim racing overlay app similar to RaceLab.app, differentiated by: 1) Performance, 2) Customization, 3) Brand identity. Must be 100% coded with LLMs, with a frontend novice joining in 2-3 weeks.

### Interview Summary
**Key Discussions**:
- Target sims: LMU (MVP), iRacing + AC EVO (post-MVP)
- Stack: Bun + Fastify + TypeScript + React + Vite + Tailwind
- Real-time: SSE (not WebSocket) for simplicity
- LMU: Python sidecar for shared memory (already implemented)
- Overlays: DOM/CSS (not Canvas) for LLM-friendliness
- Brand: v22 design system (Blood + Silver + Glass morphism)
- Multi-monitor: Yes, via browser source per screen
- Streaming: Mandatory from MVP (chat, alerts, banners)
- Hub: Sidebar + live preview + drag & drop layout editor

**Research Findings**:
- RaceLab: Electron + Express (performance issues known)
- irDashies: Single container window reduces IPC 80-95%
- h2h-iracing: Node.js + SSE + React pattern works well
- race-director: LMU uses REST API + shared memory combined

---

## Work Objectives

### Core Objective
Deliver a working MVP with LMU telemetry overlays that a sim racer can use immediately with OBS.

### Concrete Deliverables
- Python sidecar process reading LMU shared memory
- Bun server serving overlays + hub via localhost:3000
- 3 racing overlays with real-time telemetry
- Streaming overlay with chat/alerts integration
- Hub UI with sidebar navigation, live preview, layout editor
- JSON layout export/import system

### Definition of Done
- [ ] `bun run dev` starts the server and opens hub in browser
- [ ] Overlays display live LMU telemetry data
- [ ] Overlays work as OBS browser sources
- [ ] Hub shows live preview of overlays
- [ ] User can drag & drop to position overlays
- [ ] Layouts can be saved/loaded as JSON files
- [ ] Streaming overlay shows chat/alerts (placeholder for Twitch API)

### Must Have
- LMU telemetry reading via Python sidecar
- SSE streaming to frontend
- 3 basic overlays (Standings, Relative, Fuel)
- Streaming overlay (Chat + Alerts)
- Hub UI with sidebar navigation
- Live preview in hub
- Drag & drop overlay positioning
- JSON layout export/import
- OBS browser source compatible
- Multi-monitor support (URLs per overlay)

### Must NOT Have (Guardrails)
- NO Canvas 2D in MVP (DOM/CSS only)
- NO WebSocket (SSE only)
- NO Electron/Tauri
- NO iRacing/AC EVO adapters (post-MVP)
- NO VR support
- NO auth system (post-MVP)
- NO cloud sync (post-MVP)
- NO complex test infrastructure
- NO native FFI bindings (use Python sidecar)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None for MVP (focus on working code)
- **Framework**: None
- **Manual verification**: Agent runs commands and checks output

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend**: Use Bash (curl) - Send requests, assert status + response fields
- **Frontend**: Use Playwright - Navigate, interact, assert DOM, screenshot
- **OBS Integration**: Use Bash (curl) - Verify URLs return valid HTML

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - foundation):
├── Task 1: Project scaffolding + monorepo setup [quick]
├── Task 2: Design system tokens + Tailwind config [quick]
├── Task 3: Python sidecar integration [quick]
├── Task 4: Shared types + Zod schemas [quick]

Wave 2 (After Wave 1 - core backend + overlays):
├── Task 5: Bun server + Fastify setup [quick]
├── Task 6: LMU adapter + telemetry service [deep]
├── Task 7: SSE broadcaster [quick]
├── Task 8: Standings overlay [quick]
├── Task 9: Relative overlay [quick]
├── Task 10: Fuel overlay [quick]

Wave 3 (After Wave 2 - hub + streaming):
├── Task 11: Hub UI shell (sidebar + layout) [visual-engineering]
├── Task 12: Live preview system [deep]
├── Task 13: Drag & drop layout editor [visual-engineering]
├── Task 14: JSON layout export/import [quick]
├── Task 15: Streaming overlay (chat + alerts) [quick]

Wave FINAL (After ALL tasks - verification):
├── Task F1: Plan compliance audit
├── Task F2: Code quality review
├── Task F3: Real manual QA
├── Task F4: Scope fidelity check
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 4 → Task 6 → Task 7 → Task 8 → Task 11 → Task 13 → F1-F4
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | None | 2,3,4,5 |
| 2 | 1 | 8,9,10,15 |
| 3 | 1 | 6 |
| 4 | 1 | 6,8,9,10,15 |
| 5 | 1 | 6,7 |
| 6 | 3,4,5 | 7 |
| 7 | 6 | 8,9,10,15 |
| 8 | 2,4,7 | 12 |
| 9 | 2,4,7 | 12 |
| 10 | 2,4,7 | 12 |
| 11 | 2 | 12,13 |
| 12 | 8,9,10,11 | 13 |
| 13 | 12 | 14 |
| 14 | 13 | None |
| 15 | 2,4,7 | None |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks - T1→`quick`, T2→`visual-engineering`, T3→`quick`, T4→`quick`
- **Wave 2**: 6 tasks - T5→`quick`, T6→`deep`, T7→`quick`, T8→`quick`, T9→`quick`, T10→`quick`
- **Wave 3**: 5 tasks - T11→`visual-engineering`, T12→`deep`, T13→`visual-engineering`, T14→`quick`, T15→`quick`
- **FINAL**: 4 tasks - F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [ ] 1. Project Scaffolding + Monorepo Setup

  **What to do**:
  - Initialize pnpm monorepo with `pnpm-workspace.yaml`
  - Create `packages/server`, `packages/ui`, `packages/shared`
  - Configure `tsconfig.json` base config
  - Setup Bun in `packages/server` with Fastify
  - Setup Vite + React in `packages/ui`
  - Setup shared types package
  - Configure `package.json` scripts for dev/build
  - Verify all packages install and dev servers start

  **Must NOT do**:
  - No Electron/Tauri setup
  - No WebSocket setup
  - No complex test infrastructure

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (first task)
  - **Blocks**: Tasks 2,3,4,5
  - **Blocked By**: None

  **References**:
  - `C:\Users\isaac\Desktop\Vantare-Ingeniero\shared-telemetry\` - Reference for Python sidecar structure
  - pnpm workspaces docs: https://pnpm.io/workspaces

  **Acceptance Criteria**:
  - [ ] `pnpm install` completes without errors
  - [ ] `cd packages/server && bun run dev` starts Fastify on :3000
  - [ ] `cd packages/ui && bun run dev` starts Vite on :5173
  - [ ] All TypeScript configs are valid

  **QA Scenarios**:

  ```
  Scenario: Monorepo installs and dev servers start
    Tool: Bash
    Preconditions: Empty vantare-overlays directory
    Steps:
      1. cd C:\Users\isaac\Desktop\Vantare-Overlays
      2. Run pnpm install
      3. Run cd packages/server && bun run dev (in background)
      4. curl http://localhost:3000 — expect 200 or health endpoint
      5. Run cd packages/ui && bun run dev (in background)
      6. curl http://localhost:5173 — expect HTML response
    Expected Result: Both servers start, endpoints respond
    Failure Indicators: Port already in use, module not found errors
    Evidence: .sisyphus/evidence/task-1-monorepo-setup.txt

  Scenario: TypeScript configs are valid
    Tool: Bash
    Steps:
      1. cd C:\Users\isaac\Desktop\Vantare-Overlays
      2. Run npx tsc --noEmit -p packages/shared/tsconfig.json
      3. Run npx tsc --noEmit -p packages/server/tsconfig.json
    Expected Result: No TypeScript errors
    Failure Indicators: Type errors, missing modules
    Evidence: .sisyphus/evidence/task-1-typescript-check.txt
  ```

  **Commit**: YES
  - Message: `feat: scaffold pnpm monorepo with server, ui, shared packages`
  - Files: `package.json, pnpm-workspace.yaml, packages/*/package.json, tsconfig.json`

- [ ] 2. Design System Tokens + Tailwind Configuration

  **What to do**:
  - Create `packages/ui/src/styles/tokens.css` with CSS variables from v22 brandkit:
    - Colors: Blood (#721A1A → #CC3A3A), Silver (#3A3A3A → #909090), Dark backgrounds (#080808, #0D0D0D, #141414)
    - Typography: Archivo (display), JetBrains Mono (data)
    - Spacing: 8px base grid
    - Radius: 4, 6, 8, 10, 14, 20, 100px
    - Motion: Fast 150ms, Default 250ms, Slow 400ms
  - Configure Tailwind with custom colors, fonts, spacing
  - Create base component classes (glass morphism, corner glow)
  - Add Google Fonts import for Archivo + JetBrains Mono
  - Create `packages/ui/src/styles/globals.css` with base styles

  **Must NOT do**:
  - No Canvas/CSS-in-JS
  - No complex animation libraries (CSS only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`tailwind`, `frontend-responsive-design-standards`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3,4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 8,9,10,15
  - **Blocked By**: Task 1

  **References**:
  - `C:\Users\isaac\Desktop\Vantare-Overlays\ventare-widget-design.html` - Widget design system v22
  - `C:\Users\isaac\Desktop\Vantare-Overlays\ventare-hub-v22.html` - Hub brandkit v22
  - Tailwind v4 config: https://tailwindcss.com/docs/configuration

  **Acceptance Criteria**:
  - [ ] CSS variables match v22 brandkit exactly
  - [ ] Tailwind classes work: `bg-blood-500`, `text-silver-200`, `font-display`, `font-mono`
  - [ ] Glass morphism utility class works: `glass` applies backdrop-filter + background
  - [ ] Google Fonts load correctly

  **QA Scenarios**:

  ```
  Scenario: Tailwind classes render correctly
    Tool: Playwright
    Steps:
      1. Create test component with Tailwind classes from brandkit
      2. Navigate to http://localhost:5173
      3. Assert element has correct background color (Blood #AD2D2D)
      4. Assert font-family is Archivo
      5. Take screenshot
    Expected Result: Visual matches v22 brandkit
    Evidence: .sisyphus/evidence/task-2-tailwind-tokens.png

  Scenario: CSS variables are defined
    Tool: Bash
    Steps:
      1. grep -r "blood-500" packages/ui/src/styles/
      2. grep -r "silver-200" packages/ui/src/styles/
      3. grep -r "font-display" packages/ui/tailwind.config.*
    Expected Result: All tokens found
    Evidence: .sisyphus/evidence/task-2-css-tokens.txt
  ```

  **Commit**: YES (groups with 1)
  - Files: `packages/ui/src/styles/*, packages/ui/tailwind.config.*`

- [ ] 3. Python Sidecar Integration

  **What to do**:
  - Copy `shared-telemetry/` from `C:\Users\isaac\Desktop\Vantare-Ingeniero\` to `vantare-overlays/sidecar/`
  - Create `sidecar/main.py` that:
    - Starts TelemetryReader
    - Exposes HTTP endpoint `GET /telemetry` returning RaceState as JSON
    - Runs on port 4000
  - Create `sidecar/requirements.txt` with dependencies
  - Create `sidecar/start.ps1` PowerShell script to launch sidecar
  - Verify sidecar starts and returns telemetry data (or mock data in offline mode)

  **Must NOT do**:
  - No modifications to existing shared-telemetry code
  - No new features in the sidecar

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2,4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - `C:\Users\isaac\Desktop\Vantare-Ingeniero\shared-telemetry\shared_telemetry\reader.py` - TelemetryReader class
  - `C:\Users\isaac\Desktop\Vantare-Ingeniero\shared-telemetry\shared_telemetry\models.py` - Pydantic models (RaceState, etc.)
  - `C:\Users\isaac\Desktop\Vantare-Ingeniero\shared-telemetry\README.md` - Usage examples

  **Acceptance Criteria**:
  - [ ] `cd sidecar && pip install -r requirements.txt` completes
  - [ ] `python main.py` starts HTTP server on :4000
  - [ ] `curl http://localhost:4000/telemetry` returns JSON with telemetry data
  - [ ] Offline mode works (mock data when LMU not running)

  **QA Scenarios**:

  ```
  Scenario: Sidecar starts and serves telemetry
    Tool: Bash
    Steps:
      1. cd C:\Users\isaac\Desktop\Vantare-Overlays\sidecar
      2. pip install -r requirements.txt
      3. python main.py (in background, wait 3s)
      4. curl http://localhost:4000/telemetry
      5. Parse JSON response, assert it has 'engine', 'player', 'session' fields
    Expected Result: JSON response with telemetry structure
    Failure Indicators: Connection refused, import errors
    Evidence: .sisyphus/evidence/task-3-sidecar-telemetry.json

  Scenario: Sidecar offline mode works
    Tool: Bash
    Steps:
      1. python main.py --offline (in background)
      2. curl http://localhost:4000/telemetry
      3. Assert response contains mock data (gear=0, rpm=0)
    Expected Result: Mock telemetry data returned
    Evidence: .sisyphus/evidence/task-3-sidecar-offline.json
  ```

  **Commit**: YES
  - Message: `feat: add Python sidecar for LMU shared memory telemetry`
  - Files: `sidecar/*`

- [ ] 4. Shared Types + Zod Schemas

  **What to do**:
  - Create `packages/shared/src/types/telemetry.ts` with TypeScript interfaces:
    - `UnifiedTelemetry` (top-level)
    - `EngineData` (gear, rpm, maxRpm, waterTemp, oilTemp)
    - `PlayerData` (driverName, position, classPosition)
    - `TyreData` (pressures, temperatures, wear, compound)
    - `BrakeData` (temperatures, biasFront)
    - `LapData` (lapNumber, lastLaptime, bestLaptime, sector1, sector2)
    - `SessionData` (sessionType, timeRemaining, lapsRemaining)
    - `VehicleData` (id, name, gap, gapType, position)
  - Create `packages/shared/src/schemas/telemetry.ts` with Zod schemas matching types
  - Create `packages/shared/src/index.ts` exporting all types and schemas
  - Configure `packages/shared/package.json` with proper exports

  **Must NOT do**:
  - No any types
  - No runtime validation in MVP (schemas for future use)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2,3)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6,8,9,10,15
  - **Blocked By**: Task 1

  **References**:
  - `C:\Users\isaac\Desktop\Vantare-Ingeniero\shared-telemetry\shared_telemetry\models.py` - Python Pydantic models to mirror
  - Zod docs: https://zod.dev

  **Acceptance Criteria**:
  - [ ] All TypeScript interfaces compile without errors
  - [ ] Zod schemas match TypeScript interfaces
  - [ ] `packages/shared/src/index.ts` exports everything
  - [ ] `bun run typecheck` passes in shared package

  **QA Scenarios**:

  ```
  Scenario: Types compile correctly
    Tool: Bash
    Steps:
      1. cd C:\Users\isaac\Desktop\Vantare-Overlays\packages\shared
      2. Run npx tsc --noEmit
    Expected Result: No TypeScript errors
    Evidence: .sisyphus/evidence/task-4-types-check.txt

  Scenario: Zod schemas validate correctly
    Tool: Bash
    Steps:
      1. Create test script that imports schemas
      2. Validate mock telemetry data against schemas
      3. Assert validation passes
    Expected Result: Mock data validates against Zod schemas
    Evidence: .sisyphus/evidence/task-4-zod-validation.txt
  ```

  **Commit**: YES (groups with 1)
  - Files: `packages/shared/src/*`

- [ ] 5. Bun Server + Fastify Setup

  **What to do**:
  - Create `packages/server/src/index.ts` with Fastify server
  - Configure CORS for localhost origins
  - Add health endpoint `GET /health`
  - Add static file serving for `packages/ui/dist`
  - Configure SSE content type for `/sse/*` routes
  - Add error handling middleware
  - Verify server starts on :3000

  **Must NOT do**:
  - No WebSocket setup
  - No authentication
  - No database

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (first task)
  - **Blocks**: Tasks 6,7
  - **Blocked By**: Task 1

  **References**:
  - Fastify docs: https://fastify.dev/docs/latest/
  - Bun docs: https://bun.sh/docs

  **Acceptance Criteria**:
  - [ ] `bun run dev` starts server on :3000
  - [ ] `curl http://localhost:3000/health` returns 200
  - [ ] CORS headers present on responses

  **QA Scenarios**:

  ```
  Scenario: Server starts and responds
    Tool: Bash
    Steps:
      1. cd C:\Users\isaac\Desktop\Vantare-Overlays\packages\server
      2. bun run dev (in background)
      3. curl -v http://localhost:3000/health
      4. Assert status 200
      5. Assert CORS headers present
    Expected Result: Server healthy, CORS configured
    Evidence: .sisyphus/evidence/task-5-server-health.txt
  ```

  **Commit**: YES
  - Message: `feat: setup Bun + Fastify server with health endpoint`
  - Files: `packages/server/src/index.ts, packages/server/package.json`

- [ ] 6. LMU Adapter + Telemetry Service

  **What to do**:
  - Create `packages/server/src/adapters/lmu.ts`:
    - `LMUAdapter` class that fetches from sidecar (localhost:4000)
    - Methods: `getTelemetry()`, `isConnected()`
    - Maps LMU data to `UnifiedTelemetry` DTO
  - Create `packages/server/src/services/telemetry.ts`:
    - `TelemetryService` class that manages telemetry state
    - Polls LMU adapter at configurable frequency (default 20Hz)
    - Stores latest telemetry state in memory
    - Provides `getState()` method
  - Create `packages/server/src/services/gaps.ts`:
    - Gap calculation service
    - Computes gaps between vehicles
    - Handles lap gaps vs time gaps

  **Must NOT do**:
  - No shared memory reading (use sidecar HTTP)
  - No iRacing/AC EVO adapters yet

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 3,4,5

  **References**:
  - `C:\Users\isaac\Desktop\Vantare-Ingeniero\shared-telemetry\shared_telemetry\models.py` - LMU data structures
  - `C:\Users\isaac\Desktop\Vantare-Ingeniero\shared-telemetry\shared_telemetry\reader.py` - How telemetry is read
  - `packages/shared/src/types/telemetry.ts` - Unified DTO types

  **Acceptance Criteria**:
  - [ ] LMUAdapter fetches from sidecar and maps to DTO
  - [ ] TelemetryService polls at 20Hz and stores state
  - [ ] Gap calculation works for time gaps
  - [ ] Service handles sidecar disconnection gracefully

  **QA Scenarios**:

  ```
  Scenario: LMU adapter fetches telemetry
    Tool: Bash
    Steps:
      1. Start sidecar (python main.py --offline)
      2. Start Bun server
      3. curl http://localhost:3000/api/telemetry
      4. Assert response has UnifiedTelemetry structure
    Expected Result: Telemetry data from sidecar
    Evidence: .sisyphus/evidence/task-6-lmu-adapter.json

  Scenario: Telemetry service handles disconnection
    Tool: Bash
    Steps:
      1. Start Bun server WITHOUT sidecar running
      2. Wait 2 seconds
      3. curl http://localhost:3000/api/telemetry
      4. Assert response has isConnected: false
    Expected Result: Graceful disconnection handling
    Evidence: .sisyphus/evidence/task-6-disconnection.json
  ```

  **Commit**: YES
  - Message: `feat: add LMU adapter and telemetry service with gap calculation`
  - Files: `packages/server/src/adapters/*, packages/server/src/services/*`

- [ ] 7. SSE Broadcaster

  **What to do**:
  - Create `packages/server/src/sse/broadcaster.ts`:
    - `SSEBroadcaster` class managing client connections
    - Methods: `addClient(res)`, `removeClient(res)`, `broadcast(data)`
    - Heartbeat every 30s to keep connections alive
    - Client tracking with IDs
  - Create `packages/server/src/routes/sse.ts`:
    - `GET /sse/telemetry` - SSE stream for telemetry data
    - `GET /sse/streaming` - SSE stream for chat/alerts (placeholder)
  - Integrate with TelemetryService to broadcast on each tick
  - Add CORS headers for SSE endpoints

  **Must NOT do**:
  - No WebSocket
  - No bidirectional communication

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 8,9,10,15
  - **Blocked By**: Task 6

  **References**:
  - SSE spec: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
  - Fastify SSE example: https://fastify.dev/docs/latest/Guides/

  **Acceptance Criteria**:
  - [ ] `curl -N http://localhost:3000/sse/telemetry` returns SSE stream
  - [ ] Events contain telemetry data JSON
  - [ ] Heartbeat events sent every 30s
  - [ ] Multiple clients can connect simultaneously

  **QA Scenarios**:

  ```
  Scenario: SSE stream delivers telemetry
    Tool: Bash
    Steps:
      1. Start sidecar + Bun server
      2. curl -N http://localhost:3000/sse/telemetry (5 seconds)
      3. Parse SSE events, assert at least 5 events received
      4. Assert each event has data field
    Expected Result: Multiple SSE events with telemetry
    Evidence: .sisyphus/evidence/task-7-sse-stream.txt

  Scenario: Multiple clients receive same data
    Tool: Bash
      1. Start two curl connections to /sse/telemetry
      2. Wait 3 seconds
      3. Assert both received same number of events
    Expected Result: Broadcast works for multiple clients
    Evidence: .sisyphus/evidence/task-7-sse-broadcast.txt
  ```

  **Commit**: YES
  - Message: `feat: add SSE broadcaster for real-time telemetry streaming`
  - Files: `packages/server/src/sse/*, packages/server/src/routes/sse.ts`

- [ ] 8. Standings Overlay

  **What to do**:
  - Create `packages/ui/src/overlays/standings/Standings.tsx`:
    - Table showing all vehicles with: Position, Driver Name, Class, Gap, Last Lap, Best Lap
    - Highlights player row
    - Class-based coloring (multi-class support)
    - Sortable by position
  - Create `packages/ui/src/overlays/standings/Standings.css`:
    - Glass morphism styling from v22 brandkit
    - Blood accent for player position
    - Silver for other rows
    - JetBrains Mono for data
  - Create `packages/ui/src/overlays/standings/index.html`:
    - Standalone HTML page that loads React overlay
    - Connects to SSE endpoint
    - Works as OBS browser source
  - Create `packages/ui/src/hooks/useSSE.ts`:
    - Hook that connects to SSE endpoint
    - Parses telemetry events
    - Returns latest data

  **Must NOT do**:
  - No Canvas rendering
  - No complex animations (CSS transitions only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9,10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 2,4,7

  **References**:
  - `C:\Users\isaac\Desktop\Vantare-Overlays\ventare-widget-design.html` - Widget styles
  - `packages/shared/src/types/telemetry.ts` - VehicleData type
  - `packages/server/src/routes/sse.ts` - SSE endpoint

  **Acceptance Criteria**:
  - [ ] Standings overlay renders in browser at `/overlays/standings`
  - [ ] Table shows position, name, gap, lap times
  - [ ] Player row highlighted with blood accent
  - [ ] Data updates via SSE connection
  - [ ] Works as OBS browser source (transparent background)

  **QA Scenarios**:

  ```
  Scenario: Standings overlay renders with data
    Tool: Playwright
    Steps:
      1. Start sidecar + Bun server
      2. Navigate to http://localhost:3000/overlays/standings
      3. Wait for SSE data (5 seconds)
      4. Assert table has rows
      5. Assert first row has position "1"
      6. Take screenshot
    Expected Result: Standings table with telemetry data
    Evidence: .sisyphus/evidence/task-8-standings.png

  Scenario: Standings works as OBS browser source
    Tool: Bash
    Steps:
      1. curl http://localhost:3000/overlays/standings
      2. Assert response is valid HTML
      3. Assert HTML contains React mount point
    Expected Result: Valid HTML for OBS
    Evidence: .sisyphus/evidence/task-8-standings-obs.html
  ```

  **Commit**: YES
  - Message: `feat: add standings overlay with real-time telemetry`
  - Files: `packages/ui/src/overlays/standings/*, packages/ui/src/hooks/useSSE.ts`

- [ ] 9. Relative Overlay

  **What to do**:
  - Create `packages/ui/src/overlays/relative/Relative.tsx`:
    - Shows 3 cars ahead and 3 cars behind player
    - Displays: Gap, Position, Driver Name, Class
    - Color coding: Red for cars ahead, Green for cars behind
    - Dynamic gap display (seconds or laps)
  - Create styling matching v22 brandkit
  - Create standalone HTML page for OBS

  **Must NOT do**:
  - No Canvas rendering
  - No radar/proximity visualization (future overlay)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8,10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 2,4,7

  **References**:
  - `C:\Users\isaac\Desktop\Vantare-Overlays\ventare-widget-design.html` - Relative widget example
  - `packages/shared/src/types/telemetry.ts` - VehicleData, gap types

  **Acceptance Criteria**:
  - [ ] Relative overlay renders at `/overlays/relative`
  - [ ] Shows 3 cars ahead + 3 cars behind
  - [ ] Gap colors correct (red ahead, green behind)
  - [ ] Data updates via SSE

  **QA Scenarios**:

  ```
  Scenario: Relative overlay shows cars ahead/behind
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/overlays/relative
      2. Wait for SSE data
      3. Assert "ahead" section exists
      4. Assert "behind" section exists
      5. Take screenshot
    Expected Result: Relative positions displayed
    Evidence: .sisyphus/evidence/task-9-relative.png
  ```

  **Commit**: YES
  - Message: `feat: add relative overlay with ahead/behind gaps`
  - Files: `packages/ui/src/overlays/relative/*`

- [ ] 10. Fuel Overlay

  **What to do**:
  - Create `packages/ui/src/overlays/fuel/Fuel.tsx`:
    - Shows fuel remaining (liters)
    - Shows fuel consumption per lap
    - Shows laps remaining
    - Shows fuel bar (SVG circle like v22 design)
    - Color coding: Silver normal, Blood when low
  - Create standalone HTML page for OBS

  **Must NOT do**:
  - No fuel strategy calculator (future feature)
  - No pit stop recommendations

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8,9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 2,4,7

  **References**:
  - `C:\Users\isaac\Desktop\Vantare-Overlays\ventare-widget-design.html` - Fuel widget with SVG circle

  **Acceptance Criteria**:
  - [ ] Fuel overlay renders at `/overlays/fuel`
  - [ ] Shows fuel remaining, consumption, laps remaining
  - [ ] SVG circle progress indicator works
  - [ ] Low fuel triggers blood accent color

  **QA Scenarios**:

  ```
  Scenario: Fuel overlay displays fuel data
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/overlays/fuel
      2. Wait for SSE data
      3. Assert fuel value is displayed
      4. Assert SVG circle exists
      5. Take screenshot
    Expected Result: Fuel data with visual indicator
    Evidence: .sisyphus/evidence/task-10-fuel.png
  ```

  **Commit**: YES
  - Message: `feat: add fuel overlay with circular progress indicator`
  - Files: `packages/ui/src/overlays/fuel/*`

- [ ] 11. Hub UI Shell (Sidebar + Layout)

  **What to do**:
  - Create `packages/ui/src/hub/Hub.tsx`:
    - Main hub component with sidebar + content area
    - Sidebar: Logo, Overlays, Layouts, Settings nav items
    - Content area renders active page
  - Create `packages/ui/src/hub/components/Sidebar.tsx`:
    - Fixed sidebar with nav items
    - Active state highlighting
    - Brand logo at top
  - Create `packages/ui/src/hub/pages/OverlaysPage.tsx`:
    - Lists available overlays with toggle switches
    - Shows overlay status (active/inactive)
  - Create `packages/ui/src/hub/pages/LayoutsPage.tsx`:
    - Lists saved layouts
    - Create new layout button
    - Import/Export JSON buttons
  - Create `packages/ui/src/hub/pages/SettingsPage.tsx`:
    - Sim selection (LMU/iRacing/AC EVO)
    - Refresh rate setting
    - Theme selection (future)

  **Must NOT do**:
  - No live preview yet (Task 12)
  - No drag & drop yet (Task 13)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`tailwind`, `frontend-responsive-design-standards`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 12,13,14,15)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 12,13
  - **Blocked By**: Task 2

  **References**:
  - `C:\Users\isaac\Desktop\Vantare-Overlays\ventare-hub-v22.html` - Hub design v22
  - v22 brandkit: sidebar layout, icons, chips

  **Acceptance Criteria**:
  - [ ] Hub loads at `/hub`
  - [ ] Sidebar shows nav items: Overlays, Layouts, Settings
  - [ ] Clicking nav items switches content
  - [ ] Overlays page lists Standings, Relative, Fuel, Streaming
  - [ ] Sidebar matches v22 brandkit design

  **QA Scenarios**:

  ```
  Scenario: Hub navigation works
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/hub
      2. Assert sidebar exists
      3. Click "Layouts" nav item
      4. Assert LayoutsPage content appears
      5. Click "Settings" nav item
      6. Assert SettingsPage content appears
      7. Take screenshot of each page
    Expected Result: Navigation switches content
    Evidence: .sisyphus/evidence/task-11-hub-navigation.png

  Scenario: Hub matches v22 brandkit
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/hub
      2. Assert sidebar background is dark (#080808)
      3. Assert font-family is Archivo
      4. Assert blood accent color present
    Expected Result: Visual matches brandkit
    Evidence: .sisyphus/evidence/task-11-hub-brandkit.png
  ```

  **Commit**: YES
  - Message: `feat: add hub UI shell with sidebar navigation`
  - Files: `packages/ui/src/hub/*`

- [ ] 12. Live Preview System

  **What to do**:
  - Create `packages/ui/src/hub/components/LivePreview.tsx`:
    - Renders overlay preview inside hub content area
    - Uses iframe or embedded React components
    - Shows overlay with real telemetry data
    - Preview scales to fit hub content area
  - Create preview controls:
    - Overlay selector (which overlay to preview)
    - Opacity slider
    - Scale slider
  - Connect preview to SSE for real-time data
  - Overlay preview updates in real-time

  **Must NOT do**:
  - No drag & drop positioning yet (Task 13)
  - No multi-overlay preview (one at a time)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`tailwind`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 8,9,10,11

  **References**:
  - `packages/ui/src/overlays/` - Overlay components to embed
  - `packages/ui/src/hooks/useSSE.ts` - SSE hook for data

  **Acceptance Criteria**:
  - [ ] LivePreview component renders overlay with real data
  - [ ] Preview updates when telemetry changes
  - [ ] User can select which overlay to preview
  - [ ] Opacity and scale controls work

  **QA Scenarios**:

  ```
  Scenario: Live preview shows real telemetry
    Tool: Playwright
    Steps:
      1. Start sidecar + Bun server
      2. Navigate to http://localhost:3000/hub
      3. Click "Overlays" in sidebar
      4. Select "Standings" overlay
      5. Assert preview area shows standings table
      6. Wait 3 seconds, assert data updates
      7. Take screenshot
    Expected Result: Live preview with real data
    Evidence: .sisyphus/evidence/task-12-live-preview.png
  ```

  **Commit**: YES
  - Message: `feat: add live preview system for overlay visualization`
  - Files: `packages/ui/src/hub/components/LivePreview.tsx`

- [ ] 13. Drag & Drop Layout Editor

  **What to do**:
  - Create `packages/ui/src/hub/components/LayoutEditor.tsx`:
    - Canvas area showing overlay positions
    - Drag & drop to move overlays
    - Resize handles on overlays
    - Grid snapping (optional, toggle)
  - Create `packages/ui/src/hub/components/OverlayPosition.tsx`:
    - Represents an overlay on the canvas
    - Shows overlay bounds and name
    - Draggable and resizable
  - Create `packages/ui/src/hooks/useDragDrop.ts`:
    - Custom hook for drag & drop logic
    - Tracks position (x, y) and size (width, height)
    - Handles mouse events
  - Save positions to layout state

  **Must NOT do**:
  - No snap-to-grid (user chose free positioning)
  - No multi-monitor positioning (future)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`tailwind`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 14
  - **Blocked By**: Task 12

  **References**:
  - React DnD: https://react-dnd.github.io/react-dnd/about
  - Or native HTML5 drag & drop API

  **Acceptance Criteria**:
  - [ ] Layout editor shows overlay positions on canvas
  - [ ] User can drag overlays to new positions
  - [ ] Positions are saved to layout state
  - [ ] Visual feedback during drag (ghost element)

  **QA Scenarios**:

  ```
  Scenario: Drag & drop repositions overlay
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/hub
      2. Open Layouts page
      3. Click "Edit Layout" button
      4. Assert overlay position elements exist
      5. Drag "Standings" overlay from position A to B
      6. Assert position updated in state
      7. Take screenshot
    Expected Result: Overlay repositioned via drag
    Evidence: .sisyphus/evidence/task-13-drag-drop.png
  ```

  **Commit**: YES
  - Message: `feat: add drag & drop layout editor for overlay positioning`
  - Files: `packages/ui/src/hub/components/LayoutEditor.tsx, packages/ui/src/hooks/useDragDrop.ts`

- [ ] 14. JSON Layout Export/Import

  **What to do**:
  - Create `packages/ui/src/services/layoutStorage.ts`:
    - `exportLayout(layout)` - Downloads JSON file
    - `importLayout(file)` - Parses JSON and loads layout
    - `saveLayout(layout)` - Saves to localStorage
    - `loadLayout(id)` - Loads from localStorage
    - `listLayouts()` - Lists all saved layouts
  - Create layout JSON schema:
    ```json
    {
      "id": "uuid",
      "name": "My Layout",
      "createdAt": "ISO date",
      "overlays": [
        {
          "type": "standings",
          "position": { "x": 100, "y": 200 },
          "size": { "width": 400, "height": 300 },
          "visible": true
        }
      ]
    }
    ```
  - Add Export/Import buttons to LayoutsPage
  - Add layout list with load/delete

  **Must NOT do**:
  - No cloud sync (localStorage only)
  - No layout sharing (future feature)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 13

  **References**:
  - FileSaver.js for download: https://github.com/nicedoc/file-saver
  - JSON.parse/JSON.stringify for serialization

  **Acceptance Criteria**:
  - [ ] Export downloads JSON file with layout data
  - [ ] Import loads JSON file and applies layout
  - [ ] Layouts saved to localStorage
  - [ ] Layout list shows saved layouts
  - [ ] Load/Delete buttons work

  **QA Scenarios**:

  ```
  Scenario: Export and import layout
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/hub
      2. Open Layouts page
      3. Click "New Layout" button
      4. Position some overlays
      5. Click "Export" button
      6. Assert JSON file downloaded
      7. Click "Import" button
      8. Select the downloaded file
      9. Assert layout loaded correctly
    Expected Result: Layout roundtrip works
    Evidence: .sisyphus/evidence/task-14-layout-export-import.png
  ```

  **Commit**: YES
  - Message: `feat: add JSON layout export/import with localStorage persistence`
  - Files: `packages/ui/src/services/layoutStorage.ts`

- [ ] 15. Streaming Overlay (Chat + Alerts)

  **What to do**:
  - Create `packages/ui/src/overlays/streaming/Streaming.tsx`:
    - Chat message display area
    - Alert notification system (follow, sub, donation)
    - Custom text banner
    - All positioned with absolute positioning
  - Create `packages/ui/src/overlays/streaming/components/ChatOverlay.tsx`:
    - Shows recent chat messages
    - Auto-scroll
    - Message fade out after timeout
    - Twitch emote support (future)
  - Create `packages/ui/src/overlays/streaming/components/AlertOverlay.tsx`:
    - Shows alert notifications
    - Animated entrance/exit
    - Configurable duration
  - Create `packages/ui/src/overlays/streaming/components/BannerOverlay.tsx`:
    - Custom text display
    - Configurable font, color, position
  - Create placeholder SSE endpoints for chat/alerts
  - Create standalone HTML page for OBS

  **Must NOT do**:
  - No actual Twitch/YouTube API integration (placeholder)
  - No complex animations

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11,12,13,14)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 2,4,7

  **References**:
  - `C:\Users\isaac\Desktop\Vantare-Overlays\ventare-widget-design.html` - Streaming widget styles
  - Twitch chat API docs (for future integration)

  **Acceptance Criteria**:
  - [ ] Streaming overlay renders at `/overlays/streaming`
  - [ ] Chat messages display and auto-scroll
  - [ ] Alert notifications appear with animation
  - [ ] Custom banner shows text
  - [ ] Works as OBS browser source

  **QA Scenarios**:

  ```
  Scenario: Streaming overlay displays chat and alerts
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/overlays/streaming
      2. Assert chat area exists
      3. Assert alert area exists
      4. Assert banner area exists
      5. Take screenshot
    Expected Result: All streaming components visible
    Evidence: .sisyphus/evidence/task-15-streaming.png

  Scenario: Streaming overlay works as OBS source
    Tool: Bash
    Steps:
      1. curl http://localhost:3000/overlays/streaming
      2. Assert response is valid HTML
      3. Assert transparent background
    Expected Result: Valid HTML for OBS
    Evidence: .sisyphus/evidence/task-15-streaming-obs.html
  ```

  **Commit**: YES
  - Message: `feat: add streaming overlay with chat, alerts, and banner`
  - Files: `packages/ui/src/overlays/streaming/*`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.

- [ ] F2. **Code Quality Review** — Run `bun run typecheck` + `bun run lint`. Review all changed files for: `as any`, empty catches, console.log in prod, commented-out code, unused imports.

- [ ] F3. **Real Manual QA** — Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases. Save to `.sisyphus/evidence/final-qa/`.

- [ ] F4. **Scope Fidelity Check** — For each task: read "What to do", read actual diff. Verify 1:1 compliance. Check "Must NOT do" compliance. Flag unaccounted changes.

---

## Commit Strategy

- **Wave 1**: `feat: scaffold monorepo with shared types and design tokens`
- **Wave 2**: `feat: add LMU backend with SSE telemetry streaming`
- **Wave 3**: `feat: add hub UI with layout editor and streaming overlay`
- **FINAL**: No commit (review only)

---

## Success Criteria

### Verification Commands
```bash
cd vantare-overlays && pnpm install        # Expected: no errors
cd packages/server && bun run dev          # Expected: server starts on :3000
cd packages/ui && bun run dev              # Expected: Vite dev server on :5173
curl http://localhost:3000/sse/telemetry   # Expected: SSE stream
curl http://localhost:3000/overlays/standings  # Expected: HTML overlay
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Server starts without errors
- [ ] Overlays render in browser
- [ ] SSE telemetry stream works
- [ ] Hub UI loads with sidebar
- [ ] Live preview shows overlays
- [ ] Drag & drop positioning works
- [ ] JSON export/import works
- [ ] OBS can load overlay URLs
