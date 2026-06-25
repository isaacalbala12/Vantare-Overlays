# 🔍 Revisión Sistemática de Código: Vantare Overlays

Esta revisión ha sido generada tras realizar auditorías paralelas en el núcleo del sistema (frontend y backend) utilizando 3 perspectivas críticas, consolidadas a partir de análisis exhaustivos con un subagente independiente.

**Nota:** Ningún código fuente ha sido modificado durante esta revisión.

---

## 🛡️ Pasada 1: Seguridad y Programación Defensiva

### 1. Desbordamiento de Pila en Estructura MSG de Windows (`internal/app/hotkeys.go`)
- **Problema**: La estructura `msg` en `messageLoop()` está definida manualmente y omite el campo `lPrivate` de la estructura nativa `MSG` de Windows. En arquitecturas de 64 bits se rellena y se salva por pura coincidencia de alineación de memoria, pero en arquitecturas de 32 bits (o ante alteraciones sutiles del compilador), `GetMessageW` sobreescribirá memoria adyacente en la pila, causando un fallo catastrófico (stack smashing).
- **Mejora**: Sustituir el `struct` manual por el mapeo oficial de `golang.org/x/sys/windows.Msg`.

### 2. Condición de Carrera en Guardado de Perfiles (`internal/app/profile_service.go`)
- **Problema**: `SaveLayout()` muta el arreglo en memoria `s.profile.Widgets` *antes* de realizar el I/O en disco con `config.SaveFile`. Al carecer de protección con mutex o clonado seguro, si una API del frontend (vía Wails) invoca `GetProfile()` concurrentemente, leerá datos inestables, los cuales quedarán severamente corruptos si la escritura en disco posteriormente fracasa y ejecuta un rollback asíncrono.
- **Mejora**: Introducir un `sync.RWMutex` para controlar los accesos a `s.profile`, o realizar un "deep copy" del estado que se va a enviar a guardar en el disco.

### 3. Falta de Límites en Entradas de Usuario (`frontend/src/hub/pages/OverlaysStudioPage.tsx`)
- **Problema**: `createProfile()` utiliza `window.prompt` y retransmite inmediatamente el valor al backend (`hub:create`). Carece de saneamiento de longitud. Un usuario malintencionado podría enviar un input colosal de varios megabytes bloqueando el puente IPC de Wails y saturando la memoria (OOM).
- **Mejora**: Añadir truncado duro y validación estricta de longitud en cliente y servidor.

### 4. Payload Array en Múltiples Listeners (`frontend/src/hub/HubApp.tsx`)
- **Problema**: Escuchadores como `app:version` esperan de Go un objeto directo (`event.data.version`), pero en Wails v3 los eventos devuelven sus argumentos empaquetados en un Array. Esto romperá silenciosamente componentes críticos como la barra de navegación al extraer un `undefined`.
- **Mejora**: Centralizar y usar obligatoriamente la función de seguridad `getPayload` en todos los hooks de eventos.

---

## ⚡ Pasada 2: Rendimiento y Manejo de Memoria

### 1. I/O y Análisis JSON Costoso O(N) (`internal/app/hub_service.go`)
- **Problema**: Operaciones como `ListProfiles` y `findProfilePath` leen por completo el directorio e intentan des-serializar (`unmarshal`) cada archivo `.json` de forma sistemática en cada llamada. Con una biblioteca vasta, esto bloqueará el backend introduciendo alta latencia solo para intentar encontrar el ID de un perfil.
- **Mejora**: Implementar caché temporal de metadatos de los perfiles en memoria o validar correspondencias de nombres de archivo directamente como atajo O(1).

### 2. Pérdida de Datos en Desmontaje de Componentes (`frontend/src/hub/overlays/useOverlayStudioState.ts`)
- **Problema**: El guardado automático usa `window.setTimeout(..., 800)`. Si el usuario modifica un widget en el Studio y presiona el botón "Atrás", el componente se desmontará. Al hacerlo, se limpiará el `timeout` asíncrono sin enviar las modificaciones, y el trabajo del usuario se perderá permanentemente.
- **Mejora**: Implementar una condición en la limpieza del `useEffect` (unmount) para verificar si `dirty === true` y ejecutar un `saveProfile()` de forma síncrona obligatoria.

