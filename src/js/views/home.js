import {
  getRutinas,
  getWorkoutActivo,
  getUsuarioActivo,
  getRutinaHoy,
  getProximoEntrenamiento,
  getPlanSemanal,
  setPlanDia,
  clearRutinaDelDia,
} from '@/store.js';
import { navigate } from '@/router.js';
import { icon, iconLg } from '@js/icons.js';
import {
  renderTags,
  renderLastDone,
  showPreview,
  showDayAssignmentModal,
} from '@js/helpers/rutina-helpers.js';
import {
  getWeeklyStreak,
  getSessionsThisWeek,
  getPlannedDaysThisWeek,
  getDaysSinceLastSession,
  getMonthActivity,
  getSessionsForDate,
  getPlannedRoutineForDate,
  getMonthPlannedDays,
} from '@js/helpers/stats-helpers.js';
import { getCurrentUser } from '@js/services/firebase.js';
import { calcVolumenSesion } from '@/store.js';

// ── Calendar state ──────────────────────────
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calExpanded = false;
let selectedDate = new Date();

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const CAL_WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES_LONG = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const m1 = MONTH_NAMES[monday.getMonth()].substring(0, 3);
  const m2 = MONTH_NAMES[sunday.getMonth()].substring(0, 3);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${m1} ${monday.getDate()} - ${sunday.getDate()}, ${monday.getFullYear()}`;
  }
  return `${m1} ${monday.getDate()} - ${m2} ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

// ── Week strip ──────────────────────────────

function renderWeekStrip(usuario) {
  const today = new Date();
  const monday = getMonday(selectedDate);
  const USERS = ['Lean', 'Nat'];

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    const isToday = isSameDay(d, today);
    const isSelected = isSameDay(d, selectedDate);
    const isPast = d < startOfDay(today) && !isToday;

    // Build dual dots (one per user)
    let dotsHtml = '<span class="cal-strip-dots">';
    for (const u of USERS) {
      const plan = getPlanSemanal(u);
      const sessions = getSessionsForDate(u, d.getFullYear(), d.getMonth(), d.getDate());
      const hasCompleted = sessions.length > 0;
      const tipo = plan[dow] || '';
      const hasPlanned = !!tipo && !isPast;

      let dotCls = 'cal-strip-dot-user';
      if (hasCompleted) {
        dotCls += ` cal-strip-dot-user--done cal-strip-dot-user--${u.toLowerCase()}`;
      } else if (hasPlanned) {
        dotCls += ` cal-strip-dot-user--plan cal-strip-dot-user--${u.toLowerCase()}`;
      }
      dotsHtml += `<span class="${dotCls}"></span>`;
    }
    dotsHtml += '</span>';

    let cls = 'cal-strip-day';
    if (isToday) cls += ' cal-strip-day--today';
    if (isSelected) cls += ' cal-strip-day--selected';

    days.push(`
      <div class="${cls}" data-action="cal-select-day" data-cal-date="${dateToStr(d)}">
        <span class="cal-strip-weekday">${CAL_WEEKDAYS[i]}</span>
        <span class="cal-strip-number">${d.getDate()}</span>
        ${dotsHtml}
      </div>
    `);
  }

  return `<div class="cal-strip">${days.join('')}</div>`;
}

// ── Month grid ──────────────────────────────

