export function calculateZoomSourceRect({
  centerX,
  centerY,
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
  const halfViewportWidth = canvasWidth / (2 * safeScale);
  const halfViewportHeight = canvasHeight / (2 * safeScale);
  const constrainedCenterX = Math.max(
    halfViewportWidth,
    Math.min(canvasWidth - halfViewportWidth, centerX),
  );
  const constrainedCenterY = Math.max(
    halfViewportHeight,
    Math.min(canvasHeight - halfViewportHeight, centerY),
  );

  return {
    sx: (constrainedCenterX - halfViewportWidth) * ratioX,
    sy: (constrainedCenterY - halfViewportHeight) * ratioY,
    sw,
    sh,
  };
}

export function moveZoomCenter({
  centerX,
  centerY,
  deltaX,
  deltaY,
  scale,
  canvasWidth,
  canvasHeight,
}) {
  const safeScale = Math.max(1, scale);
  const halfViewportWidth = canvasWidth / (2 * safeScale);
  const halfViewportHeight = canvasHeight / (2 * safeScale);

  return {
    x: Math.max(
      halfViewportWidth,
      Math.min(canvasWidth - halfViewportWidth, centerX - deltaX / safeScale),
    ),
    y: Math.max(
      halfViewportHeight,
      Math.min(canvasHeight - halfViewportHeight, centerY - deltaY / safeScale),
    ),
  };
}
