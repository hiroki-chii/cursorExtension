const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 設定の更新をメインプロセスへ送信 (設定画面 -> メイン)
  updateConfig: (config) => ipcRenderer.send('update-config', config),
  
  // 設定の更新をメインプロセスから受信 (メイン -> 各画面)
  onConfigUpdate: (callback) => {
    const subscription = (event, config) => callback(config);
    ipcRenderer.on('config-updated', subscription);
    return () => ipcRenderer.removeListener('config-updated', subscription);
  },

  // 初期設定の取得
  getConfig: () => ipcRenderer.invoke('get-config'),

  // グローバルマウスイベントの受信
  onGlobalMouse: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('global-mouse', subscription);
    return () => ipcRenderer.removeListener('global-mouse', subscription);
  },

  // グローバルキーイベントの受信
  onGlobalKey: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('global-key', subscription);
    return () => ipcRenderer.removeListener('global-key', subscription);
  },

  // オーバーレイウィンドウのマウス透過設定切り替え (オーバーレイ -> メイン)
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),

  // 手書きのクリアシグナル (メイン -> オーバーレイ)
  onClearDrawing: (callback) => {
    const subscription = (event, all) => callback(all);
    ipcRenderer.on('clear-drawing', subscription);
    return () => ipcRenderer.removeListener('clear-drawing', subscription);
  },
  
  // 手書きクリアシグナルの送信 (設定 -> メイン -> オーバーレイ)
  triggerClearDrawing: (all = false) => ipcRenderer.send('trigger-clear-drawing', all),

  // 手書きのアンドゥシグナル (メイン -> オーバーレイ)
  onUndoDrawing: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('undo-drawing', subscription);
    return () => ipcRenderer.removeListener('undo-drawing', subscription);
  },
  
  // 手書きのアンドゥ送信 (設定 -> メイン -> オーバーレイ)
  triggerUndoDrawing: () => ipcRenderer.send('trigger-undo-drawing'),

  // 手書きのリドゥシグナル (メイン -> オーバーレイ)
  onRedoDrawing: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('redo-drawing', subscription);
    return () => ipcRenderer.removeListener('redo-drawing', subscription);
  },

  // 手書きのリドゥ送信 (設定 -> メイン -> オーバーレイ)
  triggerRedoDrawing: () => ipcRenderer.send('trigger-redo-drawing'),

  // 設定画面のホバー状態を通知 (設定 -> メイン)
  setSettingsHover: (isHovered) => ipcRenderer.send('set-settings-hover', isHovered),

  // 設定画面のアクティブ状態の同期を受信 (メイン -> オーバーレイ)
  onSettingsStateChanged: (callback) => {
    const subscription = (event, active) => callback(active);
    ipcRenderer.on('settings-state-changed', subscription);
    return () => ipcRenderer.removeListener('settings-state-changed', subscription);
  },
});
