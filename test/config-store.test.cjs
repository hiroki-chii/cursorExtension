const test = require('node:test');
const assert = require('node:assert/strict');

test('loading without a saved file returns normalized defaults', () => {
  const fs = {
    existsSync: () => false,
  };
  const defaultConfig = { theme: 'system' };
  const normalize = (savedConfig) => {
    assert.equal(savedConfig, undefined);
    return defaultConfig;
  };
  const { createConfigStore } = require('../electron/config-store.cjs');

  const store = createConfigStore({
    fs,
    filePath: 'config.json',
    normalize,
  });

  assert.equal(store.load(), defaultConfig);
});

test('saved JSON is normalized when loaded and formatted when saved', () => {
  const writes = [];
  const fs = {
    existsSync: () => true,
    readFileSync: (filePath, encoding) => {
      assert.equal(filePath, 'config.json');
      assert.equal(encoding, 'utf8');
      return '{"theme":"dark"}';
    },
    writeFileSync: (...args) => writes.push(args),
  };
  const normalize = (savedConfig) => ({ theme: 'system', ...savedConfig });
  const { createConfigStore } = require('../electron/config-store.cjs');
  const store = createConfigStore({ fs, filePath: 'config.json', normalize });

  const config = store.load();
  assert.deepEqual(config, { theme: 'dark' });

  store.save(config);
  assert.deepEqual(writes, [[
    'config.json',
    JSON.stringify(config, null, 2),
    'utf8',
  ]]);
});

test('a broken saved file reports the error and falls back to defaults', () => {
  const errors = [];
  const fs = {
    existsSync: () => true,
    readFileSync: () => '{broken json',
  };
  const defaultConfig = { theme: 'system' };
  const { createConfigStore } = require('../electron/config-store.cjs');
  const store = createConfigStore({
    fs,
    filePath: 'config.json',
    normalize: (savedConfig) => savedConfig ? savedConfig : defaultConfig,
    onError: (operation, error) => errors.push({ operation, error }),
  });

  assert.equal(store.load(), defaultConfig);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].operation, 'load');
  assert.ok(errors[0].error instanceof SyntaxError);
});

test('a save failure is reported without escaping the store', () => {
  const errors = [];
  const writeError = new Error('disk full');
  const fs = {
    existsSync: () => false,
    writeFileSync: () => { throw writeError; },
  };
  const { createConfigStore } = require('../electron/config-store.cjs');
  const store = createConfigStore({
    fs,
    filePath: 'config.json',
    normalize: () => ({}),
    onError: (operation, error) => errors.push({ operation, error }),
  });

  assert.doesNotThrow(() => store.save({ theme: 'dark' }));
  assert.deepEqual(errors, [{ operation: 'save', error: writeError }]);
});
