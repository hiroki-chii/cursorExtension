export const NATIVE_EVENTS = Object.freeze({
  CONFIG_UPDATED: 'config-updated',
  SETTINGS_STATE_CHANGED: 'settings-state-changed',
  GLOBAL_MOUSE: 'global-mouse',
  GLOBAL_KEY: 'global-key',
  GLOBAL_WHEEL: 'global-wheel',
  CLEAR_DRAWING: 'clear-drawing',
  UNDO_DRAWING: 'undo-drawing',
  REDO_DRAWING: 'redo-drawing',
});

export const NATIVE_COMMANDS = Object.freeze({
  GET_CONFIG: 'get_config',
  UPDATE_CONFIG: 'update_config',
  SET_SETTINGS_HOVER: 'set_settings_hover',
  SET_OVERLAY_IGNORE_MOUSE_EVENTS: 'set_overlay_ignore_mouse_events',
  CAPTURE_SCREEN: 'capture_screen',
  TRIGGER_CLEAR_DRAWING: 'trigger_clear_drawing',
  TRIGGER_UNDO_DRAWING: 'trigger_undo_drawing',
  TRIGGER_REDO_DRAWING: 'trigger_redo_drawing',
});
