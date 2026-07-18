const { contextBridge, ipcRenderer } = require('electron');

// Sandboxed preload scripts cannot require local files, so this boundary stays self-contained.
const channels = Object.freeze({
  CAPTURE_SCREEN: 'capture-screen',
  GET_CONFIG: 'get-config',
  UPDATE_CONFIG: 'update-config',
  CONFIG_UPDATED: 'config-updated',
  SET_SETTINGS_HOVER: 'set-settings-hover',
  SETTINGS_STATE_CHANGED: 'settings-state-changed',
  SET_IGNORE_MOUSE_EVENTS: 'set-ignore-mouse-events',
  GLOBAL_MOUSE: 'global-mouse',
  GLOBAL_KEY: 'global-key',
  GLOBAL_WHEEL: 'global-wheel',
  CLEAR_DRAWING: 'clear-drawing',
  UNDO_DRAWING: 'undo-drawing',
  REDO_DRAWING: 'redo-drawing',
  TRIGGER_CLEAR_DRAWING: 'trigger-clear-drawing',
  TRIGGER_UNDO_DRAWING: 'trigger-undo-drawing',
  TRIGGER_REDO_DRAWING: 'trigger-redo-drawing',
});

function subscribe(channel, callback, selectArgs = (...args) => args[0]) {
  const subscription = (event, ...args) => callback(selectArgs(...args));
  ipcRenderer.on(channel, subscription);
  return () => ipcRenderer.removeListener(channel, subscription);
}

contextBridge.exposeInMainWorld('electronAPI', {
  // 設定の更新をメインプロセスへ送信 (設定画面 -> メイン)
  updateConfig: (config) => ipcRenderer.send(channels.UPDATE_CONFIG, config),
  
  // 設定の更新をメインプロセスから受信 (メイン -> 各画面)
  onConfigUpdate: (callback) => subscribe(channels.CONFIG_UPDATED, callback),

  // 初期設定の取得
  getConfig: () => ipcRenderer.invoke(channels.GET_CONFIG),

  // グローバルマウスイベントの受信
  onGlobalMouse: (callback) => subscribe(channels.GLOBAL_MOUSE, callback),

  // グローバルキーイベントの受信
  onGlobalKey: (callback) => subscribe(channels.GLOBAL_KEY, callback),

  // オーバーレイウィンドウのマウス透過設定切り替え (オーバーレイ -> メイン)
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send(channels.SET_IGNORE_MOUSE_EVENTS, ignore, options),

  // 手書きのクリアシグナル (メイン -> オーバーレイ)
  onClearDrawing: (callback) => subscribe(channels.CLEAR_DRAWING, callback),
  
  // 手書きクリアシグナルの送信 (設定 -> メイン -> オーバーレイ)
  triggerClearDrawing: (all = false) => ipcRenderer.send(channels.TRIGGER_CLEAR_DRAWING, all),

  // 手書きのアンドゥシグナル (メイン -> オーバーレイ)
  onUndoDrawing: (callback) => subscribe(channels.UNDO_DRAWING, callback),
  
  // 手書きのアンドゥ送信 (設定 -> メイン -> オーバーレイ)
  triggerUndoDrawing: () => ipcRenderer.send(channels.TRIGGER_UNDO_DRAWING),

  // 手書きのリドゥシグナル (メイン -> オーバーレイ)
  onRedoDrawing: (callback) => subscribe(channels.REDO_DRAWING, callback),

  // 手書きのリドゥ送信 (設定 -> メイン -> オーバーレイ)
  triggerRedoDrawing: () => ipcRenderer.send(channels.TRIGGER_REDO_DRAWING),

  // 設定画面のホバー状態を通知 (設定 -> メイン)
  setSettingsHover: (isHovered) => ipcRenderer.send(channels.SET_SETTINGS_HOVER, isHovered),

  // 設定画面のアクティブ状態の同期を受信 (メイン -> オーバーレイ)
  onSettingsStateChanged: (callback) => subscribe(channels.SETTINGS_STATE_CHANGED, callback),

  // 画面キャプチャの要求
  captureScreen: () => ipcRenderer.invoke(channels.CAPTURE_SCREEN),

  // グローバルホイールイベントの受信
  onGlobalWheel: (callback) => subscribe(channels.GLOBAL_WHEEL, callback),
});
