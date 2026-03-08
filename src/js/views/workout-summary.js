import { getSesionById, getPersonalRecords, calcVolumenSesion, getPreviousSesion, getUsuarioActivo, getEjVueltas, getEjBestRound, updateSesion } from '@/store.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';
import { showToast } from '@js/components/toast.js';
import { haptic } from '@js/helpers/haptics.js';

function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function renderStatCard(label, value, unit = '', accent = false) {
  return `
    <div class="summary-stat ${accent ? 'summary-stat-accent' : ''}">
      <div class="summary-stat-value">${value}<span class="summary-stat-unit">${unit}</span></div>
      <div class="summary-stat-label">${label}</div>
    </div>
  `;
}

function renderComparison(current, previous) {
  if (!previous) return '';

  const volCurr = calcVolumenSesion(current);
  const volPrev = calcVolumenSesion(previous);
  const diff = volCurr - volPrev;
  const pct = volPrev > 0 ? Math.round((diff / volPrev) * 100) : 0;

  const cls = diff > 0 ? 'progress-up' : diff < 0 ? 'progress-down' : 'progress-same';
  const arrow = diff > 0 ? icon.arrowUp : diff < 0 ? icon.arrowDown : icon.equal;
  const sign = diff > 0 ? '+' : '';

  return `
    <div class="summary-comparison animate-in" style="animation-delay:400ms">
      <div class="summary-section-title">vs. sesion anterior</div>
      <div class="summary-comparison-row">
        <span>Volumen total</span>
        <span class="${cls}">${arrow} ${sign}${Math.round(diff)} kg (${sign}${pct}%)</span>
      </div>
    </div>
  `;
}

function renderPRs(sesion, records) {
  const prs = [];

  for (const c of sesion.circuitos) {
    // Skip non-normal circuits for PRs
    if ((c.tipo || 'normal') !== 'normal') continue;
    for (const ej of c.ejercicios) {
      const rec = records[ej.nombre];
      // PR if current peso matches the all-time max and this is from this session
      const best = getEjBestRound(ej);
      if (rec && best.pesoRealKg >= rec.maxPeso && best.pesoRealKg > 0) {
        prs.push({ nombre: ej.nombre, peso: best.pesoRealKg });
      }
    }
  }

  if (prs.length === 0) return '';

  const cards = prs
    .map(
      (pr, i) => `
    <div class="summary-pr-card animate-in" style="animation-delay:${500 + i * 80}ms">
      <span class="summary-pr-icon">&#127942;</span>
      <div class="summary-pr-info">
        <div class="summary-pr-name">${pr.nombre}</div>
        <div class="summary-pr-value">${pr.peso} kg</div>
      </div>
    </div>
  `,
    )
    .join('');

  return `
    <div class="summary-prs">
      <div class="summary-section-title">Records personales</div>
      ${cards}
    </div>
  `;
}

// ── Donut chart: volume by muscle group ──

const MUSCLE_COLORS = {
  piernas: '#3b82f6',
  pecho: '#ef4444',
  espalda: '#22c55e',
  brazos: '#a855f7',
  hombros: '#f97316',
  core: '#eab308',
  gluteos: '#ec4899',
  cardio: '#06b6d4',
};

