import { getSesionById, getPersonalRecords, calcVolumenSesion, getPreviousSesion, getUsuarioActivo } from '@/store.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';
import { showToast } from '@js/components/toast.js';

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
    for (const ej of c.ejercicios) {
      const rec = records[ej.nombre];
      // PR if current peso matches the all-time max and this is from this session
      if (rec && ej.pesoRealKg >= rec.maxPeso && ej.pesoRealKg > 0) {
        prs.push({ nombre: ej.nombre, peso: ej.pesoRealKg });
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

  app.addEventListener('click', handleClick);

  return () => {
    app.removeEventListener('click', handleClick);
  };
}