function renderMonthGrid(usuario) {
  const today = new Date();
  const USERS = ['Lean', 'Nat'];
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  // Gather per-user activity & plans
  const userData = USERS.map((u) => ({
    name: u,
    activeDays: getMonthActivity(u, calYear, calMonth),
    plannedDays: getMonthPlannedDays(u, calYear, calMonth),
  }));

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  const weekHeaders = CAL_WEEKDAYS.map((d) => `<div class="cal-month-weekday">${d}</div>`).join('');

  let cells = '';

  // Previous month filler
  for (let i = startOffset - 1; i >= 0; i--) {
    cells += `<div class="cal-month-day cal-month-day--outside">${prevMonthDays - i}</div>`;
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const isToday = isCurrentMonth && d === today.getDate();
    const isSelected = selectedDate.getFullYear() === calYear && selectedDate.getMonth() === calMonth && selectedDate.getDate() === d;
    const dateObj = new Date(calYear, calMonth, d);
    const isPast = dateObj < startOfDay(today) && !isToday;

    let cls = 'cal-month-day';
    if (isToday) cls += ' cal-month-day--today';
    if (isSelected) cls += ' cal-month-day--selected';

    // Build dual dots (one per user)
    let dotsHtml = '<span class="cal-month-dots">';
    for (const ud of userData) {
      const hasSession = ud.activeDays.has(d);
      const plannedTipo = ud.plannedDays.get(d);
      let dotCls = 'cal-month-dot-user';
      if (hasSession) {
        dotCls += ` cal-month-dot-user--done cal-month-dot-user--${ud.name.toLowerCase()}`;
      } else if (plannedTipo && !isPast) {
        dotCls += ` cal-month-dot-user--plan cal-month-dot-user--${ud.name.toLowerCase()}`;
      }
      dotsHtml += `<span class="${dotCls}"></span>`;
    }
    dotsHtml += '</span>';

    cells += `<div class="${cls}" data-action="cal-select-day" data-cal-date="${dateToStr(dateObj)}">${d}${dotsHtml}</div>`;
  }

  // Next month filler
  const totalCells = startOffset + totalDays;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= remaining; d++) {
    cells += `<div class="cal-month-day cal-month-day--outside">${d}</div>`;
  }

  return `
    <div class="cal-month-grid">
      ${weekHeaders}
      ${cells}
    </div>
  `;
}

// ── Unified calendar ────────────────────────

function renderUnifiedCalendar(usuario) {
  const today = new Date();
  const isOnCurrentPeriod = calExpanded
    ? (calYear === today.getFullYear() && calMonth === today.getMonth())
    : isSameDay(getMonday(selectedDate), getMonday(today)) || isSameDay(selectedDate, today);

  // Title: week range or month name
  const monday = getMonday(selectedDate);
  const title = calExpanded
    ? `${MONTH_NAMES[calMonth]} ${calYear}`
    : formatDateRange(monday);

  const todayBtn = !isOnCurrentPeriod
    ? `<button class="cal-today-btn" data-action="cal-today">Hoy</button>`
    : '';

  const body = calExpanded
    ? renderMonthGrid(usuario)
    : renderWeekStrip(usuario);

  return `
    <div class="cal-unified animate-in" id="cal-unified">
      <div class="cal-unified-header">
        <button class="cal-nav-btn" data-action="cal-prev-period">${icon.chevronLeft || '‹'}</button>
        <button class="cal-unified-title" data-action="cal-toggle-expand">
          <span>${title}</span>
          <span class="cal-expand-chevron ${calExpanded ? 'expanded' : ''}">${icon.chevronDown || '▾'}</span>
        </button>
        ${todayBtn}
        <button class="cal-nav-btn" data-action="cal-next-period">${icon.chevronRight || '›'}</button>
      </div>
      ${body}
    </div>
  `;
}

// ── Day detail panel ────────────────────────

