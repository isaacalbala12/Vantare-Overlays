# Análisis Técnico de Hotkeys para Beta Privada (B4)

Este documento detalla el análisis de viabilidad, el estado actual del código, la arquitectura recomendada, los riesgos identificados y el plan de ejecución en fases para la implementación de atajos de teclado globales en **Vantare Suite**.

---

## 1. Soporte Existente en el Código

Tras realizar una auditoría de la base de código actual de Vantare v2, se ha descubierto que **ya existe una infraestructura de soporte muy sólida para hotkeys globales en Windows**. 

### Backend (Go)
El backend cuenta con los siguientes componentes en funcionamiento:
*   **`internal/app/hotkeys.go`**:
    *   Implementa un `HotkeyManager` nativo de Windows utilizando la API Win32 (`user32.dll` y `kernel32.dll`).
    *   Utiliza `RegisterHotKey` para registrar atajos que funcionan de forma **global a nivel de sistema operativo** (incluso cuando la ventana de Vantare no tiene el foco).
    *   Ejecuta un bucle de mensajes bloqueante mediante `GetMessageW` dentro de una goroutine dedicada que bloquea su OS thread (`runtime.LockOSThread()`).
    *   Soporta modificadores (`ctrl`, `alt`, `shift`, `win`) combinados con teclas comunes como flechas (`left`, `right`, `up`, `down`), letras (`a`-`z`), teclas de función (`f1`-`f12`), `space`, `enter`, `escape`, `tab`, `backspace`, `delete`, `insert`, `home`, `end`, `pageup`, `pagedown` y números (`0`-`9`).
    *   Permite la actualización dinámica y en caliente de los atajos mediante `UpdateFromSettings` cuando el usuario cambia la configuración.
*   **`internal/app/hotkeys_test.go`**:
    *   Suite de pruebas unitarias que cubre el análisis de combinaciones (`ParseHotkeyCombo`), el registro de combinaciones válidas/inválidas, el encendido/apagado del gestor y la actualización desde la configuración.
*   **`cmd/vantare/main.go`**:
    *   Instancia `hkMgr = app.NewHotkeyManager()`.
    *   Registra las acciones globales por defecto:
        *   `toggleOverlay`: Alterna el estado del overlay físico (inicia o detiene el overlay con el perfil activo). Mapeado a `ctrl+shift+v` por defecto.
        *   `nextProfile`: Cambia al siguiente perfil del ciclo si el overlay está en ejecución. Mapeado a `ctrl+shift+right` por defecto.
        *   `prevProfile`: Cambia al perfil anterior del ciclo si el overlay está en ejecución. Mapeado a `ctrl+shift+left` por defecto.
    *   Inicia el manager y conecta los manejadores de eventos de Wails (`settings:save`) para llamar a `rebuildHotkeys()`.

### Frontend (React/TypeScript)
*   **`frontend/src/hub/pages/SettingsPage.tsx`**:
    *   Expone visualmente la sección **"Atajos de teclado globales"**.
    *   Permite editar los atajos textualmente y persistir los cambios mediante un botón dedicado ("Guardar atajos") que emite el evento `'settings:save'`.
*   **`internal/app/settings_service.go`**:
    *   Declara y valida la persistencia de las hotkeys globales en `app-settings.json`.

---

## 2. Viabilidad y Decisiones de Wails v3

*   **¿Wails v3 permite atajos globales nativos?**  
    Wails v3 ofrece APIs para atajos locales de ventana (aceleradores en menús), pero carece de un sistema multiplataforma de hotkeys globales del sistema estable en su fase alfa actual.
*   **¿Se puede hacer desde el frontend?**  
    **No para el caso de uso de sim-racing**. Si registráramos los listeners en el frontend con JavaScript (`window.addEventListener('keydown')`), los atajos sólo funcionarían cuando la ventana del Hub o del Overlay transparente tuviese el foco del teclado. Cuando el usuario está conduciendo en Le Mans Ultimate, el simulador retiene el foco absoluto del teclado y del ratón.
*   **Conclusión**: La aproximación elegida en Vantare v2 utilizando la API nativa de Windows (`RegisterHotKey`) en Go es la **única vía técnicamente viable y robusta** para asegurar que el piloto pueda activar o desactivar su overlay en pista sin salir del juego.

---

## 3. Inventario de Archivos Clave

Para cualquier trabajo de mantenimiento, robustecimiento o expansión de las hotkeys, se deben tener en cuenta los siguientes archivos:

1.  **Esquema y Validación**: [settings_service.go](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/internal/app/settings_service.go)
    *   *Propósito*: Define `AppSettings.Hotkeys` y valida sintácticamente los atajos guardados.
2.  **Ciclo de Vida en Go**: [hotkeys.go](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/internal/app/hotkeys.go)
    *   *Propósito*: Gestor nativo Win32 en Go.
3.  **Tests de Integración**: [hotkeys_test.go](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/internal/app/hotkeys_test.go)
    *   *Propósito*: Valida la lógica pura de parseo y registro de DLLs.
4.  **Inicialización y Acciones**: [main.go](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/cmd/vantare/main.go)
    *   *Propósito*: Vincula el gestor de atajos al arranque, al guardado de configuración y conecta las acciones de parada/arranque del overlay.
5.  **Interfaz de Usuario**: [SettingsPage.tsx](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/frontend/src/hub/pages/SettingsPage.tsx)
    *   *Propósito*: UI para visualizar y editar atajos desde el Hub de configuración.

