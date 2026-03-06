import { getSesiones, calcVolumenSesion, getEjBestRound, getPlanSemanal, getRutinas } from '@/store.js';

/**
 * Weekly streak: consecutive weeks (Mon-Sun) with at least 1 session.
 */
export function getWeeklyStreak(usuario) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  if (sesiones.length === 0) return 0;

  // Group sessions by ISO week
  const weeks = new Set();
  for (const s of sesiones) {
    const d = new Date(s.fecha);
    weeks.add(getWeekKey(d));
  }

  // Count streak from current week backwards
  let streak = 0;
  const now = new Date();
  let check = new Date(now);

  // Start from current week
  for (let i = 0; i < 52; i++) {
    const key = getWeekKey(check);
    if (weeks.has(key)) {
      streak++;
      check.setDate(check.getDate() - 7);
    } else {
      // If we're in week 0 (current) and no session yet, don't break — check previous
      if (i === 0) {
        check.setDate(check.getDate() - 7);
        continue;
      }
      break;
    }
  }

  return streak;
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to Monday of this week
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return `${d.getFullYear()}-W${String(Math.ceil((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 604800000)).padStart(2, '0')}`;
}

/**
 * Sessions this week count.
 */
export function getSessionsThisWeek(usuario) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);

  return sesiones.filter((s) => new Date(s.fecha) >= monday).length;
}

/**
 * Training days planned this week.
 */
export function getPlannedDaysThisWeek(usuario) {
  // Import dynamically to avoid circular deps
  const plan = JSON.parse(localStorage.getItem('gym_plan_semanal') || '{}');
  const userPlan = plan[usuario] || {};
  return Object.keys(userPlan).length;
}

/**
 * General stats.
 */
export function getGeneralStats(usuario) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  const totalSesiones = sesiones.length;
  const volumenTotal = sesiones.reduce((sum, s) => sum + calcVolumenSesion(s), 0);
  const duracionTotal = sesiones.reduce((sum, s) => sum + (s.duracionMin || 0), 0);
  const duracionPromedio = totalSesiones > 0 ? Math.round(duracionTotal / totalSesiones) : 0;

  return { totalSesiones, volumenTotal: Math.round(volumenTotal), duracionPromedio };
}

/**
 * Exercise progress: array of data points sorted by date.
 */
export function getExerciseProgressData(usuario, nombre) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  const points = [];

  // Oldest first for chart
  for (const s of [...sesiones].reverse()) {
    for (const c of s.circuitos) {
      for (const ej of c.ejercicios) {
        if (ej.nombre === nombre) {
          const best = getEjBestRound(ej);
          points.push({
            fecha: s.fecha,
            peso: best.pesoRealKg,
            reps: best.repsReal,
            volumen: best.repsReal * best.pesoRealKg,
          });
        }
      }
    }
  }

  return points;
}

/**
 * Top exercises: exercises sorted by most improvement (first vs last session).
 */
export function getTopExercises(usuario, limit = 5) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  if (sesiones.length === 0) return [];

  const exerciseData = {}; // { nombre: { first, last, maxPeso, count } }

  for (const s of [...sesiones].reverse()) {
    for (const c of s.circuitos) {
      for (const ej of c.ejercicios) {
        const best = getEjBestRound(ej);
        if (best.pesoRealKg <= 0) continue;
        if (!exerciseData[ej.nombre]) {
          exerciseData[ej.nombre] = { first: best.pesoRealKg, last: best.pesoRealKg, maxPeso: best.pesoRealKg, count: 1 };
        } else {
          exerciseData[ej.nombre].last = best.pesoRealKg;
          exerciseData[ej.nombre].maxPeso = Math.max(exerciseData[ej.nombre].maxPeso, best.pesoRealKg);
          exerciseData[ej.nombre].count++;
        }
      }
    }
  }

  return Object.entries(exerciseData)
    .map(([nombre, d]) => ({
      nombre,
      maxPeso: d.maxPeso,
      mejora: d.last - d.first,
      mejoraPct: d.first > 0 ? Math.round(((d.last - d.first) / d.first) * 100) : 0,
      count: d.count,
    }))
    .sort((a, b) => b.maxPeso - a.maxPeso)
    .slice(0, limit);
}

/**
 * Weekly activity grid: last N weeks with session counts.
 */
export function getWeeklyActivity(usuario, weeks = 12) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  const result = [];

  const now = new Date();
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const count = sesiones.filter((s) => {
      const d = new Date(s.fecha);
      return d >= weekStart && d < weekEnd;
    }).length;

    result.push({ weekStart: weekStart.toISOString(), count });
  }

  return result;
}

/**
 * Days since last session.
 */
export function getDaysSinceLastSession(usuario) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  if (sesiones.length === 0) return null;
  const last = new Date(sesiones[0].fecha);
  const now = new Date();
  return Math.floor((now - last) / 86400000);
}

/**
 * Monthly activity: returns a Set of day numbers that have sessions in the given month.
 * @param {string} usuario
 * @param {number} year  Full year (e.g. 2026)
 * @param {number} month 0-indexed (0=Jan, 11=Dec)
 * @returns {Set<number>} Day-of-month numbers with sessions
 */
export function getMonthActivity(usuario, year, month) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  const activeDays = new Set();

  for (const s of sesiones) {
    const d = new Date(s.fecha);
    if (d.getFullYear() === year && d.getMonth() === month) {
      activeDays.add(d.getDate());
    }
  }

  return activeDays;
}

/**
 * Get planned routine for a specific date based on weekday plan.
 * @param {string} usuario
 * @param {Date} date
 * @returns {{ tipo: string, routine: object|null } | null}
 */
export function getPlannedRoutineForDate(usuario, date) {
  const dayOfWeek = date.getDay(); // 0=Sun ... 6=Sat
  const plan = getPlanSemanal(usuario);
  const tipo = plan[dayOfWeek];
  if (!tipo) return null;

  const rutinas = getRutinas().filter((r) => r.usuario === usuario);
  const routine =
    rutinas.find((r) => r.diaSemana === dayOfWeek) ||
    rutinas.find((r) => r.tipo === tipo && r.diaSemana == null);

  return { tipo, routine: routine || null };
}

/**
 * Get day numbers in a month that have a weekly plan assigned.
 * @param {string} usuario
 * @param {number} year
 * @param {number} month 0-indexed
 * @returns {Map<number, string>} dayNumber -> tipo
 */
export function getMonthPlannedDays(usuario, year, month) {
  const plan = getPlanSemanal(usuario);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const result = new Map();
  for (let d = 1; d <= totalDays; d++) {
    const dow = new Date(year, month, d).getDay();
    if (plan[dow]) result.set(d, plan[dow]);
  }
  return result;
}

/**
 * Sessions for a specific date.
 * @param {string} usuario
 * @param {number} year  Full year (e.g. 2026)
 * @param {number} month 0-indexed (0=Jan, 11=Dec)
 * @param {number} day   Day of month (1-31)
 * @returns {Array} Session objects for that date
 */
export function getSessionsForDate(usuario, year, month, day) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  return sesiones.filter((s) => {
    const d = new Date(s.fecha);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });
}
