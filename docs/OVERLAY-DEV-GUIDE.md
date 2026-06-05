# Guia de Desarrollo de Overlays — Vantare Overlays

> Guia completa para desarrolladores que quieran crear nuevos overlays en el proyecto Vantare Overlays.
> Stack: React + TypeScript + Tailwind + SSE + Bun/Fastify.

---

## 1. Introduccion

### 1.1 Que es un Overlay en Vantare

Un overlay en Vantare es un **componente React autonomo** que se renderiza como una pagina HTML independiente y se conecta al backend via **SSE (Server-Sent Events)** para recibir datos de telemetria en tiempo real. Cada overlay se sirve como una URL que puede cargarse como **Browser Source** en OBS Studio.

Los overlays no son iframes ni ventanas Electron — son paginas HTML puras con fondo transparente, disenadas para superponerse sobre el stream de video sin consumir recursos innecesarios.

### 1.2 Tipos de Overlay

| Tipo | Descripcion | Ejemplo |
|------|-------------|---------|
| **Racing Overlay** | Muestra datos de telemetria del sim (posiciones, gaps, fuel, RPM) | Standings, Relative, Fuel, Delta Bar |
| **Streaming Overlay** | Contenido para el stream (chat, alertas, banners) | Chat, Alertas, Texto Custom |
| **Hub UI** | Interfaz de configuracion (NO es un overlay, es la app principal) | Pagina de settings en `/hub` |

### 1.3 Ciclo de Vida de un Overlay

```
1. Registro     → El overlay se registra en el overlay registry
2. Config       → Se define el schema de configuracion (Zod)
3. Rutas        → Se anade la ruta HTTP en el servidor Fastify
4. Componente   → Se escribe el componente React principal
5. Datos        → Se conecta al SSE stream via useTelemetry()
6. Render       → Se renderiza con fondo transparente
7. OBS          → Se carga la URL como Browser Source
8. Config       → El usuario configura opciones desde el Hub
```

### 1.4 Arquitectura General

```
Python Sidecar (LMU Shared Memory)
        |
        v HTTP :4000
   Bun/Fastify Server (:3000)
        |
        |-- GET /overlays/:name    → Pagina HTML standalone
        |-- GET /sse/telemetry     → Stream SSE de telemetria
        |-- GET /sse/streaming     → Stream SSE de chat/alertas
        └-- GET /hub               → UI de configuracion
                |
                v SSE
        Overlay React Component
                |
                v DOM/CSS
        OBS Browser Source (fondo transparente)
```

---

## 2. Estructura de un Overlay

### 2.1 Directorio de un Overlay

Cada overlay vive en `packages/ui/src/overlays/<nombre>/` con esta estructura:

```
packages/ui/src/overlays/standings/
├── Standings.tsx           # Componente principal del overlay
├── StandingsRow.tsx        # Sub-componente para cada fila
├── standings.config.ts     # Configuracion del overlay (schema Zod)
├── standings.test.ts       # Tests unitarios
└── standings.stories.tsx   # Historias de Storybook
```

### 2.2 Convenciones de Nombres

- **Directorio**: `kebab-case` (ej: `standings`, `delta-bar`, `stream-alerts`)
- **Componente principal**: `PascalCase` (ej: `Standings.tsx`, `DeltaBar.tsx`)
- **Sub-componentes**: `PascalCase` con prefijo del overlay (ej: `StandingsRow.tsx`)
- **Config**: `<nombre>.config.ts`
- **Tests**: `<nombre>.test.ts`
- **Stories**: `<nombre>.stories.tsx`
- **Ruta HTTP**: `/overlays/<nombre>` (ej: `/overlays/standings`)

### 2.3 Estructura del Monorepo

```
vantare-overlays/
├── packages/
│   ├── server/                    # Backend (Bun + Fastify)
│   │   └── src/
│   │       ├── adapters/          # Adaptadores por sim (LMU, iRacing, etc.)
│   │       ├── services/          # Servicios (telemetry, gaps, etc.)
│   │       ├── sse/               # Broadcaster SSE
│   │       └── routes/            # Rutas HTTP
│   ├── ui/                        # Frontend (React + Vite + Tailwind)
│   │   └── src/
│   │       ├── overlays/          # ← AQUI VAN LOS OVERLAYS
│   │       ├── hub/               # UI del hub (configurador)
│   │       ├── shared/            # Componentes compartidos
│   │       ├── hooks/             # Hooks (useSSE, useTelemetry, etc.)
│   │       ├── styles/            # Tailwind config + CSS tokens
│   │       └── services/          # Servicios del cliente
│   └── shared/                    # Tipos TypeScript compartidos
│       └── src/
│           ├── types/             # Interfaces TypeScript
│           └── schemas/           # Schemas Zod
├── sidecar/                       # Python sidecar (LMU shared memory)
└── docs/                          # Documentacion
```

---

## 3. Crear un Overlay Paso a Paso

### Paso 1: Crear el Componente del Overlay

Crea el archivo `packages/ui/src/overlays/mi-overlay/MiOverlay.tsx`:

```tsx
import { useTelemetry } from '@vantare/ui-core/hooks';
import { GlassPanel } from '@vantare/ui-core/components';
import type { UnifiedTelemetry } from '@vantare/sim-core';

export function MiOverlay() {
  const telemetry = useTelemetry();

  if (!telemetry.isConnected) {
    return (
      <GlassPanel>
        <span className="text-silver-200 font-mono">
          Esperando conexion...
        </span>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel>
      <h2 className="text-white font-display font-bold text-lg">
        Mi Overlay
      </h2>
      <div className="flex items-center gap-4 mt-2">
        <span className="text-silver-200 font-mono text-sm">
          Velocidad: {telemetry.player.speed} km/h
        </span>
        <span className="text-silver-200 font-mono text-sm">
          Posicion: P{telemetry.player.position}
        </span>
      </div>
    </GlassPanel>
  );
}
```

**Puntos clave:**
- `useTelemetry()` retorna el estado actual de la telemetria en tiempo real
- `telemetry.isConnected` indica si el sim esta conectado y enviando datos
- Usa los componentes compartidos (`GlassPanel`) para mantener consistencia visual
- Usa las clases de Tailwind del design system v22

### Paso 2: Registrar en el Overlay Registry

Crea o edita `packages/ui/src/overlays/registry.ts`:

```ts
import type { ComponentType } from 'react';
import type { z } from 'zod';
import { Standings } from './standings/Standings';
import { standingsConfigSchema, standingsDefaults } from './standings/standings.config';
import { MiOverlay } from './mi-overlay/MiOverlay';
import { miOverlayConfigSchema, miOverlayDefaults } from './mi-overlay/mi-overlay.config';

export interface OverlayDefinition<T extends z.ZodTypeAny> {
  id: string;
  name: string;
  description: string;
  component: ComponentType;
  configSchema: T;
  defaultConfig: z.infer<T>;
  route: string;
  category: 'racing' | 'streaming';
}

export const overlayRegistry: OverlayDefinition<any>[] = [
  {
    id: 'standings',
    name: 'Clasificacion',
    description: 'Tabla de posiciones con gaps y tiempos de vuelta',
    component: Standings,
    configSchema: standingsConfigSchema,
    defaultConfig: standingsDefaults,
    route: '/overlays/standings',
    category: 'racing',
  },
  {
    id: 'mi-overlay',
    name: 'Mi Overlay',
    description: 'Descripcion corta de mi overlay',
    component: MiOverlay,
    configSchema: miOverlayConfigSchema,
    defaultConfig: miOverlayDefaults,
    route: '/overlays/mi-overlay',
    category: 'racing',
  },
];
```

