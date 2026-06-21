# 🏗️ Revisión de Arquitectura y Estructura Técnica: Vantare Overlays

Este informe es el resultado de una auditoría en 3 pasadas (Go Backend, React Frontend y Simplicidad de Sistema) enfocada estrictamente en la arquitectura del proyecto `vantare-v2`. La revisión combina un análisis estructural independiente en segundo plano y una inspección manual de los cuellos de botella.

**Nota:** Ningún código fuente ha sido modificado durante esta revisión.

---

### 1. ¿Se podría simplificar la arquitectura o estructura técnica?
**Sí, significativamente, optimizando el puente IPC y el monolito de inicio.**

*   **Delegación Monolítica en `main.go`:** El archivo `cmd/vantare/main.go` ha crecido a más de 800 líneas. Configura y registra todos los manejadores de eventos (handlers) manualmente vía `wailsApp.Event.On()`. 
*   **Análisis y Parseo IPC Innecesario:** En los eventos de Wails en Go, la aplicación recurre constantemente a la conversión manual del `event.Data` en JSON crudo y posterior `json.Unmarshal`. Wails v3 soporta enrutado nativo a través de Métodos de Servicio tipados.
*   **Mejora de Simplicidad:** Al exponer los servicios de Go (como `HubService` y `ProfileService`) directamente a través de `wailsApp.RegisterService`, el frontend puede invocarlos como funciones TypeScript fuertemente tipadas en lugar del engorroso sistema Pub/Sub con cadenas mágicas. El uso de Mutex en `overlay_controller.go` también podría refactorizarse utilizando un Patrón de Canal (`chan`) de Go, mitigando la complejidad del bloqueo entre hilos.

### 2. ¿Se podría mejorar el rendimiento de la app de alguna forma?
**Sí, el ciclo de renderizado de la interfaz en React presenta un cuello de botella fatal.**

*   **Ciclos de React innecesarios a 30 Hz:** Aunque los componentes individuales de los widgets (ej. `DeltaWidget.tsx`) escapan brillantemente del renderizado de React mediante mutación directa del DOM (usando `requestAnimationFrame` y referencias) para máxima fluidez, el archivo padre `CompositeApp.tsx` destruye este beneficio.
*   **Problema Raíz:** `CompositeApp.tsx` tiene un listener para `telemetry:update` que muta el estado de React llamando a `setTelemetryKey((k) => k + 1)`. Esto obliga a todo el árbol de la aplicación a pasar por el proceso de Reconciliación de React 30 veces por segundo, lo cual satura la CPU y ahoga los hilos de renderizado para los widgets subyacentes.
*   **Mejora de Rendimiento:** La lógica de visibilidad (`isWidgetVisible`) debe ser movida hacia abajo, dentro de cada componente envoltorio individual, o gestionada puramente por mutación del DOM (`display: none`). Así, `CompositeApp.tsx` renderizaría solo una vez al cargar el diseño.
*   **Carga Inicial Lenta (Code Splitting):** El archivo `main.tsx` importa todos los módulos (`CompositeApp`, `ObsOverlayApp`, `HubApp`) de manera estática. Usar `React.lazy()` y `<Suspense>` dividiría drásticamente el peso del bundle permitiendo que el overlay de OBS se cargue en milisegundos en vez de descargar todo el código del panel de control.

### 3. ¿La app es todo lo eficiente posible?
**No. El puente de comunicación Go-React sufre de sobrecarga de serialización excesiva.**

*   **Presión sobre el Garbage Collector (GC):** Enviar el objeto inmenso de `TelemetryPayload` a 30 fotogramas por segundo vía JSON genera un estrés continuo en la serialización de Go y en el motor V8 (JavaScript).
*   **Bug silencioso en Desempaquetado IPC:** La función central `parseTelemetryPayload` fue diseñada para objetos estandarizados (v2), pero en Wails v3 los eventos los empacan dentro de Arrays de argumentos. Esto resulta en que iteraciones y asignaciones (`payload.snapshot`) colapsen y devuelvan `undefined`, provocando el descarte continuo de actualizaciones valiosas.
*   **Lado Positivo:** La lectura de datos en sí misma, apoyándose en la memoria compartida local y un proxy sin estado en `lib/telemetry-ref.ts`, elude de forma eficiente y brillante los stores tradicionales asíncronos como Redux. Esto es lo más eficiente posible en el paradigma actual del frontend de navegadores.

### 4. ¿El código es correcto (estructuralmente)?
**Sí, el esqueleto del código refleja una madurez de diseño muy sólida.**

*   **Aislamiento de Lógica Limpio:** Las responsabilidades en el Backend (`internal/app`) separan con eficacia el manejo del archivo de configuración, los puentes HTTP y el ciclo de vida de la ventana en structs distintos con responsabilidades delimitadas (ej. `OverlayController`, `HubService`).
*   **Gestión Segura del Ciclo de Vida Go:** La inyección del motor de telemetría ocurre dentro de una gorutina blindada con contexto y cancelación (`context.WithCancel`). Si ocurre un fallo con la telemetría viva de LMU, los hilos de Go no quedan "zombificados".
*   **Desacoplamiento Estético en React:** Los widgets están bien encapsulados. El acceso al estilo y la apariencia está claramente separado del bucle central de ingestión de telemetría.
---

**Conclusión del Reporte:**
La aplicación presume de una excelente infraestructura fundacional apta para la latencia crítica de un simulador. El esfuerzo prioritario debe concentrarse en: **descentralizar los re-renders a nivel de componente (`CompositeApp`), arreglar las deficiencias del adaptador JSON para Wails v3, y aprovechar el Lazy Loading del router**.
