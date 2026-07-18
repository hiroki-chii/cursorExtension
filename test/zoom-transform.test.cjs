const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('vite');

test('full-screen zoom keeps the pixel under the cursor at the same screen position', async (t) => {
  const server = await createServer({ server: { middlewareMode: true } });
  t.after(() => server.close());
  const { calculateZoomSourceRect } = await server.ssrLoadModule('/src/overlay/zoomTransform.js');

  const rect = calculateZoomSourceRect({
    cursorX: 400,
    cursorY: 300,
    scale: 2,
    canvasWidth: 800,
    canvasHeight: 600,
    imageWidth: 1600,
    imageHeight: 1200,
  });

  assert.deepEqual(rect, { sx: 400, sy: 300, sw: 800, sh: 600 });
});