### Paso 3: Crear el Schema de Configuracion

Crea `packages/ui/src/overlays/mi-overlay/mi-overlay.config.ts`:

```ts
import { z } from 'zod';

export const miOverlayConfigSchema = z.object({
  showSpeed: z.boolean().default(true),
  showPosition: z.boolean().default(true),
  fontSize: z.enum(['sm', 'md', 'lg']).default('md'),
  refreshRate: z.number().min(10).max(100).default(20),
});

export type MiOverlayConfig = z.infer<typeof miOverlayConfigSchema>;

export const miOverlayDefaults = miOverlayConfigSchema.parse({});
```

### Paso 4: Anadir la Ruta HTTP en el Servidor

En `packages/server/src/routes/overlays.ts`:

```ts
import type { FastifyInstance } from 'fastify';

export async function overlayRoutes(app: FastifyInstance) {
  app.get('/overlays/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const html = generateOverlayHTML(name);
    return reply.type('text/html').send(html);
  });
}

function generateOverlayHTML(overlayId: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Vantare — ${overlayId}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: transparent; overflow: hidden; }
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/overlays/${overlayId}/entry.tsx"></script>
    </body>
    </html>
  `;
}
```

### Paso 5: Escribir Tests

Crea `packages/ui/src/overlays/mi-overlay/mi-overlay.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MiOverlay } from './MiOverlay';

vi.mock('@vantare/ui-core/hooks', () => ({
  useTelemetry: vi.fn(),
}));

describe('MiOverlay', () => {
  it('muestra esperando conexion cuando no esta conectado', () => {
    const { useTelemetry } = require('@vantare/ui-core/hooks');
    useTelemetry.mockReturnValue({ isConnected: false });

    render(<MiOverlay />);
    expect(screen.getByText('Esperando conexion...')).toBeDefined();
  });

  it('muestra datos de velocidad cuando esta conectado', () => {
    const { useTelemetry } = require('@vantare/ui-core/hooks');
    useTelemetry.mockReturnValue({
      isConnected: true,
      player: { speed: 245, position: 3 },
    });

    render(<MiOverlay />);
    expect(screen.getByText(/Velocidad: 245 km\/h/)).toBeDefined();
    expect(screen.getByText(/Posicion: P3/)).toBeDefined();
  });
});
```

### Paso 6: Anadir Historias de Storybook

Crea `packages/ui/src/overlays/mi-overlay/mi-overlay.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MiOverlay } from './MiOverlay';
import { MockTelemetryProvider } from '@vantare/ui-core/testing';

