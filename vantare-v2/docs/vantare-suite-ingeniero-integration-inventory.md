# Inventario de Integración - Vantare Ingeniero

Este documento detalla la estructura y el inventario de la integración inicial de **Vantare Ingeniero** en **Vantare Overlays (v2)** para las fases EN0, EN1 y EN2.

## 1. Paquetes Copiados y Adaptados

Los siguientes paquetes se migran desde `C:\Users\isaac\Desktop\Vantare-Ingeniero-Go\internal` hacia `internal/engineer` en este repositorio:

| Paquete Origen | Directorio Destino | Estado / Adaptaciones Realizadas |
|---|---|---|
| `internal/telemetry` | `internal/engineer/telemetry` | Copiado. Se añade `source.go` con las definiciones de `Source` y `SourceInfo` para eliminar la dependencia de `internal/sim` y mantener la autonomía del paquete. |
| `internal/spotter` | `internal/engineer/spotter` | Copiado. Sin cambios de geometría; ajustados imports locales. |
| `internal/audio` | `internal/engineer/audio` | Copiado. Incluye la cola de mensajes (`queue.go`). El reproductor (`player.go`, `player_windows.go`) se compila para consistencia pero no es invocado por el servicio. |
| `internal/core` | `internal/engineer/core` | Copiado. Runtime del spotter; ajustados imports locales. |
| `internal/simulator` | `internal/engineer/simulator` | Copiado. Generador de escenarios mock; adaptado para usar `telemetry.Source`. |
| `internal/replay` | `internal/engineer/replay` | Copiado. Lector de ficheros JSONL de replay; adaptado para usar `telemetry.Source`. |

## 2. Paquetes y Componentes Descartados

Para mantener la arquitectura "un solo proceso, una sola app Wails", se descartan los siguientes componentes del repositorio externo:

- **`app/` y `cmd/`**: La inicialización y ciclo de vida de la aplicación se gestionan en `cmd/vantare/main.go` y `internal/app`.
- **`frontend/` y `build/`**: La UI de Ingeniero se rediseñará e integrará en el Hub de Vantare Overlays en fases posteriores. No se importan bindings generados.
- **`internal/sim/lmu`**: No se abre un segundo lector de memoria compartida LMU.
- **`internal/tts`**: La síntesis de voz (TTS) no se incluye en esta fase. La traducción a español se gestiona de forma estática en el servicio de notificaciones.
- **`internal/config` y `internal/version`**: Descartados para evitar conflictos de configuración global.

## 3. Desfases de Datos de Telemetría (Live Gaps)

El spotter determinista de Ingeniero requiere los siguientes campos por cada vehículo:
- `Position` (Vec3)
- `LocalVelocity` (Vec3)
- `Orientation` (Matriz de orientación 3x3)
- `PathLateral` (Distancia lateral a la línea ideal)
- `TrackEdge` (Límites de pista)

**Estado en Vantare Overlays (`pkg/models/telemetry.go`):**
Actualmente, el modelo de telemetría simplificado utilizado por los widgets de superposición no expone la geometría ni los vectores tridimensionales de los oponentes.

**Estrategia de Mitigación (EN2):**
En esta fase inicial, el servicio `EngineerService` operará exclusivamente con las fuentes `"simulator"` y `"replay"`. Estas fuentes generan tramas completas (`telemetry.Frame`) que contienen toda la información geométrica necesaria. En la fase EN6 se implementará un adaptador enriquecido (`EnrichedLMUSource`) que extraerá estos vectores directamente del mmap de LMU sin perturbar el lector principal de superposiciones.
