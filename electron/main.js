const { app, BrowserWindow, ipcMain, screen, globalShortcut, desktopCapturer, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { applyConfigUpdate } = require('./config-update.cjs');
const { normalizeConfig } = require('./config-schema.cjs');
const { createConfigStore } = require('./config-store.cjs');
const { registerShortcuts: registerShortcutBindings } = require('./shortcut-manager.cjs');
const { createInputHook } = require('./input-hook.cjs');
const { capturePrimaryScreen } = require('./screen-capture.cjs');
const { registerIpcHandlers } = require('./ipc-handlers.cjs');
const channels = require('./ipc-channels.cjs');
const {
  createOverlayWindow: buildOverlayWindow,
  createSettingsWindow: buildSettingsWindow,
  createTray: buildTray,
  showSettingsWindow,
} = require('./window-manager.cjs');

// Windowsアップデート後のGPUドライバ/サンドボックス競合によるクラッシュ暫定対策
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

let settingsWindow = null;
let overlayWindow = null;
let inputHook = null;
let isSettingsFocused = false;
let isSettingsHovered = false;
let tray = null; // タスクトレイアイコン用

function updateSettingsState() {
  let isSettingsActive = isSettingsFocused || isSettingsHovered;
  
  // 設定ウィンドウが最小化されている、または非表示の場合はアクティブとみなさない
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized() || !settingsWindow.isVisible()) {
      isSettingsActive = false;
    }
  }

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send(channels.SETTINGS_STATE_CHANGED, isSettingsActive);
    
    // 設定画面がアクティブな場合は、マウス透過を強制する
    if (isSettingsActive) {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      // 通常時は設定内容に合わせたデフォルトの透過状態を設定する。
      // トリガーキーによる一時的な透過解除はオーバーレイ側で動的に行うため、ここでは上書きしない
      const isAreaSelecting = config.areaSpotlight && config.areaSpotlight.enabled && !config.areaSpotlight.rect;
      const ignoreMouse = !config.pen.enabled && !isAreaSelecting;
      overlayWindow.setIgnoreMouseEvents(ignoreMouse, { forward: ignoreMouse });
    }
  }
}

// 設定ファイルの保存パス
const configPath = path.join(app.getPath('userData'), 'config.json');
const configStore = createConfigStore({
  fs,
  filePath: configPath,
  normalize: normalizeConfig,
  onError: (operation, error) => {
    const label = operation === 'load' ? 'ロード' : '保存';
    console.error(`設定の${label}に失敗しました:`, error);
  },
});

let config = normalizeConfig();

// 設定のロード
function loadConfig() {
  config = configStore.load();
}

// 設定の保存
function saveConfig() {
  configStore.save(config);
}

const isDev = !app.isPackaged;

function createSettingsWindow() {
  settingsWindow = buildSettingsWindow({
    BrowserWindow,
    path,
    baseDir: __dirname,
    isDev,
    events: {
      focus: () => {
        isSettingsFocused = true;
        updateSettingsState();
      },
      blur: () => {
        isSettingsFocused = false;
        isSettingsHovered = false;
        updateSettingsState();
      },
      minimize: () => {
        isSettingsFocused = false;
        isSettingsHovered = false;
        updateSettingsState();
      },
      restore: () => {
        isSettingsFocused = true;
        updateSettingsState();
      },
      closed: () => {
        settingsWindow = null;
        isSettingsFocused = false;
        isSettingsHovered = false;
        updateSettingsState();
      },
    },
  });
}

function openSettingsWindow() {
  if (!settingsWindow) createSettingsWindow();
  else showSettingsWindow(settingsWindow);
}

function createTray() {
  if (tray) return;
  tray = buildTray({
    Tray,
    Menu,
    path,
    baseDir: __dirname,
    openSettings: openSettingsWindow,
    quit: () => app.quit(),
  });
}

function createOverlayWindow() {
  overlayWindow = buildOverlayWindow({
    BrowserWindow,
    path,
    baseDir: __dirname,
    isDev,
    display: screen.getPrimaryDisplay(),
    onClosed: () => { overlayWindow = null; },
  });
}