const meta: Meta<typeof MiOverlay> = {
  title: 'Overlays/MiOverlay',
  component: MiOverlay,
  decorators: [
    (Story) => (
      <MockTelemetryProvider>
        <div style={{ width: 400, background: '#080808', padding: 16 }}>
          <Story />
        </div>
      </MockTelemetryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MiOverlay>;

export const Conectado: Story = {
  args: {},
  parameters: {
    mockTelemetry: {
      isConnected: true,
      player: { speed: 245, position: 3 },
    },
  },
};

export const Desconectado: Story = {
  args: {},
  parameters: {
    mockTelemetry: {
      isConnected: false,
    },
  },
};
```

---

## 4. Consumir Datos de Telemetria

### 4.1 Hook `useTelemetry()`

El hook principal para acceder a datos de telemetria en tiempo real:

```tsx
import { useTelemetry } from '@vantare/ui-core/hooks';

export function MiOverlay() {
  const telemetry = useTelemetry();

  // Estado de conexion
  console.log(telemetry.isConnected);   // boolean

  // Datos del jugador
  console.log(telemetry.player.position);      // number (P1-P99)
  console.log(telemetry.player.driverName);    // string
  console.log(telemetry.player.speed);         // number (km/h)

  // Datos del motor
  console.log(telemetry.engine.rpm);           // number
  console.log(telemetry.engine.maxRpm);        // number
  console.log(telemetry.engine.gear);          // number (-1=R, 0=N, 1-6)
  console.log(telemetry.engine.waterTemp);     // number (Celsius)

  // Datos de neumaticos
  console.log(telemetry.tyres.pressures);      // number[4]
  console.log(telemetry.tyres.temperatures);   // number[4]
  console.log(telemetry.tyres.wear);           // number[4]
  console.log(telemetry.tyres.compound);       // string

  // Datos de vuelta
  console.log(telemetry.lap.lapNumber);        // number
  console.log(telemetry.lap.lastLaptime);      // number (segundos)
  console.log(telemetry.lap.bestLaptime);      // number (segundos)
  console.log(telemetry.lap.fuelRemaining);    // number (litros)

  // Datos de sesion
  console.log(telemetry.session.sessionType);  // string
  console.log(telemetry.session.timeRemaining);// number (segundos)

  // Todos los vehiculos
  console.log(telemetry.vehicles);             // VehicleData[]
}
```

### 4.2 Hook `useSimState()`

Para obtener solo el estado de conexion del sim:

```tsx
import { useSimState } from '@vantare/ui-core/hooks';

export function ConnectionIndicator() {
  const simState = useSimState();

  return (
    <div className={simState.isConnected ? 'bg-green-500' : 'bg-red-500'}>
      {simState.isConnected ? 'Conectado' : 'Desconectado'}
    </div>
  );
}
```

### 4.3 Hook `useTheme()`

Para acceder al tema activo (brandkit v22):

```tsx
import { useTheme } from '@vantare/ui-core/hooks';

export function MiComponente() {
  const theme = useTheme();

  return (
    <div style={{ backgroundColor: theme.colors.dark900 }}>
      <h1 style={{ color: theme.colors.primary, fontFamily: theme.fonts.display }}>
        Titulo con tema activo
      </h1>
      <span style={{ fontFamily: theme.fonts.mono }}>
        Datos con fuente mono
      </span>
    </div>
  );
}
```

### 4.4 Hook `useProfile()`

Para acceder a configuraciones del usuario:

```tsx
import { useProfile } from '@vantare/ui-core/hooks';

export function MiOverlay() {
  const profile = useProfile();

  return (
    <div style={{ fontSize: profile.settings.overlayFontSize }}>
      Texto con tamano configurado por el usuario
    </div>
  );
}
```

### 4.5 Selectores de Zustand para Rendimiento

Cuando necesitas solo una parte de los datos y quieres evitar re-renders innecesarios, usa selectores:

```tsx
import { useTelemetryStore } from '@vantare/ui-core/store';

// ❌ MAL — re-renderiza en CADA cambio de telemetry
export function BadExample() {
  const telemetry = useTelemetryStore((state) => state);
  return <span>{telemetry.player.speed}</span>;
}

// ✅ BIEN — solo re-renderiza cuando cambia `speed`
export function GoodExample() {
  const speed = useTelemetryStore((state) => state.player.speed);
  return <span>{speed}</span>;
}

// ✅ BIEN — selector con igualdad superficial para objects
export function GoodWithObject() {
  const player = useTelemetryStore(
    (state) => ({ speed: state.player.speed, position: state.player.position }),
    (a, b) => a.speed === b.speed && a.position === b.position
  );
  return <span>{player.speed} km/h — P{player.position}</span>;
}
```

### 4.6 Patron Completo con Configuracion

```tsx
import { useTelemetry, useProfile } from '@vantare/ui-core/hooks';
import { GlassPanel, TimeDisplay, PositionBadge } from '@vantare/ui-core/components';
import type { MiOverlayConfig } from './mi-overlay.config';

interface MiOverlayProps {
  config?: MiOverlayConfig;
}

export function MiOverlay({ config }: MiOverlayProps) {
  const telemetry = useTelemetry();
  const profile = useProfile();
  const effectiveConfig = { ...profile.overlays['mi-overlay'], ...config };

  if (!telemetry.isConnected) {
    return (
      <GlassPanel>
        <span className="text-silver-200">Esperando conexion...</span>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel>
      {effectiveConfig.showPosition && (
        <PositionBadge position={telemetry.player.position} />
      )}
      {effectiveConfig.showSpeed && (
        <span className="font-mono text-white">
          {telemetry.player.speed} km/h
        </span>
      )}
    </GlassPanel>
  );
}
```

---

## 5. Componentes Compartidos Disponibles

Los componentes compartidos estan en `packages/ui/src/shared/components/`. Usa estos en lugar de crear componentes desde cero para mantener consistencia visual.

### 5.1 GlassPanel

Contenedor con efecto glass morphism (blur de fondo + borde semi-transparente):

```tsx
import { GlassPanel } from '@vantare/ui-core/components';

// Uso basico
<GlassPanel>
  <p>Contenido con efecto glass</p>
</GlassPanel>

// Con variante de tamano
<GlassPanel padding="sm">
  <p>Panel pequeno</p>
</GlassPanel>

<GlassPanel padding="lg">
  <p>Panel grande con mas padding</p>
</GlassPanel>

// Con glow personalizado
<GlassPanel glow="blood">
  <p>Panel con brillo rojo</p>
</GlassPanel>
```

**Props:**
| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `padding` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tamano del padding interno |
| `glow` | `'none' \| 'blood' \| 'silver'` | `'none'` | Color del corner glow |
| `className` | `string` | `''` | Clases adicionales |

### 5.2 TimeDisplay

Formateo de tiempos de carrera (mm:ss.fff):

```tsx
import { TimeDisplay } from '@vantare/ui-core/components';

// Tiempo en segundos (ej: 95.123 → 1:35.123)
<TimeDisplay time={95.123} />

// Sin milisegundos
<TimeDisplay time={95.123} showMs={false} />

// Con delta (muestra +/- y color)
<TimeDisplay time={95.123} delta={-0.324} showDelta />

// Tiempo de sector (puede ser 0 = sin dato)
<TimeDisplay time={0} placeholder="--:--.---" />
```

**Props:**
| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `time` | `number` | requerido | Tiempo en segundos |
| `showMs` | `boolean` | `true` | Mostrar milisegundos |
| `showDelta` | `boolean` | `false` | Mostrar delta con color |
| `delta` | `number` | `undefined` | Valor del delta (+/-) |
| `placeholder` | `string` | `'--:--.---'` | Texto cuando time es 0 |

### 5.3 PositionBadge

Badge de posicion con codificacion por color (P1-P99):

```tsx
import { PositionBadge } from '@vantare/ui-core/components';

// Posicion normal
<PositionBadge position={5} />

// Posicion en podium (oro, plata, bronce)
<PositionBadge position={1} />  // P1 — dorado
<PositionBadge position={2} />  // P2 — plateado
<PositionBadge position={3} />  // P3 — bronce

// Con variante de tamano
<PositionBadge position={7} size="sm" />
<PositionBadge position={7} size="lg" />
```

**Color coding automatico:**
- P1: `#FFD700` (dorado)
- P2: `#C0C0C0` (plateado)
- P3: `#CD7F32` (bronce)
- P4-P10: `text-primary` (blanco)
- P11+: `text-muted` (gris)

### 5.4 DeltaIndicator

Indicador de delta con +/- y colores:

```tsx
import { DeltaIndicator } from '@vantare/ui-core/components';

// Delta negativo (adelante — verde)
<DeltaIndicator delta={-0.324} />

// Delta positivo (atras — rojo)
<DeltaIndicator delta={0.156} />

// Delta en texto plano (sin color)
<DeltaIndicator delta={-0.324} variant="text" />

// Con formato de vuelta
<DeltaIndicator delta={-0.324} format="lap" />
```

**Props:**
| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `delta` | `number` | requerido | Valor del delta en segundos |
| `variant` | `'badge' \| 'text'` | `'badge'` | Estilo visual |
| `format` | `'time' \| 'lap'` | `'time'` | Formato de display |

**Color coding:**
- Delta < 0: Verde (adelante)
- Delta > 0: Rojo (atras)
- Delta === 0: Gris (empate)

### 5.5 DriverRow

Fila completa de informacion de piloto:

```tsx
import { DriverRow } from '@vantare/ui-core/components';

<DriverRow
  position={3}
  driverName="M. Verstappen"
  team="Red Bull Racing"
  gap={-1.234}
  gapType="seconds"
  lastLaptime={92.456}
  bestLaptime={91.789}
  isPlayer={false}
/>

// Fila del jugador (resaltada)
<DriverRow
  position={5}
  driverName="Tu Nombre"
  team="Mi Equipo"
  gap={0.0}
  gapType="seconds"
  lastLaptime={92.123}
  bestLaptime={91.567}
  isPlayer={true}
/>
```

**Props:**
| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `position` | `number` | requerido | Posicion en carrera |
| `driverName` | `string` | requerido | Nombre del piloto |
| `team` | `string` | `''` | Equipo/constructor |
| `gap` | `number` | requerido | Gap en segundos |
| `gapType` | `'seconds' \| 'laps'` | `'seconds'` | Tipo de gap |
| `lastLaptime` | `number` | `undefined` | Tiempo de ultima vuelta |
| `bestLaptime` | `number` | `undefined` | Mejor tiempo de vuelta |
| `isPlayer` | `boolean` | `false` | Si es el jugador actual |

### 5.6 RevLights

Indicador de RPM con luces:

```tsx
import { RevLights } from '@vantare/ui-core/components';

// RPM actual vs maximo
<RevLights rpm={8500} maxRpm={12000} />

// Con tamano personalizado
<RevLights rpm={8500} maxRpm={12000} width={200} height={20} />

// Con modo compacto (solo barras, sin texto)
<RevLights rpm={8500} maxRpm={12000} variant="compact" />
```

**Comportamiento:**
- 0-60% RPM: Verde
- 60-85% RPM: Amarillo
- 85-100% RPM: Rojo
- Flash cuando esta en zona de cambio

### 5.7 TyreWidget

Widget de neumaticos con compuesto y desgaste:

```tsx
import { TyreWidget } from '@vantare/ui-core/components';

<TyreWidget
  compound="Soft"
  pressures={[26.1, 26.3, 26.0, 26.2]}
  temperatures={[95, 97, 93, 94]}
  wear={[15, 18, 12, 14]}
/>

// Sin desgaste (solo compound y presiones)
<TyreWidget
  compound="Medium"
  pressures={[25.8, 25.9, 25.7, 25.8]}
/>
```

**Compounds y colores:**
- `Soft`: Rojo
- `Medium`: Amarillo
- `Hard`: Blanco
- `Wet`: Azul
- `Intermediate`: Verde

### 5.8 FuelGauge

Barra de nivel de combustible:

```tsx
import { FuelGauge } from '@vantare/ui-core/components';

// Nivel actual vs capacidad maxima
<FuelGauge current={45.2} max={110} />

// Con laps restantes
<FuelGauge
  current={45.2}
  max={110}
  lapsRemaining={12}
  consumptionPerLap={3.8}
/>

// Variante circular (estilo v22)
<FuelGauge
  current={45.2}
  max={110}
  variant="circular"
  size={120}
/>
```

**Color coding:**
- > 50%: Plateado (normal)
- 25-50%: Amarillo (precaucion)
- < 25%: Blood/rojo (alerta)

---

## 6. Configuracion del Overlay

### 6.1 Definicion del Schema

Cada overlay define su schema de configuracion con Zod:

```ts
// packages/ui/src/overlays/standings/standings.config.ts
import { z } from 'zod';

export const standingsConfigSchema = z.object({
  maxDrivers: z.number().min(1).max(99).default(20),
  showClassColor: z.boolean().default(true),
  highlightPlayer: z.boolean().default(true),
  sortBy: z.enum(['position', 'gap', 'name']).default('position'),
  fontSize: z.enum(['xs', 'sm', 'md', 'lg']).default('sm'),
  showLapTimes: z.boolean().default(true),
  showGaps: z.boolean().default(true),
});

export type StandingsConfig = z.infer<typeof standingsConfigSchema>;

export const standingsDefaults = standingsConfigSchema.parse({});
```

### 6.2 UI Auto-Generada para Settings

El Hub lee los schemas Zod y genera la UI de configuracion automaticamente:

```tsx
// packages/ui/src/hub/components/ConfigPanel.tsx
import { z } from 'zod';

interface ConfigPanelProps {
  schema: z.ZodObject<any>;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function ConfigPanel({ schema, values, onChange }: ConfigPanelProps) {
  const shape = schema.shape;

  return (
    <div className="space-y-4">
      {Object.entries(shape).map(([key, fieldSchema]) => {
        const field = fieldSchema as z.ZodAny;

        if (field instanceof z.ZodBoolean) {
          return (
            <label key={key} className="flex items-center gap-2 text-silver-200">
              <input
                type="checkbox"
                checked={values[key] ?? false}
                onChange={(e) => onChange(key, e.target.checked)}
              />
              {key}
            </label>
          );
        }

        if (field instanceof z.ZodNumber) {
          return (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-silver-200 text-sm">{key}</label>
              <input
                type="range"
                min={field._def.minimum}
                max={field._def.maximum}
                value={values[key] ?? 0}
                onChange={(e) => onChange(key, Number(e.target.value))}
              />
            </div>
          );
        }

        if (field instanceof z.ZodEnum) {
          return (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-silver-200 text-sm">{key}</label>
              <select
                value={values[key] ?? ''}
                onChange={(e) => onChange(key, e.target.value)}
                className="bg-dark-700 text-white p-2 rounded"
              >
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
```

### 6.3 Persistencia de Configuracion

La configuracion se guarda en `localStorage` del browser y se sincroniza con el Hub:

```ts
// packages/ui/src/services/configStorage.ts
import type { StandingsConfig } from '../overlays/standings/standings.config';

const STORAGE_KEY = 'vantare-overlay-configs';

export function saveOverlayConfig(overlayId: string, config: Record<string, any>) {
  const all = getAllConfigs();
  all[overlayId] = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getOverlayConfig(overlayId: string): Record<string, any> | null {
  const all = getAllConfigs();
  return all[overlayId] ?? null;
}

function getAllConfigs(): Record<string, any> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}
```

### 6.4 Valores por Defecto

Siempre define valores por defecto seguros en el schema:

```ts
// Los defaults se usan cuando:
// 1. El usuario no ha configurado nada
// 2. El overlay se carga por primera vez
// 3. La config es invalida (fallback seguro)

export const miConfigSchema = z.object({
  showSpeed: z.boolean().default(true),          // Seguro: true
  maxItems: z.number().min(1).max(50).default(10), // Seguro: 10
  color: z.enum(['auto', 'blood', 'silver']).default('auto'),
});
```

---

## 7. Rendimiento

### 7.1 React.memo para Componentes Puros

Envuelve componentes que no dependen de props cambiantes frecuentemente:

```tsx
import { memo } from 'react';

// ❌ Re-renderiza en cada tick de telemetry
export function DriverRowRaw({ position, name, gap }) {
  return (
    <div className="flex gap-2">
      <PositionBadge position={position} />
      <span>{name}</span>
      <span>{gap}</span>
    </div>
  );
}

// ✅ Solo re-renderiza cuando cambian las props
export const DriverRow = memo(DriverRowRaw, (prev, next) => {
  return (
    prev.position === next.position &&
    prev.name === next.name &&
    prev.gap === next.gap
  );
});
```

### 7.2 Patron de Selectores Zustand

```tsx
import { useTelemetryStore } from '@vantare/ui-core/store';

// ❌ MAL — re-renderiza en cada cambio
const telemetry = useTelemetryStore((s) => s);

// ✅ BIEN — selector granular
const speed = useTelemetryStore((s) => s.player.speed);

// ✅ BIEN — multi-selector con shallow equality
const { speed, gear, rpm } = useTelemetryStore(
  (s) => ({
    speed: s.player.speed,
    gear: s.engine.gear,
    rpm: s.engine.rpm,
  }),
  shallow
);
```

### 7.3 CSS vs JavaScript para Animaciones

**Usa CSS transitions para todo lo que sea animacion visual:**

```css
/* ✅ BIEN — GPU-accelerated, no bloquea el main thread */
.gap-delta {
  transition: color 150ms ease-out;
}

.position-change {
  transition: transform 250ms ease-out;
}

.glass-panel {
  transition: opacity 150ms ease-out;
}

/* ✅ BIEN — will-change para transform/opacity */
.animated-element {
  will-change: transform, opacity;
}
```

```tsx
// ❌ MAL — JavaScript animation en cada frame
useEffect(() => {
  const animate = () => {
    element.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(animate);
  };
  animate();
}, [x]);
```

### 7.4 Estrategias de Anti-Re-Render

```tsx
// 1. Separar datos estaticos de dinamicos
function MiOverlay() {
  const staticData = useProfile();                    // No cambia seguido
  const speed = useTelemetryStore((s) => s.player.speed); // Cambia a 20Hz

  return (
    <div>
      <StaticHeader profile={staticData} />           {/* No re-renderiza */}
      <SpeedDisplay speed={speed} />                   {/* Re-renderiza */}
    </div>
  );
}

// 2. Usar useRef para valores que no necesitan render
function MiOverlay() {
  const lastUpdateRef = useRef(0);
  const speed = useTelemetryStore((s) => s.player.speed);

  // Solo actualizar si paso suficiente tiempo
  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 50) { // 20fps max
      lastUpdateRef.current = now;
      // Actualizar display
    }
  }, [speed]);

  return <span>{displaySpeed}</span>;
}

// 3. Separar overlays en componentes aislados
// Cada overlay es su propio SSE connection — no re-renderizan entre si
```

### 7.5 Medir Rendimiento

```tsx
// En desarrollo, anade esto temporalmente para medir re-renders
function useRenderCount(componentName: string) {
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });

  return renderCount.current;
}

// Uso
export function MiOverlay() {
  useRenderCount('MiOverlay');
  // ...
}
```

**Objetivos de rendimiento:**
- Overlays individuales: < 2ms por render
- SSE update → display: < 50ms latency total
- Uso de GPU: < 5% en idle
- Memoria: < 50MB por overlay activo

---

## 8. Testing Overlays

### 8.1 Unit Tests con Vitest

```ts
// packages/ui/src/overlays/standings/standings.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Standings } from './Standings';
import { createMockTelemetry } from '@vantare/ui-core/testing';

describe('Standings Overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra mensaje de espera cuando no hay conexion', () => {
    vi.mock('@vantare/ui-core/hooks', () => ({
      useTelemetry: () => ({ isConnected: false }),
    }));

    render(<Standings />);
    expect(screen.getByText(/Esperando conexion/)).toBeDefined();
  });

  it('renderiza tabla de posiciones con datos', () => {
    vi.mock('@vantare/ui-core/hooks', () => ({
      useTelemetry: () => ({
        isConnected: true,
        vehicles: [
          { id: 1, position: 1, driverName: 'Piloto A', gap: 0, gapType: 'seconds' },
          { id: 2, position: 2, driverName: 'Piloto B', gap: 1.5, gapType: 'seconds' },
        ],
        player: { position: 2, driverName: 'Piloto B' },
      }),
    }));

    render(<Standings />);
    expect(screen.getByText('Piloto A')).toBeDefined();
    expect(screen.getByText('Piloto B')).toBeDefined();
  });

  it('resalta la fila del jugador', () => {
    vi.mock('@vantare/ui-core/hooks', () => ({
      useTelemetry: () => ({
        isConnected: true,
        vehicles: [
          { id: 1, position: 1, driverName: 'Piloto A', gap: 0 },
          { id: 2, position: 2, driverName: 'Jugador', gap: 1.5, isPlayer: true },
        ],
        player: { position: 2, driverName: 'Jugador' },
      }),
    }));

    render(<Standings />);
    const playerRow = screen.getByText('Jugador').closest('tr');
    expect(playerRow?.className).toContain('blood');
  });

  it('limita la cantidad de conductores mostrados', () => {
    const config = { maxDrivers: 3 };
    vi.mock('@vantare/ui-core/hooks', () => ({
      useTelemetry: () => ({
        isConnected: true,
        vehicles: Array.from({ length: 10 }, (_, i) => ({
          id: i,
          position: i + 1,
          driverName: `Piloto ${i + 1}`,
          gap: i * 0.5,
        })),
        player: { position: 1 },
      }),
    }));

    render(<Standings config={config} />);
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(3); // Solo 3 filas (sin header)
  });
});
```

### 8.2 Mock de Datos de Telemetria

```ts
// packages/ui/src/testing/mockTelemetry.ts
import type { UnifiedTelemetry } from '@vantare/sim-core';

export function createMockTelemetry(overrides?: Partial<UnifiedTelemetry>): UnifiedTelemetry {
  return {
    isConnected: true,
    engine: {
      gear: 3,
      rpm: 8500,
      maxRpm: 12000,
      waterTemp: 92,
      oilTemp: 105,
    },
    player: {
      driverName: 'Test Driver',
      position: 5,
      classPosition: 3,
      speed: 245,
    },
    tyres: {
      pressures: [26.1, 26.3, 26.0, 26.2],
      temperatures: [95, 97, 93, 94],
      wear: [15, 18, 12, 14],
      compound: 'Soft',
    },
    brakes: {
      temperatures: [450, 460, 440, 445],
      biasFront: 55,
    },
    lap: {
      lapNumber: 12,
      lastLaptime: 92.456,
      bestLaptime: 91.789,
      sector1: 30.123,
      sector2: 31.456,
      fuelRemaining: 45.2,
      fuelConsumption: 3.8,
      lapsRemaining: 11,
    },
    session: {
      sessionType: 'Race',
      timeRemaining: 1800,
      lapsRemaining: 20,
    },
    vehicles: [
      { id: 1, driverName: 'Leader', position: 1, gap: 0, gapType: 'seconds', isPlayer: false },
      { id: 2, driverName: 'P2 Driver', position: 2, gap: 1.234, gapType: 'seconds', isPlayer: false },
      { id: 3, driverName: 'P3 Driver', position: 3, gap: 2.567, gapType: 'seconds', isPlayer: false },
    ],
    ...overrides,
  };
}
```

### 8.3 Component Tests con React Testing Library

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PositionBadge } from './PositionBadge';

describe('PositionBadge', () => {
  it('muestra la posicion correcta', () => {
    render(<PositionBadge position={5} />);
    expect(screen.getByText('P5')).toBeDefined();
  });

  it('aplica color dorado para P1', () => {
    render(<PositionBadge position={1} />);
    const badge = screen.getByText('P1');
    expect(badge.className).toContain('gold');
  });

  it('aplica color plateado para P2', () => {
    render(<PositionBadge position={2} />);
    const badge = screen.getByText('P2');
    expect(badge.className).toContain('silver');
  });

  it('respeta el tamano prop', () => {
    render(<PositionBadge position={5} size="lg" />);
    const badge = screen.getByText('P5');
    expect(badge.className).toContain('text-lg');
  });
});
```

### 8.4 E2E Tests con Playwright

```ts
// tests/e2e/standings.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Standings Overlay', () => {
  test('renderiza correctamente con datos mock', async ({ page }) => {
    // Mock del endpoint SSE
    await page.route('**/sse/telemetry', async (route) => {
      const stream = new ReadableStream({
        start(controller) {
          const data = JSON.stringify({
            isConnected: true,
            vehicles: [
              { id: 1, position: 1, driverName: 'Leader', gap: 0 },
              { id: 2, position: 2, driverName: 'P2', gap: 1.5 },
            ],
            player: { position: 2 },
          });
          controller.enqueue(`data: ${data}\n\n`);
          controller.close();
        },
      });

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: stream,
      });
    });

    await page.goto('http://localhost:3000/overlays/standings');
    await page.waitForTimeout(2000);

    // Verificar que la tabla existe
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Verificar datos
    await expect(page.getByText('Leader')).toBeVisible();
    await expect(page.getByText('P2')).toBeVisible();

    // Screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/standings.png' });
  });

  test('fondo es transparente para OBS', async ({ page }) => {
    await page.goto('http://localhost:3000/overlays/standings');
    const bg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(bg).toBe('rgba(0, 0, 0, 0)');
  });
});
```

---

## 9. Storybook

### 9.1 Crear Historias para Overlays

```tsx
// packages/ui/src/overlays/standings/standings.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Standings } from './Standings';
import { MockTelemetryProvider } from '@vantare/ui-core/testing';

