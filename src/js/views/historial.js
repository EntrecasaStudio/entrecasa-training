import { getSesiones, getUsuarioActivo, calcVolumenSesion } from '@/store.js';
import { navigate } from '@/router.js';
import { renderNavBar } from '@js/components/nav-bar.js';
import { iconLg } from '@js/icons.js';

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function getMonthLabel(isoStr) {
  const d = new Date(isoStr);
  const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getUniqueMuscleGroups(sesion) {
  const groups = new Set();
  for (const c of sesion.circuitos) {
    if (c.grupoMuscular) groups.add(c.grupoMuscular);
  }
  return [...groups];
}

const TAG_CLASS = {
  Core: 'tag-core',
  Piernas: 'tag-piernas',
  Pecho: 'tag-pecho',
  Espalda: 'tag-espalda',
  Brazos: 'tag-brazos',
  Gluteos: 'tag-gluteos',
  Hombros: 'tag-hombros',
};

let cardIdx = 0;

function renderSesionCard(sesion) {
  const totalEjercicios = sesion.circuitos.reduce((sum, c) => sum + c.ejercicios.length, 0);
  const volumen = Math.round(calcVolumenSesion(sesion));
  const groups = getUniqueMuscleGroups(sesion);
  const delay = cardIdx++ * 60;

  const tags = groups
    .map((g) => `<span class="tag tag-sm ${TAG_CLASS[g] || ''}">${g}</span>`)
    .join('');

  return `
    <div class="card sesion-card animate-in" style="animation-delay:${delay}ms" data-action="detail" data-id="${sesion.id}">
      <div class="sesion-card-top">
        <div class="sesion-card-date">${formatDate(sesion.fecha)}</div>
        <div class="sesion-card-tags">${tags}</div>
      </div>
      <div class="sesion-card-name">${sesion.rutinaNombre}</div>
      <div class="sesion-card-stats">
        <span><span class="sesion-card-stat-value">${sesion.duracionMin}</span> min</span>
        <span><span class="sesion-card-stat-value">${volumen.toLocaleString()}</span> kg vol</span>
        <span><span class="sesion-card-stat-value">${totalEjercicios}</span> ej</span>
        <span><span class="sesion-card-stat-value">${sesion.circuitos.length}</span> circ</span>
      </div>
    </div>
  `;
}

export function render() {
  cardIdx = 0;
  const usuario = getUsuarioActivo();
  const sesiones = getSesiones().filter((s) => !s.usuario || s.usuario === usuario);

  if (sesiones.length === 0) {
    return `
      <div class="view-header">
        <div class="view-header-title">Historial</div>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">${iconLg('barChart')}</div>
        <div class="empty-state-text">Aun no tienes entrenamientos registrados.<br>Inicia una rutina para ver tu historial.</div>
        <a href="#/" class="btn btn-primary" style="margin-top:var(--space-md)">Ir a rutinas</a>
      </div>
      ${renderNavBar('historial')}
    `;
  }

  // Group by month
  let currentMonth = '';
  let html = '';

  for (const sesion of sesiones) {
    const month = getMonthLabel(sesion.fecha);
    if (month !== currentMonth) {
      currentMonth = month;
      html += `<div class="historial-month-header animate-in" style="animation-delay:${cardIdx * 60}ms">${month}</div>`;
    }
    html += renderSesionCard(sesion);
  }

  return `
    <div class="view-header">
      <div class="view-header-title">Historial</div>
    </div>
    ${html}
    ${renderNavBar('historial')}
  `;
}

export function mount() {
  const app = document.getElementById('app');

  const handleClick = (e) => {
    const card = e.target.closest('[data-action="detail"]');
    if (card) {
      navigate(`/sesion/${card.dataset.id}`);
    }
  };

  app.addEventListener('click', handleClick);

  return () => {
    app.removeEventListener('click', handleClick);
  };
}
