const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('vite');

test('a horizontal shake requests all pen strokes to be cleared', async (t) => {
  const server = await createServer({ server: { middlewareMode: true } });
  t.after(() => server.close());
  const { recognizeGesture } = await server.ssrLoadModule('/src/overlay/gestureRecognizer.js');

  const points = [
    { x: 0, y: 10 }, { x: 40, y: 12 }, { x: 90, y: 9 },
    { x: 45, y: 11 }, { x: 5, y: 10 }, { x: 50, y: 8 },
    { x: 100, y: 12 }, { x: 55, y: 9 }, { x: 10, y: 11 },
    { x: 55, y: 10 }, { x: 105, y: 9 },
  ];

  assert.equal(recognizeGesture(points), 'clearDrawing');
});
