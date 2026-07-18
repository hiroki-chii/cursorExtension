const test = require('node:test');
const assert = require('node:assert/strict');
const { createOverlayWindow, showSettingsWindow } = require('../electron/window-manager.cjs');

test('overlay window uses display bounds and development entrypoint', () => {
  let options;
  class BrowserWindow {
    constructor(value) { options = value; this.calls = []; }
    setIgnoreMouseEvents(...args) { this.calls.push(['ignore', ...args]); }
    setAlwaysOnTop(...args) { this.calls.push(['top', ...args]); }
    loadURL(url) { this.calls.push(['url', url]); }
    on() {}
  }
  const window = createOverlayWindow({
    BrowserWindow,
    path: { join: (...parts) => parts.join('/') },
    baseDir: 'electron',
    isDev: true,
    display: { bounds: { x: 10, y: 20, width: 800, height: 600 } },
    onClosed: () => {},
  });

  assert.deepEqual({ x: options.x, y: options.y, width: options.width, height: options.height },
    { x: 10, y: 20, width: 800, height: 600 });
  assert.ok(window.calls.some((call) => call[0] === 'url' && call[1].endsWith('/overlay.html')));
});

test('showing settings restores a minimized window before focusing it', () => {
  const calls = [];
  showSettingsWindow({
    isMinimized: () => true,
    restore: () => calls.push('restore'),
    focus: () => calls.push('focus'),
  });
  assert.deepEqual(calls, ['restore', 'focus']);
});
