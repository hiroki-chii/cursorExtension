const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('vite');

test('Tauri bridge subscription cleanup handles pending and resolved listeners', async (t) => {
  const server = await createServer({ server: { middlewareMode: true } });
  t.after(() => server.close());
  const { createSubscribe } = await server.ssrLoadModule('/src/native/bridge.js');

  let resolveListener;
  const cleanupCalls = [];
  const listen = () => new Promise((resolve) => { resolveListener = resolve; });
  const subscribe = createSubscribe(listen);
  const unsubscribeBeforeResolve = subscribe('pending', () => {});
  unsubscribeBeforeResolve();
  resolveListener(() => cleanupCalls.push('pending'));
  await Promise.resolve();
  assert.deepEqual(cleanupCalls, ['pending']);

  const resolvedCleanup = () => cleanupCalls.push('resolved');
  const immediateSubscribe = createSubscribe(async () => resolvedCleanup);
  const unsubscribeAfterResolve = immediateSubscribe('resolved', () => {});
  await Promise.resolve();
  unsubscribeAfterResolve();
  assert.deepEqual(cleanupCalls, ['pending', 'resolved']);
});
