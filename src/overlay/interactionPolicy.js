export function isOverlayInteractive({
  settingsActive,
  penEnabled,
  areaSelecting,
  recordingGesture,
  zoomEnabled,
}) {
  if (settingsActive) return false;
  return Boolean(penEnabled || areaSelecting || recordingGesture || zoomEnabled);
}
