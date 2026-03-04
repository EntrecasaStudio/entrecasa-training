import {
  getRutinas,
  getWorkoutActivo,
  getUsuarioActivo,
  getRutinaHoy,
  getProximoEntrenamiento,
  getPlanSemanal,
  setPlanDia,
} from '@/store.js';
import { navigate, refreshCurrentTab } from '@/router.js';
import { icon, iconLg } from '@js/icons.js';
import {
  DIAS_LABEL,
  DIAS_ABREV,
  DIAS_ORDEN,
  renderTags,
  renderLastDone,
  showPreview,
  showDayAssignmentModal,
  getDisplayName,
} from '@js/helpers/rutina-helpers.js';
import { getWeeklyStreak, getSessionsThisWeek, getPlannedDaysThisWeek, getDaysSinceLastSession } from '@js/helpers/stats-helpers.js';
import { getCurrentUser, logout } from '@js/services/firebase.js';

// ── Greeting ────────────────────────────────

function getGreeting(nombre) {
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos dias' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${saludo}, ${nombre}`;
}

function renderQuickStatsStrip(usuario) {
  const streak = getWeeklyStreak(usuario);
  const thisWeek = getSessionsThisWeek(usuario);
  const planned = getPlannedDaysThisWeek(usuario);
  const daysSince = getDaysSinceLastSession(usuario);

  const lastLabel = daysSince === null ? '--' : daysSince === 0 ? 'Hoy' : daysSince === 1 ? 'Ayer' : `${daysSince}d`;

  return `
    <div class="home-quick-stats animate-in" style="animation-delay:50ms">
      <div class="home-quick-stat">
        <span class="home-quick-stat-value">${streak}</span>
        <span class="home-quick-stat-label">sem racha</span>
      </div>
      <div class="home-quick-stat-divider"></div>
      <div class="home-quick-stat">
        <span class="home-quick-stat-value">${thisWeek}${planned > 0 ? `/${planned}` : ''}</span>
        <span class="home-quick-stat-label">esta sem</span>
      </div>
      <div class="home-quick-stat-divider"></div>
      <div class="home-quick-stat">
        <span class="home-quick-stat-value">${lastLabel}</span>
        <span class="home-quick-stat-label">ultimo</span>
      </div>
    </div>
  `;
}

// ── Week planner ─────────────────────────────

function renderWeekPlanner(usuario) {
  const hoy = new Date().getDay();
  const plan = getPlanSemanal(usuario);
  const rutinas = getRutinas().filter((r) => r.usuario === usuario);

  const circles = DIAS_ORDEN.map((d) => {
    const tipo = plan[d] || '';
    const isToday = d === hoy;
    const iconInner = tipo === 'gimnasio' ? '🏋️' : tipo === 'cross' ? '🏃' : '';
    const pulseClass = isToday && tipo ? 'pulse-today' : '';

    // Show assigned routine name
    const assigned = tipo ? rutinas.find((r) => r.diaSemana === d) : null;
    const rutLabel = assigned ? `<span class="day-circle-rutina">${assigned.nombre}</span>` : '';

    return `
      <div class="day-circle">
        <button class="day-circle-btn ${tipo} ${pulseClass}" data-action="toggle-day" data-day="${d}">
          ${iconInner}
        </button>
        <span class="day-circle-label ${isToday ? 'today' : ''}">${DIAS_ABREV[d]}</span>
        ${rutLabel}
      </div>
    `;
  }).join('');

  return `
    <div class="week-planner">${circles}</div>
    <div class="week-planner-legend">
      <span><span class="legend-dot gimnasio"></span>Gimnasio</span>
      <span><span class="legend-dot cross"></span>Cross</span>
    </div>
  `;
}

// ── Entrenamiento hero (training day) ────────

function renderEntrenoHero(rutinaHoy) {
  const numCircuitos = rutinaHoy.circuitos.length;
  const numEjercicios = rutinaHoy.circuitos.reduce((sum, c) => sum + c.ejercicios.length, 0);

  return `
    <div class="entreno-hero">
      <div class="entreno-label">Hoy</div>
      <div class="entreno-routine-name">${rutinaHoy.nombre}</div>
      <div class="entreno-tags">${renderTags(rutinaHoy)}</div>
      <div class="entreno-meta">
        ${numCircuitos} circuitos &middot; ${numEjercicios} ejercicios &middot; ${renderLastDone(rutinaHoy)}
      </div>
      <button class="entreno-cta glow-pulse" data-action="start" data-id="${rutinaHoy.id}">
        <span class="entreno-cta-icon">${iconLg('dumbbell', 48)}</span>
      </button>
      <div class="entreno-cta-label">Iniciar entrenamiento</div>
    </div>
  `;
}

// ── Rest day ─────────────────────────────────

function renderRestDay(proximo) {
  return `
    <div class="entreno-hero">
      <div class="rest-day-icon">${iconLg('dumbbell')}</div>
      <div class="rest-day-title">Hoy descansas</div>
      ${
        proximo
          ? `<div class="rest-day-next">
              Proximo: <strong>${proximo.rutina.nombre}</strong> &middot; ${proximo.diaNombre}
            </div>`
          : ''
      }
    </div>
  `;
}

// ── Weekly routines mini-cards ────────────────

