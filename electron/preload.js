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
    const subscription = () => callback();
    ipcRenderer.on('clear-drawing', subscription);
    return () => ipcRenderer.removeListener('clear-drawing', subscription);
  },
  
  // 手書きクリアシグナルの送信 (設定 -> メイン -> オーバーレイ)
  triggerClearDrawing: () => ipcRenderer.send('trigger-clear-drawing'),
});
