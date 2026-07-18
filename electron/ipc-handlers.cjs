const channels = require('./ipc-channels.cjs');

function registerIpcHandlers({
  ipcMain,
  BrowserWindow,
  captureScreen,
  getConfig,
  updateConfig,
  setSettingsHover,
  updateSettingsState,
  getOverlayWindow,
}) {
  const sendToOverlay = (channel, ...args) => {
    const overlayWindow = getOverlayWindow();
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send(channel, ...args);
    }
  };

  ipcMain.handle(channels.CAPTURE_SCREEN, captureScreen);
  ipcMain.handle(channels.GET_CONFIG, getConfig);
  ipcMain.on(channels.SET_SETTINGS_HOVER, (event, isHovered) => {
    setSettingsHover(isHovered);
    updateSettingsState();
  });
  ipcMain.on(channels.UPDATE_CONFIG, (event, newConfig) => updateConfig(newConfig));
  ipcMain.on(channels.SET_IGNORE_MOUSE_EVENTS, (event, ignore, options) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.setIgnoreMouseEvents(ignore, options);
  });
  ipcMain.on(channels.TRIGGER_CLEAR_DRAWING, (event, all) => {
    sendToOverlay(channels.CLEAR_DRAWING, all);
  });
  ipcMain.on(channels.TRIGGER_UNDO_DRAWING, () => sendToOverlay(channels.UNDO_DRAWING));
  ipcMain.on(channels.TRIGGER_REDO_DRAWING, () => sendToOverlay(channels.REDO_DRAWING));
}

module.exports = { registerIpcHandlers };