// uiohook-napi を用いたグローバルマウス・キー監視のセットアップ
function setupGlobalHook() {
  if (inputHook) return;

  try {
    const { uIOhook: uiohook } = require('uiohook-napi');
    inputHook = createInputHook({
      uiohook,
      getPrimaryDisplay: () => screen.getPrimaryDisplay(),
      send: (channel, payload) => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send(channel, payload);
        }
      },
    });
    inputHook.start();
    console.log('グローバルインプットフックを起動しました');
  } catch (err) {
    console.error('グローバルインプットフックのセットアップに失敗しました (uiohook-napi):', err);
  }
}

// グローバルショートカットの登録
function registerShortcuts() {
  const sendToOverlay = (channel, ...args) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send(channel, ...args);
    }
  };
  const actions = {
    toggleSpotlight: () => {
      config.spotlight.enabled = !config.spotlight.enabled;
      notifyConfigUpdate();
    },
    toggleAreaSpotlight: () => {
      config.areaSpotlight.enabled = !config.areaSpotlight.enabled;
      config.areaSpotlight.rect = null;
      notifyConfigUpdate();
    },
    toggleLaser: () => {
      config.laser.enabled = !config.laser.enabled;
      notifyConfigUpdate();
    },
    togglePen: () => {
      config.pen.enabled = !config.pen.enabled;
      notifyConfigUpdate();
    },
    clearDrawing: () => sendToOverlay(channels.CLEAR_DRAWING, true),
    undoDrawing: () => sendToOverlay(channels.UNDO_DRAWING),
    redoDrawing: () => sendToOverlay(channels.REDO_DRAWING),
    toggleZoom: () => {
      config.zoom.enabled = !config.zoom.enabled;
      notifyConfigUpdate();
    },
  };

  registerShortcutBindings({
    globalShortcut,
    shortcuts: config.shortcuts,
    actions,
    onRegistrationError: (accelerator, error) => {
      console.error(`ショートカットの登録に失敗しました: ${accelerator}`, error);
    },
  });
}

// 設定変更の通知
function notifyConfigUpdate() {
  saveConfig();
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send(channels.CONFIG_UPDATED, config);
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send(channels.CONFIG_UPDATED, config);
    
    // 設定画面がアクティブ（フォーカス中、またはホバー中）なら完全に透過する
    const isSettingsActive = isSettingsFocused || isSettingsHovered;
    if (isSettingsActive) {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      const isAreaSelecting = config.areaSpotlight && config.areaSpotlight.enabled && !config.areaSpotlight.rect;
      const ignoreMouse = !config.pen.enabled && !isAreaSelecting;
      overlayWindow.setIgnoreMouseEvents(ignoreMouse, { forward: ignoreMouse });
    }
  }
}

app.whenReady().then(() => {
  loadConfig();
  createOverlayWindow();
  createTray(); // タスクトレイを作成
  
  // uiohook-napi をロードしてフック開始
  setupGlobalHook();
  registerShortcuts();

  registerIpcHandlers({
    ipcMain,
    BrowserWindow,
    captureScreen: () => capturePrimaryScreen({
      getOverlayWindow: () => overlayWindow,
      getSettingsWindow: () => settingsWindow,
      screen,
      desktopCapturer,
      onError: (error) => console.error('画面キャプチャの取得に失敗しました:', error),
    }),
    getConfig: () => config,
    updateConfig: (newConfig) => {
      const update = applyConfigUpdate(config, newConfig);
      config = update.config;
      notifyConfigUpdate();
      if (update.shortcutsChanged) registerShortcuts();
    },
    setSettingsHover: (isHovered) => { isSettingsHovered = isHovered; },
    updateSettingsState,
    getOverlayWindow: () => overlayWindow,
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSettingsWindow();
      createOverlayWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // タスクトレイに常駐するため、すべてのウィンドウが閉じられても終了しない
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  try {
    inputHook?.stop();
  } catch (err) {}
  if (tray) {
    tray.destroy();
  }
});
