const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let settingsWindow = null;
let overlayWindow = null;
let hookInitialized = false;
let isSettingsFocused = false;
let isSettingsHovered = false;

function updateSettingsState() {
  const isSettingsActive = isSettingsFocused || isSettingsHovered;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('settings-state-changed', isSettingsActive);
    
    // 設定画面がアクティブな場合は、マウス透過を強制する（操作を妨げないため）
    const isAreaSelecting = config.areaSpotlight && config.areaSpotlight.enabled && !config.areaSpotlight.rect;
    const ignoreMouse = isSettingsActive || (!config.pen.enabled && !isAreaSelecting);
    overlayWindow.setIgnoreMouseEvents(ignoreMouse, { forward: ignoreMouse });
  }
}

// 設定ファイルの保存パス
const configPath = path.join(app.getPath('userData'), 'config.json');

// デフォルト設定
const defaultConfig = {
  theme: 'system',
  spotlight: {
    enabled: false,
    radius: 120,
    opacity: 0.6
  },
  areaSpotlight: {
    enabled: false,
    rect: null,
    opacity: 0.6,
    borderColor: '#3b82f6',
    borderWidth: 2
  },
  laser: {
    enabled: false,
    radius: 6,
    color: '#ef4444',
    trailLength: 8
  },
  ripple: {
    enabled: true,
    leftColor: '#ef4444',
    rightColor: '#3b82f6',
    radius: 35,
    speed: 1.5
  },
  pen: {
    enabled: false,
    color: '#eab308',
    width: 4
  },
  keycast: {
    enabled: false,
    duration: 2000
  },
  shortcuts: {
    toggleSpotlight: 'CommandOrControl+Shift+S',
    toggleLaser: 'CommandOrControl+Shift+L',
    togglePen: 'CommandOrControl+Shift+P',
    clearDrawing: 'CommandOrControl+Shift+C',
    toggleAreaSpotlight: 'CommandOrControl+Shift+A',
    undoDrawing: 'CommandOrControl+Shift+Z',
    redoDrawing: 'CommandOrControl+Shift+Y'
  }
};

let config = { ...defaultConfig };

// 設定のロード
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const loadedConfig = JSON.parse(data);
      config = {
        ...defaultConfig,
        ...loadedConfig,
        spotlight: { ...defaultConfig.spotlight, ...loadedConfig.spotlight },
        areaSpotlight: { ...defaultConfig.areaSpotlight, ...loadedConfig.areaSpotlight },
        laser: { ...defaultConfig.laser, ...loadedConfig.laser },
        ripple: { ...defaultConfig.ripple, ...loadedConfig.ripple },
        pen: { ...defaultConfig.pen, ...loadedConfig.pen },
        keycast: { ...defaultConfig.keycast, ...loadedConfig.keycast },
        shortcuts: { ...defaultConfig.shortcuts, ...loadedConfig.shortcuts }
      };
    }
  } catch (err) {
    console.error('設定のロードに失敗しました:', err);
  }
}

// 設定の保存
function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('設定の保存に失敗しました:', err);
  }
}

const isDev = !app.isPackaged;

function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 650,
    height: 800,
    minWidth: 500,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'PresenterCursor 設定',
    autoHideMenuBar: true,
  });

  if (isDev) {
    settingsWindow.loadURL('http://localhost:5173/index.html');
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  settingsWindow.on('focus', () => {
    isSettingsFocused = true;
    updateSettingsState();
  });

  settingsWindow.on('blur', () => {
    isSettingsFocused = false;
    updateSettingsState();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    isSettingsFocused = false;
    updateSettingsState();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height, x, y } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    enableLargerThanScreen: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Windowsで完全に透明化し、クリックを透過させる
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  if (isDev) {
    overlayWindow.loadURL('http://localhost:5173/overlay.html');
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../dist/overlay.html'));
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

// uiohook-napi を用いたグローバルマウス・キー監視のセットアップ
function setupGlobalHook() {
  if (hookInitialized) return;

  try {
    const { uIOhook: uiohook } = require('uiohook-napi');

    // マウス移動
    uiohook.on('mousemove', (e) => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const displayBounds = primaryDisplay.bounds;
        const scale = primaryDisplay.scaleFactor; // DPIスケール（拡大率）

        // 物理座標を論理座標に変換
        const localX = Math.round(e.x / scale) - displayBounds.x;
        const localY = Math.round(e.y / scale) - displayBounds.y;

        overlayWindow.webContents.send('global-mouse', {
          type: 'move',
          x: localX,
          y: localY,
        });
      }
    });

    // マウスクリック
    uiohook.on('mousedown', (e) => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const displayBounds = primaryDisplay.bounds;
        const scale = primaryDisplay.scaleFactor;

        // 物理座標を論理座標に変換
        const localX = Math.round(e.x / scale) - displayBounds.x;
        const localY = Math.round(e.y / scale) - displayBounds.y;

        overlayWindow.webContents.send('global-mouse', {
          type: 'down',
          button: e.button, // 1: 左, 2: 右, 3: 中
          x: localX,
          y: localY,
        });
      }
    });

    // キーボード入力（キーキャスト用）
    uiohook.on('keydown', (e) => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('global-key', {
          keycode: e.keycode,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey
        });
      }
    });

    uiohook.start();
    hookInitialized = true;
    console.log('グローバルインプットフックを起動しました');
  } catch (err) {
    console.error('グローバルインプットフックのセットアップに失敗しました (uiohook-napi):', err);
  }
}