function renderUserDayRow(u, selectedDate, isToday, isPast, dow, isActive) {
  const sessions = getSessionsForDate(u, selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const planned = getPlannedRoutineForDate(u, selectedDate);
  const initial = u.charAt(0).toUpperCase();

  // Status badge
  let statusHtml = '';
  if (sessions.length > 0) {
    const s = sessions[0];
    const dur = s.duracionMin ? ` &middot; ${s.duracionMin}min` : '';
    statusHtml = `
      <div class="cal-shared-row-info">
        <span class="cal-shared-status cal-shared-status--done">&#10003; ${s.rutinaNombre}${dur}</span>
      </div>`;
  } else if (planned && planned.routine) {
    statusHtml = `
      <div class="cal-shared-row-info">
        <span class="cal-shared-status">${planned.routine.nombre}</span>
        <span class="cal-shared-tipo ${planned.tipo}">${planned.tipo === 'cross' ? 'Cross' : 'Gym'}</span>
      </div>`;
  } else if (planned && !planned.routine) {
    statusHtml = `
      <div class="cal-shared-row-info">
        <span class="cal-shared-status cal-shared-status--muted">${planned.tipo === 'cross' ? 'Cross' : 'Gimnasio'} — sin rutina</span>
      </div>`;
  } else {
    statusHtml = `
      <div class="cal-shared-row-info">
        <span class="cal-shared-status cal-shared-status--muted">Descanso</span>
      </div>`;
  }

  // Actions (only for active user)
  let actionHtml = '';
  if (isActive) {
    if (sessions.length > 0) {
      actionHtml = `<button class="btn btn-ghost btn-xs" data-action="cal-view-session" data-id="${sessions[0].id}">Ver</button>`;
    } else if (planned && planned.routine && (isToday || !isPast)) {
      actionHtml = isToday
        ? `<button class="btn btn-primary btn-xs" data-action="start" data-id="${planned.routine.id}">${icon.play}</button>`
        : `<button class="btn btn-ghost btn-xs" data-action="cal-change-routine" data-day="${dow}">Cambiar</button>`;
    } else if (!isPast) {
      actionHtml = `<button class="btn btn-ghost btn-xs" data-action="cal-assign-training" data-day="${dow}">+</button>`;
    }
  }

  return `
    <div class="cal-shared-row${isActive ? ' cal-shared-row--active' : ''}">
      <span class="cal-shared-avatar cal-shared-avatar--${u.toLowerCase()}">${initial}</span>
      ${statusHtml}
      ${actionHtml}
    </div>
  `;
}

function renderDayDetailPanel(usuario) {
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);
  const isPast = selectedDate < startOfDay(today) && !isToday;
  const dow = selectedDate.getDay();
  const USERS = ['Lean', 'Nat'];

  // Date label
  const dayName = DAY_NAMES_LONG[dow];
  const dateLabel = isToday
    ? `Hoy &middot; ${dayName}`
    : `${dayName} ${selectedDate.getDate()} de ${MONTH_NAMES[selectedDate.getMonth()]}`;

  // Render both users
  const rows = USERS.map((u) =>
    renderUserDayRow(u, selectedDate, isToday, isPast, dow, u === usuario)
  ).join('');

  return `
    <div class="cal-day-detail" id="cal-day-detail">
      <div class="cal-day-detail-header">
        <span class="cal-day-detail-date">${dateLabel}</span>
      </div>
      <div class="cal-shared-rows">
        ${rows}
      </div>
    </div>
  `;
}

// ── Entrenamiento hero (training day) ────────

// Hero removed — training starts from the calendar day detail panel

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

// ── Render ────────────────────────────────────

export function render() {
  const usuario = getUsuarioActivo();
  const workoutActivo = getWorkoutActivo();
  const rutinaHoy = getRutinaHoy(usuario);
  const proximo = getProximoEntrenamiento(usuario);
  const firebaseUser = getCurrentUser();

  // Active workout banner
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

  // Greeting
  const displayName = firebaseUser?.displayName?.split(' ')[0] || usuario;
  const greeting = `<div class="home-greeting animate-in">${getGreeting(displayName)}</div>`;

  // Unified calendar
  const calendar = renderUnifiedCalendar(usuario);
  const dayDetail = renderDayDetailPanel(usuario);

  // Rest day message (no big CTA)
  const isSelectedToday = isSameDay(selectedDate, new Date());
  const rest = isSelectedToday && !rutinaHoy && !isMyWorkout ? renderRestDay(proximo) : '';

  return `
    ${greeting}
    ${calendar}
    ${dayDetail}
    ${banner}
    <div id="hero-section">${rest}</div>
  `;
}

