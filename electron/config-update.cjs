const { isDeepStrictEqual } = require('node:util');

function applyConfigUpdate(currentConfig, update) {
  const mergedUpdate = { ...update };

  for (const [key, value] of Object.entries(update)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      mergedUpdate[key] = { ...currentConfig[key], ...value };
    }
  }

  const config = { ...currentConfig, ...mergedUpdate };
  return {
    config,
    shortcutsChanged: !isDeepStrictEqual(currentConfig.shortcuts, config.shortcuts),
  };
}

module.exports = { applyConfigUpdate };
