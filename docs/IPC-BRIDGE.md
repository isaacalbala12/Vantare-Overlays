# IPC Bridge - Comunicación Main ↔ Renderer

> Documentación completa del sistema de comunicación entre procesos de Electron
> para el proyecto **Vantare Overlays**.

---

## 1. Visión General

### 1.1 Modelo de Seguridad de Electron

Electron ejecuta dos tipos de procesos: el **proceso principal** (Main Process) y uno o más
**procesos de renderizado** (Renderer Process). Por defecto, los procesos de renderizado
operan dentro de un sandbox que aísla el código del navegador del sistema operativo.

```
┌─────────────────────────────────────────────────────────┐
│                    Modelo de Seguridad                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Processo Principal (Main)                              │
│  ✔ Acceso completo a Node.js                           │
│  ✔ Acceso al sistema de archivos                       │
│  ✔ Creación de ventanas                                │
│  ✔ Servicios del sistema                               │
│                                                         │
│  Processo de Renderizado (Renderer)                     │
│  ✘ Sin acceso a Node.js                                │
│  ✘ Sin require() / import nativo                       │
│  ✘ Sin acceso al sistema de archivos                   │
│  ✔ DOM, APIs del navegador, WebGL                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Vantare Overlays **no** habilita `nodeIntegration`. En su lugar, utiliza `contextBridge`
para exponer una API segura y tipada al proceso de renderizado.

### 1.2 Por Qué contextBridge (no nodeIntegration)

| Enfoque              | Seguridad | Compatibilidad | Mantenibilidad |
|----------------------|-----------|----------------|----------------|
| `nodeIntegration`    | ❌ Baja   | ❌ Obsoleta     | ❌ Difícil      |
| `webPreferences`     | ⚠️ Media | ⚠️ Parcial     | ⚠️ Limitada    |
| **`contextBridge`**  | ✅ Alta   | ✅ Recomendada  | ✅ Excelente    |

`contextBridge` permite definir una API de superficie limitada y completamente tipada
que el proceso de renderizado puede consumir sin exponer internamente ningún módulo
de Node.js.

### 1.3 Patrones de Comunicación

El proyecto utiliza tres patrones fundamentales de comunicación IPC:

- **Solicitud/Respuesta (Request-Response):** El renderer solicita datos, el main responde.
  Utilizado para configuración, perfiles, autenticación y datos estáticos.
- **Push (Main → Renderer):** El main envía datos periódicamente al renderer.
  Utilizado para telemetría en tiempo real del simulador.
- **Suscripción a Eventos (Event Subscription):** El renderer se suscribe a un canal
  y recibe actualizaciones continuas. Utilizado para estado del simulador, cambios
  de configuración y eventos del sistema.

---

## 2. Arquitectura del IPC

### 2.1 Diagrama de Arquitectura

```
┌────────────────┐      ┌──────────────┐      ┌────────────────┐
│  Main Process  │◀────▶│   Preload    │◀────▶│ Renderer (React)│
│  (Node.js)     │ IPC  │(contextBridge)│      │ (Sandboxed)    │
│                │      │              │      │                │
│  - SimManager  │      │  - Exposes   │      │ - React App    │
│  - HTTP Server │      │    safe API  │      │ - Zustand      │
│  - Window Mgr  │      │  - Typed     │      │ - Overlays     │
│  - IpcHandler  │      │  - Sandboxed │      │ - Hooks        │
│  - Auth Service│      │              │      │ - Stores       │
└────────────────┘      └──────────────┘      └────────────────┘
        │                      │                       │
        │                      │                       │
        ▼                      ▼                       ▼
   ┌─────────┐          ┌───────────┐          ┌────────────┐
   │   IPC   │          │ Context   │          │ Vantare    │
   │ Channels│          │ Bridge    │          │ Bridge API │
   └─────────┘          └───────────┘          └────────────┘
```

### 2.2 Capas de Comunicación

**Capa 1 - Canal IPC nativo:**
Electron proporciona `ipcMain` y `ipcRenderer` para la comunicación entre procesos.
Cada mensaje se serializa automáticamente (structured clone algorithm).

**Capa 2 - Context Bridge:**
`contextBridge.exposeInMainWorld` define qué funciones están disponibles en el
renderer. Cada función tiene un wrapper que valida y serializa los datos.

**Capa 3 - API del Bridge:**
La interfaz `VantareBridge` define el contrato completo entre procesos. TypeScript
garantiza la compatibilidad de tipos entre ambos extremos.

### 2.3 Flujo de Datos

```
Renderer                    Preload                     Main
   │                          │                          │
   │  window.vantareBridge    │                          │
   │  .getSettings()          │                          │
   │─────────────────────────▶│  ipcRenderer.invoke      │
   │                          │  ('get-settings')        │
   │                          │─────────────────────────▶│
   │                          │                          │  ipcMain.handle
   │                          │                          │  ('get-settings')
   │                          │                          │  → lee config.json
   │                          │                          │
   │                          │         resultado        │
   │                          │◀─────────────────────────│
   │         resultado        │  ipcRenderer.invoke      │
   │◀─────────────────────────│  resuelve Promise        │
   │                          │                          │
```

---

## 3. Interfaz VantareBridge

### 3.1 Definición Completa

```typescript
// src/preload/vantare-bridge.ts

export interface VantareBridge {
  telemetry: TelemetryAPI;
  settings: SettingsAPI;
  profiles: ProfilesAPI;
  auth: AuthAPI;
  overlays: OverlaysAPI;
  sim: SimAPI;
  themes: ThemesAPI;
  system: SystemAPI;
}
```

### 3.2 API de Telemetría

```typescript
interface TelemetryAPI {
  /**
   * Registra un callback que se ejecuta cada vez que llegan datos de telemetría
   * del simulador. Los datos se emiten a ~16Hz (cada ~62.5ms).
   *
   * @param callback - Función que recibe los datos de telemetría actualizados
   * @returns Función para desuscribirse del stream
   *
   * @example
   * ```typescript
   * const unsub = window.vantareBridge.telemetry.onTelemetry((data) => {
   *   setSpeed(data.airspeed);
   *   setAltitude(data.altitude);
   * });
   * // Al desmontar el componente:
   * unsub();
   * ```
   */
  onTelemetry(callback: (data: TelemetryData) => void): () => void;

  /**
   * Registra un callback para recibir datos de sesión del simulador.
   * Incluye información sobre el vuelo actual, aeropuerto de origen/destino,
   * y configuración del simulador.
   *
   * @param callback - Función que recibe los datos de sesión
   * @returns Función para desuscribirse
   */
  onSessionData(callback: (data: SessionData) => void): () => void;

  /**
   * Registra un callback para recibir cambios en el estado del simulador
   * (conectado, desconectado, en pausa, etc.)
   *
   * @param callback - Función que recibe el estado del simulador
   * @returns Función para desuscribirse
   */
  onSimState(callback: (state: SimState) => void): () => void;

  /**
   * Solicita una captura instantánea de la telemetría actual.
   * Retorna una Promise que se resuelve con los datos más recientes.
   *
   * @returns Promise con los datos de telemetría actuales
   */
  getSnapshot(): Promise<TelemetryData>;
}
```

### 3.3 API de Configuración

```typescript
interface SettingsAPI {
  /**
   * Obtiene la configuración completa del proyecto Vantare.
   * Lee el archivo config.json desde el directorio de datos de la aplicación.
   *
   * @returns Promise con la configuración completa
   *
   * @example
   * ```typescript
   * const config = await window.vantareBridge.settings.getSettings();
   * console.log(config.defaultSim); // "MSFS"
   * ```
   */
  getSettings(): Promise<VantareConfig>;