// ── Inline refresh ───────────────────────────

function refreshCalendarSection() {
  const usuario = getUsuarioActivo();

  const calEl = document.getElementById('cal-unified');
  if (calEl) calEl.outerHTML = renderUnifiedCalendar(usuario);

  const detailEl = document.getElementById('cal-day-detail');
  if (detailEl) detailEl.outerHTML = renderDayDetailPanel(usuario);

  // Update rest day message
  const heroSection = document.getElementById('hero-section');
  if (heroSection) {
    const isSelectedToday = isSameDay(selectedDate, new Date());
    const rutinaHoy = getRutinaHoy(usuario);
    const workoutActivo = getWorkoutActivo();
    const isMyWorkout = workoutActivo && (!workoutActivo.usuario || workoutActivo.usuario === usuario);
    const rest = isSelectedToday && !rutinaHoy && !isMyWorkout ? renderRestDay(getProximoEntrenamiento(usuario)) : '';
    heroSection.innerHTML = rest;
  }
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
      case 'start':
      case 'preview-routine':
        showPreview(id);
        break;

      case 'resume-workout': {
        const workout = getWorkoutActivo();
        if (workout) navigate(`/workout/${workout.rutinaId}`);
        break;
      }

      case 'cal-select-day': {
        const dateStr = btn.dataset.calDate;
        if (!dateStr) break;
        const [y, m, d] = dateStr.split('-').map(Number);
        selectedDate = new Date(y, m - 1, d);
        calYear = selectedDate.getFullYear();
        calMonth = selectedDate.getMonth();
        refreshCalendarSection();
        break;
      }

      case 'cal-toggle-expand': {
        calExpanded = !calExpanded;
        if (calExpanded) {
          calYear = selectedDate.getFullYear();
          calMonth = selectedDate.getMonth();
        }
        const calEl = document.getElementById('cal-unified');
        if (calEl) {
          const usuario = getUsuarioActivo();
          calEl.outerHTML = renderUnifiedCalendar(usuario);
        }
        break;
      }

      case 'cal-prev-period':
      case 'cal-next-period': {
        const dir = action === 'cal-prev-period' ? -1 : 1;
        if (calExpanded) {
          calMonth += dir;
          if (calMonth < 0) { calMonth = 11; calYear--; }
          if (calMonth > 11) { calMonth = 0; calYear++; }
        } else {
          selectedDate = new Date(selectedDate);
          selectedDate.setDate(selectedDate.getDate() + dir * 7);
          calYear = selectedDate.getFullYear();
          calMonth = selectedDate.getMonth();
        }
        refreshCalendarSection();
        break;
      }

      case 'cal-today': {
        selectedDate = new Date();
        calYear = selectedDate.getFullYear();
        calMonth = selectedDate.getMonth();
        refreshCalendarSection();
        break;
      }

      case 'cal-change-routine': {
        const usuario = getUsuarioActivo();
        const dia = Number(btn.dataset.day);
        const plan = getPlanSemanal(usuario);
        const current = plan[dia] || 'gimnasio';
        showDayAssignmentModal(usuario, dia, current, () => refreshCalendarSection());
        break;
      }

      case 'cal-remove-routine': {
        const usuario = getUsuarioActivo();
        const dia = Number(btn.dataset.day);
        clearRutinaDelDia(dia, usuario);
        setPlanDia(usuario, dia, null);
        refreshCalendarSection();
        break;
      }

      case 'cal-assign-training': {
        const usuario = getUsuarioActivo();
        const dia = Number(btn.dataset.day);
        setPlanDia(usuario, dia, 'gimnasio');
        showDayAssignmentModal(usuario, dia, 'gimnasio', () => refreshCalendarSection());
        break;
      }

      case 'cal-view-session':
        if (id) navigate(`/sesion/${id}`);
        break;
    }
  };

  app.addEventListener('click', handleClick);

  return () => {
    app.removeEventListener('click', handleClick);
  };
}
