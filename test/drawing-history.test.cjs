const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('vite');

test('drawing history supports commit, undo, redo, and clears redo after a new stroke', async (t) => {
  const server = await createServer({ server: { middlewareMode: true } });
  t.after(() => server.close());
  const { createDrawingHistory } = await server.ssrLoadModule('/src/overlay/drawingHistory.js');

  const history = createDrawingHistory();
  const firstStroke = { points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] };
  const secondStroke = { points: [{ x: 5, y: 5 }, { x: 15, y: 15 }] };

  history.commit(firstStroke);
  assert.deepEqual(history.getStrokes(), [firstStroke]);

  history.undo();
  assert.deepEqual(history.getStrokes(), []);

  history.redo();
  assert.deepEqual(history.getStrokes(), [firstStroke]);

  history.undo();
  history.commit(secondStroke);
  assert.equal(history.redo(), false);
  assert.deepEqual(history.getStrokes(), [secondStroke]);
});