  /**
   * Guarda la configuración completa del proyecto.
   * Sobrescribe el archivo config.json con los nuevos valores.
   * Valida el esquema antes de escribir.
   *
   * @param settings - Configuración completa a guardar
   * @returns Promise que se resuelve cuando la escritura se completa
   *
   * @throws {ValidationError} Si la configuración no cumple el esquema
   * @throws {FileSystemError} Si no se puede escribir el archivo
   */
  saveSettings(settings: VantareConfig): Promise<void>;

  /**
   * Actualiza parcialmente la configuración. Fusiona los campos proporcionados
   * con la configuración existente sin sobrescribir campos no especificados.
   *
   * @param partial - Campos parciales de configuración a actualizar
   * @returns Promise que se resuelve cuando la actualización se completa
   */
  updateSettings(partial: Partial<VantareConfig>): Promise<void>;

  /**
   * Restablece la configuración a los valores predeterminados de fábrica.
   * Elimina todas las personalizaciones del usuario.
   *
   * @returns Promise con la configuración por defecto
   */
  resetSettings(): Promise<VantareConfig>;
}
```

### 3.4 API de Perfiles

```typescript
interface ProfilesAPI {
  /**
   * Obtiene la lista de todos los perfiles de overlay disponibles.
   * Un perfil define la configuración visual y de posición de los overlays.
   *
   * @returns Promise con la lista de perfiles
   *
   * @example
   * ```typescript
   * const profiles = await window.vantareBridge.profiles.getProfiles();
   * profiles.forEach(p => console.log(p.name, p.isActive));
   * ```
   */
  getProfiles(): Promise<OverlayProfile[]>;

  /**
   * Guarda un perfil de overlay. Si el perfil ya existe (mismo ID),
   * lo actualiza. Si no, crea uno nuevo.
   *
   * @param profile - Perfil a guardar
   * @returns Promise que se resuelve cuando el perfil se guarda
   */
  saveProfile(profile: OverlayProfile): Promise<void>;

  /**
   * Elimina un perfil de overlay por su ID.
   * No se puede eliminar el perfil predeterminado.
   *
   * @param profileId - ID del perfil a eliminar
   * @returns Promise que se resuelve cuando se elimina
   *
   * @throws {Error} Si se intenta eliminar el perfil predeterminado
   * @throws {Error} Si el perfil no existe
   */
  deleteProfile(profileId: string): Promise<void>;

  /**
   * Establece un perfil como activo. Desactiva automáticamente
   * el perfil anteriormente activo.
   *
   * @param profileId - ID del perfil a activar
   * @returns Promise que se resuelve cuando se cambia el perfil activo
   *
   * @throws {Error} Si el perfil no existe
   */
  setActiveProfile(profileId: string): Promise<void>;
}
```

### 3.5 API de Autenticación

```typescript
interface AuthAPI {
  /**
   * Inicia sesión con credenciales de usuario.
   * Valida las credenciales contra el servicio de licencias y
   * retorna un token de sesión.
   *
   * @param credentials - Credenciales de usuario (email + contraseña)
   * @returns Promise con el token de sesión
   *
   * @throws {AuthError} Si las credenciales son inválidas
   * @throws {NetworkError} Si no se puede conectar al servidor
   *
   * @example
   * ```typescript
   * const session = await window.vantareBridge.auth.login({
   *   email: "pilot@vantare.com",
   *   password: "***"
   * });
   * console.log(session.token);
   * ```
   */
  login(credentials: LoginCredentials): Promise<SessionToken>;

  /**
   * Cierra la sesión actual. Elimina el token de sesión y
   * revoca el acceso en el servidor.
   *
   * @returns Promise que se resuelve cuando se cierra la sesión
   */
  logout(): Promise<void>;

  /**
   * Obtiene la sesión actual si existe.
   * Retorna null si no hay sesión activa.
   *
   * @returns Promise con la sesión actual o null
   */
  getSession(): Promise<Session | null>;

  /**
   * Verifica el estado de la licencia del usuario.
   * Incluye información sobre el tipo de licencia, fecha de expiración,
   * y funcionalidades habilitadas.
   *
   * @returns Promise con el estado de la licencia
   */
  getLicenseStatus(): Promise<LicenseStatus>;
}
```

### 3.6 API de Overlays

```typescript
interface OverlaysAPI {
  /**
   * Obtiene la lista de ventanas de overlay actualmente abiertas.
   * Cada ventana tiene un ID único, posición, tamaño y estado.
   *
   * @returns Promise con la lista de ventanas de overlay
   *
   * @example
   * ```typescript
   * const windows = await window.vantareBridge.overlays.getOverlayWindows();
   * windows.forEach(w => console.log(w.id, w.title, w.bounds));
   * ```
   */
  getOverlayWindows(): Promise<OverlayWindowInfo[]>;

  /**
   * Crea una nueva ventana de overlay.
   * La ventana se crea sin decorations y con transparencia total.
   *
   * @param config - Configuración de la ventana (URL, tamaño, posición, etc.)
   * @returns Promise con la información de la ventana creada
   *
   * @throws {Error} Si la URL no es válida
   * @throws {Error} Si se excede el límite máximo de ventanas
   */
  createOverlayWindow(config: OverlayWindowConfig): Promise<OverlayWindowInfo>;

  /**
   * Cierra una ventana de overlay por su ID.
   * Libera los recursos asociados a la ventana.
   *
   * @param windowId - ID de la ventana a cerrar
   * @returns Promise que se resuelve cuando se cierra la ventana
   */
  closeOverlayWindow(windowId: string): Promise<void>;

  /**
   * Actualiza la posición de una ventana de overlay.
   * Las coordenadas son relativas a la pantalla principal.
   *
   * @param windowId - ID de la ventana
   * @param x - Coordenada X en píxeles
   * @param y - Coordenada Y en píxeles
   * @returns Promise que se resuelve cuando se actualiza la posición
   */
  setPosition(windowId: string, x: number, y: number): Promise<void>;

  /**
   * Actualiza el tamaño de una ventana de overlay.
   * El tamaño mínimo es 100x50 píxeles.
   *
   * @param windowId - ID de la ventana
   * @param width - Ancho en píxeles
   * @param height - Alto en píxeles
   * @returns Promise que se resuelve cuando se actualiza el tamaño
   */
  setSize(windowId: string, width: number, height: number): Promise<void>;

  /**
   * Actualiza la opacidad de una ventana de overlay.
   *
   * @param windowId - ID de la ventana
   * @param opacity - Opacidad entre 0.0 (transparente) y 1.0 (opaco)
   * @returns Promise que se resuelve cuando se actualiza la opacidad
   */
  setOpacity(windowId: string, opacity: number): Promise<void>;

  /**
   * Mueve una ventana de overlay al frente de todas las demás ventanas.
   *
   * @param windowId - ID de la ventana a enfocar
   * @returns Promise que se resuelve cuando se enfoca la ventana
   */
  focusOverlayWindow(windowId: string): Promise<void>;
}
```

### 3.7 API del Simulador

```typescript
interface SimAPI {
  /**
   * Obtiene la lista de simuladores disponibles en el sistema.
   * Detecta automáticamente las instalaciones de MSFS, X-Plane, etc.
   *
   * @returns Promise con la lista de simuladores detectados
   */
  getAvailableSims(): Promise<SimInfo[]>;

