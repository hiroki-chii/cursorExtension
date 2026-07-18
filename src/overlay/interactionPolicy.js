export function isOverlayInteractive({
  settingsActive,
  penEnabled,
  areaSelecting,
  recordingGesture,
}) {
  if (settingsActive) return false;
  return Boolean(penEnabled || areaSelecting || recordingGesture);
}
