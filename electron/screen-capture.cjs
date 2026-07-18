async function capturePrimaryScreen({
  getOverlayWindow,
  getSettingsWindow,
  screen,
  desktopCapturer,
  delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  onError = console.error,
}) {
  const overlayWindow = getOverlayWindow();
  const settingsWindow = getSettingsWindow();
  const overlayVisible = Boolean(overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible());
  const settingsVisible = Boolean(
    settingsWindow && !settingsWindow.isDestroyed()
    && settingsWindow.isVisible() && !settingsWindow.isMinimized()
  );
  const settingsWasFocused = settingsVisible && settingsWindow.isFocused();

  if (overlayVisible) overlayWindow.hide();
  if (settingsVisible) settingsWindow.hide();
  if (overlayVisible || settingsVisible) await delay(80);

  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;
    const scale = primaryDisplay.scaleFactor;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
      },
    });
    return sources[0]?.thumbnail.toDataURL() || null;
  } catch (error) {
    onError(error);
    return null;
  } finally {
    if (settingsVisible && !settingsWindow.isDestroyed()) {
      if (settingsWasFocused) settingsWindow.show();
      else settingsWindow.showInactive();
    }
    if (overlayVisible && !overlayWindow.isDestroyed()) {
      overlayWindow.showInactive();
    }
  }
}

module.exports = { capturePrimaryScreen };
