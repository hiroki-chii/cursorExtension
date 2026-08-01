const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('vite');

test('full-screen zoom starts with a centered viewport', async (t) => {
  const server = await createServer({ server: { middlewareMode: true } });
  t.after(() => server.close());
  const { calculateZoomSourceRect } = await server.ssrLoadModule('/src/overlay/zoomTransform.js');

  const rect = calculateZoomSourceRect({
    centerX: 400,
    centerY: 300,
    scale: 2,
    canvasWidth: 800,
    canvasHeight: 600,
    imageWidth: 1600,
    imageHeight: 1200,
  });

  assert.deepEqual(rect, { sx: 400, sy: 300, sw: 800, sh: 600 });
});

test('dragging moves the zoom viewport opposite to the pointer and clamps it to the screen', async (t) => {
  const server = await createServer({ server: { middlewareMode: true } });
  t.after(() => server.close());
  const { moveZoomCenter } = await server.ssrLoadModule('/src/overlay/zoomTransform.js');

  assert.deepEqual(moveZoomCenter({
    centerX: 400,
    centerY: 300,
    deltaX: 160,
    deltaY: -120,
    scale: 2,
    canvasWidth: 800,
    canvasHeight: 600,
  }), { x: 320, y: 360 });

  assert.deepEqual(moveZoomCenter({
    centerX: 400,
    centerY: 300,
    deltaX: 1000,
    deltaY: 1000,
    scale: 2,
    canvasWidth: 800,
    canvasHeight: 600,
  }), { x: 200, y: 150 });
});
