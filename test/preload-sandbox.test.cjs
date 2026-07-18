const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('sandboxed preload does not require local modules', () => {
  const preload = fs.readFileSync(path.join(__dirname, '../electron/preload.js'), 'utf8');
  assert.doesNotMatch(preload, /require\(['"]\.\//);
});
