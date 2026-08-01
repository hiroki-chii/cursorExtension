import { calculateZoomSourceRect } from './zoomTransform';

function drawPath(ctx, stroke) {
  if (!stroke || stroke.points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 0.8;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let index = 1; index < stroke.points.length; index += 1) {
    ctx.lineTo(stroke.points[index].x, stroke.points[index].y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawGesture(ctx, points) {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
  ctx.beginPath();
  ctx.arc(points[0].x, points[0].y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawZoom(ctx, canvas, image, zoomCenter, scale) {
  if (!image) return;
  const { sx, sy, sw, sh } = calculateZoomSourceRect({
    centerX: zoomCenter.x,
    centerY: zoomCenter.y,
    scale,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    imageWidth: image.width,
    imageHeight: image.height,
  });
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const badgeWidth = 54;
  const badgeHeight = 20;
  const badgeX = Math.max(12, canvas.width - badgeWidth - 12);
  const badgeY = 12;
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${scale.toFixed(1)}x`, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
  ctx.restore();
}

export function drawSpotlight(ctx, canvas, config, mousePosition) {
  if (!config?.enabled) return;
  const radius = config.radius || 120;
  ctx.save();
  ctx.fillStyle = `rgba(15, 23, 42, ${config.opacity || 0.6})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-out';
  const gradient = ctx.createRadialGradient(
    mousePosition.x, mousePosition.y, radius * 0.7,
    mousePosition.x, mousePosition.y, radius,
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(mousePosition.x, mousePosition.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawAreaSpotlight(ctx, canvas, config, temporaryRect) {
  if (!config?.enabled) return;
  const activeRect = config.rect || temporaryRect;
  if (!activeRect) {
    ctx.save();
    ctx.fillStyle = `rgba(15, 23, 42, ${(config.opacity || 0.6) * 0.5})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.fillStyle = `rgba(15, 23, 42, ${config.opacity || 0.6})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
  ctx.fillRect(activeRect.x, activeRect.y, activeRect.width, activeRect.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = config.borderColor || '#3b82f6';
  ctx.lineWidth = config.borderWidth || 2;
  ctx.strokeRect(activeRect.x, activeRect.y, activeRect.width, activeRect.height);
  ctx.restore();
}

export function drawStrokes(ctx, committedStrokes, currentStroke) {
  if (committedStrokes.length === 0 && !currentStroke) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  committedStrokes.forEach((stroke) => drawPath(ctx, stroke));
  drawPath(ctx, currentStroke);
  ctx.restore();
}

export function drawLaser(ctx, config, mousePosition, history, now = Date.now()) {
  if (!config?.enabled) return history;
  const trailLength = (config.trailLength || 8) * 40;
  const activeHistory = history.filter((point) => now - point.time < trailLength);
  if (activeHistory.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let index = 1; index < activeHistory.length; index += 1) {
      const previous = activeHistory[index - 1];
      const point = activeHistory[index];
      const ratio = 1 - (now - point.time) / trailLength;
      ctx.strokeStyle = config.color || '#ef4444';
      ctx.globalAlpha = ratio * 0.6;
      ctx.lineWidth = (config.radius || 6) * ratio * 1.5;
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = config.color || '#ef4444';
  ctx.fillStyle = config.color || '#ef4444';
  ctx.beginPath();
  ctx.arc(mousePosition.x, mousePosition.y, config.radius || 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return activeHistory;
}

export function drawRipples(ctx, config, ripples) {
  if (!config?.enabled || ripples.length === 0) return ripples;
  ctx.save();
  const activeRipples = [];
  ripples.forEach((ripple) => {
    ripple.radius += ripple.speed;
    ripple.opacity = 1 - ripple.radius / ripple.maxRadius;
    if (ripple.opacity <= 0) return;
    activeRipples.push(ripple);
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.strokeStyle = ripple.color;
    ctx.globalAlpha = ripple.opacity;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = ripple.color;
    ctx.globalAlpha = ripple.opacity * 0.15;
    ctx.fill();
  });
  ctx.restore();
  return activeRipples;
}

export function drawInteractionIndicator(ctx, config, mousePosition, areaSelecting) {
  const penEnabled = config.pen?.enabled;
  if (!penEnabled && !areaSelecting) return;
  const color = penEnabled
    ? (config.pen.color || '#eab308')
    : (config.areaSpotlight?.borderColor || '#3b82f6');
  ctx.save();
  ctx.beginPath();
  ctx.arc(mousePosition.x + 16, mousePosition.y + 16, 12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 6;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = penEnabled ? '11px sans-serif' : '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(penEnabled ? '✏️' : '⛶', mousePosition.x + 16, mousePosition.y + 16);
  ctx.restore();
}
