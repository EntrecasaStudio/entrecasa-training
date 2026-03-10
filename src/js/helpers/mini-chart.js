/**
 * Render a mini sparkline chart on a canvas element.
 * Uses smooth bezier curves for a premium look.
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
    labels = null,
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

  // Smooth bezier path helper
  function drawSmoothPath() {
    ctx.moveTo(getX(0), getY(dataPoints[0]));
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const x0 = getX(i), y0 = getY(dataPoints[i]);
      const x1 = getX(i + 1), y1 = getY(dataPoints[i + 1]);
      const cpx = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
    }
  }

  // Gradient fill under curve
  ctx.beginPath();
  drawSmoothPath();
  ctx.lineTo(getX(dataPoints.length - 1), h - padding);
  ctx.lineTo(getX(0), h - padding);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, padding, 0, h - padding);
  gradient.addColorStop(0, fillColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Smooth line
  ctx.beginPath();
  drawSmoothPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Last dot — glow ring if it's a PR (max value)
  const lastIdx = dataPoints.length - 1;
  const lastVal = dataPoints[lastIdx];
  const isPR = lastVal >= max;

  if (isPR) {
    ctx.beginPath();
    ctx.arc(getX(lastIdx), getY(lastVal), dotRadius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 205, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(getX(lastIdx), getY(lastVal), dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = dotColor;
  ctx.fill();

  // Interactive tap: show value + date
  if (labels) {
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < dataPoints.length; i++) {
        const dist = Math.abs(getX(i) - clickX);
        if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      }
      const existing = canvas.parentElement.querySelector('.sparkline-tooltip');
      if (existing) existing.remove();

      const tip = document.createElement('div');
      tip.className = 'sparkline-tooltip fade-in';
      const fecha = labels[closestIdx];
      const fechaStr = fecha ? new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '';
      tip.textContent = `${dataPoints[closestIdx]} kg${fechaStr ? ` · ${fechaStr}` : ''}`;
      canvas.parentElement.style.position = 'relative';
      tip.style.cssText = 'position:absolute;right:0;top:-20px';
      canvas.parentElement.appendChild(tip);
      setTimeout(() => tip.remove(), 2500);
    };
  }
}

/**
 * Render a full line chart with X/Y axes, grid, and labels.
 * @param {HTMLCanvasElement} canvas
 * @param {number[]} dataPoints
 * @param {object} options
 */
export function renderLineChart(canvas, dataPoints, options = {}) {
  if (!canvas || dataPoints.length < 2) return;

  const {
    lineColor = '#FFCD00',
    fillColor = 'rgba(255, 205, 0, 0.15)',
    dotColor = '#FFCD00',
    lineWidth = 2,
    dotRadius = 3,
    labels = null,
    yLabel = 'kg',
    gridColor = 'rgba(255,255,255,0.06)',
    textColor = 'rgba(255,255,255,0.45)',
    paddingTop = 16,
    paddingBottom = 32,
    paddingLeft = 36,
    paddingRight = 12,
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
  const plotW = w - paddingLeft - paddingRight;
  const plotH = h - paddingTop - paddingBottom;

  function getX(i) { return paddingLeft + (i / (dataPoints.length - 1)) * plotW; }
  function getY(val) { return paddingTop + plotH - ((val - min) / range) * plotH; }

  // Y-axis grid lines + labels (5 ticks)
  const yTicks = 4;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= yTicks; i++) {
    const val = min + (range * i / yTicks);
    const y = getY(val);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(w - paddingRight, y);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(Math.round(val), paddingLeft - 6, y + 3);
  }

  // X-axis labels (evenly spaced dates)
  if (labels) {
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(labels.length / 5));
    const shown = new Set();
    for (let i = 0; i < labels.length; i += step) {
      const d = new Date(labels[i]);
      const text = `${d.getDate()}/${d.getMonth() + 1}`;
      ctx.fillStyle = textColor;
      ctx.fillText(text, getX(i), h - 6);
      shown.add(i);
    }
    // Always show last
    const lastI = labels.length - 1;
    if (!shown.has(lastI)) {
      const d = new Date(labels[lastI]);
      ctx.fillStyle = textColor;
      ctx.fillText(`${d.getDate()}/${d.getMonth() + 1}`, getX(lastI), h - 6);
    }
  }

  // Smooth bezier path helper
  function drawSmoothPath() {
    ctx.moveTo(getX(0), getY(dataPoints[0]));
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const x0 = getX(i), y0 = getY(dataPoints[i]);
      const x1 = getX(i + 1), y1 = getY(dataPoints[i + 1]);
      const cpx = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
    }
  }

  // Gradient fill
  ctx.beginPath();
  drawSmoothPath();
  ctx.lineTo(getX(dataPoints.length - 1), paddingTop + plotH);
  ctx.lineTo(getX(0), paddingTop + plotH);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + plotH);
  gradient.addColorStop(0, fillColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  drawSmoothPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Dots on all points
  for (let i = 0; i < dataPoints.length; i++) {
    ctx.beginPath();
    ctx.arc(getX(i), getY(dataPoints[i]), dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
  }

  // PR glow on max
  const maxVal = Math.max(...dataPoints);
  const maxIdx = dataPoints.lastIndexOf(maxVal);
  ctx.beginPath();
  ctx.arc(getX(maxIdx), getY(maxVal), dotRadius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 205, 0, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Interactive tap
  if (labels) {
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < dataPoints.length; i++) {
        const dist = Math.abs(getX(i) - clickX);
        if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      }
      const existing = canvas.parentElement.querySelector('.sparkline-tooltip');
      if (existing) existing.remove();
      const tip = document.createElement('div');
      tip.className = 'sparkline-tooltip fade-in';
      const fecha = labels[closestIdx];
      const fechaStr = fecha ? new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '';
      tip.textContent = `${dataPoints[closestIdx]} ${yLabel}${fechaStr ? ` · ${fechaStr}` : ''}`;
      canvas.parentElement.style.position = 'relative';
      tip.style.cssText = 'position:absolute;right:0;top:-4px;z-index:10';
      canvas.parentElement.appendChild(tip);
      setTimeout(() => tip.remove(), 2500);
    };
  }
}
