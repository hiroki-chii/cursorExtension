function createSettingsWindow({ BrowserWindow, path, baseDir, isDev, events = {} }) {
  const window = new BrowserWindow({
    width: 650,
    height: 800,
    minWidth: 650,
    maxWidth: 650,
    minHeight: 600,
    webPreferences: {
      preload: path.join(baseDir, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'PresenterCursor 設定',
    autoHideMenuBar: true,
  });

  if (isDev) window.loadURL('http://localhost:5173/index.html');
  else window.loadFile(path.join(baseDir, '../dist/index.html'));

  for (const [name, handler] of Object.entries(events)) {
    window.on(name, handler);
  }
  return window;
}

function createOverlayWindow({ BrowserWindow, path, baseDir, isDev, display, onClosed }) {
  const { width, height, x, y } = display.bounds;
  const window = new BrowserWindow({
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
    focusable: false,
    webPreferences: {
      preload: path.join(baseDir, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.setIgnoreMouseEvents(true, { forward: true });
  window.setAlwaysOnTop(true, 'screen-saver');
  if (isDev) window.loadURL('http://localhost:5173/overlay.html');
  else window.loadFile(path.join(baseDir, '../dist/overlay.html'));
  window.on('closed', onClosed);
  return window;
}

function createTray({ Tray, Menu, path, baseDir, openSettings, quit }) {
  const tray = new Tray(path.join(baseDir, 'icon.ico'));
  tray.setToolTip('PresenterCursor');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '設定を開く', click: openSettings },
    { type: 'separator' },
    { label: '終了', click: quit },
  ]));
  tray.on('double-click', openSettings);
  return tray;
}

function showSettingsWindow(window) {
  if (window.isMinimized()) window.restore();
  window.focus();
}

module.exports = {
  createOverlayWindow,
  createSettingsWindow,
  createTray,
  showSettingsWindow,
};
