export function calculateZoomSourceRect({
  cursorX,
  cursorY,
  scale,
  canvasWidth,
  canvasHeight,
  imageWidth,
  imageHeight,
}) {
  const safeScale = Math.max(1, scale);
  const ratioX = imageWidth / canvasWidth;
  const ratioY = imageHeight / canvasHeight;
  const sw = imageWidth / safeScale;
  const sh = imageHeight / safeScale;

  return {
    sx: cursorX * ratioX * (1 - 1 / safeScale),
    sy: cursorY * ratioY * (1 - 1 / safeScale),
    sw,
    sh,
  };
}
