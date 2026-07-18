const test = require('node:test');
const assert = require('node:assert/strict');

const { applyConfigUpdate } = require('../electron/config-update.cjs');
const { normalizeConfig } = require('../electron/config-schema.cjs');

test('normalizing a saved config preserves values and fills missing defaults', () => {
  const config = normalizeConfig({
    theme: 'dark',
    pen: { enabled: true, color: '#ffffff' },
  });

  assert.equal(config.theme, 'dark');
  assert.equal(config.pen.enabled, true);
  assert.equal(config.pen.color, '#ffffff');
  assert.equal(config.pen.width, 4);
  assert.equal(config.shortcuts.toggleZoom, 'CommandOrControl+Shift+M');
});

test('changing a visual setting does not request shortcut re-registration', () => {
  const current = {
    laser: { enabled: false, radius: 6 },
    shortcuts: { toggleLaser: 'CommandOrControl+Shift+L' },
  };

  const result = applyConfigUpdate(current, {
    laser: { enabled: true, radius: 6 },
  });

  assert.equal(result.shortcutsChanged, false);
  assert.deepEqual(result.config.laser, { enabled: true, radius: 6 });
});

test('applying a partial section update preserves its other settings', () => {
  const current = normalizeConfig({
    pen: { enabled: false, color: '#ffffff', width: 8 },
  });

  const result = applyConfigUpdate(current, {
    pen: { enabled: true },
  });

  assert.equal(result.config.pen.enabled, true);
  assert.equal(result.config.pen.color, '#ffffff');
  assert.equal(result.config.pen.width, 8);
});
