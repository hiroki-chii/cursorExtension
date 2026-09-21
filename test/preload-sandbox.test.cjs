const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Tauri bridge imports only public Tauri APIs', () => {
  const bridge = fs.readFileSync(path.join(__dirname, '../src/native/bridge.js'), 'utf8');
  assert.match(bridge, /@tauri-apps\/api\/core/);
  assert.match(bridge, /@tauri-apps\/api\/event/);
  assert.doesNotMatch(bridge, /require\(['"]\.\//);
});