  /**
   * Obtiene el simulador actualmente activo (conectado).
   * Retorna null si no hay ningún simulador conectado.
   *
   * @returns Promise con la información del simulador activo o null
   */
  getActiveSim(): Promise<SimInfo | null>;

  /**
   * Establece el simulador activo. Si el simulador ya está instalado,
   * inicia la conexión. Si no, retorna un error.
   *
   * @param simId - Identificador del simulador a activar
   * @returns Promise que se resuelve cuando se establece la conexión
   *
   * @throws {SimNotFoundError} Si el simulador no está instalado
   * @throws {SimConnectionError} Si no se puede establecer la conexión
   */
  setActiveSim(simId: string): Promise<void>;

  /**
   * Solicita una reconexión al simulador actual.
   * Útil cuando el simulador se reinicia mientras Vantare está en ejecución.
   *
   * @returns Promise que se resuelve cuando se reconecta
   */
  reconnect(): Promise<void>;
}
```

### 3.8 API de Temas

```typescript
interface ThemesAPI {
  /**
   * Obtiene la lista de temas disponibles para los overlays.
   * Incluye el tema activo y los temas del sistema.
   *
   * @returns Promise con la lista de temas
   */
  getThemes(): Promise<Theme[]>;

  /**
   * Guarda un tema personalizado. Si el tema ya existe, lo actualiza.
   *
   * @param theme - Tema a guardar
   * @returns Promise que se resuelve cuando se guarda el tema
   */
  saveTheme(theme: Theme): Promise<void>;

  /**
   * Elimina un tema personalizado. No se pueden eliminar los temas del sistema.
   *
   * @param themeId - ID del tema a eliminar
   * @returns Promise que se resuelve cuando se elimina el tema
   *
   * @throws {Error} Si se intenta eliminar un tema del sistema
   */
  deleteTheme(themeId: string): Promise<void>;

  /**
   * Establece un tema como activo. Se aplica inmediatamente
   * a todas las ventanas de overlay abiertas.
   *
   * @param themeId - ID del tema a activar
   * @returns Promise que se resuelve cuando se cambia el tema
   */
  setActiveTheme(themeId: string): Promise<void>;
}
```

### 3.9 API del Sistema

```typescript
interface SystemAPI {
  /**
   * Obtiene la versión actual de la aplicación Vantare.
   *
   * @returns Promise con la versión en formato semver
   */
  getVersion(): Promise<string>;

  /**
   * Verifica si hay actualizaciones disponibles.
   * Compara la versión actual con la última versión publicada.
   *
   * @returns Promise con información sobre la actualización disponible
   */
  checkForUpdates(): Promise<UpdateInfo>;

  /**
   * Abre una URL externa en el navegador predeterminado del sistema.
   * La URL debe ser http:// o https://.
   *
   * @param url - URL a abrir
   * @returns Promise que se resuelve cuando se abre el enlace
   *
   * @throws {Error} Si la URL no es válida o no tiene un protocolo permitido
   */
  openExternal(url: string): Promise<void>;

  /**
   * Minimiza la aplicación a la bandeja del sistema.
   * La aplicación sigue ejecutándose en segundo plano.
   *
   * @returns Promise que se resuelve cuando se minimiza
   */
  minimizeToTray(): Promise<void>;

  /**
   * Alterna la visibilidad de todas las ventanas de overlay.
   * Si están visibles, las oculta. Si están ocultas, las muestra.
   *
   * @returns Promise con el nuevo estado de visibilidad
   */
  toggleOverlayVisibility(): Promise<boolean>;

  /**
   * Cierra la aplicación completamente.
   * Cierra todas las ventanas y termina el proceso principal.
   *
   * @returns Promise que se resuelve cuando se cierra la aplicación
   */
  quit(): Promise<void>;

  /**
   * Obtiene información del sistema operativo.
   * Incluye plataforma, versión, y arquitectura.
   *
   * @returns Promise con la información del sistema
   */
  getSystemInfo(): Promise<SystemInfo>;
}
```

---

## 4. Implementación del Preload Script

### 4.1 Archivo Principal: `src/preload/index.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import type { VantareBridge } from './vantare-bridge';

const vantareBridge: VantareBridge = {
  telemetry: {
    onTelemetry(callback) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('telemetry:data', handler);
      return () => ipcRenderer.removeListener('telemetry:data', handler);
    },

    onSessionData(callback) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('telemetry:session', handler);
      return () => ipcRenderer.removeListener('telemetry:session', handler);
    },

    onSimState(callback) {
      const handler = (_event: Electron.IpcRendererEvent, state: any) => callback(state);
      ipcRenderer.on('telemetry:state', handler);
      return () => ipcRenderer.removeListener('telemetry:state', handler);
    },

    getSnapshot() {
      return ipcRenderer.invoke('telemetry:get-snapshot');
    },
  },

  settings: {
    getSettings() {
      return ipcRenderer.invoke('settings:get');
    },
    saveSettings(settings) {
      return ipcRenderer.invoke('settings:save', settings);
    },
    updateSettings(partial) {
      return ipcRenderer.invoke('settings:update', partial);
    },
    resetSettings() {
      return ipcRenderer.invoke('settings:reset');
    },
  },

  profiles: {
    getProfiles() {
      return ipcRenderer.invoke('profiles:get-all');
    },
    saveProfile(profile) {
      return ipcRenderer.invoke('profiles:save', profile);
    },
    deleteProfile(profileId) {
      return ipcRenderer.invoke('profiles:delete', profileId);
    },
    setActiveProfile(profileId) {
      return ipcRenderer.invoke('profiles:set-active', profileId);
    },
  },

  auth: {
    login(credentials) {
      return ipcRenderer.invoke('auth:login', credentials);
    },
    logout() {
      return ipcRenderer.invoke('auth:logout');
    },
    getSession() {
      return ipcRenderer.invoke('auth:get-session');
    },
    getLicenseStatus() {
      return ipcRenderer.invoke('auth:get-license-status');
    },
  },

  overlays: {
    getOverlayWindows() {
      return ipcRenderer.invoke('overlays:get-windows');
    },
    createOverlayWindow(config) {
      return ipcRenderer.invoke('overlays:create-window', config);
    },
    closeOverlayWindow(windowId) {
      return ipcRenderer.invoke('overlays:close-window', windowId);
    },
    setPosition(windowId, x, y) {
      return ipcRenderer.invoke('overlays:set-position', windowId, x, y);
    },
    setSize(windowId, width, height) {
      return ipcRenderer.invoke('overlays:set-size', windowId, width, height);
    },
    setOpacity(windowId, opacity) {
      return ipcRenderer.invoke('overlays:set-opacity', windowId, opacity);
    },
    focusOverlayWindow(windowId) {
      return ipcRenderer.invoke('overlays:focus-window', windowId);
    },
  },

  sim: {
    getAvailableSims() {
      return ipcRenderer.invoke('sim:get-available');
    },
    getActiveSim() {
      return ipcRenderer.invoke('sim:get-active');
    },
    setActiveSim(simId) {
      return ipcRenderer.invoke('sim:set-active', simId);
    },
    reconnect() {
      return ipcRenderer.invoke('sim:reconnect');
    },
  },

  themes: {
    getThemes() {
      return ipcRenderer.invoke('themes:get-all');
    },
    saveTheme(theme) {
      return ipcRenderer.invoke('themes:save', theme);
    },
    deleteTheme(themeId) {
      return ipcRenderer.invoke('themes:delete', themeId);
    },
    setActiveTheme(themeId) {
      return ipcRenderer.invoke('themes:set-active', themeId);
    },
  },

  system: {
    getVersion() {
      return ipcRenderer.invoke('system:get-version');
    },
    checkForUpdates() {
      return ipcRenderer.invoke('system:check-updates');
    },
    openExternal(url) {
      return ipcRenderer.invoke('system:open-external', url);
    },
    minimizeToTray() {
      return ipcRenderer.invoke('system:minimize-to-tray');
    },
    toggleOverlayVisibility() {
      return ipcRenderer.invoke('overlays:toggle-visibility');
    },
    quit() {
      return ipcRenderer.invoke('system:quit');
    },
    getSystemInfo() {
      return ipcRenderer.invoke('system:get-info');
    },
  },
};