const meta: Meta<typeof Standings> = {
  title: 'Overlays/Standings',
  component: Standings,
  decorators: [
    (Story) => (
      <MockTelemetryProvider>
        <div style={{
          width: 500,
          background: '#080808',
          padding: 16,
          borderRadius: 8,
        }}>
          <Story />
        </div>
      </MockTelemetryProvider>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080808' }],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Standings>;

export const Default: Story = {
  parameters: {
    mockTelemetry: {
      isConnected: true,
      vehicles: [
        { id: 1, position: 1, driverName: 'Max Verstappen', gap: 0, gapType: 'seconds', isPlayer: false },
        { id: 2, position: 2, driverName: 'Lewis Hamilton', gap: 2.456, gapType: 'seconds', isPlayer: false },
        { id: 3, position: 3, driverName: 'Tu Nombre', gap: 5.123, gapType: 'seconds', isPlayer: true },
        { id: 4, position: 4, driverName: 'Charles Leclerc', gap: 8.789, gapType: 'seconds', isPlayer: false },
        { id: 5, position: 5, driverName: 'Lando Norris', gap: 12.345, gapType: 'seconds', isPlayer: false },
      ],
      player: { position: 3, driverName: 'Tu Nombre' },
    },
  },
};

export const Desconectado: Story = {
  parameters: {
    mockTelemetry: { isConnected: false },
  },
};

export const MuchosPilotos: Story = {
  parameters: {
    mockTelemetry: {
      isConnected: true,
      vehicles: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        position: i + 1,
        driverName: `Piloto ${String(i + 1).padStart(2, '0')}`,
        gap: i * 2.5,
        gapType: 'seconds',
        isPlayer: i === 14,
      })),
      player: { position: 15 },
    },
  },
};
```

### 9.2 Mock Data Provider

```tsx
// packages/ui/src/testing/MockTelemetryProvider.tsx
import { createContext, useContext } from 'react';
import type { UnifiedTelemetry } from '@vantare/sim-core';
import { createMockTelemetry } from './mockTelemetry';

