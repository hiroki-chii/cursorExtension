const defaultConfig = Object.freeze({
  theme: 'system',
  spotlight: {
    enabled: false,
    radius: 120,
    opacity: 0.6,
  },
  areaSpotlight: {
    enabled: false,
    rect: null,
    opacity: 0.6,
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  laser: {
    enabled: false,
    radius: 6,
    color: '#ef4444',
    trailLength: 8,
  },
  ripple: {
    enabled: true,
    leftColor: '#ef4444',
    rightColor: '#3b82f6',
    radius: 35,
    speed: 1.5,
  },
  pen: {
    enabled: false,
    color: '#eab308',
    width: 4,
    triggerKey: 'Shift',
    opacity: 0.8,
  },
  zoom: {
    enabled: false,
    radius: 150,
    scale: 2.0,
    minScale: 1.0,
    maxScale: 5.0,
  },
  keycast: {
    enabled: false,
    duration: 2000,
  },
  gesture: {
    enabled: true,
  },
  shortcuts: {
    toggleSpotlight: 'CommandOrControl+Shift+S',
    toggleLaser: 'CommandOrControl+Shift+L',
    togglePen: 'CommandOrControl+Shift+P',
    clearDrawing: 'CommandOrControl+Shift+C',
    toggleAreaSpotlight: 'CommandOrControl+Shift+A',
    undoDrawing: 'CommandOrControl+Shift+Z',
    redoDrawing: 'CommandOrControl+Shift+Y',
    toggleZoom: 'CommandOrControl+Shift+M',
  },
});

const sectionNames = Object.keys(defaultConfig).filter(
  (key) => typeof defaultConfig[key] === 'object' && defaultConfig[key] !== null,
);

function normalizeConfig(savedConfig = {}) {
  const config = { ...defaultConfig, ...savedConfig };

  for (const section of sectionNames) {
    config[section] = {
      ...defaultConfig[section],
      ...(savedConfig[section] || {}),
    };
  }

  return config;
}

module.exports = { defaultConfig, normalizeConfig };
