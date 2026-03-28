import {
  getRutinas,
  getWorkoutActivo,
  getUsuarioActivo,
  getRutinaHoy,
  getProximoEntrenamiento,
  getPlanSemanal,
  getDayOverride,
  setPlanDia,
  clearRutinaDelDia,
  clearDayOverride,
  getPlanGenerado,
} from '@/store.js';
import { navigate } from '@/router.js';
import { icon, iconLg } from '@js/icons.js';
import { updateMainButton } from '@js/components/nav-bar.js';
import {
  renderTags,
  renderLastDone,
  showPreview,
  showDayAssignmentModal,
  formatNumero,
  normalizeGrupos,
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
  getGeneralStats,
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
const LUGAR_LABELS = { SPORT_FITNESS: 'SPORT', VILO_GYM: 'VILO', RIO: 'RIO', URUGUAY: 'URUGUAY' };

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

// ── Carousel ───────────────────────────────

function renderCarouselSlide(usuario) {
  const streak = getWeeklyStreak(usuario);
  const now = new Date();
  const monthActivity = getMonthActivity(usuario, now.getFullYear(), now.getMonth());
  const sessionsThisMonth = monthActivity.size;
  const planned = getPlannedDaysThisWeek(usuario);
  const stats = getGeneralStats(usuario);
  const avgTime = stats.duracionPromedio ? `${stats.duracionPromedio}min` : '--';
  const initial = usuario.charAt(0).toUpperCase();

  const rutinaHoy = getRutinaHoy(usuario);
  const proximo = getProximoEntrenamiento(usuario);
  const rutina = rutinaHoy || proximo?.rutina;

  if (!rutina) {
    return `
      <div class="user-carousel-slide" data-usuario="${usuario}">
        <div class="carousel-card">
          <div class="carousel-card-header">
            <span class="carousel-avatar carousel-avatar--${usuario.toLowerCase()}">${initial}</span>
            <span class="carousel-name">${usuario}</span>
            <div class="carousel-stats">
              <span>${streak}🔥</span>
              <span>${sessionsThisMonth}/${planned}📅</span>
              <span>${avgTime}⏱</span>
            </div>
          </div>
          <div class="carousel-card-empty">Sin rutina programada</div>
        </div>
      </div>`;
  }

  const code = formatNumero(rutina.numero, rutina);
  const lugarTag = rutina.lugar ? LUGAR_LABELS[rutina.lugar] || rutina.lugar : '';

  // Build full exercise list
  let circuitsHtml = '';
  if (rutina.circuitos) {
    circuitsHtml = rutina.circuitos.map((c, ci) => {
      const grupos = normalizeGrupos(c);
      const grupoLabel = grupos.length > 0 ? grupos.join(' · ') : '';
      const ejercicios = (c.ejercicios || []).map((ej) => {
        const tipo = ej.tipo || 'normal';
        if (tipo === 'velocidad' || tipo === 'caminata') {
          return `<div class="carousel-ej"><span class="carousel-ej-name">${ej.nombre}</span><span class="carousel-ej-meta">${ej.cantidadPasadas || 3}×${ej.tiempo || 60}s</span></div>`;
        }
        if (tipo === 'hiit') {
          return `<div class="carousel-ej"><span class="carousel-ej-name">${ej.nombre}</span><span class="carousel-ej-meta">${ej.rounds || ej.series || 3} rondas</span></div>`;
        }
        const series = ej.series?.length || 2;
        const reps = ej.repsObjetivo || ej.series?.[0]?.reps || 10;
        const peso = ej.pesoKg || ej.series?.[0]?.pesoKg || 0;
        return `<div class="carousel-ej"><span class="carousel-ej-name">${ej.nombre}</span><span class="carousel-ej-meta">${series}×${reps}${peso ? ` ${peso}kg` : ''}</span></div>`;
      }).join('');

      return `
        <div class="carousel-circuit">
          <div class="carousel-circuit-header"><span class="carousel-circuit-num">${ci + 1}</span>${grupoLabel}</div>
          <div class="carousel-circuit-list">${ejercicios}</div>
        </div>`;
    }).join('');
  }

  return `
    <div class="user-carousel-slide" data-usuario="${usuario}">
      <div class="carousel-card">
        <div class="carousel-card-header">
          <span class="carousel-avatar carousel-avatar--${usuario.toLowerCase()}">${initial}</span>
          <span class="carousel-name">${usuario}</span>
          <div class="carousel-stats">
            <span>${streak}🔥</span>
            <span>${sessionsThisMonth}/${planned}📅</span>
            <span>${avgTime}⏱</span>
          </div>
        </div>
        <div class="carousel-card-meta">
          ${code ? `<span class="carousel-code">${code}</span>` : ''}
          ${lugarTag ? `<span class="carousel-lugar-badge">${lugarTag}</span>` : ''}
          <span class="carousel-rutina-name">${rutina.nombre}</span>
        </div>
        <div class="carousel-divider"></div>
        <div class="carousel-circuits">${circuitsHtml}</div>
        <div class="carousel-divider"></div>
        <div class="carousel-cta">
          <button class="btn btn-primary btn-full carousel-start-btn" data-action="start" data-id="${rutina.id}">&#9654; Iniciar entreno</button>
        </div>
      </div>
    </div>`;
}

function renderUserCarousel() {
  const USERS = ['Lean', 'Nat'];
  const slides = USERS.map(renderCarouselSlide).join('');
  const dots = USERS.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}"></span>`).join('');

  return `
    <div class="user-carousel animate-in" id="user-carousel" style="animation-delay:50ms">
      <div class="user-carousel-track">${slides}</div>
      <div class="user-carousel-dots">${dots}</div>
    </div>
  `;
}

