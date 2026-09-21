import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { NATIVE_COMMANDS, NATIVE_EVENTS } from './events.js';

export function createSubscribe(listenFn = listen) {
  return function subscribe(eventName, callback) {
  let disposed = false;
  let unlisten = null;

  listenFn(eventName, (event) => callback(event.payload)).then((cleanup) => {
    if (disposed) cleanup();
    else unlisten = cleanup;
  }).catch((error) => {
    if (!disposed) console.error(`Tauri event subscription failed: ${eventName}`, error);
  });

  return () => {
    disposed = true;
    if (unlisten) {
      unlisten();
      unlisten = null;
    }
  };
  };
}

const subscribe = createSubscribe();

const api = {
  updateConfig: (config) => invoke(NATIVE_COMMANDS.UPDATE_CONFIG, { update: config }),
  onConfigUpdate: (callback) => subscribe(NATIVE_EVENTS.CONFIG_UPDATED, callback),
  getConfig: () => invoke(NATIVE_COMMANDS.GET_CONFIG),
  onGlobalMouse: (callback) => subscribe(NATIVE_EVENTS.GLOBAL_MOUSE, callback),
  onGlobalKey: (callback) => subscribe(NATIVE_EVENTS.GLOBAL_KEY, callback),
  onGlobalWheel: (callback) => subscribe(NATIVE_EVENTS.GLOBAL_WHEEL, callback),
  setIgnoreMouseEvents: (ignore, _options) => {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      return getCurrentWindow().setIgnoreCursorEvents(ignore);
    }
    return invoke(NATIVE_COMMANDS.SET_OVERLAY_IGNORE_MOUSE_EVENTS, { ignore });
  },
  onClearDrawing: (callback) => subscribe(NATIVE_EVENTS.CLEAR_DRAWING, callback),
  triggerClearDrawing: (all = false) => invoke(NATIVE_COMMANDS.TRIGGER_CLEAR_DRAWING, { all }),
  onUndoDrawing: (callback) => subscribe(NATIVE_EVENTS.UNDO_DRAWING, callback),
  triggerUndoDrawing: () => invoke(NATIVE_COMMANDS.TRIGGER_UNDO_DRAWING),
  onRedoDrawing: (callback) => subscribe(NATIVE_EVENTS.REDO_DRAWING, callback),
  triggerRedoDrawing: () => invoke(NATIVE_COMMANDS.TRIGGER_REDO_DRAWING),
  setSettingsHover: (isHovered) => invoke(NATIVE_COMMANDS.SET_SETTINGS_HOVER, { isHovered }),
  onSettingsStateChanged: (callback) => subscribe(NATIVE_EVENTS.SETTINGS_STATE_CHANGED, callback),
  captureScreen: () => invoke(NATIVE_COMMANDS.CAPTURE_SCREEN),
};

if (typeof window !== 'undefined') {
  window.electronAPI = api;
}

export { api, subscribe };
