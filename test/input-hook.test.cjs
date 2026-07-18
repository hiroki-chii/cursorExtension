const test = require('node:test');
const assert = require('node:assert/strict');
const { createInputHook, toDisplayPoint } = require('../electron/input-hook.cjs');

test('physical input coordinates are converted to display-local logical coordinates', () => {
  assert.deepEqual(toDisplayPoint(
    { x: 2400, y: 1200 },
    { scaleFactor: 2, bounds: { x: 100, y: 50 } },
  ), { x: 1100, y: 550 });
});

test('input hook forwards normalized mouse events and starts only once', () => {
  const listeners = {};
  const sent = [];
  let starts = 0;
  const hook = createInputHook({
    uiohook: {
      on: (name, callback) => { listeners[name] = callback; },
      start: () => { starts += 1; },
      stop: () => {},
    },
    getPrimaryDisplay: () => ({ scaleFactor: 2, bounds: { x: 10, y: 20 } }),
    send: (...args) => sent.push(args),
  });

  hook.start();
  hook.start();
  listeners.mousedown({ x: 220, y: 440, button: 1 });

  assert.equal(starts, 1);
  assert.deepEqual(sent, [['global-mouse', {
    type: 'down', button: 1, x: 100, y: 200,
  }]]);
});