function renderDonutChart(sesion) {
  // Aggregate volume by muscle group (skip non-normal circuits)
  const groups = {};
  for (const c of sesion.circuitos) {
    if ((c.tipo || 'normal') !== 'normal') continue;
    const group = (c.grupoMuscular || 'Otro').toLowerCase();
    const vol = c.ejercicios.reduce((sum, ej) => {
      const vueltas = getEjVueltas(ej);
      return sum + vueltas.reduce((vs, v) => vs + (v.pesoRealKg * v.repsReal), 0);
    }, 0);
    groups[group] = (groups[group] || 0) + vol;
  }

  const entries = Object.entries(groups).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '';

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const r = 40;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = entries.map(([name]) => {
    const pct = groups[name] / total;
    const dash = pct * circumference;
    const color = MUSCLE_COLORS[name] || '#888';
    const seg = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="12"
      stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"
      transform="rotate(-90 50 50)"/>`;
    offset += dash;
    return seg;
  }).join('');

  const legend = entries.map(([name]) => {
    const pct = Math.round((groups[name] / total) * 100);
    const color = MUSCLE_COLORS[name] || '#888';
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return `<div class="donut-legend-item">
      <span class="donut-legend-dot" style="background:${color}"></span>
      <span class="donut-legend-label">${label}</span>
      <span class="donut-legend-pct">${pct}%</span>
    </div>`;
  }).join('');

  return `
    <div class="summary-donut animate-in" style="animation-delay:350ms">
      <div class="summary-section-title">Distribucion por grupo</div>
      <div class="donut-wrap">
        <svg viewBox="0 0 100 100" class="donut-svg">
          ${segments}
        </svg>
        <div class="donut-legend">${legend}</div>
      </div>
    </div>
  `;
}

export function render(params) {
  const sesion = getSesionById(params.id);
  if (!sesion) {
    navigate('/');
    return '';
  }

  const usuario = sesion.usuario || getUsuarioActivo();
  const records = getPersonalRecords(usuario);
  const previous = getPreviousSesion(sesion);
  const volumen = Math.round(calcVolumenSesion(sesion));
  const totalEj = sesion.circuitos.reduce((sum, c) => sum + c.ejercicios.length, 0);

  return `
    <div class="summary-page">
      <div class="summary-header animate-in">
        <div class="summary-check">&#10003;</div>
        <div class="summary-title">Entrenamiento completado</div>
        <div class="summary-subtitle">${sesion.rutinaNombre}</div>
      </div>

      <div class="summary-stats">
        ${renderStatCard('Duracion', formatDuration(sesion.duracionMin), '', true)}
        ${renderStatCard('Volumen', volumen.toLocaleString(), 'kg')}
        ${renderStatCard('Ejercicios', totalEj)}
        ${renderStatCard('Circuitos', sesion.circuitos.length)}
      </div>

      <div class="summary-calories animate-in" style="animation-delay:250ms">
        <div class="summary-cal-row">
          <span class="summary-cal-label">🔥 Calorías</span>
          <div class="summary-cal-input-wrap">
            <input type="number" class="summary-cal-input" inputmode="numeric" placeholder="---"
                   value="${sesion.calorias || ''}" data-sesion-id="${sesion.id}" min="0">
            <span class="summary-cal-unit">kcal</span>
          </div>
        </div>
      </div>

      ${renderDonutChart(sesion)}
      ${renderComparison(sesion, previous)}
      ${renderPRs(sesion, records)}

      <div class="summary-actions animate-in" style="animation-delay:600ms">
        <button class="btn btn-primary btn-full" data-action="detail" data-id="${sesion.id}">Ver Detalle</button>
        <button class="btn btn-ghost btn-full" data-action="share" data-id="${sesion.id}">Compartir Resumen</button>
        <button class="btn btn-ghost btn-full" data-action="home">Volver al Inicio</button>
      </div>
    </div>
  `;
}

export function mount(params) {
  // Celebration haptic on summary load
  haptic.success();

  const app = document.getElementById('app');

  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    switch (btn.dataset.action) {
      case 'detail':
        navigate(`/sesion/${btn.dataset.id}`);
        break;
      case 'share': {
        const sesion = getSesionById(btn.dataset.id);
        if (!sesion) break;
        const vol = Math.round(calcVolumenSesion(sesion));
        const text = `${sesion.rutinaNombre} — ${sesion.duracionMin} min — ${vol.toLocaleString()} kg volumen 💪`;
        if (navigator.share) {
          navigator.share({ title: 'Entrenamiento', text }).catch(() => {});
        } else {
          navigator.clipboard.writeText(text).then(() => showToast('Copiado al portapapeles'));
        }
        break;
      }
      case 'home':
        navigate('/');
        break;
    }
  };

  const handleChange = (e) => {
    if (e.target.matches('.summary-cal-input')) {
      const sesionId = e.target.dataset.sesionId;
      const val = parseInt(e.target.value) || 0;
      const sesion = getSesionById(sesionId);
      if (sesion) {
        sesion.calorias = val > 0 ? val : undefined;
        updateSesion(sesion);
        showToast('Calorías guardadas');
      }
    }
  };

  app.addEventListener('click', handleClick);
  app.addEventListener('change', handleChange);

  return () => {
    app.removeEventListener('click', handleClick);
    app.removeEventListener('change', handleChange);
  };
}
