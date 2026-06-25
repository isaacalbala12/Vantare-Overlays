# Inventario Técnico y Viabilidad del Delta/Best Live (B5)

Este documento detalla la auditoría técnica de los componentes del widget `delta`, el análisis de los datos en vivo en el pipeline de Go, la identificación de inconsistencias críticas de fusión y la propuesta de arquitectura simplificada para la fase **B6 - Implementación de Delta Best Live**.

---

## 1. Estado Actual del Widget `delta` (Frontend)

*   **Archivo principal**: [DeltaWidget.tsx](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx)
*   **Funcionamiento**:
    *   Consume la fuente de telemetría reactiva mediante `getWidgetTelemetrySource(mode)`.
    *   Lee el valor `t.deltaBest` en cada iteración del bucle de renderizado de alta frecuencia (`startFrameBudgetLoop` configurado por defecto a `updateHz = 30`).
    *   Formatea el delta con la función `formatDelta(delta)` (ej. `-0.150s`, `+1.235s`).
    *   Ajusta visualmente el ancho de la barra de progreso lateral (`fillRef`) proporcionalmente al desfase (hasta un límite de 5 segundos de diferencia) y cambia su color y dirección:
        *   **Negativo (más rápido)**: Barra hacia la izquierda, usando `negativeColor` (normalmente verde).
        *   **Positivo (más lento)**: Barra hacia la derecha, usando `positiveColor` (normalmente rojo).
*   **Limitaciones y maquetación estática actual**:
    *   La cabecera del widget muestra texto estático (hardcoded): `"Target 1:24.350"` y `"Lap 34"`. Esto da una apariencia de maqueta estática aunque el delta central reaccione a los datos mock.
    *   El widget depende al 100% de la propiedad `deltaBest` dentro de la telemetría del jugador.

---

## 2. Inventario de Datos Live en el Pipeline de Go

Tras revisar la integración de la telemetría de Le Mans Ultimate (LMU) en Go, se confirman los siguientes puntos:

### A. Shared Memory (mmap) en Windows
*   El parser nativo en [parser.go](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/internal/telemetry/lmu/parser.go) lee los bytes directamente del bloque de memoria compartida del simulador.
*   **Delta Nativo Confirmado**: En la línea 165, el parser lee el campo `po+vehicleTelemetryDeltaBest` y lo asigna a `models.PlayerTelemetry.DeltaBest`.
*   **Conclusión**: El propio simulador LMU calcula con máxima precisión de físicas (60Hz) el delta respecto a la mejor vuelta y lo expone en la Shared Memory. Este dato está listo y es totalmente utilizable en tiempo real.

### B. REST API Local (lmuapi)
*   El cliente REST consulta `/rest/watch/standings` y `/rest/watch/sessionInfo` en intervalos de 250ms.
*   **Dato Ausente**: La estructura `lmuapi.StandingRow` **no incluye** ningún campo `deltaBest` calculado por el servidor REST de LMU.
*   **Datos Disponibles**:
    *   `BestLapTime`: Sí, el mejor tiempo de vuelta de cada piloto.
    *   `TimeIntoLap`: Sí, el tiempo actual transcurrido en la vuelta.
    *   `LapDistance`: Sí, la distancia recorrida en metros a lo largo de la vuelta actual.
    *   `EstimatedLapTime`: Sí, el tiempo estimado de final de vuelta calculado por el API.
    *   `CurrentSectorTime1` / `CurrentSectorTime2`: Sí, tiempos de sector completados.

---

## 3. Hallazgo Crítico de Fusión (Causa de la Inactividad del Delta)

Durante la auditoría del flujo de combinación de datos en [fusion.go](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/internal/telemetry/fusion/fusion.go), se ha detectado una **inconsistencia crítica de lógica** que rompe e inhabilita los deltas negativos (más rápidos):

1.  **Validación Errónea**: La función `isValidTime` valida si un float64 es un tiempo de vuelta absoluto válido:
    ```go
    func isValidTime(v float64) bool {
        return !math.IsNaN(v) && !math.IsInf(v, 0) && v >= 0
    }
    ```
2.  **Filtrado de Deltas Rápidos**: En `fusion.Merge`, se utiliza esta función para validar la variable `deltaBest`:
    ```go
    if out.Player != nil && isValidTime(deltaBest) {
        out.Player.DeltaBest = deltaBest
    }
    ```
3.  **Consecuencia**: 
    *   Si el delta es **negativo** (ej. `-0.150s`, el piloto va más rápido), `isValidTime` devuelve `false` porque `v < 0`. Por tanto, **se descartan y descartan todos los deltas rápidos** en el fusionador.
    *   Si el delta es **positivo** (ej. `+0.350s`, el piloto va más lento), `isValidTime` devuelve `true` y se sobreescribe el `DeltaBest` ultra-preciso de la Shared Memory con el cálculo tosco y de baja frecuencia (250ms) estimado por el motor de Go.
    *   Esto explica por qué en los *Known Issues* el delta se describe como "desactivado por calibración de algoritmo". La lógica de fusión destruye los deltas en tiempo real.