function initCarousel(el) {
  if (!el) return;
  let startX = 0;
  let currentSlide = 0;
  const track = el.querySelector('.user-carousel-track');
  const dots = el.querySelectorAll('.dot');
  const total = el.querySelectorAll('.user-carousel-slide').length;
  if (!track || total === 0) return;

  function goTo(i) {
    currentSlide = Math.max(0, Math.min(i, total - 1));
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((d, idx) => d.classList.toggle('active', idx === currentSlide));
  }

  el.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(currentSlide + (diff > 0 ? 1 : -1));
  });

  // Allow dot clicks
  dots.forEach((d, idx) => {
    d.addEventListener('click', () => goTo(idx));
  });

  goTo(0);
}

// ── Week strip ──────────────────────────────

function renderWeekStrip() {
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

    const dateStr = dateToStr(d);
    let dotsHtml = '<span class="cal-strip-dots">';
    for (const u of USERS) {
      const plan = getPlanSemanal(u);
      const sessions = getSessionsForDate(u, d.getFullYear(), d.getMonth(), d.getDate());
      const hasCompleted = sessions.length > 0;
      const override = getDayOverride(u, dateStr);
      const tipo = override ? (override.tipo || '') : (plan[dow] || '');
      const hasPlanned = !!tipo;

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

function renderMonthGrid() {
  const today = new Date();
  const USERS = ['Lean', 'Nat'];
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

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

  for (let i = startOffset - 1; i >= 0; i--) {
    cells += `<div class="cal-month-day cal-month-day--outside">${prevMonthDays - i}</div>`;
  }

  for (let d = 1; d <= totalDays; d++) {
    const isToday = isCurrentMonth && d === today.getDate();
    const isSelected = selectedDate.getFullYear() === calYear && selectedDate.getMonth() === calMonth && selectedDate.getDate() === d;
    const dateObj = new Date(calYear, calMonth, d);

    let cls = 'cal-month-day';
    if (isToday) cls += ' cal-month-day--today';
    if (isSelected) cls += ' cal-month-day--selected';

    let dotsHtml = '<span class="cal-month-dots">';
    for (const ud of userData) {
      const hasSession = ud.activeDays.has(d);
      const plannedTipo = ud.plannedDays.get(d);
      let dotCls = 'cal-month-dot-user';
      if (hasSession) {
        dotCls += ` cal-month-dot-user--done cal-month-dot-user--${ud.name.toLowerCase()}`;
      } else if (plannedTipo) {
        dotCls += ` cal-month-dot-user--plan cal-month-dot-user--${ud.name.toLowerCase()}`;
      }
      dotsHtml += `<span class="${dotCls}"></span>`;
    }
    dotsHtml += '</span>';

    cells += `<div class="${cls}" data-action="cal-select-day" data-cal-date="${dateToStr(dateObj)}">${d}${dotsHtml}</div>`;
  }

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

function renderUnifiedCalendar() {
  const today = new Date();
  const isOnCurrentPeriod = calExpanded
    ? (calYear === today.getFullYear() && calMonth === today.getMonth())
    : isSameDay(getMonday(selectedDate), getMonday(today)) || isSameDay(selectedDate, today);

  const monday = getMonday(selectedDate);
  const title = calExpanded
    ? `${MONTH_NAMES[calMonth]} ${calYear}`
    : formatDateRange(monday);

  const todayBtn = !isOnCurrentPeriod
    ? `<button class="cal-today-btn" data-action="cal-today">Hoy</button>`
    : '';

  const body = calExpanded
    ? renderMonthGrid()
    : renderWeekStrip();

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

// ── Day detail panel ("Hoy") ────────────────

function renderUserDayRow(u, selectedDate, isToday, isPast, dow, isActive) {
  const sessions = getSessionsForDate(u, selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const planned = getPlannedRoutineForDate(u, selectedDate);
  const initial = u.charAt(0).toUpperCase();

  let statusHtml = '';
  if (sessions.length > 0) {
    const s = sessions[0];
    const dur = s.duracionMin ? `${s.duracionMin}min` : '';
    const vol = calcVolumenSesion(s);
    const metaParts = [dur, vol ? `${vol}kg` : ''].filter(Boolean);
    const metaLine = metaParts.length > 0 ? `<div class="cal-shared-meta">${metaParts.join(' · ')}</div>` : '';
    statusHtml = `
      <div class="cal-shared-row-info">
        <span class="cal-shared-status cal-shared-status--done">&#10003; ${s.rutinaNombre}</span>
        ${metaLine}
      </div>`;
  } else if (planned && planned.routine) {
    const r = planned.routine;
    const code = r.numero ? formatNumero(r.numero, r) : '';
    const lugarBadge = r.lugar
      ? ` <span class="cal-lugar-badge">${LUGAR_LABELS[r.lugar] || r.lugar}</span>`
      : '';
    statusHtml = `
      <div class="cal-shared-row-info">
        ${code ? `<div class="cal-shared-volanta">${code}</div>` : ''}
        <span class="cal-shared-status" data-action="start" data-id="${r.id}" style="cursor:pointer">${r.nombre}${lugarBadge}</span>
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

  let actionHtml = '';
  const dateISO = selectedDate ? selectedDate.toISOString() : '';
  if (sessions.length > 0) {
    actionHtml = `<button class="btn btn-ghost btn-xs" data-action="cal-view-session" data-id="${sessions[0].id}">Ver</button>`;
  } else if (planned && planned.routine && isToday && isActive) {
    actionHtml = `<button class="btn btn-ghost btn-xs" data-action="cal-change-routine" data-day="${dow}" data-user="${u}">Cambiar</button>
       <button class="btn btn-primary btn-play-circle" data-action="start" data-id="${planned.routine.id}">${icon.play}</button>`;
  } else if (planned && planned.routine && !isPast) {
    actionHtml = `<button class="btn btn-ghost btn-xs" data-action="cal-change-routine" data-day="${dow}" data-user="${u}">Cambiar</button>`;
  } else if (planned && planned.routine && isPast) {
    actionHtml = `<button class="btn btn-ghost btn-xs" data-action="start-backdate" data-id="${planned.routine.id}" data-date="${dateISO}">Registrar</button>`;
  } else if (!isPast) {
    actionHtml = `<button class="btn btn-ghost btn-xs" data-action="cal-assign-training" data-day="${dow}" data-user="${u}">+</button>`;
  }

  let rowAction = '';
  if (sessions.length > 0) {
    rowAction = `data-action="cal-view-session" data-id="${sessions[0].id}"`;
  } else if (planned && planned.routine && !isPast) {
    rowAction = `data-action="start" data-id="${planned.routine.id}"`;
  } else if (planned && planned.routine && isPast) {
    rowAction = `data-action="start-backdate" data-id="${planned.routine.id}" data-date="${dateISO}"`;
  } else if (!isPast) {
    rowAction = `data-action="cal-assign-training" data-day="${dow}" data-user="${u}"`;
  }

  return `
    <div class="cal-shared-row${isActive ? ' cal-shared-row--active' : ''}" ${rowAction} style="cursor:pointer">
      <span class="cal-shared-avatar cal-shared-avatar--${u.toLowerCase()}">${initial}</span>
      ${statusHtml}
      ${actionHtml}
    </div>
  `;
}

function renderDayDetailPanel() {
  const usuario = getUsuarioActivo();
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);
  const isPast = selectedDate < startOfDay(today) && !isToday;
  const dow = selectedDate.getDay();
  const USERS = ['Lean', 'Nat'];

  const dayName = DAY_NAMES_LONG[dow];
  const dateLabel = isToday
    ? `Hoy &middot; ${dayName}`
    : `${dayName} ${selectedDate.getDate()} de ${MONTH_NAMES[selectedDate.getMonth()]}`;

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

  // Carousel replaces old user-summary-cards
  const carousel = renderUserCarousel();

  // Unified calendar
  const calendar = renderUnifiedCalendar();
  const dayDetail = renderDayDetailPanel();

  // Rest day message
  const isSelectedToday = isSameDay(selectedDate, new Date());
  const rest = isSelectedToday && !rutinaHoy && !isMyWorkout ? renderRestDay(proximo) : '';

  // Update center nav button
  const mainBtnId = isMyWorkout ? workoutActivo.rutinaId : (rutinaHoy ? rutinaHoy.id : null);
  updateMainButton(mainBtnId);

  // Plan activity banner
  const todayStr = new Date().toISOString().split('T')[0];
  const activePlan = getPlanGenerado(usuario);
  let planActivity = '';
  if (activePlan && activePlan.status === 'active' && activePlan.weeks && isSelectedToday) {
    for (const week of activePlan.weeks) {
      const day = (week.days || []).find((d) => d.date === todayStr);
      if (day && day.tipo && day.tipo !== 'gym' && day.tipo !== 'rest') {
        const ACTIVITY_ICONS = { running: '🏃', sauna: '🧖', rucking: '🎒', yoga: '🧘' };
        const ACTIVITY_LABELS = { running: 'Running', sauna: 'Sauna', rucking: 'Rucking', yoga: 'Yoga' };
        planActivity = `
          <div class="plan-today-activity card animate-in">
            <span class="plan-today-icon">${ACTIVITY_ICONS[day.tipo] || '📋'}</span>
            <div class="plan-today-info">
              <strong>${ACTIVITY_LABELS[day.tipo] || day.tipo}</strong>
              ${day.notas ? `<span class="plan-today-note">${day.notas}</span>` : ''}
              ${week.deload ? '<span class="plan-deload-tag">DELOAD</span>' : ''}
            </div>
          </div>`;
        break;
      }
    }
  }

  // Plan button
  const planBtn = activePlan && activePlan.status === 'active'
    ? `<div style="padding:0 var(--space-md);margin-top:var(--space-md)">
        <a href="#/plan/preview" class="btn btn-ghost btn-full" style="gap:6px">📋 Ver mi plan</a>
      </div>`
    : `<div style="padding:0 var(--space-md);margin-top:var(--space-md)">
        <a href="#/plan/nuevo" class="btn btn-ghost btn-full" style="border:1.5px dashed var(--color-border);gap:6px">
          📋 Generar plan de entrenamiento
        </a>
      </div>`;

  return `
    ${carousel}
    ${planActivity}
    ${dayDetail}
    ${calendar}
    ${banner}
    <div id="hero-section">${rest}</div>
    ${planBtn}
  `;
}

// ── Inline refresh ───────────────────────────

function refreshCalendarSection() {
  const calEl = document.getElementById('cal-unified');
  if (calEl) calEl.outerHTML = renderUnifiedCalendar();

  const detailEl = document.getElementById('cal-day-detail');
  if (detailEl) detailEl.outerHTML = renderDayDetailPanel();

  // Update rest day message
  const heroSection = document.getElementById('hero-section');
  if (heroSection) {
    const usuario = getUsuarioActivo();
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

  // Initialize carousel swipe
  const carouselEl = document.getElementById('user-carousel');
  initCarousel(carouselEl);

  let lastTapDate = null;
  let lastTapTime = 0;
  const DOUBLE_TAP_DELAY = 350;

  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
      case 'start':
      case 'preview-routine':
        showPreview(id, { from: 'home', dia: selectedDate.getDay() });
        break;

      case 'start-backdate': {
        const backdateISO = btn.dataset.date;
        navigate(`/workout/${id}?date=${encodeURIComponent(backdateISO)}`);
        break;
      }

      case 'resume-workout': {
        const workout = getWorkoutActivo();
        if (workout) navigate(`/workout/${workout.rutinaId}`);
        break;
      }

      case 'cal-select-day': {
        const dateStr = btn.dataset.calDate;
        if (!dateStr) break;
        const now = Date.now();
        const [y, m, d] = dateStr.split('-').map(Number);
        selectedDate = new Date(y, m - 1, d);
        calYear = selectedDate.getFullYear();
        calMonth = selectedDate.getMonth();

        // Double-tap detection
        if (lastTapDate === dateStr && (now - lastTapTime) < DOUBLE_TAP_DELAY) {
          lastTapDate = null;
          lastTapTime = 0;
          const usuario = getUsuarioActivo();
          const dow = selectedDate.getDay();
          const plan = getPlanSemanal(usuario);
          const tipoActual = plan[dow] || null;
          showDayAssignmentModal(usuario, dow, tipoActual, () => refreshCalendarSection(), { date: selectedDate, dateOverride: !calExpanded });
        } else {
          lastTapDate = dateStr;
          lastTapTime = now;
        }

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
          calEl.outerHTML = renderUnifiedCalendar();
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
        const targetUser = btn.dataset.user || getUsuarioActivo();
        const dia = Number(btn.dataset.day);
        const plan = getPlanSemanal(targetUser);
        const current = plan[dia] || 'gimnasio';
        showDayAssignmentModal(targetUser, dia, current, () => refreshCalendarSection(), { date: selectedDate, dateOverride: !calExpanded });
        break;
      }

      case 'cal-remove-routine': {
        const usuario = btn.dataset.user || getUsuarioActivo();
        const dia = Number(btn.dataset.day);
        if (!calExpanded) {
          const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
          clearDayOverride(usuario, dateStr);
        } else {
          clearRutinaDelDia(dia, usuario);
          setPlanDia(usuario, dia, null);
        }
        refreshCalendarSection();
        break;
      }

      case 'cal-assign-training': {
        const targetUser = btn.dataset.user || getUsuarioActivo();
        const dia = Number(btn.dataset.day);
        showDayAssignmentModal(targetUser, dia, 'gimnasio', () => refreshCalendarSection(), { date: selectedDate, dateOverride: !calExpanded });
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
