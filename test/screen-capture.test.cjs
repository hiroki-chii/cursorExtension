const test = require('node:test');
const assert = require('node:assert/strict');
const { capturePrimaryScreen } = require('../electron/screen-capture.cjs');

function fakeWindow({ focused = false } = {}) {
  const calls = [];
  return {
    calls,
    isDestroyed: () => false,
    isVisible: () => true,
    isMinimized: () => false,
    isFocused: () => focused,
    hide: () => calls.push('hide'),
    show: () => calls.push('show'),
    showInactive: () => calls.push('showInactive'),
  };
}

test('screen capture hides app windows and restores their prior focus behavior', async () => {
  const overlay = fakeWindow();
  const settings = fakeWindow({ focused: true });
  const result = await capturePrimaryScreen({
    getOverlayWindow: () => overlay,
    getSettingsWindow: () => settings,
    screen: { getPrimaryDisplay: () => ({ bounds: { width: 800, height: 600 }, scaleFactor: 2 }) },
    desktopCapturer: { getSources: async () => [{ thumbnail: { toDataURL: () => 'data:image/png;base64,test' } }] },
    delay: async () => {},
  });

  assert.equal(result, 'data:image/png;base64,test');
  assert.deepEqual(settings.calls, ['hide', 'show']);
  assert.deepEqual(overlay.calls, ['hide', 'showInactive']);
});
