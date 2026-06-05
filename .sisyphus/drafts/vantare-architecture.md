# Draft: Vantare Overlays - Architecture Decisions

## Research Findings (confirmed)

### RaceLab.app - The Benchmark
- Electron + Express backend + React frontend
- Chromium-based overlays via localhost:8080
- 20+ overlay types, Smart Layouts, VR, Stream Deck
- Pain points: GPU usage climbs, IPC overhead, port conflicts, memory leaks

### irDashies (Open Source Reference)
- React + Electron + iRacing SDK
- Single container window (80-95% IPC reduction)
- Built-in web server for OBS browser sources

### h2h-iracing
- Node.js + TypeScript + SSE + React overlays
- Clean separation: server/ → schema/ → dashboard/

### race-director (LMU specific)
- Electron + React + TypeScript
- Uses LMU REST API + shared memory (combined)

### Common Patterns
- TypeScript everywhere, React for UI, WebSocket/SSE for real-time
- Shared types/schemas between backend and frontend
- Web server for OBS browser sources

## Requirements (ALL CONFIRMED)
- **Target Sims**: iRacing, Le Mans Ultimate, Assetto Corsa EVO
- **MVP**: Le Mans Ultimate first, then iRacing + AC EVO
- **VR**: NO en MVP (feature futura)
- **Monetization**: Freemium — subscription mensual + pago único inicial
- **Streaming**: MANDATORY — chat, alerts, custom text integrados en overlays
- **Platform**: Windows initially
- **Multi-monitor**: SÍ desde MVP — overlays posicionables en diferentes pantallas
- **Team**: Solo dev + possible frontend novice joining in 2-3 weeks
- **Constraint**: Architecture must be HIPERSIMPLE, LLM-friendly, correct from start

## Telemetry Methods per Sim
- **LMU**: REST API + shared memory (se combinan las dos)
- **iRacing**: SDK nativo → shared memory map
- **AC EVO**: Probablemente UDP (similar a ACC)

## Stack Elegido (CONFIRMADO v3 FINAL)
- Backend: **Bun** + Fastify + TypeScript (con tests rigorosos)
- Frontend: React + Vite + Tailwind + CSS
- Real-time: **SSE** (Server-Sent Events) — NO WebSocket
- Validation: Zod
- Monorepo: pnpm workspaces
- 100% TypeScript - optimized for LLM code generation
- DOM/CSS para overlays (sin Canvas en MVP)
- Canvas 2D solo para track map/radar cuando se necesite
- **LMU Shared Memory**: Python sidecar (MVP) → Bun FFI (futuro)
- **Distribution**: Bun compiled binary (no Electron/Tauri)

## Architecture (v3 FINAL)
- Python sidecar lee LMU shared memory → HTTP :4000
- Bun server consume sidecar → Unified DTO → SSE → Overlays
- Fastify HTTP server en localhost:3000
- SSE para telemetry + streaming
- HTTP POST para configuración
- Overlays como URLs → OBS browser sources
- Multi-monitor via browser source por pantalla

## Frontend UX Decisions (CONFIRMED)
- **Hub layout**: Sidebar izquierda + contenido principal
- **Overlay positioning**: Drag & drop libre (sin grid snapping)
- **Preview**: En vivo en el hub (overlays en tiempo real mientras editas)
- **Layout storage**: Archivos JSON exportables/importables
- **Layout editor**: Drag & drop para posicionar overlays en el canvas del hub

## Architecture
- Daemon web server (localhost:3000) sirviendo overlays + hub
- Adapters por sim: LMU (REST + shared memory), iRacing (SDK), AC EVO (UDP)
- WebSocket/SSE para data real-time
- Overlays como URLs → OBS browser sources nativo
- Streaming integrado (Twitch/YouTube chat, alerts)

## Brand Design System (v22 - DEFINIDO)
- **Colors**: Dark backgrounds (#080808, #0D0D0D, #141414), Blood accent (#721A1A → #CC3A3A), Silver UI (#3A3A3A → #909090)
- **Fonts**: Archivo (display/headings), JetBrains Mono (data/UI)
- **Style**: Glass morphism + corner glow + dark minimal + blood accents
- **Textures**: Dither, mesh, scanline, corner blood, ripple, stripes
- **Components**: Buttons (Primary Silver, Danger Blood, Ghost), Chips (LIVE, REC), Inputs, Data display
- **Logo**: "V" with inner glow, blood gradient background
- **Motion**: Fast 150ms, Default 250ms, Slow 400ms, ease-out
- **Spacing**: 8px base grid
- **Radius scale**: 4, 6, 8, 10, 14, 20, 100px
- **User note**: HTML widgets seem "too basic" - wants MORE visual richness

## Monetization Architecture Needs
- Auth system (login, accounts)
- Feature gating (free vs pro overlays)
- License management (one-time purchase + subscription)
- Potentially cloud sync for settings/layouts

## Team
- Solo developer initially
- Possible frontend developer joining in 2-3 weeks
- Architecture should be easy to onboard new developer

## Key Design Decisions
- 100% TypeScript for LLM code generation
- DOM/CSS for overlays (not Canvas) - simpler, prettier, LLM-friendly
- Single web server serving everything (overlays + hub)
- WebSocket for real-time telemetry push
- Browser source for OBS integration
- Monorepo with clear package separation for easy onboarding
- Multi-monitor via browser source per screen

## Open Questions
- NONE - All requirements confirmed