// グローバルショートカットの登録
function registerShortcuts() {
  globalShortcut.unregisterAll();

  // スポットライト切り替え
  if (config.shortcuts.toggleSpotlight) {
    try {
      globalShortcut.register(config.shortcuts.toggleSpotlight, () => {
        config.spotlight.enabled = !config.spotlight.enabled;
        notifyConfigUpdate();
      });
    } catch (e) {
      console.error(`ショートカットの登録に失敗しました: ${config.shortcuts.toggleSpotlight}`, e);
    }
  }

  // エリアスポットライト切り替え
  if (config.shortcuts.toggleAreaSpotlight) {
    try {
      globalShortcut.register(config.shortcuts.toggleAreaSpotlight, () => {
        if (config.areaSpotlight.enabled) {
          config.areaSpotlight.enabled = false;
          config.areaSpotlight.rect = null;
        } else {
          config.areaSpotlight.enabled = true;
          config.areaSpotlight.rect = null;
        }
        notifyConfigUpdate();
      });
    } catch (e) {
      console.error(`ショートカットの登録に失敗しました: ${config.shortcuts.toggleAreaSpotlight}`, e);
    }
  }

  // レーザーポインター切り替え
  if (config.shortcuts.toggleLaser) {
    try {
      globalShortcut.register(config.shortcuts.toggleLaser, () => {
        config.laser.enabled = !config.laser.enabled;
        notifyConfigUpdate();
      });
    } catch (e) {
      console.error(`ショートカットの登録に失敗しました: ${config.shortcuts.toggleLaser}`, e);
    }
  }

  // 手書きペン切り替え
  if (config.shortcuts.togglePen) {
    try {
      globalShortcut.register(config.shortcuts.togglePen, () => {
        config.pen.enabled = !config.pen.enabled;
        notifyConfigUpdate();
      });
    } catch (e) {
      console.error(`ショートカットの登録に失敗しました: ${config.shortcuts.togglePen}`, e);
    }
  }

  // 手書きのクリア (全消去)
  if (config.shortcuts.clearDrawing) {
    try {
      globalShortcut.register(config.shortcuts.clearDrawing, () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send('clear-drawing', true);
        }
      });
    } catch (e) {
      console.error(`ショートカットの登録に失敗しました: ${config.shortcuts.clearDrawing}`, e);
    }
  }

  // 手書きのアンドゥ (戻る)
  if (config.shortcuts.undoDrawing) {
    try {
      globalShortcut.register(config.shortcuts.undoDrawing, () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send('undo-drawing');
        }
      });
    } catch (e) {
      console.error(`ショートカットの登録に失敗しました: ${config.shortcuts.undoDrawing}`, e);
    }
  }

  // 手書きのリドゥ (やり直し)
  if (config.shortcuts.redoDrawing) {
    try {
      globalShortcut.register(config.shortcuts.redoDrawing, () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send('redo-drawing');
        }
      });
    } catch (e) {
      console.error(`ショートカットの登録に失敗しました: ${config.shortcuts.redoDrawing}`, e);
    }
  }
}

// 設定変更の通知
function notifyConfigUpdate() {
  saveConfig();
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('config-updated', config);
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('config-updated', config);
    
    // 設定画面がアクティブ（フォーカス中、またはホバー中）なら完全に透過する
    const isSettingsActive = isSettingsFocused || isSettingsHovered;
    const isAreaSelecting = config.areaSpotlight && config.areaSpotlight.enabled && !config.areaSpotlight.rect;
    const ignoreMouse = isSettingsActive || (!config.pen.enabled && !isAreaSelecting);
    overlayWindow.setIgnoreMouseEvents(ignoreMouse, { forward: ignoreMouse });
  }
}

app.whenReady().then(() => {
  loadConfig();
  createSettingsWindow();
  createOverlayWindow();
  
  // uiohook-napi をロードしてフック開始
  setupGlobalHook();
  registerShortcuts();

  // IPCハンドラー登録
  ipcMain.handle('get-config', () => {
    return config;
  });

  ipcMain.on('set-settings-hover', (event, isHovered) => {
    isSettingsHovered = isHovered;
    updateSettingsState();
  });

  ipcMain.on('update-config', (event, newConfig) => {
    config = { ...config, ...newConfig };
    notifyConfigUpdate();
    registerShortcuts(); // キーが変更された可能性があるため再登録
  });

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });

  ipcMain.on('trigger-clear-drawing', (event, all) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('clear-drawing', all);
    }
  });

  ipcMain.on('trigger-undo-drawing', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('undo-drawing');
    }
  });

  ipcMain.on('trigger-redo-drawing', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('redo-drawing');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSettingsWindow();
      createOverlayWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  try {
    if (hookInitialized) {
      const { uIOhook: uiohook } = require('uiohook-napi');
      uiohook.stop();
    }
  } catch (err) {}
});
