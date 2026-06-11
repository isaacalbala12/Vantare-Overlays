# v2 Fase 5 — Hub Dashboard Implementation Plan

> **For agentic workers:** Implement task-by-task. **Design is mandatory** — port from [`hub_main_v5.html`](../../../hub_main_v5.html), see [`V2-DESIGN-REFERENCE.md`](../../V2-DESIGN-REFERENCE.md).

**Goal:** Second Wails window (normal, non-transparent) — Hub dashboard matching v5 mockup. User configures profiles without editing JSON.

**Architecture:** `cmd/vantare` opens Hub + Overlay windows. Hub uses React Router (or tabs), shares telemetry ref optionally when visible. Profile CRUD calls existing `ProfileService` + new hub routes.

**Prerequisites:** Fase 4 ✅ · `ProfileService`, `configs/*.json`, design reference doc.

---

## File map (target)

```
vantare-v2/
├── cmd/vantare/main.go              # + hub window, route /hub vs /
├── frontend/src/
│   ├── styles/vantare-v5.css        # tokens from hub_main_v5.html
│   ├── hub/
│   │   ├── HubApp.tsx               # layout shell (topbar + main)
│   │   ├── pages/DashboardPage.tsx  # hero + grid v5
│   │   └── components/              # GlassPanel, CardSleek, etc.
│   └── main.tsx                     # route by URL ? or separate entry
└── configs/                         # profiles CRUD target dir
```

---

### Task 1: Design tokens (from v5)

- [ ] Extract Tailwind v4 theme: colors `vantare.*`, fonts Inter/Rajdhani/Space Mono
- [ ] Port CSS: `.glass-panel`, `.card-sleek`, `.btn-primary`, `.premium-bg`, `.nav-item`
- [ ] Source: `hub_main_v5.html` lines 16–200
- [ ] Test: visual compare screenshot vs HTML in browser

### Task 2: Hub window in Wails

- [ ] `main.go`: second window 1280×800, framed, URL `/hub` (or hash route)
- [ ] Vite MPA or React Router: `/` overlay, `/hub` dashboard
- [ ] Hub does NOT use click-through / shrink-wrap

### Task 3: Hub shell (topbar + hero)

- [ ] Topbar: logo, nav (Hub, Overlays, Telemetría, Setup), user avatar
- [ ] Hero: VANTARE typography + car/track/session panel (live from telemetry ref or mock)
- [ ] Match v5 section lines 200–289

### Task 4: Dashboard grid

- [ ] Full-width event banner
- [ ] 12-col grid: ratings cards, iRating chart, recent races, Pro sidebar, ecosystem
- [ ] Static/mock data OK for MVP; wire telemetry later

### Task 5: Profile management UI

- [ ] List profiles from `configs/`
- [ ] Create / rename / delete / activate profile
- [ ] Open overlay preview (launch racing mode with selected profile)
- [ ] Reuse `ProfileService` methods

### Task 6: Tests + docs

- [ ] Vitest: token helpers, profile list component
- [ ] `go test ./...` unchanged green
- [ ] README Fase 5 section
- [ ] Update `V2-MASTER-PLAN.md` Fase 5 → ✅ when done

---

## Acceptance

- [ ] Hub window matches v5 layout (topbar, hero, grid)
- [ ] Design tokens from `hub_main_v5.html`, not improvised
- [ ] Profile list + activate from hub
- [ ] Overlay still works on `/`
- [ ] Tests green

## Out of scope (F5 MVP)

- Supabase auth / real iRating data
- Chart live data (static Chart.js OK)
- Full CRUD every overlay setting (F5b)

---

## Execution handoff

Tasks 1→2→3→4→5→6 in order. Checkpoint after Task 2 (two windows) and Task 3 (visual shell).
