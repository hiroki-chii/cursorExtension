const test = require('node:test');
const assert = require('node:assert/strict');

test('shortcut registration replaces existing bindings and skips empty accelerators', () => {
  const registrations = [];
  let unregisterCount = 0;
  const globalShortcut = {
    unregisterAll() {
      unregisterCount += 1;
    },
    register(accelerator, action) {
      registrations.push({ accelerator, action });
      return true;
    },
  };
  const toggleLaser = () => {};
  const togglePen = () => {};
  const { registerShortcuts } = require('../electron/shortcut-manager.cjs');

  registerShortcuts({
    globalShortcut,
    shortcuts: {
      toggleLaser: 'CommandOrControl+Shift+L',
      togglePen: '',
    },
    actions: { toggleLaser, togglePen },
  });

  assert.equal(unregisterCount, 1);
  assert.deepEqual(registrations, [{
    accelerator: 'CommandOrControl+Shift+L',
    action: toggleLaser,
  }]);
});