---

## 4. Viabilidad para Beta Privada: **YES (Totalmente Viable)**

La implementación de un Delta/best live robusto es **completamente viable y sencilla de realizar** para la beta privada mediante un ajuste de robustez (hardening) acotado, sin necesidad de algoritmos de interpolación complejos en Go ni dependencias pesadas:

*   **Por qué es viable**: No necesitamos programar un motor de comparación de distancias de alta resolución en Go. El propio simulador LMU ya hace ese cálculo de físicas y nos entrega el `deltaBest` nativo en la Shared Memory.
*   **Qué necesitamos corregir**: Evitar que el fusionador sobreescriba o destruya este dato nativo, y corregir la función de validación de fusión para permitir deltas negativos.

---

## 5. Arquitectura Recomendada para la Fase B6

Para lograr un delta en tiempo real fiable y libre de ruidos, se propone la siguiente arquitectura simplificada:

1.  **Prioridad Absoluta al Delta Nativo de Windows (mmap)**:
    *   En [lmu_enriched_source.go](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/internal/app/lmu_enriched_source.go), si la Shared Memory está activa y el valor `base.Player.DeltaBest` es válido (distinto de 0), **se debe propagar este valor directamente** sin intentar recalcularlo o sobreescribirlo con datos de la API REST.
2.  **Corrección de Validación de Fusión**:
    *   Separar la validación de tiempos absolutos (`isValidTime` que requiere `>= 0`) de la validación de diferencias de tiempo (`isValidDelta`).
    *   `isValidDelta` debe permitir valores negativos (`v < 0`), asegurando que los deltas en verde fluyan limpiamente hacia el frontend:
        ```go
        func isValidDelta(v float64) bool {
            return !math.IsNaN(v) && !math.IsInf(v, 0)
        }
        ```
3.  **Dinamicidad en el Frontend (Widget Rework acotado)**:
    *   Modificar `DeltaWidget.tsx` para que lea y muestre dinámicamente la mejor vuelta del jugador (`BestLapTime` de su fila en standings) y el número de vuelta actual (`t.player.lapNumber` o el `TotalLaps` de standings) en la cabecera, sustituyendo el texto estático de la maqueta actual.
4.  **Fallback Secundario de Go**:
    *   El cálculo basado en la API REST de standings (`computeDeltaFromEngine` y `delta.AlphaDelta`) sólo debe actuar como fallback cuando la Shared Memory no esté disponible o estemos en un modo específico de test/OBS por red.

---

## 6. Miniplan de Implementación para la Fase B6

Si el usuario aprueba este análisis, el desarrollo de la fase B6 se dividirá en los siguientes pasos atómicos y seguros:

### ⚙️ Paso B6.1: Corrección de Fusión y Validación (Backend Go)
*   Modificar `internal/telemetry/fusion/fusion.go`:
    *   Crear la función `isValidDelta(v float64) bool`.
    *   Actualizar `Merge` y `enrichPlayerFromRows` para validar el delta usando `isValidDelta` en lugar de `isValidTime`.
*   Añadir pruebas unitarias en `fusion_test.go` verificando que los deltas negativos se fusionan correctamente y no se descartan.

### 🔌 Paso B6.2: Priorización del Delta Nativo (Enriched Source)
*   Modificar `internal/app/lmu_enriched_source.go`:
    *   En `computeDeltaFromEngine`, si la Shared Memory (`base`) ya tiene un `DeltaBest` válido provisto nativamente por LMU, retornar este valor de forma prioritaria.
    *   Asegurar que el flujo de reconexión/live mantiene estable esta propagación.
*   Actualizar y validar `lmu_enriched_source_test.go`.

### 🎨 Paso B6.3: Dinamicidad del Widget Delta (Frontend)
*   Modificar `frontend/src/overlay/widgets/DeltaWidget.tsx`:
    *   Consumir la mejor vuelta del jugador (`BestLapTime`) y formatearla dinámicamente para el texto de `"Target"`. Si no hay mejor vuelta registrada, mostrar `"Target: --"`.
    *   Consumir el número de vuelta actual del jugador y mostrarlo dinámicamente en `"Lap"`.
*   Actualizar `DeltaWidget.test.tsx` para verificar el correcto renderizado dinámico.

### 📝 Paso B6.4: Verificación y Cierre Documental
*   Correr la suite completa de pruebas unitarias (`go test ./...` y `pnpm test`).
*   Verificar visualmente en el Hub (usando telemetría mock animada que genera deltas alternantes) que la barra del delta se desplaza y colorea de verde y rojo correctamente.
*   Actualizar `docs/tester-known-issues.md` para eliminar la limitación del delta de la lista de incidencias conocidas.
