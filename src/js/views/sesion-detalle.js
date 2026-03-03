import { getSesionById, getSesionesByRutina, getPersonalRecords, calcVolumenSesion, getUsuarioActivo } from '@/store.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';

const TAG_CLASS = {
  Core: 'tag-core',
  Piernas: 'tag-piernas',
  Pecho: 'tag-pecho',
  Espalda: 'tag-espalda',
  Brazos: 'tag-brazos',
  Gluteos: 'tag-gluteos',
  Hombros: 'tag-hombros',
};

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getProgressIcon(current, previous) {
  if (previous == null) return '';
  if (current > previous) return `<span class="progress-up">${icon.arrowUp} +${(current - previous)}</span>`;
  if (current < previous) return `<span class="progress-down">${icon.arrowDown} -${(previous - current)}</span>`;
  return `<span class="progress-same">${icon.equal}</span>`;
}

function findPreviousSession(sesion) {
  const all = getSesionesByRutina(sesion.rutinaId);
  const idx = all.findIndex((s) => s.id === sesion.id);
  return idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
}

function renderStatsStrip(sesion) {
  const volumen = Math.round(calcVolumenSesion(sesion));
  const totalEj = sesion.circuitos.reduce((sum, c) => sum + c.ejercicios.length, 0);

  return `
    <div class="detalle-stats-strip animate-in">
      <div class="detalle-stat">
        <div class="detalle-stat-value">${sesion.duracionMin}</div>
        <div class="detalle-stat-label">min</div>
      </div>
      <div class="detalle-stat-divider"></div>
      <div class="detalle-stat">
        <div class="detalle-stat-value">${volumen.toLocaleString()}</div>
        <div class="detalle-stat-label">kg vol</div>
      </div>
      <div class="detalle-stat-divider"></div>
      <div class="detalle-stat">
        <div class="detalle-stat-value">${totalEj}</div>
        <div class="detalle-stat-label">ejercicios</div>
      </div>
      <div class="detalle-stat-divider"></div>
      <div class="detalle-stat">
        <div class="detalle-stat-value">${sesion.circuitos.length}</div>
        <div class="detalle-stat-label">circuitos</div>
      </div>
    </div>
  `;
}

function renderCircuito(circ, circIdx, prevCirc, records) {
  const ejercicios = circ.ejercicios
    .map((ej, ejIdx) => {
      const prevEj = prevCirc?.ejercicios?.[ejIdx];
      const pesoProgress = prevEj ? getProgressIcon(ej.pesoRealKg, prevEj.pesoRealKg) : '';
      const repsProgress = prevEj ? getProgressIcon(ej.repsReal, prevEj.repsReal) : '';

      // PR badge: if this exercise's weight matches the all-time record
      const rec = records[ej.nombre];
      const isPR = rec && ej.pesoRealKg > 0 && ej.pesoRealKg >= rec.maxPeso;
      const prBadge = isPR ? '<span class="pr-badge">PR</span>' : '';

      return `
        <div class="ejercicio-detalle-row">
          <div class="ejercicio-detalle-name">${ej.nombre} ${prBadge}</div>
          <div class="ejercicio-detalle-values">
            <div class="ejercicio-detalle-col">
              <div class="ejercicio-detalle-col-label">Reps</div>
              <div class="ejercicio-detalle-col-value">${ej.repsReal} ${repsProgress}</div>
            </div>
            <div class="ejercicio-detalle-col">
              <div class="ejercicio-detalle-col-label">Peso</div>
              <div class="ejercicio-detalle-col-value">${ej.pesoRealKg} kg ${pesoProgress}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="card circuito-detalle-card animate-in" style="animation-delay:${100 + circIdx * 80}ms">
      <div class="circuito-detalle-header">
        <span class="tag ${TAG_CLASS[circ.grupoMuscular] || ''}">${circ.grupoMuscular}</span>
      </div>
      ${ejercicios}
    </div>
  `;
}

export function render(params) {
  const sesion = getSesionById(params.id);
  if (!sesion) {
    navigate('/historial');
    return '';
  }

  const prev = findPreviousSession(sesion);
  const usuario = sesion.usuario || getUsuarioActivo();
  const records = getPersonalRecords(usuario);

  const circuitos = sesion.circuitos
    .map((c, i) => renderCircuito(c, i, prev?.circuitos?.[i], records))
    .join('');

  return `
    <div class="view-header">
      <button class="btn-back" data-action="back">${icon.back}</button>
      <div class="view-header-title">${sesion.rutinaNombre}</div>
    </div>

    <div class="sesion-detalle-fecha animate-in">${formatDate(sesion.fecha)}</div>

    ${renderStatsStrip(sesion)}

    ${prev ? '<p class="detalle-comparison-note animate-in" style="animation-delay:80ms">Comparado con sesion anterior</p>' : ''}

    ${circuitos}
  `;
}

export function mount() {
  const app = document.getElementById('app');

  const handleClick = (e) => {
    if (e.target.closest('[data-action="back"]')) {
      navigate('/historial');
    }
  };

  app.addEventListener('click', handleClick);

  return () => {
    app.removeEventListener('click', handleClick);
  };
}
