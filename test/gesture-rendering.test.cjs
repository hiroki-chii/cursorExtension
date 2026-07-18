const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('vite');

test('gesture trail renders a path through recorded points', async (t) => {
  const server = await createServer({ server: { middlewareMode: true } });
  t.after(() => server.close());
  const { drawGesture } = await server.ssrLoadModule('/src/overlay/canvasRenderer.js');
  const calls = [];
  const context = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: (...args) => calls.push(['moveTo', ...args]),
    lineTo: (...args) => calls.push(['lineTo', ...args]),
    stroke: () => calls.push(['stroke']),
    arc: () => {},
    fill: () => {},
  };

  drawGesture(context, [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }]);

  assert.deepEqual(calls, [
    ['moveTo', 10, 20],
    ['lineTo', 30, 40],
    ['lineTo', 50, 60],
    ['stroke'],
  ]);
});
