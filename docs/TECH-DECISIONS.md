# Decisiones Tecnicas - Vantare Overlays

> Documento maestro de arquitectura y decisiones tecnicas del proyecto Vantare Overlays.
> Ultima actualizacion: 2026-06-01

---

## Tabla de Contenidos

1. [DEC-001: Simuladores soportados en v1](#dec-001-simuladores-soportados-en-v1)
2. [DEC-002: UI Framework](#dec-002-ui-framework)
3. [DEC-003: Build Tool](#dec-003-build-tool)
4. [DEC-004: CSS Framework](#dec-004-css-framework)
5. [DEC-005: State Management](#dec-005-state-management)
6. [DEC-006: Package Manager](#dec-006-package-manager)
7. [DEC-007: Monorepo Tool](#dec-007-monorepo-tool)
8. [DEC-008: Testing Strategy](#dec-008-testing-strategy)
9. [DEC-009: Desktop Shell](#dec-009-desktop-shell)
10. [DEC-010: Distribution](#dec-010-distribution)
11. [DEC-011: Overlay Serving Model](#dec-011-overlay-serving-model)
12. [DEC-012: Dashboard UI](#dec-012-dashboard-ui)
13. [DEC-013: Auth Backend](#dec-013-auth-backend)
14. [DEC-014: Monetization](#dec-014-monetization)
15. [DEC-015: IPC Pattern](#dec-015-ipc-pattern)
16. [DEC-016: Telemetry Protocol](#dec-016-telemetry-protocol)
17. [DEC-017: Theme System](#dec-017-theme-system)
18. [DEC-018: Profile System](#dec-018-profile-system)
19. [DEC-019: Auto-Update](#dec-019-auto-update)
20. [DEC-020: Code Quality](#dec-020-code-quality)
21. [DEC-021: Documentation Language](#dec-021-documentation-language)
22. [DEC-022: Git Strategy](#dec-022-git-strategy)
23. [DEC-023: Release Strategy](#dec-023-release-strategy)
24. [DEC-024: Overlay Update Rate](#dec-024-overlay-update-rate)
25. [DEC-025: Mock System](#dec-025-mock-system)

---

## Convenciones de Estado

| Estado       | Significado                                        |
|-------------|----------------------------------------------------|
| Aprobado    | Decision tomada e implementada                     |
| En Revision | Decision pendiente de reevaluacion                 |
| Propuesto   | Sugerido, no implementado                          |
| Obsoleto    | Decision anteriormente aprobada, ahora reemplazada |

---

## DEC-001: Simuladores soportados en v1

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Vantare Overlays es una aplicacion de overlays de simracing que compite directamente con RaceLabs, iOverlay y similares. Para la version 1.0, era critico definir que simuladores se soportarian desde el lanzamiento, ya que esto impacta directamente la complejidad del protocolo de telemetria, la cantidad de trabajo de integracion, y el tamano del mercado target.

Los simuladores de motorsport mas populares en el ecosistema PC son:

- **iRacing**: El mas grande ecosistema de carreras online con licencia y suscripcion mensual. Base de usuarios muy activa y dispuesta a pagar por overlays profesionales.
- **Le Mans Ultimate (LMU)**: Sucesor espiritual de rFactor 2, con soporte oficial de FIA y WEC. Base de usuarios en crecimiento rapido.
- **Assetto Corsa (AC)**: Simulador con la comunidad de modding mas grande del mundo. Muchos usuarios lo usan en VR y con modos de carrera custom.
- **Assetto Corsa Competizione (ACC)**: GT racing especifico, licensing oficial de GT World Challenge. Base de usuarios niche pero dedicada.
- **Automobilista 2 (AMS2)**: Popular en Latinoamerica, buena fisica pero menor base de usuarios global.
- **rFactor 2**: Antiguo pero con base instalada, especialmente en ligas organizadas.
- **Gran Turismo 7**: Solo en PlayStation, no accesible por shared memory en PC.
- **Forza Motorsport/Horizon**: Xbox/PC, telemetria limitada via UDP.
- **BeamNG.drive**: Simulacion de fisica vehicular, no racing competitivo.
- **Project CARS 2/3**: Abandonado por Bandai Namco, sin soporte activo.

### Decision

Soportar **tres simuladores** en v1.0:

1. **iRacing** (prioridad maxima)
2. **Le Mans Ultimate (LMU)** (prioridad alta)
3. **Assetto Corsa (AC)** (prioridad alta)

### Alternativas consideradas

| Alternativa | Pros | Contras | Veredicto |
|------------|------|---------|-----------|
| Solo iRacing | Menor trabajo, mercado mas grande | Excluye usuarios de otros sims, limita crecimiento | Rechazado |
| iRacing + LMU | Dos sims populares | Sin AC deja fuera la comunidad de modding mas grande | Rechazado |
| Los 6 principales | Mercado maximo | Complejidad excesiva para v1, retrasa lanzamiento | Rechazado |
| iRacing + LMU + AC + ACC | Cuatro sims con shared memory | ACC similar a AC, agrega complejidad GT-specific | Postergado a v1.1 |
| Todos los sims | Mercado total | Ano adicional de desarrollo, calidad diluida | Rechazado |

### Razon

**iRacing** es la eleccion obvia: tiene la base de usuarios mas grande y mas dispuesta a pagar por overlays profesionales. Es el mercado principal de RaceLabs.

**Le Mans Ultimate** esta en crecimiento explosivo gracias al exito del WEC real-world racing. Es el segundo sim mas buscado en herramientas de overlay y tiene un protocolo de shared memory bien documentado.

**Assetto Corsa** tiene la comunidad de modding mas grande de cualquier sim. Aunque es un sim mas viejo (2014), su base de usuarios activa es enorme gracias a mods como CSP y SOL.

La combinacion cubre approximadamente el 80-85% del mercado de overlays profesionales. Los sims restantes se agregaran en v1.1-v1.3.

### Consecuencias

**Positivas**:
- Lanzamiento mas rapido con tres integraciones bien pulidas
- Cubre el grueso del mercado objetivo
- Permite enfocar calidad sobre cantidad
- Feedback temprano de usuarios reales antes de expandir

**Negativas**:
- Usuarios de ACC, AMS2, rF2 tendran que esperar
- Marketing se limita a tres sims en el lanzamiento
- Competidores como RaceLabs ya soportan mas sims

### Revisar cuando

- Lancen v1.0 y se evaluen metricas de demanda por sim
- Aparezca un nuevo sim con shared memory protocol relevante
- ACC o AMS2 superen a LMU en usuarios activos de overlays

---

## DEC-002: UI Framework

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

La interfaz de usuario tiene dos contextos muy distintos: Dashboard UI (configuracion, drag-and-drop, forms, tables) y Overlays UI (ventanas transparentes sobre el juego que deben ser lightweight). Ambos requieren rendering eficiente, ecosistema maduro, y tipado estatico.

### Decision

**React 19 + TypeScript 5**

### Alternativas consideradas

| Framework | Pros | Contras | Veredicto |
|-----------|------|---------|-----------|
| React 19 | Ecosistema mas grande, concurrent rendering, React Compiler | Bundle size mayor, dependencia de Meta | **Elegido** |
| Svelte 5 | Compiler-based, bundle pequeno, performance excelente | Ecosistema pequeno, menor pool de devs | Rechazado |
| Vue 3 | Composition API, buena documentacion | Ecosistema dividido, menos libs enterprise | Rechazado |
| Solid.js | Near-native performance, signals, bundle minimo | Ecosistema muy pequeno, poca documentacion | Rechazado |
| Angular 16+ | Full framework, TypeScript first | Overkill, bundle enorme, learning curve larga | Rechazado |
| Preact | Lightweight React alternative | Ecosistema limitado, compatibilidad imperfecta | Rechazado |
| Lit | Web Components nativos | No es framework completo | Rechazado |
| Qwik | Resumability, lazy loading extremo | Muy nuevo, ecosistema minimo | Rechazado |

### Razon

1. **Ecosistema incomparable**: Cualquier libreria necesaria tiene soporte primero para React.
2. **React 19 Compiler**: Memoiza automaticamente, critico para overlays a 16Hz.
3. **Concurrent Rendering**: Dashboard responsivo mientras procesa telemetria.
4. **TypeScript 5**: Tipado estricto obligatorio para proyecto de esta escala.
5. **Talento**: Mercado de devs React es el mas grande.
6. **Electron + React**: Plantillas oficiales maduras (electron-vite).

### Consecuencias

**Positivas**: Acceso a miles de librerias, facil contratacion, React Compiler sin cambios manuales, comunidad enorme.

**Negativas**: Bundle mas grande que Svelte/Solid, dependencia de Meta, virtual DOM overhead teorico.

### Revisar cuando

- Framework emergente demuestre mejor performance con ecosistema comparable
- React deje de ser mantenido activamente
- Bundle size sea problema real para overlays

---

## DEC-003: Build Tool

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

El build tool define velocidad de desarrollo, HMR, y eficiencia del bundle. Para monorepo con multiples packages, debe ser rapido, configurable, y soportar TypeScript out-of-the-box.

### Decision

**Vite 6**

### Alternativas consideradas

| Tool | Pros | Contras | Veredicto |
|------|------|---------|-----------|
| Vite 6 | HMR instantaneo, ESM-native, plugin ecosystem | Menos plugins que Webpack, build usa Rollup | **Elegido** |
| Webpack 5 | Ecosistema mas grande, mas plugins, battle-tested | Config compleja, HMR lento, obsoleto para nuevos proyectos | Rechazado |
| Turbopack | Extremadamente rapido, Vercel-backed | Experimental, sin soporte estable, Next.js only | Rechazado |
| esbuild | Rapido, Go-based, minification | No es dev server completo, plugins limitados | Rechazado |
| Rspack | Compatible Webpack, rapido, Rust-based | Muy nuevo, comunidad pequena | Rechazado |
| Parcel | Zero config, rapido | Menos control, menor adopcion | Rechazado |
| Rollup | Excelente tree-shaking | Dev server no nativo | Rechazado |
| SWC | Rust-based, compilation rapida | Es compiler, no dev server | Rechazado |

### Razon

1. **Velocidad**: Dev server arranca en ms con ESM nativos.
2. **HMR instantaneo**: Cambios en <50ms sin recargar estado.
3. **Vite 6**: Mejor API de plugins, soporte monorepos, Rolldown (Rust bundler).
4. **electron-vite**: Plantilla oficial madura para main/preload/renderer.
5. **TypeScript nativo**: Sin configuracion adicional.

### Consecuencias

**Positivas**: HMR instantaneo, config minima, build optimizado, compatible Turborepo.

**Negativas**: Algunos plugins Webpack sin equivalente, ecosistema joven, Rolldown madurando.

### Revisar cuando

- Turbopack alcance estabilidad fuera de Next.js
- Velocidad de build sea bottleneck CI/CD

---

## DEC-004: CSS Framework

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Dashboard UI necesita design system consistente. Overlays UI necesita ser lightweight y posicionable. Usuarios podran customizar temas, requiriendo theming robusto.

### Decision

**Tailwind CSS v4**

### Alternativas consideradas

| Solucion | Pros | Contras | Veredicto |
|----------|------|---------|-----------|
| Tailwind CSS v4 | Utility-first, @theme CSS-first, purging automatico | Learning curve, JSX verbose | **Elegido** |
| CSS Modules | Scoped styles, zero runtime | Sin design system, mucho CSS manual | Rechazado |
| vanilla-extract | Type-safe, zero runtime | Ecosistema limitado, poca adopcion | Rechazado |
| styled-components | CSS-in-JS completo, theming | Runtime overhead, SSR issues, maintenance mode | Rechazado |
| Emotion | Mejor performance que styled-components | Mismo overhead de runtime | Rechazado |
| Chakra UI | Component library completa | Overkill, bundle enorme | Rechazado |
| Ant Design | Excelentes forms/tables | Demasiado grande, no sirve para overlays | Rechazado |
| Hibrido Tailwind+CSS Modules | Flexibilidad maxima | Dos sistemas, complejidad, inconsistencia | Rechazado |

### Razon

1. **v4 CSS-first**: `@theme` en CSS, theming nativo sin JavaScript.
2. **Purging**: Bundle final 10-30KBgzipped.
3. **Consistencia**: Mismos tokens de diseño en todo el proyecto.
4. **Theming para usuarios**: Variables CSS faciles de modificar.
5. **Shadcn/ui**: Componentes listos para dashboard basados en Tailwind.

### Consecuencias

**Positivas**: Desarrollo rapido, temas customizables, bundle pequeno, consistencia visual.

**Negativas**: Learning curve, JSX verbose, dependencia de libreria externa.

### Revisar cuando

- CSS nativo tenga theming comparable
- Tailwind v5 cambie su modelo

---

## DEC-005: State Management

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Multiples tipos de estado: global (config, perfil, tema), telemetria en tiempo real (16Hz), dashboard (UI state), overlays (posicion/size/config), y autenticacion (sesion, tokens, tier).

### Decision

**Zustand** (con selecciones optimizadas y middleware)

### Alternativas consideradas

| Solucion | Pros | Contras | Veredicto |
|----------|------|---------|-----------|
| Zustand | ~1KB, rapido, sin boilerplate, selectors, middleware | Sin dev tools dedicadas, menos structure | **Elegido** |
| Redux Toolkit | Ecosistema enorme, DevTools excellent, RTK Query | Boilerplate excesivo, overkill | Rechazado |
| Jotai | Atomic model, datos derivados | Difcil gestion de multiples atoms | Rechazado |
| Recoil | Atomic model, Facebook-backed | Maintenance mode | Rechazado |
| XState | State machines, predecible | Learning curve enorme | Rechazado |
| MobX | Observable-based, menos boilerplate | Debugging dificil, magic implicita | Rechazado |
| React Context + useReducer | Zero deps, built-in | Performance issues con updates frecuentes | Rechazado |
| Valtio | Proxy-based, intuitivo | Menos mature, proxy overhead | Rechazado |

### Razon

1. **Simplicidad**: Sin providers, un store es una funcion.
2. **Performance**: Selectors evitan re-renders innecesarios, critico para 16Hz.
3. **Middleware**: Persist, devtools, immer nativos.
4. **Store separado para telemetria**: Actualizaciones batched con ref.
5. **Tamano**: ~1KB gzipped.

### Consecuencias

**Positivas**: Setup minimo, performance excelente, middleware nativo, perfecto para el tamano del proyecto.

**Negativas**: DevTools menos robustas que Redux, sin estructura opinionada.

### Revisar cuando

- Estado necesite structure formal de slices
- Problemas de performance con telemetria a 16Hz

---

## DEC-006: Package Manager

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Monorepo con multiples packages necesita instalaciones rapidas, workspaces nativos, manejo eficiente de dependencias, lockfile determinista, y compatibilidad con Turborepo/Vite/Electron Builder.

### Decision

**pnpm**

### Alternativas consideradas

| Manager | Pros | Contras | Veredicto |
|---------|------|---------|-----------|
| pnpm | 2-3x mas rapido, disk-efficient, workspaces, strict mode | Learning curve, symlinks issues ocasionales | **Elegido** |
| npm | Default de Node.js, simple | Lento, workspaces basicos, phantom deps | Rechazado |
| yarn v4 | PnP, offline mirror | PnP causa problemas con nativos, complejidad | Rechazado |
| bun | Extremadamente rapido | Experimental en Windows, workspaces inmaduros | Rechazado |

### Razon

1. **Velocidad**: Content-addressable store, dependencias descargadas una vez.
2. **Espacio**: Hard links eliminan duplicados.
3. **Strict mode**: Previene phantom dependencies.
4. **Workspaces**: Soporte nativo via `pnpm-workspace.yaml`.
5. **Turborepo**: Mejor integracion que npm o yarn.

### Consecuencias

**Positivas**: Instalaciones rapidas, bajo disco, prevencion de phantom deps.

**Negativas**: Algunos packages fallan con symlinks, requiere instalacion separada.

### Revisar cuando

- Bun alcance estabilidad en Windows
- npm implemente content-addressable store

---

## DEC-007: Monorepo Tool

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Monorepo con packages: @vantare/app, @vantare/telemetry, @vantare/ui, @vantare/shared, @vantare/overlay-renderer, @vantare/electron, @vantare/config. Necesita orquestar builds, tests, y linting eficientemente.

### Decision

**Turborepo**

### Alternativas consideradas

| Tool | Pros | Contras | Veredicto |
|------|------|---------|-----------|
| Turborepo | Rapido (Go), caching, parallel exec, config simple | Sin versioning, sin code generation | **Elegido** |
| Nx | Features completas, affected analysis, code gen | Complejo, boilerplate, overkill | Rechazado |
| Lerna | Versioning, wrappers workspaces | Poco sobre workspaces nativos | Rechazado |
| Rush | Enterprise robust | Configuracion muy compleja | Rechazado |
| Sin tool | pnpm workspaces + scripts manuales | Sin caching, sin parallel exec | Rechazado |

### Razon

1. **Velocidad**: Parallel execution con cache local y remota.
2. **Simplicidad**: Un solo `turbo.json`.
3. **Cache**: Build de 5min reduce a 30s con cache caliente.
4. **pnpm integration**: Deteccion automatica de workspaces.

### Consecuencias

**Positivas**: Builds paralelos, config minima, CI/CD rapido.

**Negativas**: Sin versioning (necesita changesets), sin code generation.

### Revisar cuando

- Nx reduzca complejidad
- Se necesite versioning automatizado

---

## DEC-008: Testing Strategy

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Capas de testing: unit (funcs, hooks, stores), component (React), integration (component+stores), E2E (flujo completo), telemetry (parsing), performance (benchmarks).

### Decision

**Vitest + Playwright** (con React Testing Library para componentes)

### Alternativas consideradas

| Tool | Pros | Contras | Veredicto |
|------|------|---------|-----------|
| Vitest | Rapido, Vite-native, Jest API compatible | Mas nuevo, menor ecosistema | **Elegido** |
| Jest | Estandar, maduro, enorme ecosistema | Lento, config compleja con Vite, sin ESM nativo | Rechazado |
| Cypress | UI visual, time-travel | Lento, no multipage, no Electron | Rechazado |
| Playwright | Multi-browser, auto-wait, codegen, Electron | Mas complejo que Cypress | **Elegido** |
| Puppeteer | Chrome-only, rapido | Solo Chrome, menos features | Rechazado |
| Storybook | Component docs + visual testing | Overhead grande, no es testing principal | Rechazado |

### Razon

**Vitest**: Misma config de Vite, ESM nativos, Jest API, coverage v8.
**Playwright**: Electron support oficial, multi-browser, auto-wait, trace viewer.

### Consecuencias

**Positivas**: Testing rapido, E2E robustos, config compartida con Vite, coverage nativo.

**Negativas**: Playwright learning curve, visual testing requiere herramienta adicional.

### Revisar cuando

- Jest tenga ESM rapido nativo
- Se necesite visual regression testing

---

## DEC-009: Desktop Shell

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Aplicacion de escritorio que necesita: ventanas transparentes (overlays sobre juego), filesystem, red, N-API nativo (shared memory), auto-update, cross-platform, performance, multiples ventanas independientes.

### Decision

**Electron**

### Alternativas consideradas

| Framework | Pros | Contras | Veredicto |
|-----------|------|---------|-----------|
| Electron | Maduro, ecosistema enorme, Node.js completo, N-API, multiples ventanas transparentes | Bundle ~150MB, memoria ~100MB, Chromium overhead | **Elegido** |
| Tauri | Bundle ~5-10MB, Rust backend, baja memoria | Sin N-API, debugging dificil, transparent windows problematicas en Windows | Rechazado |
| NW.js | Acceso directo DOM+Node | Menor ecosistema, menos mantenimiento | Rechazado |
| Neutralinojs | ~3MB binario, low memory | Sin native modules, ecosistema minimo | Rechazado |
| Flutter Desktop | Cross-platform, Skia rendering | No web tech, sin shared memory nativo | Rechazado |
| .NET MAUI | Windows nativo | No web tech, sin transparencia facil | Rechazado |

### Razon

1. **Ventanas transparentes**: `transparent: true` + `frame: false` nativo.
2. **N-API**: Addons nativos de Node.js funcionan perfectamente.
3. **Ecosistema**: electron-builder, electron-updater, etc.
4. **Node.js completo**: Acceso total a npm.

### Consecuencias

**Positivas**: Desarrollo rapido, N-API nativo, transparent windows, comunidad enorme.

**Negativas**: Bundle grande, memoria alta, Chromium por ventana.

### Revisar cuando

- Tauri tenga N-API sin FFI
- Performance de Electron sea problema para overlays

---

## DEC-010: Distribution

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Distribucion debe crear instaladores Windows (.exe, .msi), manejar auto-update, code signing, deltas de actualizacion, e integrarse con GitHub Releases.

### Decision

**Electron Builder**

### Alternativas consideradas

| Tool | Pros | Contras | Veredicto |
|------|------|---------|-----------|
| Electron Builder | Full-featured, code signing, auto-update, NSIS/MSI/WiX | Configuracion compleja | **Elegido** |
| Electron Forge | Oficial, plugin system | Menos features, documentacion limitada | Rechazado |
| electron-packager | Simple, oficial | Sin installer, sin auto-update | Rechazado |
| NSIS directo | Control total | No integra con Electron | Rechazado |

### Razon

1. **NSIS installer**: Estandar en Windows.
2. **Code signing**: Integracion con certificados EV/OV.
3. **Auto-update**: Genera `.yml` para electron-updater.
4. **GitHub Releases**: Upload automatico de artifacts.

### Consecuencias

**Positivas**: Instaladores profesionales, auto-update, code signing.

**Negativas**: Config inicial compleja, algunos bugs con code signing.

### Revisar cuando

- Electron Forge tenga features comparables
- Windows cambie requisitos de code signing

---

## DEC-011: Overlay Serving Model

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Los overlays deben renderizarse sobre el juego. Modelos: Single App (una ventana), MPA (multiples ventanas Electron), HTTP Server only (navegador/OBS), o Hybrid.

### Decision

**Hybrid (Electron Windows + HTTP Server)**

- PC: Cada overlay es una ventana Electron transparente
- HTTP server local: Sirve overlays via `localhost:PORT` para OBS y navegadores
- Segunda pantalla via navegador

### Alternativas consideradas

| Modelo | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| Single App | Simple, un proceso | No posiciones individuales, no OBS | Rechazado |
| MPA Electron | Independencia | Alto overhead, no OBS | Rechazado |
| HTTP Server only | OBS compatible | Sin ventanas transparentes nativas | Rechazado |
| Hybrid | Lo mejor de ambos | Complejidad de dos modos | **Elegido** |
| Browser Source OBS | Nativo OBS | Sin filesystem, limitado | Rechazado |

### Razon

1. **Ventanas Electron**: Baja latency, posicionamiento nativo sobre juego.
2. **HTTP server**: OBS Browser Source, segunda pantalla, streaming.
3. **Un motor de rendering**: Misma UI en Electron y navegador.
4. **Flexibilidad**: Usuario elige como usar cada overlay.

### Consecuencias

**Positivas**: Compatible con OBS, segunda pantalla, un solo motor de rendering.

**Negativas**: Complejidad de dos modos, HTTP server puede tener issues de firewall.

### Revisar cuando

- OBS tenga soporte nativo de ventanas transparentes
- Complejidad de dos modos sea insostenible

---

## DEC-012: Dashboard UI

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Dashboard es la interfaz principal para configurar overlays, temas, perfiles, conexion con sims, gestion de cuenta, y estadisticas.

### Decision

**Tab inside Electron**

- Dashboard como tab en ventana principal Electron
- Ventana principal NO transparente (ventana normal)
- Overlays como ventanas separadas

### Alternativas consideradas

| Modelo | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| Tab inside Electron | Un proceso, IPC directo, filesystem | No es web app standalone | **Elegido** |
| Web app standalone | Accesible desde navegador | Sin filesystem, sin IPC, requiere backend completo | Rechazado |
| Separate window | Independiente | Multiples ventanas, confuso | Rechazado |
| React SPA con routing | Una sola app | Complejidad de manejar overlay windows | Rechazado |

### Razon

1. **Simplicidad**: Un solo proceso de renderer para dashboard.
2. **IPC directo**: Comunicacion directa con main process.
3. **Filesystem**: Acceso directo via IPC.
4. **UX**: Una ventana con tabs + overlays como ventanas separadas.

### Consecuencias

**Positivas**: Arquitectura simple, acceso nativo, UX intuitiva, bajo consumo de memoria.

**Negativas**: No es web app standalone, depende de Electron.

### Revisar cuando

- Se necesite acceso remoto al dashboard
- Usuarios pidan version web del dashboard

---

## DEC-013: Auth Backend

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Auth para: cuentas de usuario, verificar suscripciones, sync de perfiles, gestion de licencias, analytics.

### Decision

**Supabase**

### Alternativas consideradas

| Solucion | Pros | Contras | Veredicto |
|----------|------|---------|-----------|
| Supabase | Open-source, Postgres, Auth, Realtime, Storage, Edge Functions, tier gratuito | Vendor lock-in parcial | **Elegido** |
| Firebase | Google-backed, maduro | Vendor lock-in fuerte, NoSQL, cerrado | Rechazado |
| AWS Cognito | Scalable | Complejo, pricing confusing | Rechazado |
| Auth0 | Enterprise-ready | Caro, overkill | Rechazado |
| Custom (Express+Postgres) | Control total | Mucho trabajo, security responsibility | Rechazado |
| Clerk | Modern, good DX | Nuevo, pricing escalado | Rechazado |

### Razon

1. **Auth**: Email/password, OAuth (Google, GitHub, Discord), magic links.
2. **Database**: Postgres con Row Level Security.
3. **Realtime**: Sync de perfiles entre dispositivos.
4. **Edge Functions**: Logica de negocio (verificacion de licencias).
5. **Pricing**: Tier gratuito generoso.

### Consecuencias

**Positivas**: Backend completo sin codigo custom, auth listo, Postgres robusto, realtime.

**Negativas**: Vendor lock-in parcial, Edge Functions con limitaciones.

### Revisar cuando

- Costo supere beneficio
- Se necesite personalizacion extrema

---

## DEC-014: Monetization

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura + Negocio  

### Contexto

Modelo de monetizacion competitivo con RaceLabs ($5/mes) e iOverlay ($3/mes). Debe ser atractivo, escalable, y con features claras de upgrade.

### Decision

**Freemium (Free / Pro / Ultimate)**

| Tier | Precio | Features |
|------|--------|----------|
| Free | $0 | 2 overlays, 1 sim, tema basico, sin export/import |
| Pro | $4.99/mes | Overlays ilimitados, todos los sims, temas, export/import, 3 perfiles |
| Ultimate | $9.99/mes | Todo Pro + API, custom themes, priority support, beta, perfiles ilimitados |

### Alternativas consideradas

| Modelo | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| Freemium | Barrera cero, upsell natural, competitive | Feature gating complejo | **Elegido** |
| Subscription only | Revenue predecible | Alta barrera de entrada | Rechazado |
| One-time purchase | Simple | Sin revenue continuo | Rechazado |
| Open-source + Sponsors | Community-driven | Revenue impredecible | Rechazado |
| Freemium + Ads | Revenue dual | Ads intrusivos en overlays | Rechazado |

### Razon

1. **Barrera cero**: Usuarios prueban sin compromiso.
2. **Competitivo**: $4.99/mes competitivo con RaceLabs.
3. **Upsell natural**: Mas de 2 overlays o 1 sim requiere upgrade.
4. **Community**: Version gratis genera buzz.

### Consecuencias

**Positivas**: Adquisicion facil, revenue predecible, pricing competitivo.

**Negativas**: Requiere feature gating robusto, mantener version gratis tiene costo.

### Revisar cuando

- Conversion Free->Pro sea baja
- Competencia cambie precios

---

## DEC-015: IPC Pattern

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Electron IPC entre main y renderer necesita un patron claro para evitar strings magicos y bugs de tipos.

### Decision

**contextBridge with typed VantareBridge interface**

```typescript
interface VantareBridge {
  getTelemetry: () => Promise<TelemetryData>;
  onTelemetryUpdate: (cb: (data: TelemetryData) => void) => () => void;
  getProfiles: () => Promise<Profile[]>;
  saveProfile: (profile: Profile) => Promise<void>;
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<void>;
  createOverlayWindow: (config: OverlayConfig) => Promise<void>;
  closeOverlayWindow: (id: string) => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
  checkForUpdates: () => Promise<UpdateInfo>;
  downloadUpdate: () => Promise<void>;
}
```

### Alternativas consideradas

| Pattern | Pros | Contras | Veredicto |
|---------|------|---------|-----------|
| contextBridge + typed interface | Seguro, type-safe, clean API | Requiere tipos manuales | **Elegido** |
| IPC con strings magicos | Rapido de implementar | No type-safe, propenso a errores | Rechazado |
| Remote module | Acceso directo | Deprecated, inseguro | Rechazado |
| Preload-only sin contextBridge | Mas simple | Sin type safety, sin encapsulamiento | Rechazado |

### Razon

1. **Seguridad**: `contextIsolation: true` previene acceso a Node.js.
2. **Type safety**: Interfaz tipada previene errores de runtime.
3. **Clean API**: Renderer solo ve `window.vantare.*`.
4. **Testability**: Mockeable para tests.

### Consecuencias

**Positivas**: Seguridad robusta, type safety, API limpia, facil de testear.

**Negativas**: Requiere definir tipos para cada operacion, overhead minimo del preload.

### Revisar cuando

- Electron deprece contextBridge
- Cantidad de IPC methods sea inmanejable

---

## DEC-016: Telemetry Protocol

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Cada sim expone telemetria via shared memory: iRacing (irsdk C++), LMU (rFactor 2 shared memory C), AC (acsharedmemory C++). Datos a 60Hz+ incluyendo velocidad, RPM, fuel, position, lap time, delta.

### Decision

**N-API C++ addons (shared memory mmap)**

- Addon C++ por sim que lee shared memory
- Retorna `ArrayBuffer` con datos de telemetria
- Renderer recibe via IPC y parsea

### Alternativas consideradas

| Solucion | Pros | Contras | Veredicto |
|----------|------|---------|-----------|
| N-API C++ addons | Maxima performance, acceso directo mmap, API estable | Requiere C++, build nativo complejo | **Elegido** |
| Node.js FFI (node-ffi-napi) | Sin compile step | Mas lento, memory management dificil | Rechazado |
| Rust + N-API | Mas seguro que C++ | Otro lenguaje, ecosistema menor | Rechazado |
| Electron main process sin addon | Sin nativo | Node.js no accede a shared memory | Rechazado |
| WebAssembly | Cross-platform, sandboxed | Sin acceso a shared memory del OS | Rechazado |
| WebSocket server externo | Desacoplado | Overhead de red, complejidad | Rechazado |

### Razon

1. **Shared memory**: Solo C/C++ accede directamente a mmap.
2. **N-API stability**: API estable entre versiones de Node.js.
3. **Performance**: Lectura y parsing en microsegundos.
4. **ArrayBuffer**: Transferencia sin copia al renderer.

### Consecuencias

**Positivas**: Performance maxima, acceso directo, N-API estable, modular.

**Negativas**: Requiere C++, build nativo compleja, binarios por plataforma, debugging dificil.

### Revisar cuando

- Sims expongan telemetria via web API/WebSocket
- Rust+N-API tenga ecosistema maduro

---

## DEC-017: Theme System

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Usuarios quieren personalizar overlays. Sistema de temas debe ser facil, consistente, importable/exportable, sin overhead, compatible con Tailwind.

### Decision

**CSS variables + Tailwind @theme**

```css
@theme {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f8fafc;
  --color-accent: #06b6d4;
  --font-family-display: 'Racing Sans One', sans-serif;
  --font-family-body: 'Inter', sans-serif;
}
```

### Alternativas consideradas

| Solucion | Pros | Contras | Veredicto |
|----------|------|---------|-----------|
| CSS variables + @theme | Nativo CSS, zero runtime, Tailwind integration | Sin type safety, validacion manual | **Elegido** |
| Styled Components ThemeProvider | Runtime theming, dynamic | Runtime overhead, no compatible Tailwind | Rechazado |
| CSS Modules + variables | Scoped, type-safe | Mucha config manual | Rechazado |
| Design tokens JSON | Estructurado, exportable | Requiere build step | Rechazado |
| Sass variables | Preprocessor features | Require compile, no runtime | Rechazado |
| JavaScript theme object | Flexible, type-safe | Runtime overhead | Rechazado |

### Razon

1. **Zero runtime**: Variables CSS nativas del navegador.
2. **Tailwind integration**: v4 usa `@theme` para tokens.
3. **Exportable**: Un theme es un archivo `.css`.
4. **Dynamic**: Variables CSS modificables en runtime.
5. **Familiar**: Cualquier usuario con conocimiento de CSS puede crear themes.

### Consecuencias

**Positivas**: Themes simples, zero overhead, compatible Tailwind, portable.

**Negativas**: Sin type safety para values, validacion manual.

### Revisar cuando

- Tailwind cambie su sistema de themes
- Se necesite validacion robusta de themes

---

## DEC-018: Profile System

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Usuarios tienen diferentes setups: sims, resoluciones, overlays, hardware, estilos de carrera. Profile system debe guardar/cargar, importar/exportar, compartir, sync, y versionar.

### Decision

**JSON-based, importable/exportable**

```json
{
  "version": "1.0.0",
  "name": "GT3 Competitive",
  "sim": "iracing",
  "resolution": "2560x1440",
  "overlays": [
    {
      "type": "speedometer",
      "position": { "x": 100, "y": 200 },
      "size": { "width": 300, "height": 200 },
      "theme": "dark-racing",
      "visible": true
    }
  ],
  "settings": {
    "telemetryRate": 16,
    "deltaSmoothing": 0.3,
    "fuelWarningThreshold": 0.15
  }
}
```

### Alternativas consideradas

| Solucion | Pros | Contras | Veredicto |
|----------|------|---------|-----------|
| JSON files | Simple, readable, portable, versionable | Sin validacion nativa | **Elegido** |
| SQLite | ACID, queries | Overkill, no portable | Rechazado |
| YAML | Mas readable | Sin parsing estandar en browser | Rechazado |
| Binary format | Compact | No readable, no diff-able | Rechazado |
| Cloud-only | Sync automatico | Sin offline, vendor lock-in | Rechazado |

### Razon

1. **Universal**: JSON nativo en todo el ecosistema JS.
2. **Readable**: Usuarios pueden leer/editar manualmente.
3. **Portable**: Se comparte por Discord, email, etc.
4. **Versionable**: Diffs en Git.
5. **Validable**: JSON Schema para validacion.

### Consecuencias

**Positivas**: Universal, portable, versionable, sync con Supabase.

**Negativas**: Sin validacion nativa, sin encryption.

### Revisar cuando

- Se necesite encryption de profiles
- Formato JSON sea bottleneck de performance

---

## DEC-019: Auto-Update

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Usuarios de desktop esperan auto-updates. Sin ellos, se quedan en versiones antiguas y reportan bugs ya arreglados.

### Decision

**electron-updater via GitHub Releases**

### Alternativas consideradas

| Solucion | Pros | Contras | Veredicto |
|----------|------|---------|-----------|
| electron-updater + GitHub | Integrado con Builder, differential updates | GitHub Releases dependency | **Elegido** |
| Squirrel.Windows | Nativo Electron | Menos control, menos features | Rechazado |
| Custom update server | Control total | Mucho mantenimiento | Rechazado |
| Microsoft Store | Auto-update nativo | 30% revenue share, review process | Rechazado |
| Chocolatey/Scoop | Package managers populares | No es auto-update | Rechazado |
| Sin auto-update | Sin dependencia | Usuarios en versiones antiguas | Rechazado |

### Razon

1. **Integracion**: Viene con electron-builder.
2. **Differential updates**: Solo descarga cambios.
3. **GitHub**: Hosting gratuito.
4. **Code signing**: Verificacion de firma.

### Consecuencias

**Positivas**: Auto-update sin servidor custom, differential updates, hosting gratuito.

**Negativas**: Dependencia de GitHub, limite 50MB sin LFS.

### Revisar cuando

- GitHub cambie limites de release
- Se necesite update server para enterprise

---

## DEC-020: Code Quality

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Multiples desarrolladores necesitan herramientas para consistencia: linting, formatting, pre-commit hooks, CI/CD.

### Decision

**ESLint + Prettier + Husky + lint-staged**

### Alternativas consideradas

| Tool | Pros | Contras | Veredicto |
|------|------|---------|-----------|
| ESLint + Prettier | Estandar, enorme ecosistema | Dos tools, config compleja | **Elegido** |
| Biome | All-in-one, rapido, Rust-based | Nuevo, menos reglas que ESLint | Rechazado |
| oxlint | Rust-based, muy rapido | Solo linting, menos reglas | Rechazado |
| Deno fmt + lint | Built-in, zero config | Requiere Deno | Rechazado |
| Solo ESLint | Una tool menos | No es formatter | Rechazado |
| EditorConfig | Basico, universal | Sin linting | Rechazado |

### Razon

1. **ESLint**: Reglas de calidad (unused vars, imports, etc.)
2. **Prettier**: Formatting consistente
3. **Husky**: Previene commits sucios
4. **lint-staged**: Solo procesa archivos modificados

### Consecuencias

**Positivas**: Codigo consistente, pre-commit hooks, CI/CD quality gates.

**Negativas**: Dos tools con potenciales conflictos, config inicial compleja.

### Revisar cuando

- Biome alcance madurez comparable
- Conflictos ESLint/Prettier sean frecuentes

---

## DEC-021: Documentation Language

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Documentacion tecnica, de usuario, codigo, y UI strings necesitan idioma consistente.

### Decision

**Spanish for docs, English for code**

| Tipo | Idioma |
|------|--------|
| Documentacion tecnica (.md) | Espanol |
| Documentacion de usuario (.md) | Espanol |
| Codigo (variables, funciones) | Ingles |
| Comentarios en codigo | Ingles |
| Commit messages | Ingles |
| UI strings | Ingles |
| Git branches | Ingles |

### Alternativas consideradas

| Opcion | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| Spanish docs + English code | Docs accesibles, codigo estandar | Inconsistencia potencial | **Elegido** |
| Todo en ingles | Consistencia total | Equipo hispanohablante en desventaja | Rechazado |
| Todo en espanol | Accesible para equipo | Codigo en espanol anti-estandar | Rechazado |
| Bilingual | Accesible para todos | Duplicacion de esfuerzo | Rechazado |

### Razon

1. **Codigo en ingles**: Estandar de la industria.
2. **Docs en espanol**: Comunicacion interna accesible.
3. **Commits en ingles**: Herramientas como semantic-release lo esperan.
4. **UI en ingles**: Mercado global de simracing.

### Consecuencias

**Positivas**: Codigo estandarizado, docs accesibles, compatible con herramientas.

**Negativas**: Inconsistencia potencial, equipo debe leer ingles tecnico.

### Revisar cuando

- Equipo sea mayormente angloparlante
- Se necesite documentacion publica en ingles

---

## DEC-022: Git Strategy

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Estrategia de branching, code review, CI/CD, y releases.

### Decision

**Trunk-based development with feature branches**

- `main` siempre deployable
- Feature branches desde `main`, merge via PR
- PRs requieren 1+ approval
- CI corre en cada PR
- Releases via tags (no branches de release largas)

### Alternativas consideradas

| Estrategia | Pros | Contras | Veredicto |
|------------|------|---------|-----------|
| Trunk-based + feature branches | Simple, rapido, CI-friendly | Requiere good test coverage | **Elegido** |
| GitFlow | Structure clara | Complejo, branches largas, merge conflicts | Rechazado |
| GitHub Flow | Simple, PR-based | Sin environment branches | Rechazado (muy similar) |
| Direct push | Maxima velocidad | Sin code review, sin CI en PRs | Rechazado |

### Razon

1. **Simplicidad**: Solo main + feature branches.
2. **Velocity**: Features mergean rapido.
3. **CI/CD**: Cada PR tiene CI completo.
4. **Feature flags**: Para features incompletos.
5. **Releases via tags**: No branches de release.

### Consecuencias

**Positivas**: Flujo simple, CI en cada PR, sin merge conflicts de larga duracion.

**Negativas**: Requiere good test coverage, feature flags pueden acumularse.

### Revisar cuando

- Equipo crezca y necesite release branches
- Feature flags se vuelvan inmanejables

---

## DEC-023: Release Strategy

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Releases deben ser predecibles, frecuentes, automaticos, con changelogs, y versiones semanticas.

### Decision

**Semantic versioning + GitHub Releases**

```
MAJOR.MINOR.PATCH
- MAJOR: Breaking changes (nuevo formato profiles)
- MINOR: New features (nuevo sim, nuevo overlay type)
- PATCH: Bug fixes (fix rendering, fix telemetry)
```

### Alternativas consideradas

| Estrategia | Pros | Contras | Veredicto |
|------------|------|---------|-----------|
| SemVer + GitHub Releases | Estandar, predecible, automatico | Requiere discipline en commits | **Elegido** |
| CalVer | Predecible por fecha | No comunica impacto | Rechazado |
| Rolling releases | Siempre ultima version | Sin releases formales | Rechazado |
| Manual releases | Control total | Lento, propenso a errores | Rechazado |

### Razon

1. **Comunicacion**: Usuarios saben que esperar.
2. **Automatico**: Con semantic-release o changesets.
3. **GitHub Releases**: Hosting gratuito, changelogs automaticos.
4. **Ecosistema**: electron-updater espera SemVer.

### Consecuencias

**Positivas**: Releases predecibles, changelogs automaticos, compatible con herramientas.

**Negativas**: Requiere discipline en commits, breaking changes problematicos.

### Revisar cuando

- Se necesite release branching para enterprise
- Cambios sean demasiado frecuentes para SemVer

---

## DEC-024: Overlay Update Rate

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Overlays de telemetria deben actualizarse con datos frescos. Frecuencia impacta: latency, CPU usage, GPU usage, smoothness, y bandwidth (streaming).

### Decision

**16Hz (60ms intervals)**

- Datos leidos a 60Hz desde shared memory
- UI actualizada a 16Hz (cada 60ms)
- Animaciones de interpolacion suavizan entre updates

### Alternativas consideradas

| Frecuencia | Pros | Contras | Veredicto |
|------------|------|---------|-----------|
| 16Hz (60ms) | Suave, bajo CPU, buen balance | 16ms max latency | **Elegido** |
| 30Hz (33ms) | Mas suave | Mas CPU, puede causar drop frames | Rechazado |
| 60Hz (16ms) | Perfectamente fluido | Excesivo para overlays, alto CPU | Rechazado |
| 8Hz (125ms) | Bajo CPU | Visiblemente laggy | Rechazado |
| Variable (rAF) | Adaptable | Inconsistente | Rechazado |

### Razon

1. **Percepcion humana**: Ojo no percibe diferencias >10-12Hz para overlays.
2. **CPU budget**: 16Hz = ~3% CPU. 30Hz = ~6%. 60Hz = ~12%.
3. **Smoothness**: Con interpolacion, 16Hz se siente como 60Hz.
4. **Industry standard**: RaceLabs usa ~15-20Hz.
5. **Headroom**: Deja CPU para sim y otros overlays.

### Consecuencias

**Positivas**: Bajo CPU, suave con interpolacion, compatible con hardware variado.

**Negativas**: 16ms latency (imperceptible para racing), no ideal para analisis real-time.

### Revisar cuando

- Sims expongan telemetria a mas Hz
- Usuarios reporten overlays laggy
- Se necesite soporte VR (90Hz)

---

## DEC-025: Mock System

**Estado**: Aprobado  
**Fecha**: 2026-06-01  
**Decisor**: Equipo de arquitectura  

### Contexto

Desarrolladores no siempre tienen sim corriendo. Necesitan: desarrollar UI sin sim, probar edge cases, demostrar a inversores, testear en CI/CD.

### Decision

**Platform-specific mocks for development without sim**

Cada sim tiene mock que genera datos realistas, simula scenarios (vuelta, pit stop, crash), permite control manual, y se activa automaticamente sin sim detectado.

```typescript
const iRacingMock: TelemetryProvider = {
  name: 'iRacing (Mock)',
  connect: async () => {},
  disconnect: () => {},
  getData: () => ({
    speed: simulateSpeed(),
    rpm: simulateRPM(),
    fuel: simulateFuel(),
    lap: simulateLap(),
    position: simulatePosition(),
  }),
  isConnected: true,
};
```

### Alternativas consideradas

| Solucion | Pros | Contras | Veredicto |
|----------|------|---------|-----------|
| Platform-specific mocks | Realista, controlado, automatico | Mantenimiento por sim | **Elegido** |
| Mock generico unico | Simple | No realista por sim | Rechazado |
| Video playback | Demo realistica | No interactivo | Rechazado |
| Shared memory file | Realista | Requiere crear archivos | Rechazado |
| Sin mock | Simplicidad | No se puede dev sin sim | Rechazado |

### Razon

1. **Realismo**: Cada sim tiene campos y rangos propios.
2. **Automatico**: Sin sim = mock activo, sin config manual.
3. **Scenarios**: Simula pit stops, fuel save, etc.
4. **CI/CD**: Tests sin depender de sims.
5. **Demo**: Datos realistas para presentaciones.

### Consecuencias

**Positivas**: Desarrollo sin sim, testing automatizado, demos realistas, scenarios controlados.

**Negativas**: Mocks pueden desactualizarse, mantenimiento adicional, no captura bugs de integracion real.

### Revisar cuando

- Mocks sean inmanejables
- Sims tengan APIs de testing oficiales
- Brecha mock-datos-reales sea grande

---

## Appendix: Decisiones Futuras

| DEC   | Decision                                         | Version target |
|-------|--------------------------------------------------|----------------|
| DEC-026 | Internacionalization (i18n) strategy            | v1.1           |
| DEC-027 | Plugin system for community overlays            | v1.2           |
| DEC-028 | Analytics platform                              | v1.0           |
| DEC-029 | Error reporting (Sentry vs alternatives)        | v1.0           |
| DEC-030 | CI/CD pipeline (GitHub Actions)                 | v1.0           |
| DEC-031 | Performance monitoring                          | v1.1           |
| DEC-032 | Accessibility (a11y) requirements               | v1.2           |
| DEC-033 | Mobile companion app                            | v2.0           |
| DEC-034 | Cloud sync architecture                         | v1.1           |
| DEC-035 | API rate limiting and caching                   | v1.0           |

---

## Changelog de Decisiones

| Fecha     | Decision      | Cambio                        |
|-----------|---------------|-------------------------------|
| 2026-06-01 | DEC-001 a 025 | Creacion inicial del documento |

---

> Este documento es vivo y se actualiza conforme se toman nuevas decisiones o se reevaluan las existentes.
