import {
  getRutinas,
  getWorkoutActivo,
  getUsuarioActivo,
  setUsuarioActivo,
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
import { getWeeklyStreak, getSessionsThisWeek, getPlannedDaysThisWeek, getDaysSinceLastSession, getMonthActivity } from '@js/helpers/stats-helpers.js';
import { getCurrentUser, auth, logout, switchAccount } from '@js/services/firebase.js';
import { showToast } from '@js/components/toast.js';

// ── Month calendar state ────────────────────
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const CAL_WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function renderMonthCalendar(usuario) {
  const activeDays = getMonthActivity(usuario, calYear, calMonth);
  const today = new Date();
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  // First day of month (0=Sun, convert to Mon-based: 0=Mon)
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon-based offset
  const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  // Weekday headers
  const weekHeaders = CAL_WEEKDAYS.map((d) => `<div class="cal-weekday">${d}</div>`).join('');

  // Calendar cells
  let cells = '';

  // Previous month filler days
  for (let i = startOffset - 1; i >= 0; i--) {
    cells += `<div class="cal-day cal-day--outside">${prevMonthDays - i}</div>`;
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const isToday = isCurrentMonth && d === today.getDate();
    const isActive = activeDays.has(d);
    let cls = 'cal-day';
    if (isToday) cls += ' cal-day--today';
    if (isActive) cls += ' cal-day--active';
    cells += `<div class="${cls}">${d}</div>`;
  }

  // Next month filler to complete grid
  const totalCells = startOffset + totalDays;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= remaining; d++) {
    cells += `<div class="cal-day cal-day--outside">${d}</div>`;
  }

  return `
    <div class="month-calendar animate-in" id="month-calendar">
      <div class="cal-header">
        <button class="cal-nav-btn" data-action="cal-prev">${icon.chevronLeft || '‹'}</button>
        <span class="cal-header-title">${MONTH_NAMES[calMonth]} ${calYear}</span>
        <button class="cal-nav-btn" data-action="cal-next">${icon.chevronRight || '›'}</button>
      </div>
      <div class="cal-grid">
        ${weekHeaders}
        ${cells}
      </div>
    </div>
  `;
}

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
      <button class="entreno-cta" data-action="start" data-id="${rutinaHoy.id}">
        <span class="entreno-cta-icon">${iconLg('kettlebell', 48)}</span>
      </button>
      <div class="entreno-cta-label">Iniciar entrenamiento</div>
    </div>
  `;
}

// ── Rest day ─────────────────────────────────

function renderRestDay(proximo) {
  return `
    <div class="entreno-hero">
      <div class="rest-day-icon">${iconLg('kettlebell')}</div>
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
        <span class="workout-banner-icon">${icon.kettlebell}</span>
        <div class="workout-banner-text">
          <div class="workout-banner-title">Entrenamiento en curso</div>
          <div class="workout-banner-sub">${workoutActivo.rutinaNombre}</div>
        </div>
        <span class="workout-banner-arrow">${icon.arrowRight}</span>
      </div>`
    : '';

  // User header: Firebase mode (avatar + switch/logout) or local mode (Lean/Nat toggle)
  const displayName = firebaseUser?.displayName?.split(' ')[0] || usuario;
  let userHeader = '';
  if (firebaseUser) {
    const avatarHtml = firebaseUser.photoURL
      ? `<img class="user-avatar" src="${firebaseUser.photoURL}" alt="" referrerpolicy="no-referrer" />`
      : `<div class="user-avatar-placeholder">${displayName[0] || '?'}</div>`;
    userHeader = `
      <div class="user-header">
        <button class="user-header-info" data-action="switch-account" title="Cambiar cuenta">
          ${avatarHtml}
          <span class="user-switch-hint">${icon.chevronDown}</span>
        </button>
        <div class="user-header-actions">
          <button class="btn-icon-action" data-action="logout" title="Cerrar sesion">
            ${icon.logOut}
          </button>
        </div>
      </div>
    `;
  } else if (!auth) {
    // Local mode — Lean / Nat toggle with sliding pill
    userHeader = `
      <div class="user-toggle" data-active="${usuario === 'Nat' ? '1' : '0'}">
        <button class="user-toggle-btn ${usuario === 'Lean' ? 'active' : ''}" data-action="switch-user" data-user="Lean">Lean</button>
        <button class="user-toggle-btn ${usuario === 'Nat' ? 'active' : ''}" data-action="switch-user" data-user="Nat">Nat</button>
      </div>
    `;
  }

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

  // Month calendar
  const calendar = renderMonthCalendar(usuario);

  return `
    ${userHeader}
    ${greeting}
    ${planner}
    ${quickStats}
    ${banner}
    ${hero}
    ${rest}
    ${weekly}
    ${calendar}
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
      case 'switch-user': {
        const newUser = btn.dataset.user;
        const toggle = document.querySelector('.user-toggle');
        if (toggle) {
          // Animate pill slide
          toggle.dataset.active = newUser === 'Nat' ? '1' : '0';
          toggle.querySelectorAll('.user-toggle-btn').forEach((b) => {
            b.classList.toggle('active', b.dataset.user === newUser);
          });
          // Wait for animation then navigate
          setTimeout(() => {
            setUsuarioActivo(newUser);
            navigate('/');
          }, 250);
        } else {
          setUsuarioActivo(newUser);
          navigate('/');
        }
        break;
      }
      case 'switch-account':
        switchAccount().catch((err) => {
          // User closed popup — not an error
          if (err.code !== 'auth/popup-closed-by-user') {
            showToast('Error al cambiar cuenta');
            console.warn('[home] switchAccount error:', err);
          }
        });
        break;
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
      case 'cal-prev':
      case 'cal-next': {
        if (action === 'cal-prev') {
          calMonth--;
          if (calMonth < 0) { calMonth = 11; calYear--; }
        } else {
          calMonth++;
          if (calMonth > 11) { calMonth = 0; calYear++; }
        }
        const calEl = document.getElementById('month-calendar');
        if (calEl) {
          const usuario = getUsuarioActivo();
          calEl.outerHTML = renderMonthCalendar(usuario);
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