contextBridge.exposeInMainWorld('vantareBridge', vantareBridge);
```

### 4.2 Configuración de Electron en Main Process

```typescript
// src/main/index.ts

import { app, BrowserWindow } from 'electron';
import path from 'node:path';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
}

app.whenReady().then(createWindow);
```

> **Importante:** `contextIsolation: true` y `nodeIntegration: false` son
> obligatorios para que `contextBridge` funcione correctamente.

### 4.3 Estructura de Archivos

```
src/
├── main/
│   ├── index.ts              # Entry point del proceso principal
│   └── ipc/
│       └── handlers.ts       # Registro de todos los handlers IPC
├── preload/
│   ├── index.ts              # Script preload con contextBridge
│   └── vantare-bridge.ts     # Definición TypeScript de la interfaz
└── renderer/
    └── src/
        ├── hooks/
        │   └── useBridge.ts  # Hook React para usar el bridge
        └── stores/
            └── telemetryStore.ts
```

---

## 5. Registro de Handlers IPC (Main Process)

### 5.1 Archivo: `src/main/ipc/handlers.ts`

```typescript
import { ipcMain } from 'electron';
import { SimManager } from '../services/sim-manager';
import { SettingsManager } from '../services/settings-manager';
import { OverlayWindowManager } from '../services/overlay-window-manager';
import { AuthService } from '../services/auth-service';
import { ThemeManager } from '../services/theme-manager';

export function registerIpcHandlers(
  simManager: SimManager,
  settingsManager: SettingsManager,
  overlayManager: OverlayWindowManager,
  authService: AuthService,
  themeManager: ThemeManager,
): void {

  // ─── Telemetry ──────────────────────────────────────────────
  ipcMain.handle('telemetry:get-snapshot', async () => {
    return simManager.getTelemetrySnapshot();
  });

  // ─── Settings ───────────────────────────────────────────────
  ipcMain.handle('settings:get', async () => {
    return settingsManager.getSettings();
  });

  ipcMain.handle('settings:save', async (_event, settings) => {
    return settingsManager.saveSettings(settings);
  });

  ipcMain.handle('settings:update', async (_event, partial) => {
    return settingsManager.updateSettings(partial);
  });

  ipcMain.handle('settings:reset', async () => {
    return settingsManager.resetSettings();
  });

  // ─── Profiles ───────────────────────────────────────────────
  ipcMain.handle('profiles:get-all', async () => {
    return settingsManager.getProfiles();
  });

  ipcMain.handle('profiles:save', async (_event, profile) => {
    return settingsManager.saveProfile(profile);
  });

  ipcMain.handle('profiles:delete', async (_event, profileId) => {
    return settingsManager.deleteProfile(profileId);
  });

  ipcMain.handle('profiles:set-active', async (_event, profileId) => {
    return settingsManager.setActiveProfile(profileId);
  });

  // ─── Auth ───────────────────────────────────────────────────
  ipcMain.handle('auth:login', async (_event, credentials) => {
    return authService.login(credentials);
  });

  ipcMain.handle('auth:logout', async () => {
    return authService.logout();
  });

  ipcMain.handle('auth:get-session', async () => {
    return authService.getSession();
  });

  ipcMain.handle('auth:get-license-status', async () => {
    return authService.getLicenseStatus();
  });

  // ─── Overlays ───────────────────────────────────────────────
  ipcMain.handle('overlays:get-windows', async () => {
    return overlayManager.getWindows();
  });

  ipcMain.handle('overlays:create-window', async (_event, config) => {
    return overlayManager.createWindow(config);
  });

  ipcMain.handle('overlays:close-window', async (_event, windowId) => {
    return overlayManager.closeWindow(windowId);
  });

  ipcMain.handle('overlays:set-position', async (_event, windowId, x, y) => {
    return overlayManager.setPosition(windowId, x, y);
  });

  ipcMain.handle('overlays:set-size', async (_event, windowId, width, height) => {
    return overlayManager.setSize(windowId, width, height);
  });

  ipcMain.handle('overlays:set-opacity', async (_event, windowId, opacity) => {
    return overlayManager.setOpacity(windowId, opacity);
  });

  ipcMain.handle('overlays:focus-window', async (_event, windowId) => {
    return overlayManager.focusWindow(windowId);
  });

  ipcMain.handle('overlays:toggle-visibility', async () => {
    return overlayManager.toggleVisibility();
  });

  // ─── Sim ────────────────────────────────────────────────────
  ipcMain.handle('sim:get-available', async () => {
    return simManager.getAvailableSims();
  });

  ipcMain.handle('sim:get-active', async () => {
    return simManager.getActiveSim();
  });

  ipcMain.handle('sim:set-active', async (_event, simId) => {
    return simManager.setActiveSim(simId);
  });

  ipcMain.handle('sim:reconnect', async () => {
    return simManager.reconnect();
  });

  // ─── Themes ─────────────────────────────────────────────────
  ipcMain.handle('themes:get-all', async () => {
    return themeManager.getThemes();
  });

  ipcMain.handle('themes:save', async (_event, theme) => {
    return themeManager.saveTheme(theme);
  });

  ipcMain.handle('themes:delete', async (_event, themeId) => {
    return themeManager.deleteTheme(themeId);
  });

  ipcMain.handle('themes:set-active', async (_event, themeId) => {
    return themeManager.setActiveTheme(themeId);
  });

  // ─── System ─────────────────────────────────────────────────
  ipcMain.handle('system:get-version', async () => {
    return app.getVersion();
  });

  ipcMain.handle('system:check-updates', async () => {
    // Implementación pendiente con electron-updater
    return { available: false, version: app.getVersion() };
  });

  ipcMain.handle('system:open-external', async (_event, url: string) => {
    const { shell } = await import('electron');
    return shell.openExternal(url);
  });

  ipcMain.handle('system:minimize-to-tray', async () => {
    // La lógica de minimizar a bandeja está en Window Manager
    return { success: true };
  });

  ipcMain.handle('system:quit', async () => {
    app.quit();
  });

  ipcMain.handle('system:get-info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      release: process.release,
      nodeVersion: process.version,
    };
  });
}
```

### 5.2 Emisión de Telemetría desde Main Process

```typescript
// src/main/services/sim-manager.ts

import { BrowserWindow } from 'electron';