---

## 4. Propuesta de Corte Mínimo para Beta Privada

La infraestructura actual ya cumple con los requisitos más críticos. Para la beta privada se propone un **corte mínimo y directo** sin introducir editores complejos:

1.  **Toggle de Overlay Activo (`toggleOverlay`)**: Permite abrir/cerrar la ventana del overlay transparente en pantalla completa. (Ya implementado, `ctrl+shift+v` por defecto).
2.  **Ciclo de Perfiles (`nextProfile` / `prevProfile`)**: Permite alternar configuraciones completas de widgets (ej. cambiar entre un perfil mínimo de clasificación y uno completo de carrera) de forma instantánea. (Ya implementado, `ctrl+shift+right/left` por defecto).
3.  **Toggle de Telemetría Sintética (Mock / Live) (Adición Opcional Recomendada)**:
    *   Permite alternar globalmente la fuente de datos entre los datos de simulación sintéticos (Mock) y la conexión en vivo con el simulador (Live).
    *   Esto es muy útil para que los testers verifiquen el comportamiento y la alineación de sus widgets en pista simulando pérdidas de señal o cambios rápidos.
4.  **No Editor Interactivo**: No se desarrollará un capturador interactivo de teclas (el típico componente React que escucha la combinación al pulsarla). La edición por texto plano con validación estricta en backend es suficiente y más segura para evitar bloqueos del hilo principal.

---

## 5. Riesgos Identificados

| Riesgo | Impacto | Mitigación |
| :--- | :--- | :--- |
| **Conflicto de atajos con LMU o Steam** | Alto | Recomendar combinaciones de 3 teclas (`ctrl+shift+key`) que raramente son usadas por juegos o la capa de Steam/Discord overlay. |
| **Falta de privilegios de Administrador (UAC)** | Crítico | Si el usuario ejecuta Le Mans Ultimate como Administrador (muy común para forzar compatibilidad con volantes antiguos), Windows impide que una aplicación sin privilegios (`vantare.exe`) capture atajos globales. Se debe documentar esto claramente en la guía del tester. |
| **Colisiones de Registro** | Medio | Si otra aplicación del sistema ya registró la combinación (ej. GeForce Experience con `alt+z`), `RegisterHotKey` fallará. El backend debe capturar este fallo, escribir un warning legible en logs e informar al usuario de la colisión en el Hub. |
| **Rotura de compilación multiplataforma** | Bajo | Dado que `hotkeys.go` usa `syscall` con DLLs de Windows directas, la compilación en Linux/macOS fallará inmediatamente. Debemos añadir guards de build (`//go:build windows`) y estructurar un fallback mock para otros sistemas operativos si en el futuro se planea el desarrollo o CI multiplataforma. |
| **Errores tipográficos del tester** | Medio | La interfaz del Hub de configuración debe mostrar un listado/guía de nombres de teclas permitidas para evitar que los testers intenten ingresar nombres no soportados (como escribir `control` en vez de `ctrl`). |

---

## 6. Miniplan de Trabajo en Fases (B4.1 - B4.4)

Para consolidar y entregar esta funcionalidad con total seguridad a los testers, se estructurará el siguiente plan de desarrollo:

### 🚀 Fase B4.1: Robustecimiento del Backend y Compilación Segura
*   Añadir la directiva de compilación `//go:build windows` en `internal/app/hotkeys.go` y `internal/app/hotkeys_test.go`.
*   Crear un archivo `internal/app/hotkeys_stub.go` con directiva `//go:build !windows` que contenga una versión mock del gestor para asegurar que la app compila perfectamente en entornos de desarrollo de otros sistemas operativos y en pipelines de Integración Continua (CI).
*   Mejorar el registro en logs cuando `RegisterHotKey` devuelve `0` (fallo de colisión) para identificar qué atajo falló y por qué.

### ⚙️ Fase B4.2: Implementación de Acciones Adicionales y Robustez
*   Registrar el atajo opcional `toggleTelemetrySource` (mapeado a `ctrl+shift+t` por defecto) que permita alternar la telemetría entre Live y Mock dinámicamente mediante el runtime de Go (`vapp`).
*   Añadir pruebas unitarias adicionales en `hotkeys_test.go` para simular la actualización desde configuraciones corruptas o vacías.

### 🎨 Fase B4.3: UX de Configuración en el Hub
*   Añadir un bloque descriptivo o leyenda visual en la sección de atajos de `SettingsPage.tsx` con ejemplos de teclas válidas (`ctrl`, `alt`, `shift`, `win`, `space`, `enter`, flechas, teclas de función).
*   Implementar feedback de error visual en la UI de ajustes: si el backend devuelve un error al intentar guardar un atajo mal formado, mostrar un mensaje de alerta en rojo en la pantalla en lugar de fallar silenciosamente.
*   Agregar un botón de "Restaurar atajos predeterminados" en la UI de ajustes.

### 📝 Fase B4.4: Documentación de Soporte y Pruebas
*   Actualizar la guía de instalación y pruebas (`docs/tester-build-instructions.md`) incluyendo una nueva sección explicativa de las hotkeys y cómo utilizarlas en carrera.
*   Actualizar las incidencias conocidas (`docs/tester-known-issues.md`) para documentar el riesgo de conflicto con atajos de simuladores y la limitación de privilegios de Administrador (UAC) de Windows.
*   Realizar pruebas de teclado en un entorno Windows simulado (o manual en el sistema del usuario) para garantizar la reactividad del overlay.
