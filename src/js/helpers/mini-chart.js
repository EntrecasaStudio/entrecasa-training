/**
 * Render a mini sparkline chart on a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {number[]} dataPoints - Array of numeric values
 * @param {object} options
 */
export function renderMiniChart(canvas, dataPoints, options = {}) {
  if (!canvas || dataPoints.length < 2) return;

  const {
    lineColor = '#FFCD00',
    fillColor = 'rgba(255, 205, 0, 0.15)',
    dotColor = '#FFCD00',
    lineWidth = 2,
    dotRadius = 3,
    padding = 8,
  } = options;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min || 1;

  const plotW = w - padding * 2;
  const plotH = h - padding * 2;

  function getX(i) {
    return padding + (i / (dataPoints.length - 1)) * plotW;
  }

  function getY(val) {
    return padding + plotH - ((val - min) / range) * plotH;
  }

  // Gradient fill
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(dataPoints[0]));
  for (let i = 1; i < dataPoints.length; i++) {
    ctx.lineTo(getX(i), getY(dataPoints[i]));
  }
  ctx.lineTo(getX(dataPoints.length - 1), h - padding);
  ctx.lineTo(getX(0), h - padding);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, padding, 0, h - padding);
  gradient.addColorStop(0, fillColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(dataPoints[0]));
  for (let i = 1; i < dataPoints.length; i++) {
    ctx.lineTo(getX(i), getY(dataPoints[i]));
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Last dot (highlight)
  const lastIdx = dataPoints.length - 1;
  ctx.beginPath();
  ctx.arc(getX(lastIdx), getY(dataPoints[lastIdx]), dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = dotColor;
  ctx.fill();
}
