const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('vite');

test('overlay subscriptions are registered and disposed as one unit', async (t) => {
  const server = await createServer({ server: { middlewareMode: true } });
  t.after(() => server.close());
  const { subscribeOverlayEvents } = await server.ssrLoadModule('/src/overlay/electronSubscriptions.js');
  const registered = [];
  const disposed = [];
  const api = {};
  const methods = [
    'onConfigUpdate', 'onGlobalMouse', 'onGlobalKey', 'onGlobalWheel',
    'onClearDrawing', 'onUndoDrawing', 'onRedoDrawing', 'onSettingsStateChanged',
  ];
  methods.forEach((method) => {
    api[method] = (handler) => {
      registered.push([method, handler]);
      return () => disposed.push(method);
    };
  });
  const handler = () => {};
  const handlers = {
    configUpdated: handler,
    globalMouse: handler,
    globalKey: handler,
    globalWheel: handler,
    clearDrawing: handler,
    undoDrawing: handler,
    redoDrawing: handler,
    settingsStateChanged: handler,
  };

  const unsubscribe = subscribeOverlayEvents(api, handlers);
  unsubscribe();

  assert.equal(registered.length, 8);
  assert.deepEqual(disposed, methods);
});
