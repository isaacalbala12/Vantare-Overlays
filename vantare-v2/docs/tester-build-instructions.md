# Guía de Pruebas para Testers - Vantare Suite

Bienvenido a la versión Alpha/Beta privada de **Vantare Suite** (Overlays Studio + Ingeniero). Esta guía contiene las instrucciones para instalar, probar las funcionalidades clave y reportar fallos de manera efectiva.

---

## 1. Requisitos del Sistema y Preparación

Para ejecutar la aplicación y realizar las pruebas en modo de telemetría en vivo, necesitas:
*   **Sistema Operativo**: Windows 10 u 11 (64 bits).
*   **Simulador**: Le Mans Ultimate (LMU) instalado y configurado para compartir memoria.
*   **Modo de prueba sin simulador**: La app incluye un modo **Mock** (con datos sintéticos) por defecto si el simulador no está abierto, lo que permite probar la interfaz y los widgets en cualquier momento.

---

## 2. Instalación y Ejecución

Tienes dos métodos para abrir la aplicación suministrada en el paquete:

### Método A: Instalador NSIS (Recomendado)
1. Ejecuta el archivo `vantare-amd64-installer.exe`.
2. Sigue los pasos del asistente de instalación de Windows.
3. Abre la aplicación desde el acceso directo del escritorio o el menú Inicio.

### Método B: Ejecutable Portable
1. Extrae el contenido del archivo comprimido de distribución en una carpeta local.
2. Asegúrate de que la carpeta `configs/` que contiene los perfiles predeterminados está en la misma ruta que el ejecutable `vantare.exe`.
3. Haz doble clic en `vantare.exe` para iniciar.

---

## 3. Flujo de Pruebas Recomendado

### Bloque A: Overlays Studio (Edición de Widgets)
1. En el menú lateral del Hub, entra en **Overlays Studio**.
2. Haz clic en el panel **Widgets** y selecciona uno de los widgets configurables principales:
   *   **Relative**
   *   **Standings**
3. **Prueba de columnas y filtros**:
   *   Activa o desactiva columnas opcionales en el panel derecho.
   *   Modifica anchos, formatos de tiempo (Vuelta rápida, Última vuelta) y alineación.
   *   Observa cómo la **Preview Aislada** central ajusta su ancho intrínseco automáticamente sin dejar espacios vacíos a la derecha ni recortar los nombres de forma forzada.
4. **Prueba de escenarios sintéticos (Standings)**:
   *   Cambia el selector de escenario en la preview entre `Práctica`, `Qualy` y `Carrera`.
   *   Verifica que los datos cambian coherentemente para simular cada tipo de sesión.
   *   **Nota**: Cambiar el escenario de la preview no modifica el perfil ni activa el botón **Guardar**.
5. **Guardar cambios**:
   *   Modifica una columna real y confirma que el botón **Guardar** en la cabecera superior derecha pasa a estar activo.
   *   Haz clic en **Guardar** para persistir los cambios en tu perfil.

### Bloque B: Gestión de Perfiles y Lienzo (LayoutStudio)
1. En la pantalla principal de **Overlays Studio**, navega a **Mis perfiles**.
2. **Recomendados por Vantare**:
   *   Entra en la sección de recomendados, selecciona un perfil predefinido y haz clic en **Guardar como perfil propio**.
   *   Confirma que se crea una copia editable con el sufijo `(copia)` en tu sección de **Mis perfiles**.
3. **Control del Overlay**:
   *   En la tarjeta de tu perfil activo, haz clic en **Abrir overlay**.
   *   Se abrirá una ventana transparente de pantalla completa que mostrará tus widgets configurados sobre el escritorio.
4. **Edición de Layout**:
   *   Haz clic en **Editar layout** en tu perfil.
   *   Entrarás a la cuadrícula de diseño. Arrastra los widgets para cambiar su posición y usa los tiradores para redimensionarlos.
   *   Haz clic en **Guardar** en la barra superior.
   *   Verifica que el overlay abierto en tu pantalla se updates en tiempo real reflejando la nueva distribución y escala proporcional.

### Bloque C: Sección del Ingeniero
1. En el menú lateral, haz clic en **Ingeniero**.
2. Revisa la pantalla de control donde puedes ajustar el nivel de sensibilidad del spotter y activar/desactivar sus avisos.
3. Propara un mensaje de prueba a través del modo simulator/replay si está activo.
4. Verifica que el historial de notificaciones del Hub muestra los mensajes entrantes de forma reactiva.
5. Abre tu overlay y comprueba que el widget `engineer-notifications` muestra las alertas del spotter en tiempo real con sus animaciones y que estas desaparecen automáticamente cuando expira su tiempo (`expiresAt`).

