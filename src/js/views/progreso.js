import { getPersonalRecords, getUsuarioActivo } from '@/store.js';
import { icon } from '@js/icons.js';
import { renderMiniChart } from '@js/helpers/mini-chart.js';
import {
  getWeeklyStreak,
  getSessionsThisWeek,
  getPlannedDaysThisWeek,
  getGeneralStats,
  getTopExercises,
  getWeeklyActivity,
  getExerciseProgressData,
  getDaysSinceLastSession,
} from '@js/helpers/stats-helpers.js';

function renderQuickStats(usuario) {
  const stats = getGeneralStats(usuario);
  const streak = getWeeklyStreak(usuario);
  const thisWeek = getSessionsThisWeek(usuario);
  const planned = getPlannedDaysThisWeek(usuario);
  const daysSince = getDaysSinceLastSession(usuario);

  const lastLabel =
    daysSince === null ? 'Sin datos' : daysSince === 0 ? 'Hoy' : daysSince === 1 ? 'Ayer' : `Hace ${daysSince}d`;

  return `
    <div class="progress-quick-stats">
      <div class="progress-stat-card animate-in" style="animation-delay:100ms">
        <div class="progress-stat-value">${stats.totalSesiones}</div>
        <div class="progress-stat-label">Sesiones</div>
      </div>
      <div class="progress-stat-card animate-in" style="animation-delay:150ms">
        <div class="progress-stat-value">${streak}<span class="progress-stat-unit">sem</span></div>
        <div class="progress-stat-label">Racha</div>
      </div>
      <div class="progress-stat-card animate-in" style="animation-delay:200ms">
        <div class="progress-stat-value">${thisWeek}${planned > 0 ? `<span class="progress-stat-unit">/${planned}</span>` : ''}</div>
        <div class="progress-stat-label">Esta semana</div>
      </div>
      <div class="progress-stat-card animate-in" style="animation-delay:250ms">
        <div class="progress-stat-value progress-stat-value-sm">${lastLabel}</div>
        <div class="progress-stat-label">Ultimo</div>
      </div>
    </div>
  `;
}

function renderActivityGrid(usuario) {
  const activity = getWeeklyActivity(usuario, 12);
  if (activity.every((w) => w.count === 0)) return '';

  const maxCount = Math.max(...activity.map((w) => w.count), 1);

  const cells = activity
    .map((w, i) => {
      const level = w.count === 0 ? 0 : Math.min(Math.ceil((w.count / maxCount) * 3), 3);
      const d = new Date(w.weekStart);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      return `<div class="activity-cell level-${level} animate-in" style="animation-delay:${300 + i * 30}ms" data-action="activity-tap" data-week-label="Sem ${label}" data-count="${w.count}"></div>`;
    })
    .join('');

  return `
    <div class="progress-section animate-in" style="animation-delay:300ms">
      <div class="progress-section-title">Actividad (12 semanas)</div>
      <div class="activity-grid">${cells}</div>
      <div class="activity-legend">
        <span>Menos</span>
        <div class="activity-cell level-0"></div>
        <div class="activity-cell level-1"></div>
        <div class="activity-cell level-2"></div>
        <div class="activity-cell level-3"></div>
        <span>Mas</span>
      </div>
    </div>
  `;
}

function renderExerciseCards(usuario) {
  const exercises = getTopExercises(usuario, 6);
  if (exercises.length === 0) return '';

  const cards = exercises
    .map((ex, i) => {
      const arrow = ex.mejora > 0 ? icon.arrowUp : ex.mejora < 0 ? icon.arrowDown : '';
      const cls = ex.mejora > 0 ? 'progress-up' : ex.mejora < 0 ? 'progress-down' : '';
      const sign = ex.mejora > 0 ? '+' : '';

      return `
      <div class="exercise-progress-card animate-in" style="animation-delay:${400 + i * 60}ms">
        <div class="exercise-progress-info">
          <div class="exercise-progress-name">${ex.nombre}</div>
          <div class="exercise-progress-detail">
            <span class="exercise-progress-max">${ex.maxPeso} kg</span>
            ${ex.mejora !== 0 ? `<span class="exercise-progress-trend ${cls}">${arrow} ${sign}${ex.mejora} kg</span>` : ''}
          </div>
        </div>
        <canvas class="exercise-sparkline" data-exercise="${ex.nombre}" width="120" height="48"></canvas>
      </div>
    `;
    })
    .join('');

  return `
    <div class="progress-section animate-in" style="animation-delay:400ms">
      <div class="progress-section-title">Progreso por ejercicio</div>
      ${cards}
    </div>
  `;
}

function renderRecentPRs(usuario) {
  const records = getPersonalRecords(usuario);
  const entries = Object.entries(records);
  if (entries.length === 0) return '';

  // Sort by most recent date
  const sorted = entries
    .filter(([, r]) => r.maxPeso > 0)
    .sort((a, b) => new Date(b[1].fecha) - new Date(a[1].fecha))
    .slice(0, 5);

  if (sorted.length === 0) return '';

  const cards = sorted
    .map(
      ([nombre, r], i) => `
    <div class="pr-list-item animate-in" style="animation-delay:${500 + i * 50}ms">
      <span class="pr-list-icon">&#127942;</span>
      <span class="pr-list-name">${nombre}</span>
      <span class="pr-list-value">${r.maxPeso} kg</span>
    </div>
  `,
    )
    .join('');

  return `
    <div class="progress-section animate-in" style="animation-delay:500ms">
      <div class="progress-section-title">Records personales</div>
      ${cards}
    </div>
  `;
}

export function render() {
  const usuario = getUsuarioActivo();

  return `
    <div class="progreso-page">
      <div class="progreso-header animate-in">
        <div class="progreso-title">Progreso</div>
      </div>
      ${renderQuickStats(usuario)}
      ${renderActivityGrid(usuario)}
      ${renderExerciseCards(usuario)}
      ${renderRecentPRs(usuario)}
    </div>
  `;
}

export function mount() {
  const usuario = getUsuarioActivo();
  const app = document.getElementById('app');

  // Render sparklines for each exercise card
  document.querySelectorAll('.exercise-sparkline').forEach((canvas) => {
    const nombre = canvas.dataset.exercise;
    const data = getExerciseProgressData(usuario, nombre);
    if (data.length >= 2) {
      renderMiniChart(
        canvas,
        data.map((d) => d.peso),
        { labels: data.map((d) => d.fecha) },
      );
    }
  });

  // Activity grid tap → floating tooltip
  let tooltip = null;
  const handleClick = (e) => {
    const cell = e.target.closest('[data-action="activity-tap"]');
    if (!cell) {
      if (tooltip) { tooltip.remove(); tooltip = null; }
      return;
    }
    const label = cell.dataset.weekLabel;
    const count = cell.dataset.count;
    if (tooltip) tooltip.remove();
    tooltip = document.createElement('div');
    tooltip.className = 'activity-tooltip fade-in';
    tooltip.textContent = `${label} — ${count} sesion${count !== '1' ? 'es' : ''}`;
    const rect = cell.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 8}px`;
    document.body.appendChild(tooltip);
    setTimeout(() => { if (tooltip) { tooltip.remove(); tooltip = null; } }, 2000);
  };

  app.addEventListener('click', handleClick);

  return () => {
    app.removeEventListener('click', handleClick);
    if (tooltip) tooltip.remove();
  };
}
