# Vantare Overlays — Onboarding para Dev Frontend

> **Hola!** Este doc es tu guía para empezar. No necesitas saber sim racing — solo React.

## Antes de empezar

### Instala esto
```powershell
# Node.js 20+ y pnpm
winget install OpenJS.NodeJS.LTS
npm install -g pnpm

# Python 3.12+ (para el sidecar de telemetría)
winget install Python.Python.3.12

# Git
winget install Git.Git
```

### Clona y arranca
```powershell
git clone <url-del-repo>
cd Vantare-Overlays
pnpm install          # Instala todo el monorepo

# Terminal 1 — Inicia el sidecar (lector de telemetría)
cd sidecar
pip install -r requirements.txt
python main.py --offline    # Modo offline = datos mock

# Terminal 2 — Inicia el servidor backend
cd packages/server
bun run dev          # Arranca en localhost:3000

# Terminal 3 — Inicia el frontend
cd packages/ui
bun run dev          # Arranca en localhost:5173
```

## Estructura del proyecto

```
vantare-overlays/
├── packages/
│   ├── server/          # Backend (Bun + Fastify) — NO TOCAR sin preguntar
│   ├── ui/              # Frontend (React + Vite + Tailwind) — TU ZONA
│   │   ├── src/
│   │   │   ├── overlays/       # Components de overlays ← AQUÍ TRABAJARÁS
│   │   │   ├── hub/            # UI del hub (settings, layouts)
│   │   │   ├── streaming/      # Chat, alerts, banners
│   │   │   ├── shared/         # Componentes compartidos
│   │   │   ├── hooks/          # Hooks (useSSE, useTelemetry)
│   │   │   └── styles/         # Tailwind + CSS tokens
│   │   └── package.json
│   └── shared/          # Tipos TypeScript (NO TOCAR)
└── sidecar/             # Python sidecar (NO TOCAR)
```

## Cómo funcionan los overlays

Cada overlay es un **componente React normal**. Recibe datos vía **SSE** (Server-Sent Events).

```tsx
// packages/ui/src/overlays/standings/Standings.tsx
import { useSSE } from '../../hooks/useSSE';

export function Standings() {
  const { data } = useSSE('/sse/telemetry');
  
  if (!data) return <div>Cargando...</div>;

  return (
    <div className="standings-overlay glass">
      <table>
        {data.vehicles.map(v => (
          <tr key={v.id}>
            <td>{v.position}</td>
            <td>{v.driverName}</td>
            <td>{v.gap}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

### El hook `useSSE` ya maneja todo:
- Conexión automática al SSE
- Reconexión si se cae
- Parsing del JSON
- Estado: `{ data, isConnected, error }`

Solo tienes que importarlo y usar `data`.

## Design System (v22)

### Colores (usa Tailwind classes)
```
bg-dark-900  → #080808 (fondo principal)
bg-dark-800  → #0D0D0D (sidebar)
bg-dark-700  → #141414 (cards)
text-primary → #ECECEC (texto principal)
text-secondary → #C0C0C0 (texto secundario)
text-muted   → #888888 (texto tenue)

bg-blood-500 → #721A1A (accent base)
bg-blood-400 → #8F2222
bg-blood-300 → #AD2D2D (accent principal)
bg-blood-200 → #CC3A3A

text-silver-500 → #3A3A3A
text-silver-300 → #707070
text-silver-200 → #909090 (UI elements)
text-silver-100 → #B0B0B0
```

### Tipografía
```tsx
// Display — títulos, números grandes
<h1 className="font-display font-bold">287 km/h</h1>

// Data — tablas, gaps, tiempos
<span className="font-mono text-silver-200">−0.324</span>
```

### Efectos especiales (clases utilitarias)
```tsx
// Glass morphism
<div className="glass">
  Contenido con blur de fondo
</div>

// Corner glow
<div className="corner-glow">
  Brillo en esquina superior izquierda
</div>

// Blood accent (alertas, warning)
<span className="blood-accent">PIT NOW</span>
```

## URLs — Cada overlay es una página

| Overlay | URL en localhost |
|---------|-----------------|
| Standings | `http://localhost:3000/overlays/standings` |
| Relative | `http://localhost:3000/overlays/relative` |
| Fuel | `http://localhost:3000/overlays/fuel` |
| Streaming | `http://localhost:3000/overlays/streaming` |
| Hub | `http://localhost:3000/hub` |

**Para OBS**: Pega la URL como Browser Source.
**Para multi-monitor**: Abre cada URL en un monitor diferente.

## Datos disponibles (tipos TypeScript)

```typescript
// Estructura principal — disponible en data.*
interface UnifiedTelemetry {
  engine: EngineData;
  player: PlayerData;
  tyres: TyreData;
  brakes: BrakeData;
  lap: LapData;
  session: SessionData;
  vehicles: VehicleData[];
  isConnected: boolean;
}

interface EngineData {
  gear: number;        // -1=R, 0=N, 1-6
  rpm: number;         // RPM actuales
  maxRpm: number;      // RPM máximo
  waterTemp: number;   // °C
  oilTemp: number;     // °C
}

interface VehicleData {
  id: number;
  driverName: string;
  position: number;
  classPosition: number;
  gap: number;         // Segundos (negativo = ahead, positivo = behind)
  gapType: 'seconds' | 'laps';
  lastLaptime: number;
  bestLaptime: number;
  isPlayer: boolean;
}

interface LapData {
  lapNumber: number;
  lastLaptime: number;
  bestLaptime: number;
  sector1: number;
  sector2: number;
  fuelRemaining: number;   // Litros
  fuelConsumption: number;  // Litros/vuelta
  lapsRemaining: number;
}
```

## Reglas de rendimiento

1. **NO Canvas** — todo es DOM/CSS (más simple, más bonito)
2. **NO animaciones JavaScript** — usa CSS transitions
3. **Memoizar componentes** que no cambian: `React.memo()`
4. **Usa `will-change: transform`** para hover/active
5. **Actualizaciones a 30fps** máximo — los datos vienen a 20Hz

## Comandos útiles

```powershell
pnpm install          # Instalar dependencias
cd packages/ui
bun run dev           # Dev server con hot reload
bun run build         # Build para producción
bun run typecheck     # Verificar tipos TypeScript
```

## Preguntas frecuentes

**¿No veo datos en los overlays?**
→ Asegúrate de que el sidecar está corriendo (`python main.py --offline`)

**¿Cómo pruebo un overlay específico?**
→ Abre `http://localhost:3000/overlays/<nombre>` en el browser

**¿Cómo sé qué datos están disponibles?**
→ Mira `packages/shared/src/types/telemetry.ts` — es la fuente de verdad

**¿Puedo usar librerías extra?**
→ Pregunta antes. Queremos mantener la app ligera. Tailwind cubre el 90%.

---

*Dudas → Pregunta. No te quedes atascado.*
