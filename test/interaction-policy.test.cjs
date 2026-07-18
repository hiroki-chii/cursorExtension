const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('vite');

test('settings window activity keeps the overlay non-interactive', async (t) => {
  const server = await createServer({ server: { middlewareMode: true } });
  t.after(() => server.close());
  const { isOverlayInteractive } = await server.ssrLoadModule('/src/overlay/interactionPolicy.js');

  assert.equal(isOverlayInteractive({
    settingsActive: true,
    penEnabled: true,
    areaSelecting: true,
    recordingGesture: true,
  }), false);
});

test('active overlay tools enable interaction only while settings are inactive', async (t) => {
  const server = await createServer({ server: { middlewareMode: true } });
  t.after(() => server.close());
  const { isOverlayInteractive } = await server.ssrLoadModule('/src/overlay/interactionPolicy.js');
  const inactive = {
    settingsActive: false,
    penEnabled: false,
    areaSelecting: false,
    recordingGesture: false,
  };

  assert.equal(isOverlayInteractive(inactive), false);
  assert.equal(isOverlayInteractive({ ...inactive, penEnabled: true }), true);
  assert.equal(isOverlayInteractive({ ...inactive, areaSelecting: true }), true);
  assert.equal(isOverlayInteractive({ ...inactive, recordingGesture: true }), true);
});