export class SimManager {
  private telemetryInterval: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  startTelemetryStream(): void {
    // Emite telemetría a 16Hz (~62.5ms entre cada emisión)
    this.telemetryInterval = setInterval(() => {
      const data = this.collectTelemetry();
      // Verificar que la ventana no está destruida antes de enviar
      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('telemetry:data', data);
      }
    }, 62.5); // 16Hz
  }

  stopTelemetryStream(): void {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
  }

  private collectTelemetry(): TelemetryData {
    // Lee datos del simulador vía SimConnect / X-Plane UDP
    return {
      timestamp: Date.now(),
      airspeed: this.getAirspeed(),
      altitude: this.getAltitude(),
      heading: this.getHeading(),
      verticalSpeed: this.getVerticalSpeed(),
      latitude: this.getLatitude(),
      longitude: this.getLongitude(),
      gear: this.getGearState(),
      flaps: this.getFlapsPosition(),
      throttle: this.getThrottlePosition(),
    };
  }
}
```

---

## 6. Patrones de Flujo de Datos

### 6.1 Patrón A: Push (Main → Renderer)

El proceso principal envía datos periódicamente al renderer sin que este los solicite.

**Uso principal:** Telemetría del simulador en tiempo real.

```
┌──────────┐                                    ┌──────────┐
│   Main   │                                    │ Renderer │
│          │                                    │          │
│ SimMgr   │    webContents.send(               │          │
│ .tick()  │      'telemetry:data',             │          │
│          │      telemetryData                 │          │
│          │  ─────────────────────────────▶    │          │
│          │                                    │ onTelemetry()
│          │    webContents.send(               │   .call() │
│          │      'telemetry:state',            │          │
│          │      simState                      │          │
│          │  ─────────────────────────────▶    │ onSimState()
│          │                                    │   .call() │
└──────────┘                                    └──────────┘
```

**Código en el Renderer:**

```typescript
// src/renderer/src/hooks/useTelemetry.ts

import { useEffect, useState } from 'react';

export function useTelemetry() {
  const [data, setData] = useState<TelemetryData | null>(null);

  useEffect(() => {
    const unsubscribe = window.vantareBridge.telemetry.onTelemetry((newData) => {
      setData(newData);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return data;
}
```

### 6.2 Patrón B: Request/Response (Renderer → Main → Renderer)

El renderer envía una solicitud y espera una respuesta.

**Uso principal:** Configuración, perfiles, autenticación, datos estáticos.

```
┌──────────┐                                    ┌──────────┐
│ Renderer │                                    │   Main   │
│          │    ipcRenderer.invoke(              │          │
│          │      'settings:get'                │          │
│          │  ─────────────────────────────▶    │ Settings │
│          │                                    │ Manager  │
│          │                                    │ .get()   │
│          │         resultado                  │          │
│          │  ◀─────────────────────────────    │          │
│  .then() │                                    │          │
└──────────┘                                    └──────────┘
```

**Código en el Renderer:**

```typescript
// src/renderer/src/stores/settingsStore.ts

import { create } from 'zustand';
import { VantareConfig } from '../../../shared/types';

interface SettingsState {
  config: VantareConfig | null;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  saveSettings: (config: VantareConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  config: null,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const config = await window.vantareBridge.settings.getSettings();
      set({ config, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  saveSettings: async (config) => {
    set({ loading: true, error: null });
    try {
      await window.vantareBridge.settings.saveSettings(config);
      set({ config, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
```

### 6.3 Patrón C: Suscripción a Eventos

El renderer se suscribe a un canal y recibe actualizaciones continuas.

**Uso principal:** Estado del simulador, cambios de configuración en tiempo real.

```
┌──────────┐                                    ┌──────────┐
│ Renderer │                                    │   Main   │
│          │    ipcRenderer.on(                  │          │
│          │      'config:changed',             │          │
│          │      handler                       │          │
│          │  ◀─────────────────────────────    │ Event    │
│          │                                    │ Emitter  │
│          │    ipcRenderer.on(                  │          │
│          │      'sim:disconnected',           │ .emit()  │
│          │      handler                       │          │
│          │  ◀─────────────────────────────    │          │
│          │                                    │          │
│  cleanup │    ipcRenderer.removeListener()    │          │
│  .unsub()│  ─────────────────────────────▶    │          │
└──────────┘                                    └──────────┘
```

**Código en el Renderer:**

```typescript
// src/renderer/src/hooks/useSimState.ts

import { useEffect, useCallback, useRef } from 'react';

export function useSimState() {
  const [state, setState] = useState<SimState>('disconnected');

  useEffect(() => {
    const unsubscribe = window.vantareBridge.telemetry.onSimState((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}
```

---

## 7. Referencia de Canales IPC

### 7.1 Tabla Completa de Canales

| Canal                       | Dirección           | Método IPC     | Tipo de Payload              | Descripción                                    |
|-----------------------------|---------------------|----------------|------------------------------|------------------------------------------------|
| `telemetry:data`            | Main → Renderer     | `send/on`      | `TelemetryData`              | Datos de telemetría en tiempo real (~16Hz)     |
| `telemetry:session`         | Main → Renderer     | `send/on`      | `SessionData`                | Datos de la sesión de vuelo actual             |
| `telemetry:state`           | Main → Renderer     | `send/on`      | `SimState`                   | Cambios de estado del simulador                |
| `telemetry:get-snapshot`    | Renderer → Main     | `invoke/handle`| `TelemetryData`              | Captura instantánea de telemetría              |
| `settings:get`              | Renderer → Main     | `invoke/handle`| `VantareConfig`              | Obtiene configuración completa                 |
| `settings:save`             | Renderer → Main     | `invoke/handle`| `void`                       | Guarda configuración completa                  |
| `settings:update`           | Renderer → Main     | `invoke/handle`| `void`                       | Actualiza configuración parcialmente           |
| `settings:reset`            | Renderer → Main     | `invoke/handle`| `VantareConfig`              | Restablece configuración por defecto           |
| `profiles:get-all`          | Renderer → Main     | `invoke/handle`| `OverlayProfile[]`           | Lista de todos los perfiles                    |
| `profiles:save`             | Renderer → Main     | `invoke/handle`| `void`                       | Guarda o actualiza un perfil                   |
| `profiles:delete`           | Renderer → Main     | `invoke/handle`| `void`                       | Elimina un perfil por ID                       |
| `profiles:set-active`       | Renderer → Main     | `invoke/handle`| `void`                       | Establece el perfil activo                     |
| `auth:login`                | Renderer → Main     | `invoke/handle`| `SessionToken`               | Inicia sesión con credenciales                 |
| `auth:logout`               | Renderer → Main     | `invoke/handle`| `void`                       | Cierra la sesión actual                        |
| `auth:get-session`          | Renderer → Main     | `invoke/handle`| `Session \| null`             | Obtiene la sesión actual                       |
| `auth:get-license-status`   | Renderer → Main     | `invoke/handle`| `LicenseStatus`              | Estado de la licencia del usuario              |
| `overlays:get-windows`      | Renderer → Main     | `invoke/handle`| `OverlayWindowInfo[]`        | Lista de ventanas de overlay abiertas          |
| `overlays:create-window`    | Renderer → Main     | `invoke/handle`| `OverlayWindowInfo`          | Crea una nueva ventana de overlay              |
| `overlays:close-window`     | Renderer → Main     | `invoke/handle`| `void`                       | Cierra una ventana de overlay                  |
| `overlays:set-position`     | Renderer → Main     | `invoke/handle`| `void`                       | Actualiza posición de una ventana              |
| `overlays:set-size`         | Renderer → Main     | `invoke/handle`| `void`                       | Actualiza tamaño de una ventana                |
| `overlays:set-opacity`      | Renderer → Main     | `invoke/handle`| `void`                       | Actualiza opacidad de una ventana              |
| `overlays:focus-window`     | Renderer → Main     | `invoke/handle`| `void`                       | Enfoca una ventana de overlay                  |
| `overlays:toggle-visibility`| Renderer → Main     | `invoke/handle`| `boolean`                    | Alterna visibilidad de overlays                |
| `sim:get-available`         | Renderer → Main     | `invoke/handle`| `SimInfo[]`                  | Simuladores disponibles en el sistema          |
| `sim:get-active`            | Renderer → Main     | `invoke/handle`| `SimInfo \| null`             | Simulador actualmente activo                   |
| `sim:set-active`            | Renderer → Main     | `invoke/handle`| `void`                       | Establece el simulador activo                  |
| `sim:reconnect`             | Renderer → Main     | `invoke/handle`| `void`                       | Reconecta al simulador actual                  |
| `themes:get-all`            | Renderer → Main     | `invoke/handle`| `Theme[]`                    | Lista de temas disponibles                     |
| `themes:save`               | Renderer → Main     | `invoke/handle`| `void`                       | Guarda o actualiza un tema                     |
| `themes:delete`             | Renderer → Main     | `invoke/handle`| `void`                       | Elimina un tema personalizado                  |
| `themes:set-active`         | Renderer → Main     | `invoke/handle`| `void`                       | Establece el tema activo                       |
| `system:get-version`        | Renderer → Main     | `invoke/handle`| `string`                     | Versión de la aplicación                       |
| `system:check-updates`      | Renderer → Main     | `invoke/handle`| `UpdateInfo`                 | Verifica actualizaciones disponibles           |
| `system:open-external`      | Renderer → Main     | `invoke/handle`| `void`                       | Abre URL en navegador externo                  |
| `system:minimize-to-tray`   | Renderer → Main     | `invoke/handle`| `{ success: boolean }`       | Minimiza a la bandeja del sistema              |
| `system:quit`               | Renderer → Main     | `invoke/handle`| `void`                       | Cierra la aplicación                           |
| `system:get-info`           | Renderer → Main     | `invoke/handle`| `SystemInfo`                 | Información del sistema operativo              |

### 7.2 Categorías de Canales

**Canales de Push (Main → Renderer):** `telemetry:data`, `telemetry:session`, `telemetry:state`
- Utilizan `ipcRenderer.on()` / `webContents.send()`
- Emisión continua sin solicitud previa
- Requieren limpieza con `removeListener` al desmontar

**Canales de Solicitud (Renderer → Main):** Todos los demás canales
- Utilizan `ipcRenderer.invoke()` / `ipcMain.handle()`
- Patrón request/response basado en Promesas
- Un handler por canal, máximo 1 respuesta

---

## 8. Seguridad

### 8.1 Aislamiento con contextBridge

```typescript
// ✅ CORRECTO: Exponer API limitada vía contextBridge
contextBridge.exposeInMainWorld('vantareBridge', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
});

// ❌ INCORRECTO: Exponer ipcRenderer directamente
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
```

`contextBridge` crea un objeto proxy que:
- Solo expone las funciones explícitamente definidas
- No permite al renderer acceder a `ipcRenderer` directamente
- Mantiene el sandbox intacto
- Serializa/deserializa datos automáticamente

### 8.2 Electron Fuses

Los fuses de Electron son flags de compilación que deshabilitan funcionalidades
peligrosas de forma permanente. Se configuran en `electron-builder.yml`:

```yaml
# electron-builder.yml
afterPack: ./build/fuses.js
```

```typescript
// build/fuses.js
const {FuseV1Options, FuseVersion, flipFuses} = require('@electron/fuses');

module.exports = async (context) => {
  const electronBinaryPath = context.appOutDir + '/' +
    (context.packager.platformSpecifics.platformName === 'mac'
      ? context.packager.info.productFilename + '.app/Contents/MacOS/' + context.packager.info.productFilename
      : context.packager.info.productFilename);

  await flipFuses(electronBinaryPath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  });
};
```

| Fuse                                     | Estado  | Efecto                                              |
|------------------------------------------|---------|-----------------------------------------------------|
| `RunAsNode`                              | `false` | Impide ejecutar el binario como Node.js puro         |
| `EnableNodeOptionsEnvironmentVariable`   | `false` | Bloquea variables `NODE_OPTIONS`                    |
| `EnableNodeCliInspectArguments`          | `false` | Bloquea `--inspect` y `--inspect-brk`              |
| `EnableEmbeddedAsarIntegrityValidation`  | `true`  | Valida integridad del archivo ASAR                  |
| `OnlyLoadAppFromAsar`                    | `true`  | Solo carga la app desde el archivo ASAR empaquetado |

### 8.3 Reglas de Seguridad en Renderer

El proceso de renderizado **NO** puede:
- Usar `require()` o `import` de módulos de Node.js
- Acceder a `process`, `__dirname`, `__filename`
- Usar `fs`, `path`, `child_process`, u otros módulos nativos
- Acceder al sistema de archivos directamente
- Ejecular código arbitrario del sistema

Todas estas operaciones se realizan exclusivamente a través del bridge IPC,
donde el main process puede validar y sanitizar cada solicitud.

### 8.4 Whitelisting de Canales

Los canales IPC se registran de forma explícita en `handlers.ts`. Cada canal tiene
un handler único que define la lógica de negocio y validación de entrada.

```typescript
// Ejemplo de validación de canal
ipcMain.handle('settings:save', async (event, settings) => {
  // Validar que el remitente es la ventana principal
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (senderWindow !== mainWindow) {
    throw new Error('Unauthorized: only main window can modify settings');
  }

  // Validar el esquema de la configuración
  const validation = validateConfig(settings);
  if (!validation.success) {
    throw new Error(`Invalid settings: ${validation.error}`);
  }

  return settingsManager.saveSettings(settings);
});
```

---

## 9. Manejo de Errores

### 9.1 Propagación de Errores

Cuando un handler IPC lanza un error, Electron lo serializa y lo envía al renderer.
El renderer recibe el error como una Promise rechazada.

```
┌──────────┐                                    ┌──────────┐
│ Renderer │                                    │   Main   │
│          │    ipcRenderer.invoke(              │          │
│          │      'profiles:delete',            │          │
│          │      'invalid-id'                  │          │
│          │  ─────────────────────────────▶    │ Profiles │
│          │                                    │ Handler  │
│          │                                    │          │
│          │                                    │ throw    │
│          │                                    │ Error()  │
│          │         Error serializado          │          │
│          │  ◀─────────────────────────────    │          │
│  .catch()│                                    │          │
└──────────┘                                    └──────────┘
```

### 9.2 Patrón de Manejo de Errores en el Renderer

```typescript
// src/renderer/src/hooks/useBridgeCall.ts

import { useState, useCallback } from 'react';

interface UseBridgeCallResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<void>;
}

export function useBridgeCall<T>(
  bridgeMethod: (...args: any[]) => Promise<T>
): UseBridgeCallResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bridgeMethod(...args);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error(`[IPC Error] ${bridgeMethod.name}:`, message);
    } finally {
      setLoading(false);
    }
  }, [bridgeMethod]);

  return { data, loading, error, execute };
}

// Uso:
const { data: profiles, loading, error, execute: loadProfiles } =
  useBridgeCall(window.vantareBridge.profiles.getProfiles);
```

### 9.3 Patrón de Manejo de Errores en Main Process

```typescript
// src/main/ipc/handlers.ts

function safeHandler<TArgs, TResult>(
  handler: (event: Electron.IpcMainInvokeEvent, ...args: TArgs[]) => Promise<TResult>
): (event: Electron.IpcMainInvokeEvent, ...args: TArgs[]) => Promise<TResult> {
  return async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[IPC Handler Error] ${handler.name}:`, message);

      // Re-lanzar para que el renderer reciba el error
      throw new Error(message);
    }
  };
}

// Uso:
ipcMain.handle('profiles:delete', safeHandler(async (_event, profileId) => {
  if (!profileId || typeof profileId !== 'string') {
    throw new Error('Invalid profile ID');
  }
  return settingsManager.deleteProfile(profileId);
}));
```

### 9.4 Tipos de Error Comunes

| Tipo de Error          | Causa                                    | Solución                                  |
|------------------------|------------------------------------------|-------------------------------------------|
| `Invalid channel`      | Canal no registrado en handlers.ts       | Verificar el nombre del canal             |
| `Timeout`              | Handler tarda demasiado                  | Optimizar la operación o aumentar timeout |
| `Target closed`        | Renderer se cerró antes de la respuesta  | Verificar estado de la ventana            |
| `Serialized error`     | Error genérico serializado               | Revisar logs del main process             |
| `Structure clone`      | Payload no serializable                  | Usar objetos planos, no funciones         |

---

## 10. Testing

### 10.1 Mock del Bridge para Unit Tests

```typescript
// src/__mocks__/vantare-bridge.ts

import { VantareBridge } from '../preload/vantare-bridge';

export function createMockBridge(): VantareBridge {
  const listeners: Record<string, Function[]> = {};

  return {
    telemetry: {
      onTelemetry: vi.fn((callback) => {
        if (!listeners['telemetry:data']) listeners['telemetry:data'] = [];
        listeners['telemetry:data'].push(callback);
        return () => {
          listeners['telemetry:data'] = listeners['telemetry:data']
            .filter(cb => cb !== callback);
        };
      }),
      onSessionData: vi.fn((callback) => {
        if (!listeners['telemetry:session']) listeners['telemetry:session'] = [];
        listeners['telemetry:session'].push(callback);
        return () => {
          listeners['telemetry:session'] = listeners['telemetry:session']
            .filter(cb => cb !== callback);
        };
      }),
      onSimState: vi.fn((callback) => {
        if (!listeners['telemetry:state']) listeners['telemetry:state'] = [];
        listeners['telemetry:state'].push(callback);
        return () => {
          listeners['telemetry:state'] = listeners['telemetry:state']
            .filter(cb => cb !== callback);
        };
      }),
      getSnapshot: vi.fn().mockResolvedValue({
        timestamp: Date.now(),
        airspeed: 250,
        altitude: 35000,
        heading: 270,
        verticalSpeed: 0,
        latitude: 40.6413,
        longitude: -73.7781,
        gear: 'UP',
        flaps: 0,
        throttle: 0.85,
      }),
    },

    settings: {
      getSettings: vi.fn().mockResolvedValue({
        defaultSim: 'MSFS',
        theme: 'dark',
        telemetryRate: 16,
      }),
      saveSettings: vi.fn().mockResolvedValue(undefined),
      updateSettings: vi.fn().mockResolvedValue(undefined),
      resetSettings: vi.fn().mockResolvedValue({
        defaultSim: 'MSFS',
        theme: 'dark',
        telemetryRate: 16,
      }),
    },

    profiles: {
      getProfiles: vi.fn().mockResolvedValue([]),
      saveProfile: vi.fn().mockResolvedValue(undefined),
      deleteProfile: vi.fn().mockResolvedValue(undefined),
      setActiveProfile: vi.fn().mockResolvedValue(undefined),
    },

    auth: {
      login: vi.fn().mockResolvedValue({ token: 'mock-token', expires: Date.now() + 86400000 }),
      logout: vi.fn().mockResolvedValue(undefined),
      getSession: vi.fn().mockResolvedValue(null),
      getLicenseStatus: vi.fn().mockResolvedValue({ valid: true, type: 'pro', expires: null }),
    },

    overlays: {
      getOverlayWindows: vi.fn().mockResolvedValue([]),
      createOverlayWindow: vi.fn().mockResolvedValue({
        id: 'mock-window-1',
        title: 'Overlay',
        bounds: { x: 100, y: 100, width: 300, height: 200 },
      }),
      closeOverlayWindow: vi.fn().mockResolvedValue(undefined),
      setPosition: vi.fn().mockResolvedValue(undefined),
      setSize: vi.fn().mockResolvedValue(undefined),
      setOpacity: vi.fn().mockResolvedValue(undefined),
      focusOverlayWindow: vi.fn().mockResolvedValue(undefined),
    },

    sim: {
      getAvailableSims: vi.fn().mockResolvedValue([
        { id: 'msfs', name: 'Microsoft Flight Simulator', installed: true },
      ]),
      getActiveSim: vi.fn().mockResolvedValue(null),
      setActiveSim: vi.fn().mockResolvedValue(undefined),
      reconnect: vi.fn().mockResolvedValue(undefined),
    },

    themes: {
      getThemes: vi.fn().mockResolvedValue([
        { id: 'dark', name: 'Dark', colors: {} },
        { id: 'light', name: 'Light', colors: {} },
      ]),
      saveTheme: vi.fn().mockResolvedValue(undefined),
      deleteTheme: vi.fn().mockResolvedValue(undefined),
      setActiveTheme: vi.fn().mockResolvedValue(undefined),
    },

    system: {
      getVersion: vi.fn().mockResolvedValue('1.0.0'),
      checkForUpdates: vi.fn().mockResolvedValue({ available: false, version: '1.0.0' }),
      openExternal: vi.fn().mockResolvedValue(undefined),
      minimizeToTray: vi.fn().mockResolvedValue(undefined),
      toggleOverlayVisibility: vi.fn().mockResolvedValue(true),
      quit: vi.fn().mockResolvedValue(undefined),
      getSystemInfo: vi.fn().mockResolvedValue({
        platform: 'win32',
        arch: 'x64',
        release: '10.0.19045',
        nodeVersion: 'v20.11.0',
      }),
    },
  };
}

// Helper para emitir eventos de telemetría en tests
export function emitTelemetry(mockBridge: VantareBridge, data: TelemetryData) {
  // Acceder a los listeners internos del mock
  const listeners = (mockBridge.telemetry.onTelemetry as any).mock.calls;
  if (listeners.length > 0) {
    listeners[0][0](data);
  }
}
```

### 10.2 Uso en Tests de Componentes

```typescript
// src/renderer/src/components/__tests__/AltitudeIndicator.test.tsx

import { render, screen } from '@testing-library/react';
import { AltitudeIndicator } from '../AltitudeIndicator';
import { createMockBridge } from '../../../__mocks__/vantare-bridge';

beforeEach(() => {
  // Inyectar el mock bridge en window
  (window as any).vantareBridge = createMockBridge();
});

describe('AltitudeIndicator', () => {
  it('renders current altitude from telemetry', async () => {
    render(<AltitudeIndicator />);

    // Simular llegada de datos de telemetría
    const mockData = {
      timestamp: Date.now(),
      altitude: 35000,
      airspeed: 250,
      heading: 270,
      verticalSpeed: 0,
      latitude: 40.6413,
      longitude: -73.7781,
      gear: 'UP',
      flaps: 0,
      throttle: 0.85,
    };

    // Emitir datos de telemetría
    window.vantareBridge.telemetry.onTelemetry((cb: Function) => cb(mockData));

    expect(screen.getByText('35,000')).toBeInTheDocument();
  });
});
```

---

## 11. Rendimiento

### 11.1 Throttling de Telemetría

La telemetría del simulador se emite a **16Hz** (cada ~62.5ms) para equilibrar
precisión y rendimiento. A mayor frecuencia, mayor uso de CPU y memoria.

```
┌──────────────────────────────────────────────────────────┐
│                Telemetría vs. Rendimiento                 │
├──────────┬───────────┬────────────┬──────────────────────┤
│  Frec.   │   CPU     │  Latencia  │  Precisión visual    │
├──────────┼───────────┼────────────┼──────────────────────┤
│  1Hz     │   Baja    │   ~1000ms  │  ❌ Visiblemente      │
│  10Hz    │   Media   │   ~100ms   │  ⚠️ Alguna latencia   │
│  16Hz    │   Media   │   ~62.5ms  │  ✅ Fluida            │
│  30Hz    │   Alta    │   ~33ms    │  ✅ Muy fluida        │
│  60Hz    │   Muy Alta│   ~16ms    │  ✅ Extremadamente    │
│          │           │            │  fluida pero costosa  │
└──────────┴───────────┴────────────┴──────────────────────┘
```

16Hz es el punto óptimo para overlays de vuelo: suficientemente fluido para
mostrar variaciones de altitud y velocidad, sin saturar el canal IPC.

### 11.2 Suscripciones Selectivas a Canales

Los overlays solo se suscriben a los canales que necesitan. Un overlay de
altitud no recibe datos de flaps o gear, reduciendo el procesamiento innecesario.

```typescript
// ❌ INEFICIENTE: Suscribirse a todo
const data = useTelemetry(); // Recibe TODOS los campos

// ✅ EFICIENTE: Seleccionar solo los campos necesarios
const altitude = useTelemetryField('altitude');
const airspeed = useTelemetryField('airspeed');
```

```typescript
// src/renderer/src/hooks/useTelemetryField.ts

import { useEffect, useState } from 'react';

export function useTelemetryField<K extends keyof TelemetryData>(
  field: K
): TelemetryData[K] | null {
  const [value, setValue] = useState<TelemetryData[K] | null>(null);

  useEffect(() => {
    const unsubscribe = window.vantareBridge.telemetry.onTelemetry((data) => {
      setValue(data[field]);
    });
    return () => unsubscribe();
  }, [field]);

  return value;
}
```

### 11.3 Reutilización de Buffers para Payloads Grandes

Para payloads grandes (como datos de waypoints o rutas completas), se recomienda
reutilizar arrays pre-asignados en lugar de crear nuevos objetos en cada emisión.

```typescript
// ❌ CREAR OBJETO NUEVO en cada emisión (genera GC pressure)
function collectWaypoints(): Waypoint[] {
  return simManager.getAllWaypoints().map(wp => ({
    lat: wp.latitude,
    lon: wp.longitude,
    alt: wp.altitude,
    name: wp.name,
  }));
}

// ✅ REUTILIZAR BUFFER pre-asignado
private waypointBuffer: WaypointData[] = new Array(1000).fill(null).map(() => ({
  lat: 0, lon: 0, alt: 0, name: '',
}));

function collectWaypoints(): WaypointData[] {
  const count = simManager.getWaypointsIntoBuffer(this.waypointBuffer);
  return this.waypointBuffer.slice(0, count);
}
```

### 11.4 Métricas de Rendimiento

Para monitorear el rendimiento del IPC en producción:

```typescript
// src/main/ipc/performance.ts

const channelMetrics: Record<string, { count: number; totalTime: number }> = {};

export function instrumentHandler<T>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<T>
): typeof handler {
  return async (event, ...args) => {
    const start = performance.now();
    try {
      const result = await handler(event, ...args);
      const elapsed = performance.now() - start;

      if (!channelMetrics[channel]) {
        channelMetrics[channel] = { count: 0, totalTime: 0 };
      }
      channelMetrics[channel].count++;
      channelMetrics[channel].totalTime += elapsed;

      if (elapsed > 50) {
        console.warn(`[IPC Perf] Slow handler: ${channel} took ${elapsed.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      throw error;
    }
  };
}

// Reportar métricas cada 60 segundos
setInterval(() => {
  console.table(
    Object.entries(channelMetrics).map(([channel, metrics]) => ({
      channel,
      calls: metrics.count,
      avgTime: (metrics.totalTime / metrics.count).toFixed(2) + 'ms',
      totalTime: metrics.totalTime.toFixed(2) + 'ms',
    }))
  );
  // Reset counters
  Object.keys(channelMetrics).forEach(key => {
    channelMetrics[key] = { count: 0, totalTime: 0 };
  });
}, 60000);
```

---

## 12. Tipos Compartidos

### 12.1 Archivo: `src/shared/types.ts`

```typescript
// ─── Telemetry ────────────────────────────────────────────────
export interface TelemetryData {
  timestamp: number;
  airspeed: number;
  altitude: number;
  heading: number;
  verticalSpeed: number;
  latitude: number;
  longitude: number;
  gear: 'UP' | 'DOWN' | 'TRANSIT';
  flaps: number;
  throttle: number;
}

export interface SessionData {
  flightNumber: string;
  origin: string;
  destination: string;
  cruiseAltitude: number;
  aircraft: string;
  simName: string;
}

export type SimState = 'connected' | 'disconnected' | 'paused' | 'error';

// ─── Settings ─────────────────────────────────────────────────
export interface VantareConfig {
  defaultSim: string;
  theme: string;
  telemetryRate: number;
  overlays: OverlayConfig[];
  general: GeneralConfig;
}

export interface OverlayConfig {
  id: string;
  type: string;
  url: string;
  bounds: { x: number; y: number; width: number; height: number };
  opacity: number;
  visible: boolean;
}

export interface GeneralConfig {
  minimizeToTray: boolean;
  autoConnect: boolean;
  language: string;
}

// ─── Profiles ─────────────────────────────────────────────────
export interface OverlayProfile {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  overlays: OverlayConfig[];
  createdAt: number;
  updatedAt: number;
}

// ─── Auth ─────────────────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SessionToken {
  token: string;
  expires: number;
}

export interface Session {
  userId: string;
  email: string;
  token: string;
  expires: number;
}

export interface LicenseStatus {
  valid: boolean;
  type: 'free' | 'pro' | 'enterprise';
  expires: number | null;
  features: string[];
}

// ─── Overlays ─────────────────────────────────────────────────
export interface OverlayWindowInfo {
  id: string;
  title: string;
  bounds: { x: number; y: number; width: number; height: number };
  opacity: number;
  visible: boolean;
}

export interface OverlayWindowConfig {
  url: string;
  title: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  opacity?: number;
  transparent?: boolean;
  alwaysOnTop?: boolean;
}

// ─── Sim ──────────────────────────────────────────────────────
export interface SimInfo {
  id: string;
  name: string;
  installed: boolean;
  path?: string;
  version?: string;
}

// ─── Themes ───────────────────────────────────────────────────
export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  isSystem?: boolean;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
  text: string;
  textSecondary: string;
}

// ─── System ───────────────────────────────────────────────────
export interface UpdateInfo {
  available: boolean;
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  release: string;
  nodeVersion: string;
}
```

---

## 13. Resumen

| Aspecto                | Decisión                                         |
|------------------------|--------------------------------------------------|
| **Mecanismo IPC**      | `ipcRenderer.invoke` / `ipcMain.handle`          |
| **Aislamiento**        | `contextBridge` + `contextIsolation: true`        |
| **Seguridad**          | `nodeIntegration: false`, sandbox, fuses          |
| **Serialización**      | Structured Clone Algorithm (Electron nativo)     |
| **Telemetría**         | Push a 16Hz via `webContents.send`               |
| **Configuración**      | Request/Response vía `invoke/handle`             |
| **Error handling**     | Promise rejection + error serialization           |
| **Tipos**              | TypeScript en ambos extremos del bridge           |
| **Testing**            | Mock completo del bridge para unit tests          |
| **Rendimiento**        | Throttling 16Hz, suscripciones selectivas         |
