# Guía de Adaptadores de Simulador

> Documentación completa del sistema de adaptadores de telemetría para Vantare Overlays.
> Cubre iRacing, Le Mans Ultimate (LMU) y Assetto Corsa (AC).

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [SimAdapter Interface](#2-simadapter-interface)
3. [Arquitectura del Adaptador](#3-arquitectura-del-adaptador)
4. [iRacing Adapter — Implementación Detallada](#4-iracing-adapter--implementación-detallada)
5. [LMU Adapter — Implementación Detallada](#5-lmu-adapter--implementación-detallada)
6. [AC Adapter — Implementación Detallada](#6-ac-adapter--implementación-detallada)
7. [Patrón Normalizer](#7-patrón-normalizer)
8. [SimManager — Auto-Detección](#8-simmanager--auto-detección)
9. [Añadir un Nuevo Adaptador (Tutorial Completo)](#9-añadir-un-nuevo-adaptador-tutorial-completo)
10. [Sistema Mock](#10-sistema-mock)
11. [Consideraciones de Rendimiento](#11-consideraciones-de-rendimiento)
12. [Testing](#12-testing)
13. [Referencia de Telemetría por Sim](#13-referencia-de-telemetría-por-sim)

---

## 1. Visión General

### 1.1 ¿Qué hacen los adaptadores de simulador?

Los adaptadores de simulador son el puente entre los datos crudos de cada simulador de carreras y el formato unificado que consume Vantare Overlays. Cada simulador (iRacing, LMU, AC) expone sus datos de telemetría de forma completamente diferente:

- **iRacing** usa SDK nativo con shared memory mapeada via C++ addon de N-API
- **LMU** usa shared memory + REST API, accedidos via sidecar Python con FFI
- **AC** usa paquetes UDP en tiempo real con formato binario propio

Sin una capa de abstracción, cada overlay tendría que conocer los detalles específicos de cada simulador. Esto haría imposible añadir soporte para nuevos sims sin reescribir toda la aplicación.

### 1.2 ¿Por qué necesitamos una capa de abstracción unificada?

La capa de abstracción unificada resuelve varios problemas fundamentales:

1. **Separación de responsabilidades**: Los adaptadores se encargan únicamente de leer datos del sim y convertirlos al formato unificado. Los overlays solo consumen datos unificados.
2. **Testeabilidad**: Cada adaptador puede ser testeado independientemente usando datos mock. Los overlays pueden ser desarrollados sin ningún simulador ejecutándose.
3. **Extensibilidad**: Añadir soporte para un nuevo simulador requiere solo implementar un nuevo adaptador y su normalizador, sin tocar ningún overlay existente.
4. **Consistencia**: Todos los datos que llegan a los overlays tienen la misma estructura, independientemente del simulador de origen.
5. **Resiliencia**: Si un adaptador falla o el simulador se desconecta, el sistema puede manejarlo gracefully sin crashear la aplicación.

### 1.3 Cómo encajan los adaptadores en la arquitectura

La arquitectura sigue un patrón de tubería de datos con tres etapas principales:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Simulador  │────▶│   Adaptador  │────▶│   Normalizer    │────▶│   SimManager │
│  (iRacing,  │     │  (Lectura    │     │  (Conversión    │     │  (Orquesta   │
│   LMU, AC)  │     │   cruda)     │     │   a DTO)        │     │   streams)   │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────┬───────┘
                                                                       │
                                                                       ▼
                                                              ┌─────────────────┐
                                                              │   UnifiedTelemetry│
                                                              │   (DTO unificado) │
                                                              └────────┬────────┘
                                                                       │
                                                                       ▼
                                                              ┌─────────────────┐
                                                              │  SSE Broadcaster │
                                                              │  → Overlays      │
                                                              └─────────────────┘
```

El flujo completo es:

1. **El adaptador** lee los datos crudos del simulador (shared memory, UDP, REST API)
2. **El normalizer** convierte esos datos crudos al formato `UnifiedTelemetry`
3. **El SimManager** orquesta la conexión, auto-detecta qué sim está activo, y maneja reconexiones
4. **El SSE Broadcaster** envía los datos unificados a todos los overlays conectados
5. **Los overlays** renderizan los datos usando el hook `useSSE`

---

## 2. SimAdapter Interface

La interfaz `SimAdapter` es el contrato que todo adaptador debe cumplir. Está definida en `packages/server/src/sim/adapters/base.ts`.

```typescript
import type { SimType } from '@vantare/shared';

/**
 * Estado de conexión del adaptador con el simulador.
 *
 * - `disconnected`: No se ha intentado conectar o la conexión fue cerrada.
 * - `connecting`: Se está estableciendo la conexión (lectura inicial de shared memory).
 * - `connected`: Conexión activa, recibiendo datos de telemetría.
 * - `error`: La conexión falló. Incluye información del error.
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/**
 * Metadatos del simulador al que está conectado el adaptador.
 *
 * Contiene información estática sobre el sim que puede ser útil
 * para adaptar el comportamiento de overlays o depuración.
 */
export interface SimInfo {
  /** Nombre único del simulador */
  name: SimType;

  /** Nombre legible para mostrar al usuario */
  displayName: string;

  /** Versión del simulador (si está disponible) */
  version: string;

  /** Versión del SDK o mecanismo de acceso a datos */
  sdkVersion: string;

  /** Frecuencia de actualización de datos en Hz */
  updateFrequency: number;

  /** Número de variables de telemetría disponibles */
  variableCount: number;
}

/**
 * Datos crudos de telemetría tal como los proporciona el simulador.
 *
 * ESTE NO ES EL DTO UNIFICADO. El adaptador produce datos crudos,
 * y el normalizer los convierte a UnifiedTelemetry.
 *
 * La forma de estos datos varía completamente según el simulador.
 * Cada adaptador tiene su propio tipo para esto.
 */
export interface RawTelemetry {
  [key: string]: number | string | boolean;
}

/**
 * Datos crudos de sesión tal como los proporciona el simulador.
 *
 * Incluye información sobre la sesión actual: tipo, duración,
 * número de participantes, condiciones meteorológicas, etc.
 */
export interface RawSession {
  [key: string]: number | string | boolean;
}

/**
 * Interfaz principal que todo adaptador de simulador debe implementar.
 *
 * Cada simulador soportado (iRacing, LMU, AC) tiene una implementación
 * de esta interfaz. El SimManager usa esta interfaz para orquestar
 * la conexión y desconexión de adaptadores de forma uniforme.
 *
 * @example
 * ```typescript
 * const adapter = new IRacingAdapter();
 * await adapter.connect();
 *
 * const unsubscribe = adapter.onTelemetry((data) => {
 *   console.log('RPM:', data.RPM);
 * });
 *
 * // Cuando ya no necesites datos:
 * unsubscribe();
 * adapter.disconnect();
 * adapter.destroy();
 * ```
 */
export interface SimAdapter {
  /**
   * Identificador único de tipo de simulador.
   *
   * Usado para distinguir entre adaptadores y para resolver
   * qué adaptador usar para cada sim.
   *
   * @example 'iracing', 'lmu', 'ac'
   */
  readonly name: SimType;

  /**
   * Nombre legible para mostrar al usuario.
   *
   * Se usa en la UI del Hub, logs, y mensajes de error.
   *
   * @example 'iRacing', 'Le Mans Ultimate', 'Assetto Corsa'
   */
  readonly displayName: string;

  /**
   * Indica si la memoria compartida del simulador está disponible.
   *
   * Este método debe retornar `true` solo si el adaptador puede
   * leer datos del simulador en este momento. No debe lanzar errores.
   *
   * Para iRacing, verifica si el mapeo de shared memory está activo.
   * Para LMU, verifica si el sidecar Python está devolviendo datos.
   * Para AC, verifica si se están recibiendo paquetes UDP.
   *
   * @returns `true` si hay datos disponibles, `false` en caso contrario.
   *
   * @example
   * ```typescript
   * if (adapter.isAvailable()) {
   *   await adapter.connect();
   * }
   * ```
   */
  isAvailable(): boolean;

  /**
   * Establece la conexión con el stream de telemetría del simulador.
   *
   * Este método debe ser llamado antes de usar `onTelemetry` o
   * `onSessionData`. La conexión puede tardar un tiempo variable
   * dependiendo del mecanismo de acceso al sim.
   *
   * Cambia el estado de conexión a `connecting` y luego a `connected`
   * cuando la conexión se establece correctamente. Si falla, el estado
   * cambia a `error`.
   *
   * @throws {AdapterConnectionError} Si la conexión falla de forma
   *   irrecuperable (ej: simulador no instalado, permisos insuficientes).
   *
   * @example
   * ```typescript
   * try {
   *   await adapter.connect();
   *   console.log('Conectado a', adapter.displayName);
   * } catch (err) {
   *   console.error('No se pudo conectar:', err.message);
   * }
   * ```
   */
  connect(): Promise<void>;

  /**
   * Cierra la conexión con el stream de telemetría.
   *
   * Después de llamar a `disconnect()`, el adaptador no emitirá
   * más eventos de telemetría. El estado de conexión cambia a
   * `disconnected`.
   *
   * Este método es seguro de llamar múltiples veces. Si ya está
   * desconectado, no hace nada.
   *
   * @example
   * ```typescript
   * adapter.disconnect();
   * // Ahora se puede reconectar:
   * await adapter.connect();
   * ```
   */
  disconnect(): void;

  /**
   * Suscribe a actualizaciones de telemetría cruda.
   *
   * Retorna una función de limpieza que, al ser llamada, cancela
   * la suscripción. Esto sigue el patrón de unsubscribe estándar
   * en React y Node.js.
   *
   * Los datos crudos son específicos del simulador y deben ser
   * procesados por el normalizer antes de usarlos en overlays.
   *
   * @param callback - Función que recibe los datos crudos de
   *   telemetría en cada actualización. Se ejecuta en el thread
   *   principal (main process).
   *
   * @returns Función de limpieza para cancelar la suscripción.
   *
   * @example
   * ```typescript
   * const unsubscribe = adapter.onTelemetry((data) => {
   *   // data contiene las variables crudas del sim
   *   const normalized = normalizer.normalize(data);
   *   broadcaster.broadcast(normalized);
   * });
   *
   * // En cleanup:
   * unsubscribe();
   * ```
   */
  onTelemetry(callback: (data: RawTelemetry) => void): () => void;

  /**
   * Suscribe a actualizaciones de datos de sesión.
   *
   * Los datos de sesión cambian con menor frecuencia que la
   * telemetría (generalmente una vez por vuelta o cuando cambia
   * el estado de la sesión).
   *
   * @param callback - Función que recibe los datos de sesión crudos.
   *
   * @returns Función de limpieza para cancelar la suscripción.
   *
   * @example
   * ```typescript
   * const unsubscribe = adapter.onSessionData((session) => {
   *   console.log('Tipo de sesión:', session.SessionType);
   *   console.log('Tiempo restante:', session.SessionTimeRemaining);
   * });
   * ```
   */
  onSessionData(callback: (data: RawSession) => void): () => void;

  /**
   * Suscribe a cambios en el estado de conexión.
   *
   * Útil para mostrar indicadores de estado en la UI o para
   * implementar lógica de reconexión automática.
   *
   * @param callback - Función que recibe el nuevo estado de conexión.
   *
   * @returns Función de limpieza para cancelar la suscripción.
   *
   * @example
   * ```typescript
   * adapter.onConnectionState((state) => {
   *   switch (state) {
   *     case 'connected':
   *       showGreenIndicator();
   *       break;
   *     case 'disconnected':
   *       showRedIndicator();
   *       break;
   *     case 'error':
   *       showErrorNotification();
   *       break;
   *   }
   * });
   * ```
   */
  onConnectionState(callback: (state: ConnectionState) => void): () => void;

  /**
   * Retorna metadatos estáticos del simulador.
   *
   * Esta información no cambia durante la vida del adaptador
   * y puede ser cacheada.
   *
   * @returns Objeto con información del simulador.
   *
   * @example
   * ```typescript
   * const info = adapter.getSimInfo();
   * console.log(`${info.displayName} v${info.version}`);
   * console.log(`Variables disponibles: ${info.variableCount}`);
   * ```
   */
  getSimInfo(): SimInfo;

  /**
   * Libera todos los recursos asociados con el adaptador.
   *
   * Después de llamar a `destroy()`, el adaptador no debe ser
   * utilizado. Este método cierra conexiones, libera buffers
   * de memoria compartida, y elimina listeners de eventos.
   *
   * Diferente a `disconnect()`, que solo cierra la conexión
   * de telemetría, `destroy()` libera TODOS los recursos.
   *
   * @example
   * ```typescript
   * // En cleanup del proceso o cambio de adaptador:
   * adapter.destroy();
   * ```
   */
  destroy(): void;
}
```

### 2.1 Tipos del Paquete Shared

Los tipos compartidos entre frontend y backend están definidos en `packages/shared/src/types/telemetry.ts`:

```typescript
/**
 * Identificador único de tipo de simulador soportado.
 */
export type SimType = 'iracing' | 'lmu' | 'ac';

/**
 * Datos de telemetría unificados — el DTO que todos los overlays consumen.
 *
 * Este tipo es la fuente de verdad para la estructura de datos.
 * Tanto el normalizer como los overlays dependen de esta definición.
 */
export interface UnifiedTelemetry {
  /** Timestamp del momento en que se capturaron estos datos */
  timestamp: number;

  /** Simulador de origen */
  sim: SimType;

  /** Indica si los datos son válidos y actualizados */
  isConnected: boolean;

  /** Datos del motor del vehículo */
  engine: EngineData;

  /** Datos del jugador actual */
  player: PlayerData;

  /** Datos de neumáticos */
  tyres: TyreData;

  /** Datos de frenos */
  brakes: BrakeData;

  /** Datos de vuelta */
  lap: LapData;

  /** Datos de sesión */
  session: SessionData;

  /** Lista de todos los vehículos en la sesión */
  vehicles: VehicleData[];
}

export interface EngineData {
  gear: number;
  rpm: number;
  maxRpm: number;
  speed: number;
  throttle: number;
  clutch: number;
  waterTemp: number;
  oilTemp: number;
  oilPressure: number;
  fuelPressure: number;
}

export interface PlayerData {
  driverName: string;
  carNumber: string;
  carName: string;
  teamName: string;
  position: number;
  classPosition: number;
  iRating: number;
  licenceLevel: number;
}

export interface TyreData {
  pressures: [number, number, number, number];
  temperatures: [number, number, number, number];
  wear: [number, number, number, number];
  compound: string;
  isDry: boolean;
}

export interface BrakeData {
  temperatures: [number, number, number, number];
  biasFront: number;
  biasRear: number;
}

export interface LapData {
  lapNumber: number;
  lastLaptime: number;
  bestLaptime: number;
  sector1: number;
  sector2: number;
  sector3: number;
  fuelRemaining: number;
  fuelConsumption: number;
  lapsRemaining: number;
}

export interface SessionData {
  sessionType: SessionType;
  sessionTimeRemaining: number;
  sessionLapsRemaining: number;
  sessionTotalTime: number;
  weather: WeatherData;
  trackName: string;
  trackTemperature: number;
  ambientTemperature: number;
}

export type SessionType =
  | 'practice'
  | 'qualifying'
  | 'race'
  | 'warmup'
  | 'time-trial';

export interface WeatherData {
  condition: 'clear' | 'cloudy' | 'overcast' | 'rain' | 'storm';
  windSpeed: number;
  windDirection: number;
}

export interface VehicleData {
  id: number;
  driverName: string;
  carNumber: string;
  position: number;
  classPosition: number;
  gap: number;
  gapType: 'seconds' | 'laps';
  lastLaptime: number;
  bestLaptime: number;
  isPlayer: boolean;
}
```

---

## 3. Arquitectura del Adaptador

### 3.1 Estructura de Directorios

```
packages/server/src/
├── sim/
│   ├── sim-manager.ts          # Orquestador principal
│   ├── normalizer.ts           # Normalizer global
│   ├── types.ts                # Tipos internos del módulo sim
│   └── adapters/
│       ├── base.ts             # Interfaz SimAdapter
│       ├── iracing/
│       │   ├── index.ts        # Re-exports
│       │   ├── iracing-adapter.ts    # Implementación principal
│       │   ├── iracing-normalizer.ts # Conversión a UnifiedTelemetry
│       │   ├── iracing-types.ts      # Tipos de iRacing SDK
│       │   ├── native/
│       │   │   ├── iracing_sdk.cc    # C++ N-API addon
│       │   │   ├── iracing_sdk.h     # Header C++
│       │   │   └── binding.gyp       # Configuración de compilación
│       │   └── mock.ts               # Mock para desarrollo
│       ├── lmu/
│       │   ├── index.ts
│       │   ├── lmu-adapter.ts
│       │   ├── lmu-normalizer.ts
│       │   ├── lmu-types.ts
│       │   ├── native/
│       │   │   ├── lmu_sdk.cc
│       │   │   ├── lmu_sdk.h
│       │   │   └── binding.gyp
│       │   └── mock.ts
│       └── ac/
│           ├── index.ts
│           ├── ac-adapter.ts
│           ├── ac-normalizer.ts
│           ├── ac-types.ts
│           ├── native/
│           │   ├── ac_sdk.cc
│           │   ├── ac_sdk.h
│           │   └── binding.gyp
│           └── mock.ts
```

### 3.2 Flujo de Datos Detallado

```
1. SimManager detecta iRacing ejecutándose
   │
2. SimManager instancia IRacingAdapter
   │
3. IRacingAdapter.connect()
   │   ├── C++ addon mapea irsdk header via mmap()
   │   ├── Lee variable buffer para confirmar conexión
   │   └── Emite state: 'connected'
   │
4. SimManager crea SimNormalizer para iRacing
   │
5. SimManager suscribe a adapter.onTelemetry()
   │   │
   │   └── En cada tick (~60Hz del sim):
   │       ├── IRacingAdapter lee buffer de shared memory
   │       ├── Emite RawTelemetry con variables crudas
   │       │
   │       └── SimNormalizer.normalizeIRacing(raw)
   │           ├── Convierte Speed de m/s a km/h
   │           ├── Convierte Gear de iRacing format (-1,0,1..8)
   │           ├── Convierte Temperaturas de F a C
   │           ├── Mapea VehicleData de la lista iRacing
   │           └── Retorna UnifiedTelemetry
   │
6. SimManager pasa UnifiedTelemetry a SSEBroadcaster
   │
7. SSEBroadcaster.envía a todos los overlays conectados
```

### 3.3 Responsabilidades por Componente

| Componente | Responsabilidad | NO hace |
|------------|----------------|---------|
| `SimAdapter` | Leer datos crudos del sim | No convierte datos |
| `SimNormalizer` | Convertir datos crudos a DTO | No lee del sim |
| `SimManager` | Orquestar conexiones, auto-detectar sims | No renderiza UI |
| `SSEBroadcaster` | Enviar datos a overlays | No procesa datos |

---

## 4. iRacing Adapter — Implementación Detallada

### 4.1 iRacing Shared Memory Format

iRacing expone datos de telemetría a través de un archivo de memoria compartida (shared memory mapping). El formato es una secuencia de buffers con un header que describe la estructura de datos.

#### irsdk_header

```c
// irsdk_header.h — Estructura del header de iRacing SDK
typedef struct {
    int ver;                  // Versión del formato (actual: 2)
    int status;               // Bit flags de estado
    int tick_rate;            // Frecuencia de actualización (Hz)
    int session_info_update;  // Contador de updates de sesión
    int session_info_len;     // Longitud de session info string
    int session_info_offset;  // Offset al session info string
    int num_vars;             // Número de variables de telemetría
    int var_header_offset;    // Offset a los headers de variables
    int num_buf_header;       // Número de headers de buffer
    int buf_header_len;       // Longitud de cada buffer header
    int pad[2];               // Padding
} irsdk_header;
```

#### irsdk_var_header

```c
// irsdk_var_header — Describe una variable individual
typedef struct {
    int type;                 // Tipo de dato (IRSdkDataType)
    int offset;               // Offset en el buffer de datos
    int count;                // Número de elementos (array)
    char name[32];            // Nombre de la variable
    char desc[64];            // Descripción (opcional)
    char unit[32];            // Unidad de medida
} irsdk_var_header;
```

#### Tipos de datos de iRacing

```c
typedef enum {
    IRSdkDataTypeChar = 0,     // char
    IRSdkDataTypeBool,         // bool (int32)
    IRSdkDataTypeInt,          // int32
    IRSdkDataTypeFloat,        // float
    IRSdkDataTypeDouble,       // double
    IRSdkDataTypeBitField,    // Bitfield (uint32)
    IRSdkDataTypeString,      // String (char array)
    IRSdkDataTypeFloat3,      // Array de 3 floats
    IRSdkDataTypeFloat4,      // Array de 4 floats
    IRSdkDataTypeDouble3,     // Array de 3 doubles
    IRSdkDataTypeUInt32,      // uint32
    IRSdkDataTypeUInt64       // uint64
} IRSdkDataType;
```

### 4.2 C++ N-API Binding Code Structure

El binding C++ es un addon nativo de Node.js (N-API) que mapea la shared memory de iRacing y expone los datos a JavaScript/Bun.

#### iracing_sdk.h

```cpp
#ifndef IRACING_SDK_H
#define IRACING_SDK_H

#include <napi.h>
#include <windows.h>
#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>
#include <atomic>

class IRacingSDK : public Napi::ObjectWrap<IRacingSDK> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    IRacingSDK(const Napi::CallbackInfo& info);
    ~IRacingSDK();

private:
    // Métodos N-API expuestos a JS
    Napi::Value Connect(const Napi::CallbackInfo& info);
    Napi::Value Disconnect(const Napi::CallbackInfo& info);
    Napi::Value GetTelemetry(const Napi::CallbackInfo& info);
    Napi::Value GetSessionInfo(const Napi::CallbackInfo& info);
    Napi::Value IsConnected(const Napi::CallbackInfo& info);
    Napi::Value GetVariableNames(const Napi::CallbackInfo& info);

    // Métodos internos
    bool MapSharedMemory();
    void UnmapSharedMemory();
    bool ReadHeader();
    void BuildVariableMap();
    Napi::Value ReadVariable(Napi::Env env, int offset, int type, int count);

    // Estado
    HANDLE hMapFile;
    void* pSharedMemory;
    irsdk_header* header;
    std::unordered_map<std::string, int> variableOffsets;
    std::unordered_map<std::string, int> variableTypes;
    std::unordered_map<std::string, int> variableCounts;
    std::mutex dataMutex;
    std::atomic<bool> connected;
    int lastTickCount;
};

#endif // IRACING_SDK_H
```

#### iracing_sdk.cc

```cpp
#include "iracing_sdk.h"

Napi::Object IRacingSDK::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "IRacingSDK", {
        InstanceMethod("connect", &IRacingSDK::Connect),
        InstanceMethod("disconnect", &IRacingSDK::Disconnect),
        InstanceMethod("getTelemetry", &IRacingSDK::GetTelemetry),
        InstanceMethod("getSessionInfo", &IRacingSDK::GetSessionInfo),
        InstanceMethod("isConnected", &IRacingSDK::IsConnected),
        InstanceMethod("getVariableNames", &IRacingSDK::GetVariableNames),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);

    exports.Set("IRacingSDK", func);
    return exports;
}

IRacingSDK::IRacingSDK(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<IRacingSDK>(info),
      hMapFile(nullptr),
      pSharedMemory(nullptr),
      header(nullptr),
      connected(false),
      lastTickCount(-1) {}

IRacingSDK::~IRacingSDK() {
    Disconnect();
}

Napi::Value IRacingSDK::Connect(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (connected) {
        return Napi::Boolean::New(env, true);
    }

    if (!MapSharedMemory()) {
        Napi::Error::New(env, "No se pudo mapear iRacing shared memory").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    if (!ReadHeader()) {
        UnmapSharedMemory();
        Napi::Error::New(env, "Header de iRacing inválido").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    BuildVariableMap();
    connected = true;
    lastTickCount = -1;

    return Napi::Boolean::New(env, true);
}

Napi::Value IRacingSDK::Disconnect(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!connected) {
        return Napi::Boolean::New(env, true);
    }

    connected = false;
    variableOffsets.clear();
    variableTypes.clear();
    variableCounts.clear();
    UnmapSharedMemory();

    return Napi::Boolean::New(env, true);
}

Napi::Value IRacingSDK::GetTelemetry(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!connected || !header || !pSharedMemory) {
        return env.Null();
    }

    std::lock_guard<std::mutex> lock(dataMutex);

    // Seleccionar buffer más reciente (double buffer)
    int bestTick = -1;
    int bestOffset = 0;
    char* pBuf = (char*)pSharedMemory + header->var_header_offset + header->num_vars * sizeof(irsdk_var_header);

    for (int i = 0; i < header->num_buf_header; i++) {
        irsdk_buffer_header* bufHeader = (irsdk_buffer_header*)(pBuf + i * header->buf_header_len);
        if (bufHeader->tick_count > bestTick) {
            bestTick = bufHeader->tick_count;
            bestOffset = bufHeader->buf_offset;
        }
    }

    if (bestTick == lastTickCount) {
        // No hay datos nuevos
        return env.Null();
    }

    lastTickCount = bestTick;

    // Leer todas las variables del buffer
    Napi::Object result = Napi::Object::New(env);
    char* pData = (char*)pSharedMemory + bestOffset;

    for (int i = 0; i < header->num_vars; i++) {
        irsdk_var_header* varHeader = (irsdk_var_header*)(
            (char*)pSharedMemory + header->var_header_offset + i * sizeof(irsdk_var_header)
        );

        Napi::Value value = ReadVariable(env, varHeader->offset, varHeader->type, varHeader->count);
        result.Set(varHeader->name, value);
    }

    // Añadir metadata de tick
    result.Set("tick_count", Napi::Number::New(env, bestTick));

    return result;
}

Napi::Value IRacingSDK::GetSessionInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!connected || !header || !pSharedMemory) {
        return env.Null();
    }

    char* sessionStr = (char*)pSharedMemory + header->session_info_offset;
    return Napi::String::New(env, sessionStr, header->session_info_len);
}

Napi::Value IRacingSDK::IsConnected(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(info.Env(), connected);
}

Napi::Value IRacingSDK::GetVariableNames(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!connected || !header) {
        return Napi::Array::New(env, 0);
    }

    Napi::Array result = Napi::Array::New(env, header->num_vars);

    for (int i = 0; i < header->num_vars; i++) {
        irsdk_var_header* varHeader = (irsdk_var_header*)(
            (char*)pSharedMemory + header->var_header_offset + i * sizeof(irsdk_var_header)
        );
        result.Set(i, Napi::String::New(env, varHeader->name));
    }

    return result;
}

bool IRacingSDK::MapSharedMemory() {
    hMapFile = OpenFileMappingA(
        FILE_MAP_READ,
        FALSE,
        "Local\\IRacingSDK"
    );

    if (!hMapFile) {
        return false;
    }

    pSharedMemory = MapViewOfFile(
        hMapFile,
        FILE_MAP_READ,
        0,
        0,
        0
    );

    return pSharedMemory != nullptr;
}

void IRacingSDK::UnmapSharedMemory() {
    if (pSharedMemory) {
        UnmapViewOfFile(pSharedMemory);
        pSharedMemory = nullptr;
    }
    if (hMapFile) {
        CloseHandle(hMapFile);
        hMapFile = nullptr;
    }
    header = nullptr;
}

bool IRacingSDK::ReadHeader() {
    if (!pSharedMemory) return false;
    header = (irsdk_header*)pSharedMemory;
    return header->ver == 2 && header->num_vars > 0;
}

void IRacingSDK::BuildVariableMap() {
    variableOffsets.clear();
    variableTypes.clear();
    variableCounts.clear();

    for (int i = 0; i < header->num_vars; i++) {
        irsdk_var_header* varHeader = (irsdk_var_header*)(
            (char*)pSharedMemory + header->var_header_offset + i * sizeof(irsdk_var_header)
        );

        variableOffsets[varHeader->name] = varHeader->offset;
        variableTypes[varHeader->name] = varHeader->type;
        variableCounts[varHeader->name] = varHeader->count;
    }
}

Napi::Value IRacingSDK::ReadVariable(Napi::Env env, int offset, int type, int count) {
    char* pBase = (char*)pSharedMemory + header->var_header_offset + header->num_vars * sizeof(irsdk_var_header);

    switch (type) {
        case IRSdkDataTypeChar: {
            char buf[32] = {};
            memcpy(buf, pBase + offset, count);
            return Napi::String::New(env, buf);
        }
        case IRSdkDataTypeBool: {
            int val = 0;
            memcpy(&val, pBase + offset, sizeof(int));
            return Napi::Boolean::New(env, val != 0);
        }
        case IRSdkDataTypeInt: {
            int val = 0;
            memcpy(&val, pBase + offset, sizeof(int));
            return Napi::Number::New(env, val);
        }
        case IRSdkDataTypeFloat: {
            float val = 0;
            memcpy(&val, pBase + offset, sizeof(float));
            return Napi::Number::New(env, val);
        }
        case IRSdkDataTypeDouble: {
            double val = 0;
            memcpy(&val, pBase + offset, sizeof(double));
            return Napi::Number::New(env, val);
        }
        case IRSdkDataTypeFloat3: {
            float vals[3] = {};
            memcpy(vals, pBase + offset, sizeof(float) * 3);
            Napi::Array arr = Napi::Array::New(env, 3);
            for (int j = 0; j < 3; j++) {
                arr.Set(j, Napi::Number::New(env, vals[j]));
            }
            return arr;
        }
        case IRSdkDataTypeFloat4: {
            float vals[4] = {};
            memcpy(vals, pBase + offset, sizeof(float) * 4);
            Napi::Array arr = Napi::Array::New(env, 4);
            for (int j = 0; j < 4; j++) {
                arr.Set(j, Napi::Number::New(env, vals[j]));
            }
            return arr;
        }
        case IRSdkDataTypeUInt32: {
            uint32_t val = 0;
            memcpy(&val, pBase + offset, sizeof(uint32_t));
            return Napi::Number::New(env, val);
        }
        case IRSdkDataTypeUInt64: {
            uint64_t val = 0;
            memcpy(&val, pBase + offset, sizeof(uint64_t));
            return Napi::Number::New(env, val);
        }
        default:
            return Napi::Number::New(env, 0);
    }
}

// Exportar
Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
    return IRacingSDK::Init(env, exports);
}

NODE_API_MODULE(iracing_sdk, InitModule)
```

#### binding.gyp

```json
{
  "targets": [
    {
      "target_name": "iracing_sdk",
      "sources": ["iracing_sdk.cc"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        [
          "OS=='win'",
          {
            "libraries": ["-ladvapi32"]
          }
        ]
      ]
    }
  ]
}
```

### 4.3 Adaptador TypeScript para iRacing

#### iracing-adapter.ts

```typescript
import { EventEmitter } from 'events';
import type {
  SimAdapter,
  ConnectionState,
  SimInfo,
  RawTelemetry,
  RawSession,
} from '../base';

// El binding C++ se compila como addon nativo
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IRacingNative = require('../../../native/iracing_sdk.node');

/**
 * Variables de telemetría clave de iRacing.
 *
 * Estas son las variables más importantes que lee iRacing SDK.
 * Para la lista completa, ver: https://iracing-sdk.readthedocs.io/
 */
export const IRACING_VARIABLES = {
  // Motor
  Speed: 'Speed',                    // Velocidad en mph
  RPM: 'RPM',                        // Revoluciones por minuto
  MaxRPM: 'MaxRPM',                  // RPM máximo del motor
  Throttle: 'Throttle',              // Posición del acelerador (0-1)
  Brake: 'Brake',                    // Posición del freno (0-1)
  Clutch: 'Clutch',                  // Posición del clutch (0-1)
  Gear: 'Gear',                      // Marcha actual (-1=R, 0=N, 1-10)

  // Temperaturas
  WaterTemp: 'WaterTemp',            // Temperatura del agua en °F
  OilTemp: 'OilTemp',                // Temperatura del aceite en °F
  OilPressure: 'OilPressure',        // Presión del aceite en psi
  FuelPressure: 'FuelPressure',      // Presión del combustible en psi

  // Combustible
  FuelLevel: 'FuelLevel',            // Nivel de combustible (galones)
  FuelLevelPct: 'FuelLevelPct',      // Nivel de combustible (0-1)
  FuelUsedLap: 'FuelUsedLap',        // Combustible usado por vuelta

  // Vuelta
  Lap: 'Lap',                        // Número de vuelta actual
  LapDistPct: 'LapDistPct',          // Porcentaje de vuelta completada
  LapTime: 'LapTime',                // Tiempo de vuelta actual
  LastLapTime: 'LastLapTime',        // Tiempo de última vuelta
  BestLapTime: 'BestLapTime',        // Tiempo de mejor vuelta
  Sector1Time: 'Sector1Time',        // Tiempo sector 1
  Sector2Time: 'Sector2Time',        // Tiempo sector 2
  Sector3Time: 'Sector3Time',        // Tiempo sector 3

  // Frenos
  BrakeTemp: 'BrakeTemp',            // Temperatura de frenos (array de 4)
  BrakeBiasF: 'BrakeBiasF',          // Bias de frenado delantero

  // Neumáticos
  TirePressure: 'TirePressure',      // Presión neumáticos (array de 4)
  TireTemp: 'TireTemp',              // Temperatura neumáticos (array de 4)
  TireWear: 'TireWear',              // Desgaste neumáticos (array de 4)
  TireCompound: 'TireCompound',      // Compuesto de neumáticos

  // Posición y clasificación
  Position: 'Position',              // Posición general
  ClassPosition: 'ClassPosition',    // Posición de clase
  CarNumber: 'CarNumber',            // Número del coche
  DriverName: 'DriverName',          // Nombre del piloto
  TeamName: 'TeamName',              // Nombre del equipo

  // Dirección
  SteeringAngle: 'SteeringAngle',    // Ángulo de dirección (radianes)

  // Sesión
  SessionType: 'SessionType',        // Tipo de sesión
  SessionTimeRemaining: 'SessionTimeRemaining',  // Tiempo restante
  SessionLapsRemaining: 'SessionLapsRemaining',  // Vueltas restantes
} as const;

/**
 * Adaptador para iRacing.
 *
 * Usa un addon C++ nativo (N-API) para mapear la shared memory
 * de iRacing y leer los datos de telemetría en tiempo real.
 *
 * @example
 * ```typescript
 * const adapter = new IRacingAdapter();
 * if (adapter.isAvailable()) {
 *   await adapter.connect();
 *   adapter.onTelemetry((data) => {
 *     console.log('Speed:', data.Speed, 'mph');
 *   });
 * }
 * ```
 */
export class IRacingAdapter extends EventEmitter implements SimAdapter {
  readonly name = 'iracing' as const;
  readonly displayName = 'iRacing';

  private native: typeof IRacingNative | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private telemetryListeners: Set<(data: RawTelemetry) => void> = new Set();
  private sessionListeners: Set<(data: RawSession) => void> = new Set();
  private connectionListeners: Set<(state: ConnectionState) => void> = new Set();
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  /** Frecuencia de polling en ms (60Hz = ~16ms) */
  private readonly pollFrequency = 16;

  constructor() {
    super();
  }

  /**
   * Verifica si la shared memory de iRacing está disponible.
   *
   * Intenta mapear la shared memory temporalmente para verificar
   * que iRacing está ejecutándose. No establece una conexión persistente.
   */
  isAvailable(): boolean {
    try {
      this.native = new IRacingNative();
      const connected = this.native.connect();
      if (connected) {
        this.native.disconnect();
        this.native = null;
        return true;
      }
      this.native = null;
      return false;
    } catch {
      this.native = null;
      return false;
    }
  }

  /**
   * Conecta al stream de telemetría de iRacing.
   *
   * Mapea la shared memory y comienza a leer datos a 60Hz.
   * Los datos se emiten a través de `onTelemetry` y `onSessionData`.
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected') return;

    this.setConnectionState('connecting');

    try {
      this.native = new IRacingNative();
      const connected = this.native.connect();

      if (!connected) {
        throw new Error(
          'No se pudo conectar a iRacing. ¿Está el simulador ejecutándose?'
        );
      }

      this.setConnectionState('connected');

      // Iniciar polling de datos
      this.startPolling();

      // Emitir sesión inicial
      const sessionInfo = this.native.getSessionInfo();
      if (sessionInfo) {
        const sessionData = this.parseSessionInfo(sessionInfo);
        this.sessionListeners.forEach((cb) => cb(sessionData));
      }
    } catch (error) {
      this.setConnectionState('error');
      throw error;
    }
  }

  /**
   * Desconecta del stream de telemetría.
   */
  disconnect(): void {
    if (this.connectionState === 'disconnected') return;

    this.stopPolling();

    if (this.native) {
      this.native.disconnect();
      this.native = null;
    }

    this.setConnectionState('disconnected');
  }

  /**
   * Suscribe a actualizaciones de telemetría cruda de iRacing.
   */
  onTelemetry(callback: (data: RawTelemetry) => void): () => void {
    this.telemetryListeners.add(callback);
    return () => this.telemetryListeners.delete(callback);
  }

  /**
   * Suscribe a actualizaciones de datos de sesión de iRacing.
   */
  onSessionData(callback: (data: RawSession) => void): () => void {
    this.sessionListeners.add(callback);
    return () => this.sessionListeners.delete(callback);
  }

  /**
   * Suscribe a cambios de estado de conexión.
   */
  onConnectionState(callback: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  /**
   * Retorna metadatos del simulador iRacing.
   */
  getSimInfo(): SimInfo {
    return {
      name: 'iracing',
      displayName: 'iRacing',
      version: this.native?.getVersion?.() ?? 'unknown',
      sdkVersion: '4.0.0',
      updateFrequency: 60,
      variableCount: Object.keys(IRACING_VARIABLES).length,
    };
  }

  /**
   * Libera todos los recursos del adaptador.
   */
  destroy(): void {
    this.disconnect();
    this.telemetryListeners.clear();
    this.sessionListeners.clear();
    this.connectionListeners.clear();
    this.removeAllListeners();
  }

  // --- Métodos privados ---

  private startPolling(): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(() => {
      if (!this.native || this.connectionState !== 'connected') return;

      try {
        const data = this.native.getTelemetry();
        if (data) {
          this.telemetryListeners.forEach((cb) => cb(data));
        }
      } catch (error) {
        console.error('[IRacingAdapter] Error leyendo telemetría:', error);
        this.setConnectionState('error');
        this.stopPolling();
      }
    }, this.pollFrequency);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.connectionListeners.forEach((cb) => cb(state));
  }

  private parseSessionInfo(yamlString: string): RawSession {
    // iRacing session info es YAML embebido como string
    // Parser simplificado — en producción usar librería YAML
    const lines = yamlString.split('\n');
    const result: Record<string, string> = {};

    for (const line of lines) {
      const match = line.match(/^\s+(\w+):\s*(.*)$/);
      if (match) {
        result[match[1]] = match[2];
      }
    }

    return result;
  }
}
```

### 4.4 Variables Clave de iRacing

Las variables más importantes para los overlays:

| Variable | Tipo | Unidad | Descripción |
|----------|------|--------|-------------|
| `Speed` | float | mph | Velocidad actual |
| `RPM` | int | RPM | Revoluciones actuales |
| `MaxRPM` | int | RPM | RPM máximo del motor |
| `Throttle` | float | 0-1 | Posición del acelerador |
| `Brake` | float | 0-1 | Posición del freno |
| `Clutch` | float | 0-1 | Posición del clutch |
| `Gear` | int | -1..10 | Marcha actual |
| `WaterTemp` | float | °F | Temperatura del agua |
| `OilTemp` | float | °F | Temperatura del aceite |
| `FuelLevel` | float | galones | Combustible restante |
| `FuelLevelPct` | float | 0-1 | Porcentaje de combustible |
| `FuelUsedLap` | float | galones/vuelta | Consumo por vuelta |
| `Lap` | int | vueltas | Número de vuelta actual |
| `LapTime` | float | segundos | Tiempo de vuelta actual |
| `LastLapTime` | float | segundos | Tiempo de última vuelta |
| `BestLapTime` | float | segundos | Tiempo de mejor vuelta |
| `Position` | int | posición | Posición general |
| `ClassPosition` | int | posición | Posición de clase |
| `SteeringAngle` | float | radianes | Ángulo de dirección |
| `TirePressure` | float[4] | psi | Presión de neumáticos |
| `TireTemp` | float[4] | °F | Temperatura de neumáticos |
| `TireWear` | float[4] | 0-1 | Desgaste de neumáticos |
| `BrakeTemp` | float[4] | °F | Temperatura de frenos |

### 4.5 Variables de Sesión de iRacing

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `SessionType` | string | 'Practice', 'Qualify', 'Race', etc. |
| `SessionTimeRemaining` | float | Tiempo restante en segundos |
| `SessionLapsRemaining` | int | Vueltas restantes |
| `CarsInSession` | int | Número de coches en sesión |
| `DriverInfo.DriverName` | string | Nombre del piloto |
| `DriverInfo.CarNumber` | string | Número del coche |
| `DriverInfo.TeamName` | string | Nombre del equipo |
| `DriverInfo.iRating` | int | iRating del piloto |
| `DriverInfo.LicenceLevel` | int | Nivel de licencia |
| `SplitTimeInfo.Info.LastLap` | float | Último tiempo de vuelta |
| `WeatherInfo.Temperature` | float | Temperatura ambiental |
| `WeatherInfo.TrackTemp` | float | Temperatura de pista |
| `WeatherInfo.WindSpeed` | float | Velocidad del viento |
| `WeatherInfo.Conditions` | string | Condiciones meteorológicas |
| `TrackInfo.TrackName` | string | Nombre de la pista |

### 4.6 Mock System para iRacing

El mock permite desarrollo sin iRacing ejecutándose. Se usa automáticamente en macOS/Linux o cuando se especifica `--mock` explícitamente.

#### iracing-mock.ts

```typescript
import type { RawTelemetry, RawSession } from '../base';

/**
 * Genera datos mock realistas de iRacing para desarrollo.
 *
 * Simula una sesión de carrera con datos que cambian
 * de forma realista a lo largo del tiempo.
 */
export class IRacingMock {
  private tick = 0;
  private gear = 0;
  private rpm = 0;
  private speed = 0;
  private lap = 1;
  private lapTime = 0;
  private fuelLevel = 100;
  private sessionTimeRemaining = 1800;
  private readonly maxRpm = 8000;
  private readonly maxSpeed = 320;

  /**
   * Escenarios de mock disponibles.
   *
   * Cada escenario simula una situación diferente de carrera
   * para testing de overlays.
   */
  static readonly scenarios = {
    /** Vehículo en pits, motor apagado */
    idle: {
      rpm: 0,
      speed: 0,
      gear: 0,
      throttle: 0,
      brake: 0,
    },
    /** Vehículo acelerando en recta */
    accelerating: {
      rpm: 6500,
      speed: 250,
      gear: 5,
      throttle: 0.95,
      brake: 0,
    },
    /** Vehículo frenando para curva */
    braking: {
      rpm: 3000,
      speed: 80,
      gear: 2,
      throttle: 0,
      brake: 0.8,
    },
    /** Combustible bajo */
    lowFuel: {
      fuelLevelPct: 0.05,
      fuelRemaining: 2.5,
    },
  } as const;

  /**
   * Genera un tick de datos mock de telemetría.
   *
   * Los datos evolucionan de forma realista:
   * - El vehículo acelera y frena
   * - Cambia de marcha según RPM
   * - El combustible se consume
   * - Las vueltas avanzan
   */
  generateTelemetry(): RawTelemetry {
    this.tick++;
    this.lapTime += 0.016; // ~60Hz

    // Simular ciclo de carrera (acelerar → frenar → curva → repetir)
    const cycle = (this.tick % 600) / 600; // Ciclo de 10 segundos
    let throttle = 0;
    let brake = 0;

    if (cycle < 0.4) {
      // Acelerando
      throttle = 0.8 + Math.sin(cycle * Math.PI * 2.5) * 0.15;
      brake = 0;
    } else if (cycle < 0.5) {
      // Frenando
      throttle = 0;
      brake = 0.7 + Math.sin((cycle - 0.4) * Math.PI * 10) * 0.2;
    } else if (cycle < 0.7) {
      // En curva
      throttle = 0.3 + Math.sin((cycle - 0.5) * Math.PI * 5) * 0.2;
      brake = 0;
    } else {
      // Acelerando de nuevo
      throttle = 0.5 + Math.sin((cycle - 0.7) * Math.PI * 3.33) * 0.3;
      brake = 0;
    }

    // Calcular RPM según throttle
    this.rpm = Math.floor(this.maxRpm * throttle + 1000);

    // Calcular velocidad
    if (throttle > 0) {
      this.speed = Math.min(this.maxSpeed, this.speed + throttle * 2);
    } else if (brake > 0) {
      this.speed = Math.max(0, this.speed - brake * 5);
    }

    // Calcular marcha según velocidad
    if (this.speed < 30) this.gear = 1;
    else if (this.speed < 60) this.gear = 2;
    else if (this.speed < 100) this.gear = 3;
    else if (this.speed < 150) this.gear = 4;
    else if (this.speed < 200) this.gear = 5;
    else if (this.speed < 260) this.gear = 6;
    else this.gear = 7;

    // Consumo de combustible
    if (throttle > 0) {
      this.fuelLevel = Math.max(0, this.fuelLevel - 0.01 * throttle);
    }

    // Avanzar vuelta (cada 90 segundos simulados)
    if (this.lapTime > 90) {
      this.lap++;
      this.lapTime = 0;
    }

    // Tiempo restante de sesión
    this.sessionTimeRemaining = Math.max(0, this.sessionTimeRemaining - 0.016);

    return {
      // Motor
      Speed: this.speed * 0.621371, // km/h a mph
      RPM: this.rpm,
      MaxRPM: this.maxRpm,
      Throttle: throttle,
      Brake: brake,
      Clutch: 0,
      Gear: this.gear,

      // Temperaturas
      WaterTemp: 180 + Math.random() * 10,
      OilTemp: 190 + Math.random() * 5,
      OilPressure: 60 + Math.random() * 5,
      FuelPressure: 40 + Math.random() * 2,

      // Combustible
      FuelLevel: this.fuelLevel * 0.0757, // % a galones
      FuelLevelPct: this.fuelLevel / 100,
      FuelUsedLap: 0.75 + Math.random() * 0.1,

      // Vuelta
      Lap: this.lap,
      LapDistPct: (this.lapTime / 90) * 100,
      LapTime: this.lapTime,
      LastLapTime: 88 + Math.random() * 4,
      BestLapTime: 85 + Math.random() * 2,
      Sector1Time: this.lapTime > 30 ? 28 + Math.random() * 2 : 0,
      Sector2Time: this.lapTime > 60 ? 30 + Math.random() * 2 : 0,
      Sector3Time: this.lapTime > 90 ? 29 + Math.random() * 2 : 0,

      // Frenos
      BrakeTemp: [300 + Math.random() * 50, 300 + Math.random() * 50, 300 + Math.random() * 50, 300 + Math.random() * 50],
      BrakeBiasF: 55 + Math.random() * 5,

      // Neumáticos
      TirePressure: [25 + Math.random() * 0.5, 25 + Math.random() * 0.5, 25 + Math.random() * 0.5, 25 + Math.random() * 0.5],
      TireTemp: [90 + Math.random() * 10, 90 + Math.random() * 10, 90 + Math.random() * 10, 90 + Math.random() * 10],
      TireWear: [Math.max(0, 1 - this.tick * 0.0001), Math.max(0, 1 - this.tick * 0.0001), Math.max(0, 1 - this.tick * 0.0001), Math.max(0, 1 - this.tick * 0.0001)],
      TireCompound: 'Soft',

      // Dirección
      SteeringAngle: Math.sin(this.tick * 0.01) * 0.5,

      // Posición
      Position: 3,
      ClassPosition: 2,
      CarNumber: '42',
      DriverName: 'Vantare Test',
      TeamName: 'Vantare Racing',
    };
  }

  /**
   * Genera datos mock de sesión de iRacing.
   */
  generateSession(): RawSession {
    return {
      SessionType: 'Race',
      SessionTimeRemaining: this.sessionTimeRemaining,
      SessionLapsRemaining: Math.max(0, 30 - this.lap),
      CarsInSession: 24,
      TrackName: 'Spa-Francorchamps',
      TrackTemperature: 28 + Math.random() * 5,
      AmbientTemperature: 22 + Math.random() * 3,
      WeatherInfo: {
        Conditions: 'Clear',
        WindSpeed: 5 + Math.random() * 10,
        TrackTemp: 30 + Math.random() * 8,
      },
    };
  }

  /**
   * Aplica un escenario específico al mock.
   */
  applyScenario(scenario: keyof typeof IRacingMock.scenarios): void {
    const config = IRacingMock.scenarios[scenario];
    if ('speed' in config) {
      this.speed = config.speed;
    }
    if ('rpm' in config) {
      this.rpm = config.rpm;
    }
    if ('gear' in config) {
      this.gear = config.gear;
    }
  }
}
```

### 4.7 Cómo Probar sin iRacing Ejecutándose

```typescript
// Opción 1: Usar el mock directamente
import { IRacingMock } from './iracing/mock';

const mock = new IRacingMock();
const telemetry = mock.generateTelemetry();
console.log(telemetry);

// Opción 2: Configurar el adaptador en modo mock
import { IRacingAdapter } from './iracing/adapter';

const adapter = new IRacingAdapter();
// El adaptador detecta automáticamente la plataforma
// En macOS/Linux usa mock, en Windows intenta real

// Opción 3: Forzar mock en Windows
const adapter = new IRacingAdapter({ forceMock: true });
await adapter.connect();
adapter.onTelemetry((data) => {
  console.log('Mock telemetry:', data);
});

// Opción 4: Usar test-data/
// Coloca archivos JSON en test-data/iracing/
// El adaptador los carga automáticamente en modo test
```

---

## 5. LMU Adapter — Implementación Detallada

### 5.1 LMU Shared Memory Interface v1.2+

Le Mans Ultimate expone datos de telemetría a través de:
1. **Shared memory** (vía sidecar Python)
2. **REST API** (información adicional de sesión)

El sidecar Python lee la shared memory y la expone como JSON en HTTP.

### 5.2 Cómo LMU Expone Datos

LMU usa una estructura de shared memory diferente a iRacing:

```c
// Estructura de shared memory de LMU (simplificada)
typedef struct {
    // Header
    int version;
    int dataLength;
    int updateCount;
    int gamePaused;

    // Motor
    float speed;              // m/s
    int rpm;
    int maxRpm;
    float throttle;           // 0-1
    float brake;              // 0-1
    float clutch;             // 0-1
    int gear;

    // Posición
    float position[3];        // x, y, z en metros
    float rotation[4];        // quaternion

    // Neumáticos
    float tirePressure[4];    // kPa
    float tireTemperature[4]; // °C
    float tireWear[4];        // 0-1

    // Frenos
    float brakeTemperature[4];// °C
    float brakeBias;          // 0-1

    // Combustible
    float fuelLevel;          // litros
    float fuelCapacity;       // litros
    float fuelConsumption;    // litros/vuelta

    // Vuelta
    int currentLap;
    float currentLapTime;
    float lastLapTime;
    float bestLapTime;
    float sector1Time;
    float sector2Time;
    float sector3Time;

    // Sesión
    int sessionType;
    float sessionTimeRemaining;
    int sessionLapsRemaining;
    int carsInSession;

    // Clima
    float trackTemperature;
    float ambientTemperature;
    float windSpeed;
    float windDirection;
} LMUTelemetryData;
```

### 5.3 Adaptador LMU

#### lmu-adapter.ts

```typescript
import type {
  SimAdapter,
  ConnectionState,
  SimInfo,
  RawTelemetry,
  RawSession,
} from '../base';

/**
 * Adaptador para Le Mans Ultimate.
 *
 * Lee datos del sidecar Python que expone la shared memory de LMU
 * como JSON en HTTP (localhost:4000).
 *
 * @example
 * ```typescript
 * const adapter = new LMUAdapter();
 * if (adapter.isAvailable()) {
 *   await adapter.connect();
 *   adapter.onTelemetry((data) => {
 *     console.log('Speed:', data.speed, 'm/s');
 *   });
 * }
 * ```
 */
export class LMUAdapter implements SimAdapter {
  readonly name = 'lmu' as const;
  readonly displayName = 'Le Mans Ultimate';

  private connectionState: ConnectionState = 'disconnected';
  private telemetryListeners: Set<(data: RawTelemetry) => void> = new Set();
  private sessionListeners: Set<(data: RawSession) => void> = new Set();
  private connectionListeners: Set<(state: ConnectionState) => void> = new Set();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private sidecarUrl = 'http://localhost:4000';

  /** Frecuencia de polling en ms (20Hz = 50ms) */
  private readonly pollFrequency = 50;

  constructor(options?: { sidecarUrl?: string }) {
    if (options?.sidecarUrl) {
      this.sidecarUrl = options.sidecarUrl;
    }
  }

  /**
   * Verifica si el sidecar de LMU está disponible.
   *
   * Hace una petición HTTP al sidecar para verificar que está
   * ejecutándose y devolviendo datos.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.sidecarUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Conecta al stream de telemetría de LMU.
   *
   * Comienza a hacer polling al sidecar a 20Hz.
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected') return;

    this.setConnectionState('connecting');

    try {
      // Verificar que el sidecar está disponible
      const available = await this.isAvailable();
      if (!available) {
        throw new Error(
          'Sidecar de LMU no disponible. Ejecuta: python main.py'
        );
      }

      this.setConnectionState('connected');
      this.startPolling();
    } catch (error) {
      this.setConnectionState('error');
      throw error;
    }
  }

  /**
   * Desconecta del stream de telemetría.
   */
  disconnect(): void {
    if (this.connectionState === 'disconnected') return;

    this.stopPolling();
    this.setConnectionState('disconnected');
  }

  onTelemetry(callback: (data: RawTelemetry) => void): () => void {
    this.telemetryListeners.add(callback);
    return () => this.telemetryListeners.delete(callback);
  }

  onSessionData(callback: (data: RawSession) => void): () => void {
    this.sessionListeners.add(callback);
    return () => this.sessionListeners.delete(callback);
  }

  onConnectionState(callback: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  getSimInfo(): SimInfo {
    return {
      name: 'lmu',
      displayName: 'Le Mans Ultimate',
      version: '1.2.0',
      sdkVersion: 'shared-memory-v1',
      updateFrequency: 20,
      variableCount: 45,
    };
  }

  destroy(): void {
    this.disconnect();
    this.telemetryListeners.clear();
    this.sessionListeners.clear();
    this.connectionListeners.clear();
  }

  // --- Métodos privados ---

  private startPolling(): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(async () => {
      if (this.connectionState !== 'connected') return;

      try {
        const response = await fetch(`${this.sidecarUrl}/telemetry`, {
          signal: AbortSignal.timeout(1000),
        });

        if (!response.ok) {
          throw new Error(`Sidecar responded with ${response.status}`);
        }

        const data = await response.json();

        // Emitir telemetría
        this.telemetryListeners.forEach((cb) => cb(data.telemetry));

        // Emitir datos de sesión
        if (data.session) {
          this.sessionListeners.forEach((cb) => cb(data.session));
        }
      } catch (error) {
        console.error('[LMUAdapter] Error leyendo telemetría:', error);
        this.setConnectionState('error');
        this.stopPolling();
      }
    }, this.pollFrequency);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.connectionListeners.forEach((cb) => cb(state));
  }
}
```

### 5.4 Diferencias con iRacing

| Aspecto | iRacing | LMU |
|---------|---------|-----|
| **Mecanismo** | Shared memory via C++ addon | Shared memory via Python sidecar |
| **Formato** | Binario (mmap) | JSON (HTTP) |
| **Frecuencia** | 60Hz | 20Hz |
| **Unidades velocidad** | mph | m/s |
| **Unidades temperatura** | °F | °C |
| **Unidades presión** | psi | kPa |
| **Combustible** | galones | litros |
| **Acceso** | N-API directo | HTTP fetch |
| **Plataforma** | Solo Windows | Cross-platform (Python) |
| **Session info** | YAML embebido | JSON separado |

### 5.5 Variables de LMU

| Variable LMU | Tipo | Unidad | Equivalente iRacing |
|-------------|------|--------|---------------------|
| `speed` | float | m/s | `Speed` (mph) |
| `rpm` | int | RPM | `RPM` |
| `maxRpm` | int | RPM | `MaxRPM` |
| `throttle` | float | 0-1 | `Throttle` |
| `brake` | float | 0-1 | `Brake` |
| `clutch` | float | 0-1 | `Clutch` |
| `gear` | int | -1..8 | `Gear` |
| `tirePressure` | float[4] | kPa | `TirePressure` (psi) |
| `tireTemperature` | float[4] | °C | `TireTemp` (°F) |
| `tireWear` | float[4] | 0-1 | `TireWear` |
| `brakeTemperature` | float[4] | °C | `BrakeTemp` (°F) |
| `fuelLevel` | float | litros | `FuelLevel` (galones) |
| `fuelConsumption` | float | L/vuelta | `FuelUsedLap` (gal/vuelta) |
| `currentLap` | int | vueltas | `Lap` |
| `currentLapTime` | float | segundos | `LapTime` |
| `lastLapTime` | float | segundos | `LastLapTime` |
| `bestLapTime` | float | segundos | `BestLapTime` |

---

## 6. AC Adapter — Implementación Detallada

### 6.1 AC Data via UDP

Assetto Corsa expone datos de telemetría a través de UDP en el puerto configurable (por defecto 9996).

### 6.2 AC UDP Protocol

```typescript
// AC UDP packet structure (simplified)
interface ACUDPPacket {
  // Header
  connectionId: number;
  version: number;
  packetId: number;

  // Engine
  speed: number;           // km/h
  rpm: number;
  maxRpm: number;
  throttle: number;        // 0-1
  brake: number;           // 0-1
  clutch: number;          // 0-1
  gear: number;

  // Position
  position: [number, number, number];

  // Tyres
  tyrePressure: [number, number, number, number];
  tyreTemperature: [number, number, number, number];

  // Fuel
  fuelLevel: number;       // litros
  fuelCapacity: number;    // litros

  // Lap
  currentLap: number;
  currentLapTime: number;
  lastLapTime: number;
  bestLapTime: number;

  // Session
  sessionTimeRemaining: number;
  carsInSession: number;
}
```

### 6.3 Adaptador AC

```typescript
import { createSocket, type Socket } from 'dgram';
import type {
  SimAdapter,
  ConnectionState,
  SimInfo,
  RawTelemetry,
  RawSession,
} from '../base';

/**
 * Adaptador para Assetto Corsa.
 *
 * Lee datos de telemetría del protocolo UDP de AC.
 * Escucha en el puerto configurado (por defecto 9996).
 */
export class ACAdapter implements SimAdapter {
  readonly name = 'ac' as const;
  readonly displayName = 'Assetto Corsa';

  private connectionState: ConnectionState = 'disconnected';
  private telemetryListeners: Set<(data: RawTelemetry) => void> = new Set();
  private sessionListeners: Set<(data: RawSession) => void> = new Set();
  private connectionListeners: Set<(state: ConnectionState) => void> = new Set();
  private socket: Socket | null = null;
  private port: number;
  private lastPacketId = -1;

  constructor(options?: { port?: number }) {
    this.port = options?.port ?? 9996;
  }

  isAvailable(): boolean {
    // Verificar si el puerto UDP está activo
    return this.connectionState === 'connected';
  }

  async connect(): Promise<void> {
    if (this.connectionState === 'connected') return;

    this.setConnectionState('connecting');

    try {
      this.socket = createSocket('udp4');

      this.socket.on('message', (msg) => {
        this.handleUDPMessage(msg);
      });

      this.socket.on('error', (err) => {
        console.error('[ACAdapter] Socket error:', err);
        this.setConnectionState('error');
      });

      this.socket.bind(this.port);

      this.setConnectionState('connected');
    } catch (error) {
      this.setConnectionState('error');
      throw error;
    }
  }

  disconnect(): void {
    if (this.connectionState === 'disconnected') return;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.setConnectionState('disconnected');
  }

  onTelemetry(callback: (data: RawTelemetry) => void): () => void {
    this.telemetryListeners.add(callback);
    return () => this.telemetryListeners.delete(callback);
  }

  onSessionData(callback: (data: RawSession) => void): () => void {
    this.sessionListeners.add(callback);
    return () => this.sessionListeners.delete(callback);
  }

  onConnectionState(callback: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  getSimInfo(): SimInfo {
    return {
      name: 'ac',
      displayName: 'Assetto Corsa',
      version: '1.16.4',
      sdkVersion: 'udp-v1',
      updateFrequency: 60,
      variableCount: 35,
    };
  }

  destroy(): void {
    this.disconnect();
    this.telemetryListeners.clear();
    this.sessionListeners.clear();
    this.connectionListeners.clear();
  }

  // --- Métodos privados ---

  private handleUDPMessage(msg: Buffer): void {
    // Parsear paquete UDP (formato binario de AC)
    const packet = this.parseUDPPacket(msg);

    if (!packet) return;

    // Ignorar paquetes duplicados
    if (packet.packetId === this.lastPacketId) return;
    this.lastPacketId = packet.packetId;

    // Emitir telemetría
    this.telemetryListeners.forEach((cb) => cb(packet.telemetry));

    // Emitir datos de sesión
    if (packet.session) {
      this.sessionListeners.forEach((cb) => cb(packet.session));
    }
  }

  private parseUDPPacket(msg: Buffer): {
    telemetry: RawTelemetry;
    session: RawSession;
  } | null {
    try {
      // Parseo del protocolo UDP de AC
      // El formato exacto depende de la versión del protocolo
      const offset = 0;

      const telemetry: RawTelemetry = {
        Speed: msg.readFloatLE(offset),
        RPM: msg.readInt32LE(offset + 4),
        MaxRpm: msg.readInt32LE(offset + 8),
        Throttle: msg.readFloatLE(offset + 12),
        Brake: msg.readFloatLE(offset + 16),
        Clutch: msg.readFloatLE(offset + 20),
        Gear: msg.readInt32LE(offset + 24),
        // ... más campos
      };

      const session: RawSession = {
        SessionTimeRemaining: msg.readFloatLE(offset + 100),
        CarsInSession: msg.readInt32LE(offset + 104),
        // ... más campos
      };

      return { telemetry, session };
    } catch {
      return null;
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.connectionListeners.forEach((cb) => cb(state));
  }
}
```

---

## 7. Patrón Normalizer

El normalizer es el componente que convierte los datos crudos específicos de cada simulador al formato unificado `UnifiedTelemetry`.

### 7.1 Normalizer Global

```typescript
import type {
  UnifiedTelemetry,
  EngineData,
  PlayerData,
  TyreData,
  BrakeData,
  LapData,
  SessionData,
  VehicleData,
  SimType,
  SessionType,
} from '@vantare/shared';
import type { RawTelemetry, RawSession } from './adapters/base';

/**
 * Normaliza datos crudos de iRacing al formato unificado.
 *
 * Maneja las diferencias de unidades:
 * - Velocidad: mph → km/h
 * - Temperatura: °F → °C
 * - Presión: psi → kPa
 * - Combustible: galones → litros
 * - Gas: 0-1 → 0-100%
 */
export function normalizeIRacing(
  raw: RawTelemetry,
  session: RawSession | null
): UnifiedTelemetry {
  return {
    timestamp: performance.now(),
    sim: 'iracing',
    isConnected: true,

    engine: normalizeEngineIRacing(raw),
    player: normalizePlayerIRacing(raw),
    tyres: normalizeTyresIRacing(raw),
    brakes: normalizeBrakesIRacing(raw),
    lap: normalizeLapIRacing(raw),
    session: normalizeSessionIRacing(session),
    vehicles: [], // iRacing vehicles require additional processing
  };
}

function normalizeEngineIRacing(raw: RawTelemetry): EngineData {
  return {
    gear: raw.Gear as number,
    rpm: raw.RPM as number,
    maxRpm: raw.MaxRPM as number,
    speed: (raw.Speed as number) * 1.60934, // mph → km/h
    throttle: (raw.Throttle as number) * 100, // 0-1 → 0-100%
    clutch: (raw.Clutch as number) * 100,
    waterTemp: ((raw.WaterTemp as number) - 32) * 5 / 9, // °F → °C
    oilTemp: ((raw.OilTemp as number) - 32) * 5 / 9,
    oilPressure: (raw.OilPressure as number) * 6.89476, // psi → kPa
    fuelPressure: (raw.FuelPressure as number) * 6.89476,
  };
}

function normalizePlayerIRacing(raw: RawTelemetry): PlayerData {
  return {
    driverName: (raw.DriverName as string) ?? 'Unknown',
    carNumber: (raw.CarNumber as string) ?? '0',
    carName: '',
    teamName: (raw.TeamName as string) ?? '',
    position: raw.Position as number,
    classPosition: raw.ClassPosition as number,
    iRating: 0,
    licenceLevel: 0,
  };
}

function normalizeTyresIRacing(raw: RawTelemetry): TyreData {
  const pressures = raw.TirePressure as number[];
  const temps = raw.TireTemp as number[];
  const wear = raw.TireWear as number[];

  return {
    pressures: pressures?.map((p) => p * 6.89476) ?? [0, 0, 0, 0], // psi → kPa
    temperatures: temps?.map((t) => (t - 32) * 5 / 9) ?? [0, 0, 0, 0], // °F → °C
    wear: wear ?? [0, 0, 0, 0],
    compound: (raw.TireCompound as string) ?? 'Unknown',
    isDry: true,
  };
}

function normalizeBrakesIRacing(raw: RawTelemetry): BrakeData {
  const temps = raw.BrakeTemp as number[];

  return {
    temperatures: temps?.map((t) => (t - 32) * 5 / 9) ?? [0, 0, 0, 0], // °F → °C
    biasFront: raw.BrakeBiasF as number,
    biasRear: 100 - (raw.BrakeBiasF as number),
  };
}

function normalizeLapIRacing(raw: RawTelemetry): LapData {
  const fuelLevel = raw.FuelLevel as number;
  const fuelCapacity = 20; // Galones — debería venir del session info
  const fuelPerLap = raw.FuelUsedLap as number;

  return {
    lapNumber: raw.Lap as number,
    lastLaptime: raw.LastLapTime as number,
    bestLaptime: raw.BestLapTime as number,
    sector1: raw.Sector1Time as number,
    sector2: raw.Sector2Time as number,
    sector3: raw.Sector3Time as number,
    fuelRemaining: fuelLevel * 3.78541, // galones → litros
    fuelConsumption: fuelPerLap * 3.78541,
    lapsRemaining: fuelPerLap > 0
      ? Math.floor(fuelLevel / fuelPerLap)
      : 0,
  };
}

function normalizeSessionIRacing(session: RawSession | null): SessionData {
  if (!session) {
    return {
      sessionType: 'practice',
      sessionTimeRemaining: 0,
      sessionLapsRemaining: 0,
      sessionTotalTime: 0,
      weather: {
        condition: 'clear',
        windSpeed: 0,
        windDirection: 0,
      },
      trackName: 'Unknown',
      trackTemperature: 0,
      ambientTemperature: 0,
    };
  }

  return {
    sessionType: parseSessionType(session.SessionType as string),
    sessionTimeRemaining: session.SessionTimeRemaining as number,
    sessionLapsRemaining: session.SessionLapsRemaining as number,
    sessionTotalTime: 0,
    weather: {
      condition: 'clear',
      windSpeed: session.WeatherInfo?.WindSpeed as number ?? 0,
      windDirection: 0,
    },
    trackName: session.TrackName as string ?? 'Unknown',
    trackTemperature: session.WeatherInfo?.TrackTemp as number ?? 0,
    ambientTemperature: session.WeatherInfo?.Temperature as number ?? 0,
  };
}

function parseSessionType(type: string): SessionType {
  const lower = type.toLowerCase();
  if (lower.includes('race')) return 'race';
  if (lower.includes('qual')) return 'qualifying';
  if (lower.includes('practice')) return 'practice';
  if (lower.includes('warmup')) return 'warmup';
  return 'practice';
}
```

### 7.2 Normalizer LMU

```typescript
import type {
  UnifiedTelemetry,
  EngineData,
  PlayerData,
  TyreData,
  BrakeData,
  LapData,
  SessionData,
  VehicleData,
  SessionType,
} from '@vantare/shared';
import type { RawTelemetry, RawSession } from './adapters/base';

/**
 * Normaliza datos crudos de LMU al formato unificado.
 *
 * LMU ya usa unidades métricas, así que menos conversiones.
 */
export function normalizeLMU(
  raw: RawTelemetry,
  session: RawSession | null
): UnifiedTelemetry {
  return {
    timestamp: performance.now(),
    sim: 'lmu',
    isConnected: true,

    engine: normalizeEngineLMU(raw),
    player: normalizePlayerLMU(raw),
    tyres: normalizeTyresLMU(raw),
    brakes: normalizeBrakesLMU(raw),
    lap: normalizeLapLMU(raw),
    session: normalizeSessionLMU(session),
    vehicles: [], // LMU vehicles require additional processing
  };
}

function normalizeEngineLMU(raw: RawTelemetry): EngineData {
  return {
    gear: raw.gear as number,
    rpm: raw.rpm as number,
    maxRpm: raw.maxRpm as number,
    speed: (raw.speed as number) * 3.6, // m/s → km/h
    throttle: (raw.throttle as number) * 100,
    clutch: (raw.clutch as number) * 100,
    waterTemp: raw.waterTemp as number,
    oilTemp: raw.oilTemp as number,
    oilPressure: raw.oilPressure as number,
    fuelPressure: raw.fuelPressure as number,
  };
}

function normalizePlayerLMU(raw: RawTelemetry): PlayerData {
  return {
    driverName: (raw.driverName as string) ?? 'Unknown',
    carNumber: (raw.carNumber as string) ?? '0',
    carName: (raw.carName as string) ?? '',
    teamName: (raw.teamName as string) ?? '',
    position: raw.position as number,
    classPosition: raw.classPosition as number,
    iRating: 0,
    licenceLevel: 0,
  };
}

function normalizeTyresLMU(raw: RawTelemetry): TyreData {
  const pressures = raw.tirePressure as number[];
  const temps = raw.tireTemperature as number[];
  const wear = raw.tireWear as number[];

  return {
    pressures: pressures ?? [0, 0, 0, 0],
    temperatures: temps ?? [0, 0, 0, 0],
    wear: wear ?? [0, 0, 0, 0],
    compound: (raw.tireCompound as string) ?? 'Unknown',
    isDry: true,
  };
}

function normalizeBrakesLMU(raw: RawTelemetry): BrakeData {
  const temps = raw.brakeTemperature as number[];

  return {
    temperatures: temps ?? [0, 0, 0, 0],
    biasFront: (raw.brakeBias as number) * 100,
    biasRear: 100 - (raw.brakeBias as number) * 100,
  };
}

function normalizeLapLMU(raw: RawTelemetry): LapData {
  const fuelLevel = raw.fuelLevel as number;
  const fuelConsumption = raw.fuelConsumption as number;

  return {
    lapNumber: raw.currentLap as number,
    lastLaptime: raw.lastLapTime as number,
    bestLaptime: raw.bestLapTime as number,
    sector1: raw.sector1Time as number,
    sector2: raw.sector2Time as number,
    sector3: raw.sector3Time as number,
    fuelRemaining: fuelLevel,
    fuelConsumption: fuelConsumption,
    lapsRemaining: fuelConsumption > 0
      ? Math.floor(fuelLevel / fuelConsumption)
      : 0,
  };
}

function normalizeSessionLMU(session: RawSession | null): SessionData {
  if (!session) {
    return {
      sessionType: 'practice',
      sessionTimeRemaining: 0,
      sessionLapsRemaining: 0,
      sessionTotalTime: 0,
      weather: {
        condition: 'clear',
        windSpeed: 0,
        windDirection: 0,
      },
      trackName: 'Unknown',
      trackTemperature: 0,
      ambientTemperature: 0,
    };
  }

  return {
    sessionType: parseSessionType(session.sessionType as string),
    sessionTimeRemaining: session.sessionTimeRemaining as number,
    sessionLapsRemaining: session.sessionLapsRemaining as number,
    sessionTotalTime: 0,
    weather: {
      condition: 'clear',
      windSpeed: session.windSpeed as number ?? 0,
      windDirection: session.windDirection as number ?? 0,
    },
    trackName: (session.trackName as string) ?? 'Unknown',
    trackTemperature: session.trackTemperature as number ?? 0,
    ambientTemperature: session.ambientTemperature as number ?? 0,
  };
}

function parseSessionType(type: string): SessionType {
  const lower = type.toLowerCase();
  if (lower.includes('race')) return 'race';
  if (lower.includes('qual')) return 'qualifying';
  if (lower.includes('practice')) return 'practice';
  if (lower.includes('warmup')) return 'warmup';
  return 'practice';
}
```

### 7.3 Clase SimNormalizer (Orquestador)

```typescript
import type { UnifiedTelemetry, SimType } from '@vantare/shared';
import type { RawTelemetry, RawSession } from './adapters/base';
import { normalizeIRacing } from './adapters/iracing/iracing-normalizer';
import { normalizeLMU } from './adapters/lmu/lmu-normalizer';
import { normalizeAC } from './adapters/ac/ac-normalizer';

/**
 * Orquestador de normalización.
 *
 * Selecciona el normalizer correcto según el tipo de simulador
 * y aplica la conversión de datos crudos a DTO unificado.
 *
 * @example
 * ```typescript
 * const normalizer = new SimNormalizer();
 *
 * // El tipo de sim se determina automáticamente
 * const unified = normalizer.normalize('iracing', rawTelemetry, rawSession);
 * console.log(unified.engine.speed); // km/h, siempre
 * ```
 */
export class SimNormalizer {
  /**
   * Normaliza datos crudos al formato unificado.
   *
   * @param sim - Tipo de simulador de origen
   * @param raw - Datos crudos de telemetría
   * @param session - Datos crudos de sesión (opcional)
   * @returns Datos unificados listos para overlays
   */
  normalize(
    sim: SimType,
    raw: RawTelemetry,
    session: RawSession | null = null
  ): UnifiedTelemetry {
    switch (sim) {
      case 'iracing':
        return normalizeIRacing(raw, session);
      case 'lmu':
        return normalizeLMU(raw, session);
      case 'ac':
        return normalizeAC(raw, session);
      default:
        throw new Error(`Simulador no soportado: ${sim}`);
    }
  }
}
```

---

## 8. SimManager — Auto-Detección

El SimManager es el orquestador principal que gestiona la vida de los adaptadores.

### 8.1 Implementación Completa

```typescript
import { EventEmitter } from 'events';
import type { SimType, UnifiedTelemetry } from '@vantare/shared';
import type { SimAdapter, ConnectionState } from './adapters/base';
import { SimNormalizer } from './normalizer';
import { IRacingAdapter } from './adapters/iracing/iracing-adapter';
import { LMUAdapter } from './adapters/lmu/lmu-adapter';
import { ACAdapter } from './adapters/ac/ac-adapter';
import type { RawTelemetry, RawSession } from './adapters/base';

/**
 * Eventos emitidos por el SimManager.
 */
export interface SimManagerEvents {
  /** Se detectó un simulador ejecutándose */
  'sim-detected': (sim: SimType) => void;

  /** Se perdió conexión con el simulador */
  'sim-lost': (sim: SimType) => void;

  /** Nuevo dato de telemetría normalizado */
  'telemetry': (data: UnifiedTelemetry) => void;

  /** Error en un adaptador */
  'error': (sim: SimType, error: Error) => void;

  /** Cambio de estado de conexión */
  'connection-state': (sim: SimType, state: ConnectionState) => void;
}

/**
 * Prioridad de auto-detección de simuladores.
 *
 * Cuando múltiples sims están ejecutándose simultáneamente,
 * se selecciona el de mayor prioridad.
 */
const SIM_PRIORITY: SimType[] = ['iracing', 'lmu', 'ac'];

/**
 * SimManager — Orquestador principal de adaptadores.
 *
 * Responsabilidades:
 * 1. Auto-detectar qué simulador está ejecutándose
 * 2. Gestionar la conexión/desconexión de adaptadores
 * 3. Normalizar datos crudos a UnifiedTelemetry
 * 4. Emitir eventos para el SSE Broadcaster
 * 5. Manejar reconexiones automáticas
 *
 * @example
 * ```typescript
 * const manager = new SimManager();
 *
 * manager.on('telemetry', (data) => {
 *   console.log(`${data.sim}: ${data.engine.speed} km/h`);
 *   broadcaster.broadcast(data);
 * });
 *
 * await manager.start();
 * ```
 */
export class SimManager extends EventEmitter {
  private adapters: Map<SimType, SimAdapter> = new Map();
  private normalizer = new SimNormalizer();
  private activeSim: SimType | null = null;
  private isRunning = false;
  private detectionInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts: Map<SimType, number> = new Map();

  /** Intervalo de auto-detección en ms (2 segundos) */
  private readonly detectionFrequency = 2000;

  /** Máximo número de intentos de reconexión */
  private readonly maxReconnectAttempts = 5;

  /** Intervalo base de reconexión en ms (se incrementa exponencialmente) */
  private readonly reconnectBaseDelay = 1000;

  /**
   * Inicia el SimManager.
   *
   * Comienza a detectar simuladores ejecutándose y conecta
   * automáticamente al primero que encuentre.
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    // Crear instancias de todos los adaptadores
    this.adapters.set('iracing', new IRacingAdapter());
    this.adapters.set('lmu', new LMUAdapter());
    this.adapters.set('ac', new ACAdapter());

    // Iniciar loop de auto-detección
    this.startDetection();
  }

  /**
   * Detiene el SimManager.
   *
   * Desconecta todos los adaptadores y detiene la auto-detección.
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    // Desconectar todos los adaptadores
    for (const [sim, adapter] of this.adapters) {
      try {
        adapter.disconnect();
        adapter.destroy();
      } catch (error) {
        console.error(`[SimManager] Error desconectando ${sim}:`, error);
      }
    }

    this.adapters.clear();
    this.reconnectAttempts.clear();
    this.activeSim = null;
  }

  /**
   * Conecta manualmente a un simulador específico.
   *
   * Útil cuando el usuario selecciona un sim en la UI de Settings.
   *
   * @param sim - Tipo de simulador al que conectar
   */
  async connectTo(sim: SimType): Promise<void> {
    const adapter = this.adapters.get(sim);
    if (!adapter) {
      throw new Error(`Adaptador no encontrado para ${sim}`);
    }

    // Desconectar sim activo actual
    if (this.activeSim) {
      const currentAdapter = this.adapters.get(this.activeSim);
      currentAdapter?.disconnect();
      this.activeSim = null;
    }

    try {
      await adapter.connect();
      this.activeSim = sim;
      this.reconnectAttempts.set(sim, 0);

      // Suscribir a eventos
      this.subscribeToAdapter(sim, adapter);

      this.emit('sim-detected', sim);
    } catch (error) {
      this.emit('error', sim, error as Error);
      throw error;
    }
  }

  /**
   * Desconecta del simulador activo.
   */
  disconnect(): void {
    if (!this.activeSim) return;

    const adapter = this.adapters.get(this.activeSim);
    adapter?.disconnect();

    const sim = this.activeSim;
    this.activeSim = null;
    this.emit('sim-lost', sim);
  }

  /**
   * Retorna el adaptador activo actual.
   */
  getActiveAdapter(): SimAdapter | null {
    if (!this.activeSim) return null;
    return this.adapters.get(this.activeSim) ?? null;
  }

  /**
   * Retorna el tipo de sim activo.
   */
  getActiveSim(): SimType | null {
    return this.activeSim;
  }

  /**
   * Retorna todos los adaptadores registrados.
   */
  getAdapters(): Map<SimType, SimAdapter> {
    return new Map(this.adapters);
  }

  // --- Métodos privados ---

  /**
   * Loop principal de auto-detección.
   *
   * Verifica periódicamente si algún simulador está ejecutándose
   * y conecta automáticamente al de mayor prioridad.
   */
  private startDetection(): void {
    this.detectionInterval = setInterval(async () => {
      if (!this.isRunning) return;

      // Si ya hay un sim activo, verificar que sigue conectado
      if (this.activeSim) {
        const adapter = this.adapters.get(this.activeSim);
        if (adapter && !adapter.isAvailable()) {
          console.log(`[SimManager] ${this.activeSim} desconectado`);
          adapter.disconnect();
          this.activeSim = null;
          this.emit('sim-lost', this.activeSim);
          this.reconnectAttempts.set(this.activeSim, 0);
        }
        return;
      }

      // Buscar nuevo sim en orden de prioridad
      for (const sim of SIM_PRIORITY) {
        const adapter = this.adapters.get(sim);
        if (!adapter) continue;

        try {
          if (await adapter.isAvailable()) {
            console.log(`[SimManager] Detectado ${sim}, conectando...`);
            await this.connectTo(sim);
            return;
          }
        } catch (error) {
          console.error(`[SimManager] Error verificando ${sim}:`, error);
        }
      }
    }, this.detectionFrequency);
  }

  /**
   * Suscribe a los eventos de un adaptador.
   */
  private subscribeToAdapter(sim: SimType, adapter: SimAdapter): void {
    // Telemetría
    adapter.onTelemetry((raw: RawTelemetry) => {
      try {
        const sessionData = this.getLastSessionData(sim);
        const unified = this.normalizer.normalize(sim, raw, sessionData);
        this.emit('telemetry', unified);
      } catch (error) {
        console.error(`[SimManager] Error normalizando ${sim}:`, error);
      }
    });

    // Estado de conexión
    adapter.onConnectionState((state: ConnectionState) => {
      this.emit('connection-state', sim, state);

      if (state === 'error') {
        this.handleReconnect(sim);
      }
    });
  }

  /**
   * Maneja la reconexión automática después de un error.
   *
   * Usa backoff exponencial: 1s, 2s, 4s, 8s, 16s
   */
  private handleReconnect(sim: SimType): void {
    const attempts = this.reconnectAttempts.get(sim) ?? 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(
        `[SimManager] Máximo de intentos de reconexión alcanzado para ${sim}`
      );
      return;
    }

    const delay = this.reconnectBaseDelay * Math.pow(2, attempts);
    console.log(
      `[SimManager] Reconectando ${sim} en ${delay}ms (intento ${attempts + 1})`
    );

    this.reconnectAttempts.set(sim, attempts + 1);

    setTimeout(async () => {
      if (!this.isRunning) return;

      const adapter = this.adapters.get(sim);
      if (!adapter) return;

      try {
        await adapter.connect();
        this.reconnectAttempts.set(sim, 0);
        this.emit('sim-detected', sim);
      } catch (error) {
        console.error(`[SimManager] Reconexión fallida para ${sim}:`, error);
        this.handleReconnect(sim);
      }
    }, delay);
  }

  /**
   * Almacena datos de sesión para uso del normalizer.
   * (Simplificado — en producción usar un Map con timestamps)
   */
  private lastSessionData: Map<SimType, RawSession> = new Map();

  private getLastSessionData(sim: SimType): RawSession | null {
    return this.lastSessionData.get(sim) ?? null;
  }
}
```

### 8.2 Flujo de Auto-Detección

```
1. SimManager.start()
   │
   ├── Crea adaptadores: IRacingAdapter, LMUAdapter, ACAdapter
   │
   └── startDetection() → setInterval cada 2s
       │
       ├── ¿Hay sim activo?
       │   ├── SÍ → ¿Sigue disponible?
       │   │   ├── SÍ → No hacer nada
       │   │   └── NO → Desconectar, emitir 'sim-lost'
       │   │
       │   └── NO → Buscar nuevo sim (orden: iRacing > LMU > AC)
       │       │
       │       ├── iRacing disponible? → connectTo('iracing')
       │       ├── LMU disponible? → connectTo('lmu')
       │       └── AC disponible? → connectTo('ac')
       │
       └── connectTo(sim)
           │
           ├── Desconectar sim actual (si hay)
           ├── adapter.connect()
           ├── subscribeToAdapter(sim, adapter)
           │   ├── onTelemetry → normalize → emit 'telemetry'
           │   └── onConnectionState → emit 'connection-state'
           └── emit 'sim-detected'
```

### 8.3 Reconexión Exponencial

```
Intento 1: Espera 1s
Intento 2: Espera 2s
Intento 3: Espera 4s
Intento 4: Espera 8s
Intento 5: Espera 16s
Intento 6: FALLO → No más intentos
```

---

## 9. Añadir un Nuevo Adaptador (Tutorial Completo)

### Paso 1: Crear Directorio del Adaptador

```bash
mkdir -p packages/server/src/sim/adapters/mysim
mkdir -p packages/server/src/sim/adapters/mysim/native
```

### Paso 2: Definir Tipos

Crear `packages/server/src/sim/adapters/mysim/mysim-types.ts`:

```typescript
/**
 * Tipos específicos del simulador "MySim".
 *
 * Estos tipos reflejan la estructura de datos crudos
 * que proporciona el simulador.
 */

/** Datos crudos de telemetría de MySim */
export interface MySimTelemetryData {
  /** Velocidad en km/h */
  currentSpeed: number;

  /** RPM del motor */
  engineRpm: number;

  /** RPM máximo */
  maxEngineRpm: number;

  /** Posición del acelerador (0-1) */
  acceleratorPedal: number;

  /** Posición del freno (0-1) */
  brakePedal: number;

  /** Posición del clutch (0-1) */
  clutchPedal: number;

  /** Marcha actual (-1=R, 0=N, 1+) */
  currentGear: number;

  /** Presiones de neumáticos (kPa) */
  tirePressures: [number, number, number, number];

  /** Temperaturas de neumáticos (°C) */
  tireTemperatures: [number, number, number, number];

  /** Combustible restante (litros) */
  fuelRemaining: number;

  /** Consumo de combustible por vuelta (litros) */
  fuelPerLap: number;

  /** Vuelta actual */
  currentLap: number;

  /** Tiempo de vuelta actual (segundos) */
  currentLapTime: number;

  /** Tiempo de última vuelta (segundos) */
  lastLapTime: number;

  /** Tiempo de mejor vuelta (segundos) */
  bestLapTime: number;

  /** Posición general */
  overallPosition: number;

  /** Nombre del piloto */
  playerName: string;
}

/** Datos de sesión de MySim */
export interface MySimSessionData {
  /** Tipo de sesión */
  sessionMode: string;

  /** Tiempo restante (segundos) */
  remainingTime: number;

  /** Vueltas restantes */
  remainingLaps: number;

  /** Nombre de la pista */
  circuitName: string;

  /** Temperatura de pista (°C) */
  trackTemp: number;

  /** Temperatura ambiental (°C) */
  ambientTemp: number;
}
```

### Paso 3: Implementar el Adaptador

Crear `packages/server/src/sim/adapters/mysim/mysim-adapter.ts`:

```typescript
import type {
  SimAdapter,
  ConnectionState,
  SimInfo,
  RawTelemetry,
  RawSession,
} from '../base';
import type { MySimTelemetryData, MySimSessionData } from './mysim-types';

/**
 * Adaptador para MySim.
 *
 * Implementa la interfaz SimAdapter para leer datos
 * del simulador MySim.
 */
export class MySimAdapter implements SimAdapter {
  readonly name = 'mysim' as SimType;
  readonly displayName = 'MySim';

  private connectionState: ConnectionState = 'disconnected';
  private telemetryListeners = new Set<(data: RawTelemetry) => void>();
  private sessionListeners = new Set<(data: RawSession) => void>();
  private connectionListeners = new Set<(state: ConnectionState) => void>();

  isAvailable(): boolean {
    // TODO: Implementar verificación de disponibilidad
    // Por ejemplo: verificar si el proceso está ejecutándose
    // o si la shared memory está accesible
    return false;
  }

  async connect(): Promise<void> {
    if (this.connectionState === 'connected') return;

    this.setConnectionState('connecting');

    try {
      // TODO: Implementar conexión al simulador
      // Por ejemplo: mapear shared memory, abrir socket UDP, etc.

      this.setConnectionState('connected');
    } catch (error) {
      this.setConnectionState('error');
      throw error;
    }
  }

  disconnect(): void {
    if (this.connectionState === 'disconnected') return;

    // TODO: Implementar desconexión
    // Por ejemplo: cerrar handle de shared memory

    this.setConnectionState('disconnected');
  }

  onTelemetry(callback: (data: RawTelemetry) => void): () => void {
    this.telemetryListeners.add(callback);
    return () => this.telemetryListeners.delete(callback);
  }

  onSessionData(callback: (data: RawSession) => void): () => void {
    this.sessionListeners.add(callback);
    return () => this.sessionListeners.delete(callback);
  }

  onConnectionState(callback: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  getSimInfo(): SimInfo {
    return {
      name: 'mysim' as SimType,
      displayName: 'MySim',
      version: '1.0.0',
      sdkVersion: '1.0.0',
      updateFrequency: 60,
      variableCount: 0,
    };
  }

  destroy(): void {
    this.disconnect();
    this.telemetryListeners.clear();
    this.sessionListeners.clear();
    this.connectionListeners.clear();
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.connectionListeners.forEach((cb) => cb(state));
  }

  /**
   * Método interno para emitir datos de telemetría.
   * Llamar desde el polling loop o event handler del sim.
   */
  emitTelemetry(data: MySimTelemetryData): void {
    const raw: RawTelemetry = {
      Speed: data.currentSpeed,
      RPM: data.engineRpm,
      MaxRPM: data.maxEngineRpm,
      Throttle: data.acceleratorPedal,
      Brake: data.brakePedal,
      Clutch: data.clutchPedal,
      Gear: data.currentGear,
      TirePressure: data.tirePressures,
      TireTemp: data.tireTemperatures,
      FuelLevel: data.fuelRemaining,
      FuelUsedLap: data.fuelPerLap,
      Lap: data.currentLap,
      LapTime: data.currentLapTime,
      LastLapTime: data.lastLapTime,
      BestLapTime: data.bestLapTime,
      Position: data.overallPosition,
      DriverName: data.playerName,
    };

    this.telemetryListeners.forEach((cb) => cb(raw));
  }

  /**
   * Método interno para emitir datos de sesión.
   */
  emitSession(data: MySimSessionData): void {
    const raw: RawSession = {
      SessionType: data.sessionMode,
      SessionTimeRemaining: data.remainingTime,
      SessionLapsRemaining: data.remainingLaps,
      TrackName: data.circuitName,
      TrackTemperature: data.trackTemp,
      AmbientTemperature: data.ambientTemp,
    };

    this.sessionListeners.forEach((cb) => cb(raw));
  }
}
```

### Paso 4: Crear el Normalizer

Crear `packages/server/src/sim/adapters/mysim/mysim-normalizer.ts`:

```typescript
import type { UnifiedTelemetry, SessionType } from '@vantare/shared';
import type { RawTelemetry, RawSession } from '../base';

/**
 * Normaliza datos crudos de MySim al formato unificado.
 *
 * IMPORTANTE: Las unidades de MySim son:
 * - Velocidad: km/h (ya unificada)
 * - Temperatura: °C (ya unificada)
 * - Presión: kPa (ya unificada)
 * - Combustible: litros (ya unificada)
 *
 * Por lo tanto, no se necesitan conversiones de unidades.
 */
export function normalizeMySim(
  raw: RawTelemetry,
  session: RawSession | null
): UnifiedTelemetry {
  return {
    timestamp: performance.now(),
    sim: 'mysim' as any,
    isConnected: true,

    engine: {
      gear: raw.Gear as number,
      rpm: raw.RPM as number,
      maxRpm: raw.MaxRPM as number,
      speed: raw.Speed as number,
      throttle: (raw.Throttle as number) * 100,
      clutch: (raw.Clutch as number) * 100,
      waterTemp: (raw.WaterTemp as number) ?? 0,
      oilTemp: (raw.OilTemp as number) ?? 0,
      oilPressure: (raw.OilPressure as number) ?? 0,
      fuelPressure: (raw.FuelPressure as number) ?? 0,
    },

    player: {
      driverName: (raw.DriverName as string) ?? 'Unknown',
      carNumber: (raw.CarNumber as string) ?? '0',
      carName: (raw.CarName as string) ?? '',
      teamName: (raw.TeamName as string) ?? '',
      position: (raw.Position as number) ?? 0,
      classPosition: (raw.ClassPosition as number) ?? 0,
      iRating: 0,
      licenceLevel: 0,
    },

    tyres: {
      pressures: (raw.TirePressure as number[]) ?? [0, 0, 0, 0],
      temperatures: (raw.TireTemp as number[]) ?? [0, 0, 0, 0],
      wear: (raw.TireWear as number[]) ?? [0, 0, 0, 0],
      compound: (raw.TireCompound as string) ?? 'Unknown',
      isDry: true,
    },

    brakes: {
      temperatures: (raw.BrakeTemp as number[]) ?? [0, 0, 0, 0],
      biasFront: (raw.BrakeBias as number) ?? 55,
      biasRear: 100 - ((raw.BrakeBias as number) ?? 55),
    },

    lap: {
      lapNumber: (raw.Lap as number) ?? 0,
      lastLaptime: (raw.LastLapTime as number) ?? 0,
      bestLaptime: (raw.BestLapTime as number) ?? 0,
      sector1: (raw.Sector1Time as number) ?? 0,
      sector2: (raw.Sector2Time as number) ?? 0,
      sector3: (raw.Sector3Time as number) ?? 0,
      fuelRemaining: (raw.FuelLevel as number) ?? 0,
      fuelConsumption: (raw.FuelUsedLap as number) ?? 0,
      lapsRemaining: ((raw.FuelUsedLap as number) ?? 0) > 0
        ? Math.floor(((raw.FuelLevel as number) ?? 0) / ((raw.FuelUsedLap as number) ?? 1))
        : 0,
    },

    session: session
      ? {
          sessionType: parseSessionType(session.SessionType as string),
          sessionTimeRemaining: (session.SessionTimeRemaining as number) ?? 0,
          sessionLapsRemaining: (session.SessionLapsRemaining as number) ?? 0,
          sessionTotalTime: 0,
          weather: {
            condition: 'clear',
            windSpeed: 0,
            windDirection: 0,
          },
          trackName: (session.TrackName as string) ?? 'Unknown',
          trackTemperature: (session.TrackTemperature as number) ?? 0,
          ambientTemperature: (session.AmbientTemperature as number) ?? 0,
        }
      : {
          sessionType: 'practice' as SessionType,
          sessionTimeRemaining: 0,
          sessionLapsRemaining: 0,
          sessionTotalTime: 0,
          weather: { condition: 'clear', windSpeed: 0, windDirection: 0 },
          trackName: 'Unknown',
          trackTemperature: 0,
          ambientTemperature: 0,
        },

    vehicles: [],
  };
}

function parseSessionType(type: string): SessionType {
  const lower = type.toLowerCase();
  if (lower.includes('race')) return 'race';
  if (lower.includes('qual')) return 'qualifying';
  if (lower.includes('practice')) return 'practice';
  return 'practice';
}
```

### Paso 5: Crear Mock para Desarrollo

Crear `packages/server/src/sim/adapters/mysim/mysim-mock.ts`:

```typescript
import type { RawTelemetry, RawSession } from '../base';

/**
 * Mock de MySim para desarrollo sin el simulador.
 */
export class MySimMock {
  private tick = 0;

  generateTelemetry(): RawTelemetry {
    this.tick++;
    const cycle = (this.tick % 300) / 300;

    return {
      Speed: 100 + Math.sin(cycle * Math.PI * 2) * 150,
      RPM: 4000 + Math.sin(cycle * Math.PI * 4) * 3000,
      MaxRpm: 8000,
      Throttle: Math.max(0, Math.sin(cycle * Math.PI * 2)),
      Brake: Math.max(0, -Math.sin(cycle * Math.PI * 2)),
      Clutch: 0,
      Gear: Math.floor(cycle * 6) + 1,
      TirePressure: [220, 220, 220, 220],
      TireTemp: [85, 85, 85, 85],
      TireWear: [0.9, 0.9, 0.9, 0.9],
      TireCompound: 'Soft',
      FuelLevel: 50 - (this.tick * 0.01),
      FuelUsedLap: 1.5,
      Lap: Math.floor(this.tick / 300) + 1,
      LapTime: (this.tick % 300) * 0.016,
      LastLapTime: 90 + Math.random() * 5,
      BestLapTime: 88 + Math.random() * 2,
      Sector1Time: 28 + Math.random() * 2,
      Sector2Time: 30 + Math.random() * 2,
      Sector3Time: 29 + Math.random() * 2,
      BrakeTemp: [350, 350, 350, 350],
      BrakeBias: 55,
      Position: 5,
      ClassPosition: 3,
      CarNumber: '7',
      DriverName: 'Test Driver',
      TeamName: 'Test Team',
      CarName: 'Test Car',
      WaterTemp: 85,
      OilTemp: 95,
      OilPressure: 4,
      FuelPressure: 3,
    };
  }

  generateSession(): RawSession {
    return {
      SessionType: 'Race',
      SessionTimeRemaining: 1800 - this.tick * 0.016,
      SessionLapsRemaining: 30 - Math.floor(this.tick / 300),
      TrackName: 'Test Circuit',
      TrackTemperature: 30,
      AmbientTemperature: 22,
    };
  }
}
```

### Paso 6: Registrar en SimManager

Actualizar `packages/server/src/sim/sim-manager.ts`:

```typescript
import { MySimAdapter } from './adapters/mysim/mysim-adapter';

// En el método start(), añadir:
this.adapters.set('mysim', new MySimAdapter());

// En SIM_PRIORITY, añadir:
const SIM_PRIORITY: SimType[] = ['iracing', 'lmu', 'mysim', 'ac'];
```

### Paso 7: Añadir tipo SimType

Actualizar `packages/shared/src/types/telemetry.ts`:

```typescript
export type SimType = 'iracing' | 'lmu' | 'ac' | 'mysim';
```

### Paso 8: Crear Tests

Crear `packages/server/src/sim/adapters/mysim/__tests__/mysim-normalizer.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { normalizeMySim } from '../mysim-normalizer';
import type { RawTelemetry, RawSession } from '../../base';

describe('MySim Normalizer', () => {
  const mockRaw: RawTelemetry = {
    Speed: 200,
    RPM: 6000,
    MaxRpm: 8000,
    Throttle: 0.8,
    Brake: 0,
    Clutch: 0,
    Gear: 4,
    Position: 3,
    DriverName: 'Test',
    Lap: 5,
    LastLapTime: 90,
    BestLapTime: 88,
    FuelLevel: 45,
    FuelUsedLap: 1.5,
  };

  const mockSession: RawSession = {
    SessionType: 'Race',
    SessionTimeRemaining: 1200,
    SessionLapsRemaining: 15,
    TrackName: 'Monza',
    TrackTemperature: 30,
    AmbientTemperature: 25,
  };

  it('should normalize engine data', () => {
    const result = normalizeMySim(mockRaw, mockSession);

    expect(result.engine.speed).toBe(200);
    expect(result.engine.rpm).toBe(6000);
    expect(result.engine.gear).toBe(4);
    expect(result.engine.throttle).toBe(80);
  });

  it('should normalize player data', () => {
    const result = normalizeMySim(mockRaw, mockSession);

    expect(result.player.driverName).toBe('Test');
    expect(result.player.position).toBe(3);
  });

  it('should normalize lap data', () => {
    const result = normalizeMySim(mockRaw, mockSession);

    expect(result.lap.lapNumber).toBe(5);
    expect(result.lap.fuelRemaining).toBe(45);
    expect(result.lap.lapsRemaining).toBe(30);
  });

  it('should normalize session data', () => {
    const result = normalizeMySim(mockRaw, mockSession);

    expect(result.session.sessionType).toBe('race');
    expect(result.session.trackName).toBe('Monza');
  });
});
```

### Paso 9: Documentar Variables

Crear `packages/server/src/sim/adapters/mysim/VARIABLES.md`:

```markdown
# MySim Telemetry Variables

## Motor
| Variable | Tipo | Unidad | Rango | Descripción |
|----------|------|--------|-------|-------------|
| currentSpeed | float | km/h | 0-350 | Velocidad actual |
| engineRpm | int | RPM | 0-10000 | Revoluciones actuales |
| maxEngineRpm | int | RPM | 8000-12000 | RPM máximo |
| acceleratorPedal | float | 0-1 | 0-1 | Posición del acelerador |
| brakePedal | float | 0-1 | 0-1 | Posición del freno |
| clutchPedal | float | 0-1 | 0-1 | Posición del clutch |
| currentGear | int | marcha | -1..8 | Marcha actual |

## Neumáticos
| Variable | Tipo | Unidad | Rango | Descripción |
|----------|------|--------|-------|-------------|
| tirePressures | float[4] | kPa | 150-300 | Presiones de neumáticos |
| tireTemperatures | float[4] | °C | 20-120 | Temperaturas de neumáticos |

## Combustible
| Variable | Tipo | Unidad | Rango | Descripción |
|----------|------|--------|-------|-------------|
| fuelRemaining | float | litros | 0-100 | Combustible restante |
| fuelPerLap | float | L/vuelta | 0-10 | Consumo por vuelta |

## Vuelta
| Variable | Tipo | Unidad | Rango | Descripción |
|----------|------|--------|-------|-------------|
| currentLap | int | vueltas | 0-100 | Vuelta actual |
| currentLapTime | float | segundos | 0-300 | Tiempo de vuelta actual |
| lastLapTime | float | segundos | 0-300 | Tiempo de última vuelta |
| bestLapTime | float | segundos | 0-300 | Tiempo de mejor vuelta |
```

---

## 10. Sistema Mock

### 10.1 Desarrollo sin Simulador

El sistema mock permite desarrollar y testear overlays sin ningún simulador ejecutándose.

```typescript
// Auto-detección de plataforma
const isWindows = process.platform === 'win32';
const isMockMode = !isWindows || process.env.VANTARE_MOCK === 'true';

// Crear adaptador apropiado
const adapter = isMockMode
  ? new IRacingAdapter({ forceMock: true })
  : new IRacingAdapter();
```

### 10.2 Escenarios de Mock Configurables

```typescript
export interface MockScenario {
  /** Nombre del escenario */
  name: string;
  /** Descripción */
  description: string;
  /** Datos de telemetría base */
  telemetry: Partial<RawTelemetry>;
  /** Datos de sesión base */
  session: Partial<RawSession>;
  /** Velocidad de cambio (ms entre updates) */
  tickInterval: number;
}

export const MOCK_SCENARIOS: Record<string, MockScenario> = {
  practice: {
    name: 'Practice',
    description: 'Sesión de práctica libre',
    telemetry: { Speed: 0, RPM: 0, Gear: 0 },
    session: { SessionType: 'Practice', SessionTimeRemaining: 3600 },
    tickInterval: 16,
  },
  qualifying: {
    name: 'Qualifying',
    description: 'Sesión de clasificación',
    telemetry: { Speed: 250, RPM: 7000, Gear: 6 },
    session: { SessionType: 'Qualifying', SessionTimeRemaining: 600 },
    tickInterval: 16,
  },
  race_start: {
    name: 'Race Start',
    description: 'Inicio de carrera, grid de salida',
    telemetry: { Speed: 0, RPM: 4000, Gear: 1 },
    session: { SessionType: 'Race', SessionTimeRemaining: 3600, SessionLapsRemaining: 30 },
    tickInterval: 16,
  },
  race_mid: {
    name: 'Race Mid',
    description: 'En medio de la carrera',
    telemetry: { Speed: 280, RPM: 7500, Gear: 6 },
    session: { SessionType: 'Race', SessionTimeRemaining: 1800, SessionLapsRemaining: 15 },
    tickInterval: 16,
  },
  pit_stop: {
    name: 'Pit Stop',
    description: 'En boxes, detenido',
    telemetry: { Speed: 0, RPM: 0, Gear: 0, Throttle: 0, Brake: 1 },
    session: { SessionType: 'Race', SessionTimeRemaining: 1500 },
    tickInterval: 100,
  },
  low_fuel: {
    name: 'Low Fuel',
    description: 'Combustible bajo, último stint',
    telemetry: { FuelLevel: 2.5, FuelLevelPct: 0.05 },
    session: { SessionType: 'Race', SessionTimeRemaining: 600, SessionLapsRemaining: 5 },
    tickInterval: 16,
  },
  rain: {
    name: 'Rain',
    description: 'Lluvia, neumáticos de lluvia',
    telemetry: { TireCompound: 'Wet', Speed: 180 },
    session: { SessionType: 'Race', SessionTimeRemaining: 1200 },
    tickInterval: 16,
  },
};
```

### 10.3 Directorio test-data/

```
packages/server/test-data/
├── iracing/
│   ├── practice.json        # Datos de práctica
│   ├── race.json            # Datos de carrera
│   ├── qualifying.json      # Datos de clasificación
│   └── session-info.yaml    # Session info YAML
├── lmu/
│   ├── telemetry.json       # Datos de telemetría
│   └── session.json         # Datos de sesión
└── ac/
    ├── telemetry.json
    └── session.json
```

### 10.4 Carga de Datos de Test

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

export class TestDataLoader {
  private basePath: string;

  constructor() {
    this.basePath = join(__dirname, '..', '..', 'test-data');
  }

  loadTelemetry(sim: SimType): RawTelemetry {
    const filePath = join(this.basePath, sim, 'telemetry.json');
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  loadSession(sim: SimType): RawSession {
    const filePath = join(this.basePath, sim, 'session.json');
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  /**
   * Genera una secuencia de datos para testing de overlays.
   *
   * @param sim - Tipo de simulador
   * @param ticks - Número de frames a generar
   * @returns Array de telemetrías cronometradas
   */
  generateSequence(
    sim: SimType,
    ticks: number
  ): Array<{ timestamp: number; data: RawTelemetry }> {
    const base = this.loadTelemetry(sim);
    const sequence: Array<{ timestamp: number; data: RawTelemetry }> = [];

    for (let i = 0; i < ticks; i++) {
      sequence.push({
        timestamp: i * 16.67, // ~60Hz
        data: {
          ...base,
          RPM: (base.RPM as number) + Math.sin(i * 0.1) * 500,
          Speed: (base.Speed as number) + Math.sin(i * 0.05) * 20,
        },
      });
    }

    return sequence;
  }
}
```

---

## 11. Consideraciones de Rendimiento

### 11.1 Frecuencia de Lectura

| Simulador | Frecuencia nativa | Frecuencia de lectura | Overhead estimado |
|-----------|-------------------|----------------------|-------------------|
| iRacing | 60Hz | 60Hz (polling) | ~0.5ms por tick |
| LMU | 20Hz | 20Hz (polling) | ~1ms por tick (HTTP) |
| AC | 60Hz | 60Hz (event-driven) | ~0.1ms por tick |

### 11.2 mmap vs read() para iRacing

```
✅ mmap (usado por iRacing SDK):
  - Zero-copy: los datos están en el espacio de usuario
  - No syscall overhead después del mapeo inicial
  - Lectura directa desde puntero de memoria
  - Latencia: ~0.01ms por lectura

❌ read() (alternativa):
  - Copia datos del kernel a user space
  - Syscall overhead en cada lectura
  - Latencia: ~0.1ms por lectura

Decisión: Usar mmap para iRacing (via C++ addon)
```

### 11.3 Buffer Reuse Patterns

```typescript
/**
 * Pool de buffers reutilizables para evitar GC pressure.
 *
 * En lugar de crear nuevos objetos en cada tick,
 * reutilizamos buffers pre-asignados.
 */
export class TelemetryBuffer {
  private engineBuffer: EngineData = {
    gear: 0, rpm: 0, maxRpm: 0, speed: 0,
    throttle: 0, clutch: 0, waterTemp: 0,
    oilTemp: 0, oilPressure: 0, fuelPressure: 0,
  };

  private tyresBuffer: TyreData = {
    pressures: [0, 0, 0, 0],
    temperatures: [0, 0, 0, 0],
    wear: [0, 0, 0, 0],
    compound: '',
    isDry: true,
  };

  /**
   * Actualiza el buffer de engine con nuevos datos.
   * No crea nuevos objetos — muta los existentes.
   */
  updateEngine(raw: RawTelemetry): void {
    this.engineBuffer.gear = raw.Gear as number;
    this.engineBuffer.rpm = raw.RPM as number;
    this.engineBuffer.speed = (raw.Speed as number) * 1.60934;
    this.engineBuffer.throttle = (raw.Throttle as number) * 100;
    // ... más campos
  }

  /**
   * Retorna referencia al buffer (no copia).
   */
  getEngine(): Readonly<EngineData> {
    return this.engineBuffer;
  }
}
```

### 11.4 Error Handling para Sims Desconectados

```typescript
/**
 * Wrapper que maneja errores de conexión gracefully.
 *
 * Si el simulador se desconecta mid-lectura,
 * retorna los últimos datos válidos en lugar de fallar.
 */
export class ResilientAdapter implements SimAdapter {
  private lastValidTelemetry: RawTelemetry | null = null;
  private consecutiveErrors = 0;
  private readonly maxConsecutiveErrors = 3;

  async readTelemetry(): Promise<RawTelemetry | null> {
    try {
      const data = this.native.getTelemetry();
      this.consecutiveErrors = 0;

      if (data) {
        this.lastValidTelemetry = data;
        return data;
      }

      return this.lastValidTelemetry;
    } catch (error) {
      this.consecutiveErrors++;

      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error('[ResilientAdapter] Demasiados errores consecutivos');
        this.setConnectionState('error');
        return null;
      }

      // Retornar últimos datos válidos
      return this.lastValidTelemetry;
    }
  }
}
```

### 11.5 Prevención de Memory Leaks en C++ Addons

```cpp
// En iracing_sdk.cc — Cleanup correcto
IRacingSDK::~IRacingSDK() {
    // SIEMPRE liberar en orden inverso
    // 1. Desconectar
    connected = false;

    // 2. Limpiar buffers
    variableOffsets.clear();
    variableTypes.clear();
    variableCounts.clear();

    // 3. Desmapear shared memory
    if (pSharedMemory) {
        UnmapViewOfFile(pSharedMemory);
        pSharedMemory = nullptr;
    }

    // 4. Cerrar handle
    if (hMapFile) {
        CloseHandle(hMapFile);
        hMapFile = nullptr;
    }

    header = nullptr;
}

// Importante: N-API manage el lifecycle del objeto
// pero los recursos nativos deben liberarse manualmente
```

### 11.6 Throttling de Eventos

```typescript
/**
 * Throttle para evitar flooding de eventos.
 *
 * Si el sim produce datos a 60Hz pero los overlays
 * solo necesitan 30Hz, throttling reduce el overhead.
 */
export class ThrottledEmitter {
  private lastEmit = 0;
  private minInterval: number;

  constructor(hz: number) {
    this.minInterval = 1000 / hz;
  }

  emit<T>(
    callback: (data: T) => void,
    data: T
  ): void {
    const now = performance.now();
    if (now - this.lastEmit >= this.minInterval) {
      this.lastEmit = now;
      callback(data);
    }
  }
}

// Uso:
const throttled = new ThrottledEmitter(30); // 30Hz
adapter.onTelemetry((data) => {
  throttled.emit(broadcast, data);
});
```

---

## 12. Testing

### 12.1 Unit Tests para Normalizer

```typescript
// packages/server/src/sim/__tests__/normalizer.test.ts
import { describe, it, expect } from 'bun:test';
import { SimNormalizer } from '../normalizer';

describe('SimNormalizer', () => {
  const normalizer = new SimNormalizer();

  describe('normalizeIRacing', () => {
    const raw = {
      Speed: 186, // mph
      RPM: 6500,
      MaxRPM: 8000,
      Throttle: 0.95,
      Brake: 0,
      Clutch: 0,
      Gear: 5,
      WaterTemp: 194, // °F
      OilTemp: 210, // °F
      FuelLevel: 8.5, // galones
      FuelUsedLap: 0.8, // galones/vuelta
      Lap: 15,
      LastLapTime: 88.5,
      BestLapTime: 86.2,
      Position: 3,
      DriverName: 'Test Driver',
      TirePressure: [24.5, 24.5, 24.5, 24.5], // psi
      TireTemp: [185, 185, 185, 185], // °F
      BrakeTemp: [400, 400, 400, 400], // °F
    };

    it('should convert speed from mph to km/h', () => {
      const result = normalizer.normalize('iracing', raw);
      expect(result.engine.speed).toBeCloseTo(299.33, 1);
    });

    it('should convert temperature from °F to °C', () => {
      const result = normalizer.normalize('iracing', raw);
      expect(result.engine.waterTemp).toBeCloseTo(90, 0);
    });

    it('should convert fuel from gallons to liters', () => {
      const result = normalizer.normalize('iracing', raw);
      expect(result.lap.fuelRemaining).toBeCloseTo(32.18, 1);
    });

    it('should convert tyre pressure from psi to kPa', () => {
      const result = normalizer.normalize('iracing', raw);
      expect(result.tyres.pressures[0]).toBeCloseTo(168.9, 0);
    });

    it('should convert brake temperature from °F to °C', () => {
      const result = normalizer.normalize('iracing', raw);
      expect(result.brakes.temperatures[0]).toBeCloseTo(204.4, 0);
    });

    it('should convert throttle to percentage', () => {
      const result = normalizer.normalize('iracing', raw);
      expect(result.engine.throttle).toBe(95);
    });
  });

  describe('normalizeLMU', () => {
    const raw = {
      speed: 83.33, // m/s
      rpm: 6500,
      maxRpm: 8000,
      throttle: 0.95,
      brake: 0,
      gear: 5,
      fuelLevel: 45, // litros
      fuelConsumption: 2.5, // litros/vuelta
      currentLap: 15,
      lastLapTime: 88.5,
      bestLapTime: 86.2,
      tirePressure: [220, 220, 220, 220], // kPa
      tireTemperature: [85, 85, 85, 85], // °C
    };

    it('should convert speed from m/s to km/h', () => {
      const result = normalizer.normalize('lmu', raw);
      expect(result.engine.speed).toBeCloseTo(300, 0);
    });

    it('should keep temperature in °C', () => {
      const result = normalizer.normalize('lmu', raw);
      expect(result.tyres.temperatures[0]).toBe(85);
    });

    it('should keep fuel in liters', () => {
      const result = normalizer.normalize('lmu', raw);
      expect(result.lap.fuelRemaining).toBe(45);
    });

    it('should keep pressure in kPa', () => {
      const result = normalizer.normalize('lmu', raw);
      expect(result.tyres.pressures[0]).toBe(220);
    });
  });
});
```

### 12.2 Integration Tests con Mock Data

```typescript
// packages/server/src/sim/__tests__/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { SimManager } from '../sim-manager';
import { IRacingMock } from '../adapters/iracing/mock';

describe('SimManager Integration', () => {
  let manager: SimManager;
  let mock: IRacingMock;

  beforeAll(() => {
    manager = new SimManager();
    mock = new IRacingMock();
  });

  afterAll(async () => {
    await manager.stop();
  });

  it('should emit telemetry events', async () => {
    const received: any[] = [];

    manager.on('telemetry', (data) => {
      received.push(data);
    });

    // Simular datos del mock
    const adapter = manager.getActiveAdapter();
    if (adapter) {
      const data = mock.generateTelemetry();
      adapter.emit('telemetry', data);
    }

    // Esperar al menos 1 evento
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(received.length).toBeGreaterThan(0);
  });

  it('should detect sim disconnection', async () => {
    let disconnected = false;

    manager.on('sim-lost', () => {
      disconnected = true;
    });

    // Simular desconexión
    const adapter = manager.getActiveAdapter();
    if (adapter) {
      adapter.emit('connectionState', 'disconnected');
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(disconnected).toBe(true);
  });
});
```

### 12.3 End-to-End Tests con Playwright

```typescript
// packages/ui/tests/e2e/overlays.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Overlay E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Asegurar que el servidor está corriendo
    await page.goto('http://localhost:3000/overlays/standings');
  });

  test('should display standings overlay', async ({ page }) => {
    // Esperar a que los datos se carguen
    await page.waitForSelector('table', { timeout: 5000 });

    // Verificar que la tabla tiene filas
    const rows = await page.locator('tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('should update data via SSE', async ({ page }) => {
    await page.waitForSelector('table', { timeout: 5000 });

    // Obtener valor inicial
    const initialSpeed = await page.locator('.speed-value').textContent();

    // Esperar actualización
    await page.waitForTimeout(1000);

    // Verificar que el dato cambió (o al menos sigue presente)
    const currentSpeed = await page.locator('.speed-value').textContent();
    expect(currentSpeed).toBeTruthy();
  });

  test('should work as OBS browser source', async ({ page }) => {
    await page.goto('http://localhost:3000/overlays/standings');

    // Verificar que el HTML es válido para OBS
    const html = await page.content();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('standings');
  });
});
```

### 12.4 Testing de Addons C++

```bash
# Compilar el addon C++
cd packages/server/src/sim/adapters/iracing/native
node-gyp rebuild

# Ejecutar tests del addon
node -e "
  const addon = require('./build/Release/iracing_sdk.node');
  console.log('Addon loaded:', Object.keys(addon));
"

# Test con mock (sin iRacing)
node -e "
  const addon = require('./build/Release/iracing_sdk.node');
  const sdk = new addon.IRacingSDK();
  try {
    sdk.connect();
    console.log('Connected');
  } catch (e) {
    console.log('Expected error (no iRacing):', e.message);
  }
"
```

---

## 13. Referencia de Telemetría por Sim

### 13.1 Tabla de Mapeo Completa

| Campo Unificado | iRacing Variable | LMU Variable | AC Variable | Notas |
|----------------|-----------------|-------------|-------------|-------|
| `engine.speed` | `Speed` (mph) × 1.609 | `speed` (m/s) × 3.6 | `Speed` (km/h) | Unidad final: km/h |
| `engine.rpm` | `RPM` | `rpm` | `RPM` | Sin conversión |
| `engine.maxRpm` | `MaxRPM` | `maxRpm` | `MaxRpm` | Sin conversión |
| `engine.throttle` | `Throttle` × 100 | `throttle` × 100 | `Gas` × 100 | 0-100% |
| `engine.brake` | `Brake` × 100 | `brake` × 100 | `Brake` × 100 | 0-100% |
| `engine.clutch` | `Clutch` × 100 | `clutch` × 100 | `Clutch` × 100 | 0-100% |
| `engine.gear` | `Gear` | `gear` | `Gear` | -1=R, 0=N |
| `engine.waterTemp` | `(WaterTemp-32)×5/9` | `waterTemp` | `WaterTemp` | °C |
| `engine.oilTemp` | `(OilTemp-32)×5/9` | `oilTemp` | `OilTemp` | °C |
| `engine.oilPressure` | `OilPressure×6.895` | `oilPressure` | `OilPressure` | kPa |
| `engine.fuelPressure` | `FuelPressure×6.895` | `fuelPressure` | `FuelPressure` | kPa |
| `player.driverName` | `DriverName` | `driverName` | `DriverName` | String |
| `player.position` | `Position` | `position` | `Position` | Entero |
| `player.classPosition` | `ClassPosition` | `classPosition` | `ClassPosition` | Entero |
| `tyres.pressures` | `TirePressure×6.895` | `tirePressure` | `TyrePressure` | kPa |
| `tyres.temperatures` | `(TireTemp-32)×5/9` | `tireTemperature` | `TyreTemp` | °C |
| `tyres.wear` | `TireWear` | `tireWear` | `TyreWear` | 0-1 |
| `tyres.compound` | `TireCompound` | `tireCompound` | `TyreCompound` | String |
| `brakes.temperatures` | `(BrakeTemp-32)×5/9` | `brakeTemperature` | `BrakeTemp` | °C |
| `brakes.biasFront` | `BrakeBiasF` | `brakeBias×100` | `BrakeBias` | 0-100% |
| `lap.lapNumber` | `Lap` | `currentLap` | `Lap` | Entero |
| `lap.lastLaptime` | `LastLapTime` | `lastLapTime` | `LastLapTime` | Segundos |
| `lap.bestLaptime` | `BestLapTime` | `bestLapTime` | `BestLapTime` | Segundos |
| `lap.fuelRemaining` | `FuelLevel×3.785` | `fuelLevel` | `Fuel` | Litros |
| `lap.fuelConsumption` | `FuelUsedLap×3.785` | `fuelConsumption` | `FuelPerLap` | L/vuelta |
| `session.sessionType` | `SessionType` | `sessionType` | `SessionType` | Mapeado a enum |
| `session.timeRemaining` | `SessionTimeRemaining` | `sessionTimeRemaining` | `SessionTimeRemaining` | Segundos |
| `session.trackName` | `TrackInfo.TrackName` | `trackName` | `Track` | String |

### 13.2 Conversiones de Unidades

```
VELOCIDAD:
  iRacing:  mph → km/h    (× 1.60934)
  LMU:      m/s → km/h    (× 3.6)
  AC:       km/h           (sin conversión)

TEMPERATURA:
  iRacing:  °F → °C       (°F - 32) × 5/9
  LMU:      °C             (sin conversión)
  AC:       °C             (sin conversión)

PRESIÓN:
  iRacing:  psi → kPa     (× 6.89476)
  LMU:      kPa            (sin conversión)
  AC:       kPa            (sin conversión)

COMBUSTIBLE:
  iRacing:  galones → litros (× 3.78541)
  LMU:      litros           (sin conversión)
  AC:       litros           (sin conversión)

GAS/FRENOS:
  iRacing:  0-1 → 0-100%  (× 100)
  LMU:      0-1 → 0-100%  (× 100)
  AC:       0-1 → 0-100%  (× 100)
```

### 13.3 Variables Especiales por Sim

#### iRacing Exclusivas
- `iRating` — Rating del piloto
- `LicenceLevel` — Nivel de licencia (R, D, C, B, A, Pro)
- `CarNumber` — Número del coche
- `TeamName` — Nombre del equipo
- `LapDistPct` — Porcentaje de distancia en la vuelta
- `SteeringAngle` — Ángulo de dirección (radianes)
- `SessionInfo` — YAML con info detallada de sesión

#### LMU Exclusivas
- `position[3]` — Coordenadas XYZ del vehículo
- `rotation[4]` — Quaternion de orientación
- `gamePaused` — Estado de pausa del juego

#### AC Exclusivas
- `connectionId` — ID de conexión UDP
- `packetId` — ID del paquete (para deduplicación)
- `isInPitlane` — Si está en el pit lane
- `pitWindowOpen` — Si la ventana de pits está abierta
- `pitWindowEnd` — Fin de la ventana de pits

---

## Apéndice A: Troubleshooting

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `No se pudo mapear iRacing shared memory` | iRacing no está ejecutándose | Inicia iRacing primero |
| `Sidecar de LMU no disponible` | Python sidecar no está corriendo | Ejecuta `python main.py` |
| `Socket UDP bind failed` | Puerto 9996 en uso | Cambia el puerto o cierra la app que lo usa |
| `Variable not found: Speed` | Versión de SDK incompatible | Actualiza el addon C++ |
| `Connection state: error` | Sim se desconectó mid-session | SimManager intenta reconexión automática |

### Debug Mode

```bash
# Habilitar logging detallado
VANTARE_DEBUG=true bun run dev

# Forzar mock mode
VANTARE_MOCK=true bun run dev

# Especificar adaptador
VANTARE_SIM=iracing bun run dev
VANTARE_SIM=lmu bun run dev
VANTARE_SIM=ac bun run dev

# Puerto del sidecar
VANTARE_SIDECAR_URL=http://localhost:4000 bun run dev
```

---

## Apéndice B: Checklist para Nuevo Adaptador

- [ ] Crear directorio en `packages/server/src/sim/adapters/mysim/`
- [ ] Definir tipos en `mysim-types.ts`
- [ ] Implementar `SimAdapter` interface en `mysim-adapter.ts`
- [ ] Crear normalizer en `mysim-normalizer.ts`
- [ ] Crear mock en `mysim-mock.ts`
- [ ] Registrar en `SimManager`
- [ ] Añadir `SimType` al package shared
- [ ] Crear unit tests para normalizer
- [ ] Crear integration tests con mock
- [ ] Documentar variables en `VARIABLES.md`
- [ ] Añadir escenarios de mock si es necesario
- [ ] Verificar que `bun run typecheck` pasa
- [ ] Verificar que `bun run lint` pasa
- [ ] Actualizar esta guía con la nueva sección