### 3. Hotkeys Globales Bloqueando Inputs (`frontend/src/hub/overlays/useOverlayStudioState.ts`)
- **Problema**: El `useEffect` que escucha los eventos `keydown` reacciona de forma global para los atajos como "s" (guardar) y "z" (deshacer). Si un usuario está escribiendo un texto como "suspensión" dentro de un control de UI, el evento prevendrá la escritura de la letra "s" y ejecutará el guardado no intencional.
- **Mejora**: Añadir guardas para detener las hotkeys si `event.target` se origina dentro de nodos del DOM como `<input>` o `<textarea>`.

### 4. Código Muerto / Tráfico Basura para el GC (`internal/app/hotkeys.go`)
- **Problema**: Ciertas funciones asignan *slices* pesados y mapas, transitan por iteradores complejos generando objetos, y eventualmente asignan el resultado al operador *blank* (`_`), descartándolo todo. Esto empuja esfuerzo basura inútil al Garbage Collector.
- **Mejora**: Suprimir la lógica muerta de actualización interna.

---

## 🏗️ Pasada 3: Código Limpio y Arquitectura

### 1. Condición de Carrera en Estado del Overlay (`internal/app/overlay_controller.go`)
- **Problema**: En `Start()`, el mutex se suelta temporalmente mientras `c.factory.NewOverlayWindow` realiza el pintado nativo pesado. Durante ese lapso en que se detiene el mundo, `c.current == nil`. Si el usuario gatilla `Stop()`, la función creerá que no hay ventana activa y terminará exitosamente, ignorando que milisegundos después `Start()` retornará e inyectará un "overlay zombie" imborrable.
- **Mejora**: Modificar la clase incorporando una máquina de estados explícita (`StateStarting`, `StateRunning`, `StateStopping`) previniendo invocaciones colisionadas.

### 2. Patrón Anti-SRP en Componente de UI (`frontend/src/hub/pages/OverlaysStudioPage.tsx`)
- **Problema**: Este archivo orquesta el enrutador condicional manual (`mode`), interactúa brutalmente con el modelo IPC subyacente de Wails, procesa flujos de estado modal y se inyecta en el ecosistema. Es un claro "God Component" con más de 3 dimensiones de responsabilidad.
- **Mejora**: Separar las responsabilidades de UI puro delegando a abstracciones (un enrutador semántico y una capa de control encapsulada en React Context).

### 3. Responsabilidades de E/S Fuertemente Acopladas (`internal/app/profile_service.go`)
- **Problema**: El `ProfileService` tiene la responsabilidad inherente de la consistencia de memoria de la base de datos de perfiles, pero a su vez dispara métodos ajenos a su dominio para aplicar la previsualización contra el sistema de ventanas nativas (`s.mgr.ApplyProfile()`).
- **Mejora**: Aplicar Inversión de Control; `ProfileService` debe solo almacenar y despachar eventos de sincronización. Un servicio controlador independiente debe reaccionar y re-pintar.

### 4. Bucle Inmortal en Pantalla de Carga (`frontend/src/hub/pages/OverlaysStudioPage.tsx`)
- **Problema**: Al pedir cargar un perfil, la variable `layoutTarget` muta y la UI entra en modo inoperativo "Cargando perfil...". Si ocurre un error lógico (como un perfil que existía y fue borrado o no tiene permisos), el evento `hub:activate` falla por debajo. Dado que nunca se detecta el aborto desde el frontend, `layoutTarget` jamás retorna a `null`. El usuario queda atrapado.
- **Mejora**: Interconectar el fallback del gestor de red, limpiar `layoutTarget` al detectar el emit de `hub:error`, o imponer un timeout lógico de rescate.

### 5. Doble Criterio de Selección Causa Inconsistencias (`frontend/src/hub/overlays/`)
- **Problema**: Dependiendo de si estás en el Panel del `WidgetStudio` o el Inspector del `LayoutStudio`, el widget activo se determina en caso de que sea nulo de formas diferentes (fijándolo al primer elemento `[0]` contra tolerarlo vacío). Como la arquitectura fluye hacia abajo, los paneles visuales saltan extrañamente.
- **Mejora**: Descentralizar el cálculo erróneo y encapsular la "Verdad Absoluta" únicamente dentro del Reducer principal (`useOverlayStudioState.ts`), garantizando el pasaje universal.