function renderWeeklyRoutines(usuario) {
  const hoy = new Date().getDay();
  const plan = getPlanSemanal(usuario);
  const rutinas = getRutinas().filter((r) => r.usuario === usuario);

  // Build cards for each planned day (in order Lun→Dom)
  const cards = DIAS_ORDEN
    .filter((d) => plan[d])
    .map((d) => {
      const tipo = plan[d];
      const isToday = d === hoy;

      // Find routine: programmed for this day, or first library match
      const rut =
        rutinas.find((r) => r.diaSemana === d) ||
        rutinas.find((r) => r.tipo === tipo && r.diaSemana == null);

      const nombre = rut ? getDisplayName(rut) : (tipo === 'gimnasio' ? 'Gimnasio' : 'Cross Training');
      const meta = rut ? renderLastDone(rut) : '';
      const tipoLabel = tipo === 'gimnasio' ? 'Gym' : 'Cross';
      const startBtn = rut
        ? `<button class="btn-icon-action" data-action="start" data-id="${rut.id}">${icon.play}</button>`
        : '';

      const cardIdx = DIAS_ORDEN.filter((dd) => plan[dd]).indexOf(d);

      return `
        <div class="mini-card animate-in ${isToday ? 'today' : ''}" style="animation-delay:${cardIdx * 60}ms" ${rut ? `data-action="preview-routine" data-id="${rut.id}"` : ''}>
          <div class="mini-card-left">
            <div class="mini-card-day">${DIAS_LABEL[d]} · ${tipoLabel}</div>
            <div class="mini-card-name">${nombre}</div>
            ${meta ? `<div class="mini-card-meta">${meta}</div>` : ''}
          </div>
          <div class="mini-card-actions">
            ${startBtn}
          </div>
        </div>
      `;
    })
    .join('');

  if (!cards) return '';

  return `
    <div class="section-header">
      <span class="section-title">Esta semana</span>
    </div>
    ${cards}
  `;
}

// ── Render ────────────────────────────────────

export function render() {
  const usuario = getUsuarioActivo();
  const workoutActivo = getWorkoutActivo();
  const rutinaHoy = getRutinaHoy(usuario);
  const proximo = getProximoEntrenamiento(usuario);
  const firebaseUser = getCurrentUser();

  // Active workout banner (only show for current user)
  const isMyWorkout = workoutActivo && (!workoutActivo.usuario || workoutActivo.usuario === usuario);
  const banner = isMyWorkout
    ? `<div class="workout-banner" data-action="resume-workout">
        <span class="workout-banner-icon">${icon.dumbbell}</span>
        <div class="workout-banner-text">
          <div class="workout-banner-title">Entrenamiento en curso</div>
          <div class="workout-banner-sub">${workoutActivo.rutinaNombre}</div>
        </div>
        <span class="workout-banner-arrow">${icon.arrowRight}</span>
      </div>`
    : '';

  // User header (replaces the old Lean/Nat toggle)
  const displayName = firebaseUser?.displayName?.split(' ')[0] || usuario;
  const avatarHtml = firebaseUser?.photoURL
    ? `<img class="user-avatar" src="${firebaseUser.photoURL}" alt="" referrerpolicy="no-referrer" />`
    : `<div class="user-avatar-placeholder">${displayName[0] || '?'}</div>`;
  const userHeader = `
    <div class="user-header">
      <div class="user-header-info">
        ${avatarHtml}
      </div>
      <button class="btn-icon-action" data-action="logout" title="Cerrar sesion">
        ${icon.logOut}
      </button>
    </div>
  `;

  // Greeting
  const greeting = `<div class="home-greeting animate-in">${getGreeting(displayName)}</div>`;

  // Quick stats strip
  const quickStats = renderQuickStatsStrip(usuario);

  // Week planner
  const planner = renderWeekPlanner(usuario);

  // Hero section: training day or rest day
  const hero = rutinaHoy && !isMyWorkout ? renderEntrenoHero(rutinaHoy) : '';
  const rest = !rutinaHoy && !isMyWorkout ? renderRestDay(proximo) : '';

  // Weekly routines
  const weekly = renderWeeklyRoutines(usuario);

  return `
    ${userHeader}
    ${greeting}
    ${planner}
    ${quickStats}
    ${banner}
    ${hero}
    ${rest}
    ${weekly}
  `;
}

// ── Mount ─────────────────────────────────────

export function mount() {
  const app = document.getElementById('app');

  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
      case 'logout':
        if (confirm('¿Cerrar sesion?')) {
          logout();
        }
        break;
      case 'start':
      case 'preview-routine':
        showPreview(id);
        break;
      case 'resume-workout': {
        const workout = getWorkoutActivo();
        if (workout) navigate(`/workout/${workout.rutinaId}`);
        break;
      }
      case 'toggle-day': {
        const usuario = getUsuarioActivo();
        const dia = Number(btn.dataset.day);
        const plan = getPlanSemanal(usuario);
        const current = plan[dia] || '';

        if (current === '') {
          // Empty day → set to gimnasio
          setPlanDia(usuario, dia, 'gimnasio');
          refreshCurrentTab();
        } else {
          // Day has type → show assignment modal
          showDayAssignmentModal(usuario, dia, current, () => refreshCurrentTab());
        }
        break;
      }
    }
  };

  app.addEventListener('click', handleClick);

  return () => {
    app.removeEventListener('click', handleClick);
  };
}
