import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import fs from 'node:fs';
import path from 'path';
import { registerIpcHandlers, setOverlayManager } from './ipc/handlers';
import { OverlayManager } from './windows/overlay-manager';
import { HttpServer } from './server/http-server';
import { SimManager } from './sim/sim-manager';
import { loadEnv, setupSecureStorage, setupMachineId } from './auth/setup';
import { initAppStore, seedE2eDefaults } from './store';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let overlayManager: OverlayManager;
let httpServer: HttpServer;
let simManager: SimManager;
let isQuitting = false;
const isDev = !app.isPackaged;

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const builtRenderer = path.join(__dirname, '../renderer/index.html');
  const useBuiltRendererInDev =
    process.env.E2E_TEST === '1' || (isDev && fs.existsSync(builtRenderer) && process.env.USE_BUILT_RENDERER === '1');

  if (!isDev || useBuiltRendererInDev) {
    mainWindow.loadFile(builtRenderer);
  } else {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (event) => {
    if (process.env.E2E_TEST === '1') return;
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray(): void {
  const trayIcon = nativeImage.createEmpty();
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Vantare', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setToolTip('Vantare Overlays');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow?.show());
}

app.whenReady().then(async () => {
  loadEnv();
  setupSecureStorage();
  setupMachineId();
  await initAppStore();
  seedE2eDefaults();
  registerIpcHandlers();
  overlayManager = new OverlayManager();
  httpServer = new HttpServer();
  await httpServer.start();

  createMainWindow();
  createTray();

  simManager = new SimManager(mainWindow!);

  // Wire telemetry pipeline: SimManager → HttpServer → SSE clients
  httpServer.setSimManager(simManager);
  simManager.setBroadcastTelemetryFn((data) => httpServer.broadcastTelemetry(data));

  simManager.start();
  mainWindow!.webContents.on('did-finish-load', () => {
    simManager.reemitSimState();
  });
  setOverlayManager(overlayManager);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