interface MockTelemetryContextValue {
  telemetry: UnifiedTelemetry;
}

const MockTelemetryContext = createContext<MockTelemetryContextValue>({
  telemetry: createMockTelemetry(),
});

export function MockTelemetryProvider({
  children,
  telemetry,
}: {
  children: React.ReactNode;
  telemetry?: UnifiedTelemetry;
}) {
  return (
    <MockTelemetryContext.Provider
      value={{ telemetry: telemetry ?? createMockTelemetry() }}
    >
      {children}
    </MockTelemetryContext.Provider>
  );
}

export function useMockTelemetry() {
  return useContext(MockTelemetryContext).telemetry;
}
```

### 9.3 Theme Switching en Stories

```tsx
// .storybook/preview.tsx
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#080808' },
        { name: 'darker', value: '#0D0D0D' },
        { name: 'card', value: '#141414' },
        { name: 'transparent', value: 'transparent' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

---

## 10. Integracion con OBS

### 10.1 Formato de URL para Browser Sources

Cada overlay es una pagina HTML independiente accesible via URL:

```
http://localhost:3000/overlays/standings
http://localhost:3000/overlays/relative
http://localhost:3000/overlays/fuel
http://localhost:3000/overlays/delta-bar
http://localhost:3000/overlays/streaming
```

### 10.2 Configuracion de Fondo Transparente

Asegurate de que tu overlay tenga fondo transparente:

```css
/* En tu componente o en el HTML base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: transparent;
  overflow: hidden;
}

/* El componente GlassPanel ya maneja el backdrop-filter */
```

### 10.3 Settings Recomendados para OBS

| Setting | Valor | Razon |
|---------|-------|-------|
| **Width** | 1920 (o tamano del overlay) | Resolucion de tu escena |
| **Height** | 1080 (o tamano del overlay) | Resolucion de tu escena |
| **FPS** | 30 | Suficiente para overlays de telemetria |
| **Shutdown source when not visible** | Desactivado | Mantiene la conexion SSE activa |
| **Refresh when active** | Activado | Actualiza datos al volver a visible |

### 10.4 Configuracion Multi-Monitor

Para usar overlays en diferentes pantallas:

```
Monitor 1 (Game): Sin overlays
Monitor 2 (OBS Primary):
  - Browser Source: http://localhost:3000/overlays/standings
  - Browser Source: http://localhost:3000/overlays/relative
Monitor 3 (OBS Secondary):
  - Browser Source: http://localhost:3000/overlays/fuel
  - Browser Source: http://localhost:3000/overlays/delta-bar
```

Cada Browser Source en OBS puede configurarse independientemente con su URL, tamano y posicion.

### 10.5 Script de PowerShell para Iniciar Todo

```powershell
# start-vantare.ps1
Write-Host "Iniciando Vantare Overlays..." -ForegroundColor Cyan

# Iniciar sidecar
Write-Host "Iniciando sidecar de telemetria..." -ForegroundColor Yellow
Start-Process -FilePath "python" `
  -ArgumentList "main.py --offline" `
  -WorkingDirectory ".\sidecar"

# Esperar a que el sidecar este listo
Start-Sleep -Seconds 2

# Iniciar servidor backend
Write-Host "Iniciando servidor backend..." -ForegroundColor Yellow
Start-Process -FilePath "bun" `
  -ArgumentList "run dev" `
  -WorkingDirectory ".\packages\server"

# Esperar a que el servidor este listo
Start-Sleep -Seconds 2

# Iniciar frontend
Write-Host "Iniciando frontend..." -ForegroundColor Yellow
Start-Process -FilePath "bun" `
  -ArgumentList "run dev" `
  -WorkingDirectory ".\packages\ui"

Start-Sleep -Seconds 3

Write-Host "Vantare Overlays listo!" -ForegroundColor Green
Write-Host "Hub:       http://localhost:3000/hub" -ForegroundColor White
Write-Host "Standings: http://localhost:3000/overlays/standings" -ForegroundColor White
Write-Host "Relative:  http://localhost:3000/overlays/relative" -ForegroundColor White
Write-Host "Fuel:      http://localhost:3000/overlays/fuel" -ForegroundColor White
```

---

## 11. Overlays v1 — Especificacion Detallada

### 11.1 Standings (Clasificacion)

**URL:** `/overlays/standings`

**Funcionalidades:**
- Tabla de posiciones con todos los vehiculos en carrera
- Columnas: Posicion, Nombre, Clase, Gap, Ultima Vuelta, Mejor Vuelta
- Resaltado de fila del jugador con accent blood
- Colores por clase (multi-class: LMP1, LMGTE, etc.)
- Ordenamiento por posicion
- Soporte para hasta 99 vehiculos

**Opciones de Configuracion:**
```ts
const standingsConfigSchema = z.object({
  maxDrivers: z.number().min(1).max(99).default(20),
  showClassColor: z.boolean().default(true),
  highlightPlayer: z.boolean().default(true),
  sortBy: z.enum(['position', 'gap', 'name']).default('position'),
  fontSize: z.enum(['xs', 'sm', 'md', 'lg']).default('sm'),
  showLapTimes: z.boolean().default(true),
  showGaps: z.boolean().default(true),
});
```

**Diagrama de Layout:**
```
+---------------------------------------------+
| CLASIFICACION                     Race  L12 |
+-----+--------------+------+-------+---------+
| P1  | Max Verstappen| RED  | +0.00 | 1:31.456|
| P2  | Lewis Hamilton| MER  | +2.45 | 1:31.789|
|>P3> | Tu Nombre     | FER  | +5.12 | 1:31.234|  <- Jugador
| P4  | Charles Leclerc| FER | +8.78 | 1:32.012|
| P5  | Lando Norris  | MCL  | +12.34| 1:32.345|
+-----+--------------+------+-------+---------+
```

### 11.2 Relative (Relativo)

**URL:** `/overlays/relative`

**Funcionalidades:**
- Muestra 3 coches delante y 3 detras del jugador
- Gap calculado con interpolacion en tiempo real
- Color coding: Rojo (adelante), Verde (detras)
- Gap display: segundos (cercano) o vueltas (lejano)
- Posicion del jugador siempre visible

**Algoritmo de Calculo de Gap:**
```ts
function calculateGap(
  playerLapTime: number,
  targetLapTime: number,
  lapsBehind: number
): GapResult {
  const timeGap = targetLapTime - playerLapTime;

  if (Math.abs(lapsBehind) >= 1) {
    return { value: Math.abs(lapsBehind), type: 'laps' };
  }

  return { value: timeGap, type: 'seconds' };
}

function interpolateGap(
  currentGap: number,
  previousGap: number,
  alpha: number = 0.3
): number {
  // Suavizado exponencial para evitar saltos
  return previousGap + alpha * (currentGap - previousGap);
}
```

**Metodos de Interpolacion:**
- **Alpha 0.3**: Suave, ideal para gaps estables
- **Alpha 0.7**: Reactivo, ideal para gaps que cambian rapido
- **Fallback**: Si no hay datos previos, usar el valor actual sin interpolar

**Opciones de Configuracion:**
```ts
const relativeConfigSchema = z.object({
  carsAhead: z.number().min(1).max(10).default(3),
  carsBehind: z.number().min(1).max(10).default(3),
  interpolationAlpha: z.number().min(0.1).max(1.0).default(0.3),
  showClassColor: z.boolean().default(true),
  highlightPlayer: z.boolean().default(true),
});
```

**Diagrama de Layout:**
```
+-------------------------------+
|      <- ADELANTE              |
|  P2  Lewis Hamilton  +2.45   |  <- Rojo
|  P3  Charles Leclerc +5.12   |  <- Rojo
|  P4  Lando Norris    +8.78   |  <- Rojo
+-------------------------------+
| >>  TU NOMBRE           P5   |  <- Jugador (Blood)
+-------------------------------+
|  P6  Carlos Sainz   -1.23    |  <- Verde
|  P7  George Russell  -3.45   |  <- Verde
|  P8  Fernando Alonso -6.78   |  <- Verde
|      DETRAS ->                |
+-------------------------------+
```

### 11.3 Delta Bar (Barra de Delta)

**URL:** `/overlays/delta-bar`

**Funcionalidades:**
- Barra visual mostrando delta vs mejor vuelta/personal best
- Delta en tiempo real con colores
- Tiempo predicho de vuelta
- Indicador visual de ganancia/perdida por sector

**Calculo del Delta:**
```ts
function calculateDelta(
  currentTime: number,
  referenceTime: number,
  currentSector: number,
  sectorTimes: number[],
  referenceSectorTimes: number[]
): DeltaResult {
  const sectorDelta = currentSector - referenceSectorTimes[currentSector];
  const totalDelta = currentTime - referenceTime;

  return {
    sectorDelta,
    totalDelta,
    predictedLapTime: referenceTime + totalDelta,
    isImproving: totalDelta < 0,
  };
}
```

**Umbrales de Color:**
| Delta | Color | Significado |
|-------|-------|-------------|
| < -0.5s | Verde brillante | Ganando tiempo |
| -0.5s a -0.1s | Verde suave | Levemente mejor |
| -0.1s a +0.1s | Gris/Plata | Empate |
| +0.1s a +0.5s | Rojo suave | Levemente peor |
| > +0.5s | Rojo brillante | Perdiendo tiempo |

**Opciones de Configuracion:**
```ts
const deltaBarConfigSchema = z.object({
  reference: z.enum(['best', 'personal', 'predicted']).default('best'),
  showTime: z.boolean().default(true),
  showPredicted: z.boolean().default(true),
  barWidth: z.number().min(100).max(500).default(300),
  barHeight: z.number().min(10).max(50).default(20),
});
```

### 11.4 Stream Alerts (Alertas de Streaming)

**URL:** `/overlays/streaming`

**Funcionalidades:**
- Sistema de colas para alertas
- Multiples tipos de alerta
- Animaciones de entrada/salida
- Integracion con OBS via SSE

**Tipos de Alerta:**
| Tipo | Icono | Duracion | Animacion |
|------|-------|----------|-----------|
| **Overtake** | Chequera | 3s | Slide-in desde la izquierda |
| **Pole Position** | Corona | 5s | Pop-in con glow |
| **Fastest Lap** | Rayo | 4s | Flash + slide-in |
| **Personal Best** | Estrella | 3s | Fade-in suave |
| **Podium** | Trofeo | 5s | Scale-in con brillo |

**Sistema de Colas:**
```ts
interface Alert {
  id: string;
  type: 'overtake' | 'pole' | 'fastest_lap' | 'personal_best' | 'podium';
  message: string;
  timestamp: number;
  duration: number;
}

class AlertQueue {
  private queue: Alert[] = [];
  private current: Alert | null = null;

  enqueue(alert: Alert) {
    this.queue.push(alert);
    this.processNext();
  }

  private processNext() {
    if (this.current || this.queue.length === 0) return;

    this.current = this.queue.shift()!;
    this.display(this.current);

    setTimeout(() => {
      this.current = null;
      this.processNext();
    }, this.current.duration);
  }

  private display(alert: Alert) {
    // Renderizar alerta con animacion
  }
}
```

**Patrones de Animacion:**
```css
/* Slide-in desde la izquierda */
@keyframes slide-in-left {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Pop-in con glow */
@keyframes pop-in {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

/* Flash */
@keyframes flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Scale-in con brillo */
@keyframes scale-glow {
  0% {
    transform: scale(0);
    box-shadow: 0 0 0 rgba(114, 26, 26, 0);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 30px rgba(114, 26, 26, 0.5);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 10px rgba(114, 26, 26, 0.3);
  }
}
```

**Integracion con OBS:**
```
1. Abre OBS Studio
2. Anade un Browser Source
3. URL: http://localhost:3000/overlays/streaming
4. Width: 1920, Height: 1080
5. Activa "Shutdown source when not visible" = OFF
6. Activa "Refresh when active" = ON
7. Ajusta la posicion en tu escena
```

---

## 12. Best Practices

### 12.1 Separacion de Concerns

```tsx
// ❌ MAL — logica de negocio en el componente
export function Standings() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const es = new EventSource('/sse/telemetry');
    es.onmessage = (e) => setData(JSON.parse(e.data));
    return () => es.close();
  }, []);

  const sortedVehicles = data?.vehicles
    ?.sort((a, b) => a.position - b.position)
    ?.slice(0, 20);

  return (
    <table>
      {sortedVehicles?.map(v => (
        <tr key={v.id}>
          <td>{v.position}</td>
          <td>{v.driverName}</td>
        </tr>
      ))}
    </table>
  );
}

// ✅ BIEN — separacion clara
// hook para datos
function useSortedVehicles(maxDrivers: number) {
  const vehicles = useTelemetryStore((s) => s.vehicles);
  return useMemo(
    () => vehicles
      .sort((a, b) => a.position - b.position)
      .slice(0, maxDrivers),
    [vehicles, maxDrivers]
  );
}

// componente puro
export function Standings({ config }: { config: StandingsConfig }) {
  const vehicles = useSortedVehicles(config.maxDrivers);

  return (
    <GlassPanel>
      <StandingsHeader />
      <StandingsTable vehicles={vehicles} config={config} />
    </GlassPanel>
  );
}
```

### 12.2 TypeScript Strict Mode

```ts
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

```tsx
// ❌ MAL — any types
function processData(data: any) {
  return data.something.nested.value;
}

// ✅ BIEN — tipos explicitos
function processData(data: UnifiedTelemetry) {
  return data.engine.rpm;
}

// ✅ BIEN — tipos para props
interface SpeedDisplayProps {
  speed: number;
  unit?: 'km/h' | 'mph';
  precision?: number;
}

function SpeedDisplay({ speed, unit = 'km/h', precision = 0 }: SpeedDisplayProps) {
  return (
    <span className="font-mono text-white">
      {speed.toFixed(precision)} {unit}
    </span>
  );
}
```

### 12.3 Error Boundaries

```tsx
// packages/ui/src/shared/components/OverlayErrorBoundary.tsx
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class OverlayErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Overlay error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="bg-dark-900 text-red-400 p-4 font-mono text-sm">
          <p>Error en el overlay:</p>
          <p className="text-red-300 mt-1">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Uso en el entry point del overlay
import { OverlayErrorBoundary } from '@vantare/ui-core/components';

function OverlayEntry() {
  return (
    <OverlayErrorBoundary>
      <MiOverlay />
    </OverlayErrorBoundary>
  );
}
```

### 12.4 Accesibilidad (para Hub UI)

```tsx
// ✅ Elementos interactivos accesibles
<button
  onClick={handleClick}
  aria-label="Activar overlay de clasificacion"
  role="switch"
  aria-checked={isEnabled}
>
  Standings
</button>

// ✅ Navegacion por teclado
<nav role="navigation" aria-label="Navegacion principal">
  <ul>
    <li><a href="/hub/overlays" aria-current="page">Overlays</a></li>
    <li><a href="/hub/layouts">Layouts</a></li>
    <li><a href="/hub/settings">Settings</a></li>
  </ul>
</nav>

// ✅ Labels en inputs
<label htmlFor="max-drivers">Maximo de pilotos</label>
<input
  id="max-drivers"
  type="range"
  min={1}
  max={99}
  value={config.maxDrivers}
  onChange={handleChange}
  aria-valuemin={1}
  aria-valuemax={99}
  aria-valuenow={config.maxDrivers}
/>
```

### 12.5 Mobile Responsiveness (para Hub UI)

```tsx
// Tailwind breakpoints para el Hub
<div className="
  grid grid-cols-1
  md:grid-cols-2
  lg:grid-cols-3
  gap-4
">
  {overlays.map(overlay => (
    <OverlayCard key={overlay.id} overlay={overlay} />
  ))}
</div>

// Sidebar responsive
<nav className="
  fixed bottom-0 w-full
  md:fixed md:left-0 md:top-0 md:w-64 md:h-screen
  bg-dark-800
">
  {/* Nav items */}
</nav>
```

---

## 13. Comandos Utiles

```powershell
# Desarrollo
pnpm install                              # Instalar dependencias
cd packages/ui && bun run dev             # Dev server frontend
cd packages/server && bun run dev         # Dev server backend
python sidecar/main.py --offline          # Sidecar con datos mock

# Testing
cd packages/ui && bun run test            # Tests unitarios
cd packages/ui && bun run test:e2e        # Tests E2E con Playwright
cd packages/ui && bun run storybook       # Storybook

# Build
cd packages/ui && bun run build           # Build para produccion
cd packages/server && bun run build       # Build del servidor

# Type checking
pnpm run typecheck                        # Verificar tipos en todo el monorepo
pnpm run lint                             # Lint en todo el monorepo
```

---

## 14. Troubleshooting

### No veo datos en los overlays
1. Verifica que el sidecar esta corriendo: `python sidecar/main.py --offline`
2. Verifica que el servidor backend esta corriendo: `curl http://localhost:3000/health`
3. Verifica la conexion SSE: `curl -N http://localhost:3000/sse/telemetry`

### El overlay no carga en OBS
1. Verifica que la URL es correcta: `http://localhost:3000/overlays/<nombre>`
2. Verifica que el Browser Source tiene el tamano correcto
3. Activa "Shutdown source when not visible" = OFF

### Errores de TypeScript
1. Ejecuta `pnpm run typecheck` para ver errores exactos
2. Verifica que los imports usan los paths correctos (`@vantare/ui-core/...`)

### Overlays lentos
1. Usa selectores Zustand granulares (no el estado completo)
2. Memoiza componentes con `React.memo()`
3. Usa CSS transitions en lugar de JS animations
4. Mide re-renders con `useRenderCount()`

---

> **Autor**: Equipo Vantare Overlays
> **Ultima actualizacion**: 2026-06-01
> **Version**: 1.0.0
