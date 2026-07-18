export function subscribeOverlayEvents(api, handlers) {
  const unsubscribers = [
    api.onConfigUpdate(handlers.configUpdated),
    api.onGlobalMouse(handlers.globalMouse),
    api.onGlobalKey(handlers.globalKey),
    api.onGlobalWheel(handlers.globalWheel),
    api.onClearDrawing(handlers.clearDrawing),
    api.onUndoDrawing(handlers.undoDrawing),
    api.onRedoDrawing(handlers.redoDrawing),
    api.onSettingsStateChanged(handlers.settingsStateChanged),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
