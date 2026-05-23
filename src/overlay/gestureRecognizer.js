// 手書きペンに特化したジェスチャー認識アルゴリズム & スワイプ・シェイク判定

function distance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function pathLength(points) {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += distance(points[i - 1], points[i]);
  }
  return d;
}

function resample(points, n) {
  const I = pathLength(points) / (n - 1);
  let D = 0;
  const newPoints = [points[0]];
  const pts = [...points];
  for (let i = 1; i < pts.length; i++) {
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const d = distance(p1, p2);
    if ((D + d) >= I) {
      const qx = p1.x + ((I - D) / d) * (p2.x - p1.x);
      const qy = p1.y + ((I - D) / d) * (p2.y - p1.y);
      const q = { x: qx, y: qy };
      newPoints.push(q);
      pts.splice(i, 0, q); // ptsを更新
      D = 0;
    } else {
      D += d;
    }
  }
  while (newPoints.length < n) {
    newPoints.push(pts[pts.length - 1]);
  }
  if (newPoints.length > n) {
    newPoints.length = n;
  }
  return newPoints;
}

function getBoundingBox(points) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return [minX, maxX, minY, maxY];
}

function scaleTo(points, size) {
  const [minX, maxX, minY, maxY] = getBoundingBox(points);
  const w = maxX - minX;
  const h = maxY - minY;
  return points.map(p => ({
    x: p.x * (size / (w || 1)),
    y: p.y * (size / (h || 1))
  }));
}

function centroid(points) {
  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

function translateTo(points, pt) {
  const c = centroid(points);
  return points.map(p => ({
    x: p.x + pt.x - c.x,
    y: p.y + pt.y - c.y
  }));
}

function pathDistance(pts1, pts2) {
  let d = 0;
  for (let i = 0; i < pts1.length; i++) {
    d += distance(pts1[i], pts2[i]);
  }
  return d / pts1.length;
}

// 左右のシェイク（振る）判定
function detectShake(points) {
  if (points.length < 10) return false;

  let xReversals = 0;
  let lastDirection = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    if (Math.abs(dx) > 3) {
      const direction = dx > 0 ? 1 : -1;
      if (lastDirection !== 0 && direction !== lastDirection) {
        xReversals++;
      }
      lastDirection = direction;
    }
  }

  const [minX, maxX, minY, maxY] = getBoundingBox(points);
  const w = maxX - minX;
  const h = maxY - minY;

  // 横に一定以上振られていて、縦幅が少なく、3回以上の往復がある
  return xReversals >= 3 && h < w * 0.5 && w > 80;
}

// 水平スワイプ（右から左＝戻る、左から右＝進む）判定
function detectHorizontalSwipe(points) {
  if (points.length < 5) return null;
  const [minX, maxX, minY, maxY] = getBoundingBox(points);
  const w = maxX - minX;
  const h = maxY - minY;
  const start = points[0];
  const end = points[points.length - 1];

  // 横幅が十分あり、縦方向のブレが少ない（水平直線に近い）
  if (w > 100 && h < w * 0.4) {
    let xReversals = 0;
    let lastDirection = 0;

    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      if (Math.abs(dx) > 3) {
        const direction = dx > 0 ? 1 : -1;
        if (lastDirection !== 0 && direction !== lastDirection) {
          xReversals++;
        }
        lastDirection = direction;
      }
    }

    // 往復がほぼ無く、一方向へのスワイプであること
    if (xReversals <= 1) {
      if (start.x > end.x) {
        return 'rightToLeft'; // 右から左 (Undo)
      } else {
        return 'leftToRight'; // 左から右 (Redo)
      }
    }
  }
  return null;
}

// テンプレート群
const templates = {};

// Checkmark (V) のみ登録
const vRaw = [
  { x: 0, y: 0 },
  { x: 50, y: 80 },
  { x: 100, y: 20 }
];
templates.checkmark = translateTo(scaleTo(resample(vRaw, 64), 250), { x: 0, y: 0 });

// メイン認識関数
export function recognizeGesture(points) {
  if (points.length < 5) return null;

  const [minX, maxX, minY, maxY] = getBoundingBox(points);
  const w = maxX - minX;
  const h = maxY - minY;

  // 1. まずシェイクを判定
  if (detectShake(points)) {
    return 'shake';
  }

  // 2. 水平スワイプ（左から右、右から左）を判定
  const swipe = detectHorizontalSwipe(points);
  if (swipe) {
    return swipe;
  }

  // 小さすぎるものはジェスチャーと判定しない（V字判定用）
  if (w < 40 && h < 40 && pathLength(points) < 60) {
    return null;
  }

  // 3. テンプレートマッチング（Vの字）
  try {
    const resampled = resample(points, 64);
    const scaled = scaleTo(resampled, 250);
    const normalized = translateTo(scaled, { x: 0, y: 0 });

    let bestScore = -Infinity;
    let bestMatch = null;

    for (const [name, templatePoints] of Object.entries(templates)) {
      const dist = pathDistance(normalized, templatePoints);
      const score = 1 - dist / 250;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = name;
      }
    }

    if (bestScore > 0.78) {
      return bestMatch;
    }
  } catch (err) {
    console.error('ジェスチャー認識中にエラーが発生しました:', err);
  }

  return null;
}