---

## 4. Atajos de Teclado Globales (Hotkeys)

Vantare Suite incluye soporte para atajos de teclado globales nativos en Windows. Esto te permite interactuar con la aplicación en segundo plano mientras conduces en el simulador (incluso cuando el juego tiene el foco a pantalla completa).

### Hotkeys predeterminadas disponibles:
*   `ctrl+shift+v`: **Toggle Overlay**. Alterna (muestra u oculta) de forma instantánea el overlay activo en tu pantalla.
*   `ctrl+shift+right`: **Siguiente perfil**. Cambia tu overlay activo al siguiente perfil en tu lista de perfiles (solo funciona si el overlay está en ejecución).
*   `ctrl+shift+left`: **Perfil anterior**. Cambia tu overlay activo al perfil anterior en tu lista de perfiles (solo funciona si el overlay está en ejecución).

> [!IMPORTANT]
> **Privilegios de Administrador (UAC)**
> Si ejecutas Le Mans Ultimate (LMU) con privilegios de Administrador (muy común para compatibilidad con ciertos volantes o herramientas de telemetría de terceros), Windows por seguridad impedirá que Vantare capture los atajos globales si se está ejecutando con permisos normales. Para solucionarlo, **debes abrir Vantare Suite como Administrador** (clic derecho sobre el ejecutable o acceso directo > *Ejecutar como administrador*).

> [!WARNING]
> **Colisiones con otros programas**
> Si otra aplicación que se ejecuta en segundo plano (como GeForce Experience, el software de AMD, Steam, Discord u OBS Studio) ya tiene registrado alguno de estos atajos, Windows no permitirá que Vantare lo registre. Puedes cambiar y personalizar estas combinaciones de teclas en cualquier momento desde la página de **Ajustes** en el Hub de Vantare y hacer clic en **Guardar atajos**.

---

## 5. ¿Qué NO está soportado todavía? (Limitaciones de la Alpha)

Por favor, no reportes como fallos las siguientes características que se encuentran planificadas para fases posteriores:
*   **Ingeniero con LMU en vivo real (Fase EN6)**: La conexión del spotter con el buffer de memoria en vivo de LMU está en desarrollo. Actualmente, el Ingeniero funciona en modo simulación/replay.
*   **Audio/Voces TTS reales del Ingeniero**: Los avisos del spotter son puramente visuales y textuales en esta fase (se muestran en el widget del overlay y en el historial del Hub).
*   **Widget Pedales Completo**: El widget de pedales actual es una maqueta estética inicial. La lectura del pedal de embrague y ajustes profundos se completarán en la beta.
*   **Widget Delta en Vivo**: El algoritmo de diferencia de tiempos (Delta Best) en tiempo real está pendiente de calibración.
*   **Soporte Multisimulador**: Esta versión está optimizada exclusivamente para Le Mans Ultimate. El soporte para iRacing, Assetto Corsa, etc., se implementará tras la release estable v1.0.
*   **Doble PC / LAN para OBS**: La visualización en OBS está soportada localmente a través de la URL de renderizado local `/overlay?profile=...`, pero la optimización de red para doble PC no forma parte del alcance actual.

---

## 5. Cómo Reportar Bugs

Si encuentras un comportamiento inesperado, errores visuales o problemas de rendimiento:
1. **Captura de pantalla o vídeo**: Toma una captura del problema (especialmente si es un fallo visual en el editor o en el overlay).
2. **Pasos para reproducir**: Describe detalladamente qué acciones realizaste justo antes de que ocurriera el fallo.
3. **Archivos de configuración**: Si el problema está relacionado con perfiles que no se guardan o se visualizan mal, adjunta el archivo JSON del perfil afectado que se encuentra en la carpeta `configs/`.
4. **Log de errores**: Si la app se cierra inesperadamente, comprueba si existe algún archivo `.log` en la carpeta raíz y adjúntalo.

---

## 6. Documentos Relacionados

*   Para conocer la lista completa de problemas identificados y limitaciones actuales, consulta la [Guía de Incidencias Conocidas (Known Issues)](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/docs/tester-known-issues.md).
*   Para saber cómo y dónde reportar fallos y compartir tus comentarios, revisa el [Protocolo de Feedback y Reporte de Bugs](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/docs/tester-feedback-process.md).
*   Para configurar los overlays en tu software de transmisión, consulta la [Guía de Configuración de OBS Studio (Local)](file:///c:/Users/isaac/Desktop/Vantare-Overlays/vantare-v2/docs/obs-local-setup.md).

