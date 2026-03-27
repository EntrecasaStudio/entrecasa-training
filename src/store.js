import { queueSync } from '@js/services/sync.js';

const KEYS = {
  rutinas: 'gym_rutinas',
  sesiones: 'gym_sesiones',
  workoutActivo: 'gym_workout_activo',
  usuario: 'gym_usuario',
  planSemanal: 'gym_plan_semanal',
  dayOverrides: 'gym_day_overrides',
  planGenerado: 'gym_plan_generado',
};

// ── Data version (for router cache staleness) ──
let _dataVersion = 0;
export function getDataVersion() { return _dataVersion; }
function bumpVersion() { _dataVersion++; }

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  queueSync(key); // sync to Firestore in background
}

// ── Raw readers (include soft-deleted items — for internal read-modify-write) ──

function _allRutinas() { return read(KEYS.rutinas) || []; }
function _allSesiones() { return read(KEYS.sesiones) || []; }

// ── Rutinas ──────────────────────────────────

export function getRutinas() {
  return _allRutinas().filter((r) => !r.deleted);
}

export function getRutinaById(id) {
  return _allRutinas().find((r) => r.id === id && !r.deleted) || null;
}

export function saveRutina(rutina) {
  rutina.updatedAt = new Date().toISOString();
  const rutinas = _allRutinas();
  const idx = rutinas.findIndex((r) => r.id === rutina.id);
  if (idx >= 0) {
    rutinas[idx] = rutina;
  } else {
    rutinas.push(rutina);
  }
  write(KEYS.rutinas, rutinas);
  bumpVersion();
}

export function deleteRutina(id) {
  const rutinas = _allRutinas();
  const target = rutinas.find((r) => r.id === id);
  if (target) {
    target.deleted = true;
    target.deletedAt = new Date().toISOString();
    write(KEYS.rutinas, rutinas);
    bumpVersion();
  }
}

export function restoreRutina(id) {
  const rutinas = _allRutinas();
  const target = rutinas.find((r) => r.id === id);
  if (target) {
    delete target.deleted;
    delete target.deletedAt;
    write(KEYS.rutinas, rutinas);
    bumpVersion();
  }
}

export function duplicateRutina(id) {
  const original = getRutinaById(id);
  if (!original) return null;
  const copia = JSON.parse(JSON.stringify(original));
  copia.id = crypto.randomUUID();
  copia.nombre = original.nombre + ' (copia)';
  copia.diaSemana = null; // don't copy day assignment
  // Assign next available numero for this tipo
  const rutinas = getRutinas();
  const sameType = rutinas.filter((r) => r.tipo === (copia.tipo || 'gimnasio'));
  copia.numero = sameType.reduce((m, r) => Math.max(m, r.numero || 0), 0) + 1;
  copia.custom = true;
  const all = _allRutinas();
  all.push(copia);
  write(KEYS.rutinas, all);
  bumpVersion();
  return copia;
}

// ── Sesiones ─────────────────────────────────

export function getSesiones() {
  return _allSesiones().filter((s) => !s.deleted).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export function getSesionById(id) {
  return _allSesiones().find((s) => s.id === id && !s.deleted) || null;
}

export function getSesionesByRutina(rutinaId) {
  return getSesiones().filter((s) => s.rutinaId === rutinaId);
}

export function saveSesion(sesion) {
  sesion.updatedAt = new Date().toISOString();
  const sesiones = _allSesiones();
  sesiones.push(sesion);
  write(KEYS.sesiones, sesiones);
  bumpVersion();
}

export function updateSesion(sesion) {
  sesion.updatedAt = new Date().toISOString();
  const sesiones = _allSesiones();
  const idx = sesiones.findIndex((s) => s.id === sesion.id);
  if (idx >= 0) {
    sesiones[idx] = sesion;
    write(KEYS.sesiones, sesiones);
    bumpVersion();
  }
}

export function deleteSesion(id) {
  const sesiones = _allSesiones();
  const target = sesiones.find((s) => s.id === id);
  if (target) {
    target.deleted = true;
    target.deletedAt = new Date().toISOString();
    write(KEYS.sesiones, sesiones);
    bumpVersion();
  }
}

export function restoreSesion(id) {
  const sesiones = _allSesiones();
  const target = sesiones.find((s) => s.id === id);
  if (target) {
    delete target.deleted;
    delete target.deletedAt;
    write(KEYS.sesiones, sesiones);
    bumpVersion();
  }
}

// ── Usuario activo ──────────────────────────

export function getUsuarioActivo() {
  return localStorage.getItem(KEYS.usuario) || 'Lean';
}

export function setUsuarioActivo(nombre) {
  localStorage.setItem(KEYS.usuario, nombre);
  bumpVersion();
}

// ── Plan semanal ─────────────────────────────

export function getPlanSemanal(usuario) {
  const plan = read(KEYS.planSemanal) || {};
  return plan[usuario] || {};
}

export function setPlanDia(usuario, dia, tipo) {
  const all = read(KEYS.planSemanal) || {};
  if (!all[usuario]) all[usuario] = {};
  if (tipo) {
    all[usuario][dia] = tipo; // 'gimnasio' | 'cross'
  } else {
    delete all[usuario][dia]; // descanso
  }
  write(KEYS.planSemanal, all);
  bumpVersion();
}

// ── Notas de ejercicios ─────────────────────

const NOTAS_KEY = 'gym_notas_ejercicios';

export function getNotaEjercicio(nombre) {
  const notas = read(NOTAS_KEY) || {};
  return notas[nombre] || '';
}

export function saveNotaEjercicio(nombre, nota) {
  const notas = read(NOTAS_KEY) || {};
  if (nota && nota.trim()) {
    notas[nombre] = nota.trim();
  } else {
    delete notas[nombre];
  }
  write(NOTAS_KEY, notas);
  bumpVersion();
}

// ── Ejercicio metadata (parámetros) ────────

const EJERCICIO_META_KEY = 'gym_ejercicio_meta';

export function getEjercicioMeta(nombre) {
  const all = read(EJERCICIO_META_KEY) || {};
  return all[nombre] || { usaPeso: false, usaChaleco: false };
}

export function saveEjercicioMeta(nombre, meta) {
  const all = read(EJERCICIO_META_KEY) || {};
  all[nombre] = meta;
  write(EJERCICIO_META_KEY, all);
  bumpVersion();
}

// ── Routine-day assignment ──────────────────

export function assignRutinaADia(rutinaId, dia, usuario) {
  const now = new Date().toISOString();
  const rutinas = _allRutinas();
  // Clear any routine currently assigned to this day for this user
  for (const r of rutinas) {
    if (!r.deleted && Number(r.diaSemana) === Number(dia) && r.usuario === usuario) {
      r.diaSemana = null;
      r.updatedAt = now;
    }
  }
  // Assign the new one
  const target = rutinas.find((r) => r.id === rutinaId && !r.deleted);
  if (target) { target.diaSemana = Number(dia); target.updatedAt = now; }
  write(KEYS.rutinas, rutinas);
  bumpVersion();
}

export function clearRutinaDelDia(dia, usuario) {
  const rutinas = _allRutinas();
  for (const r of rutinas) {
    if (!r.deleted && Number(r.diaSemana) === Number(dia) && r.usuario === usuario) {
      r.diaSemana = null;
    }
  }
  write(KEYS.rutinas, rutinas);
  bumpVersion();
}

// ── Day-specific overrides ──────────────────

export function getDayOverrides(usuario) {
  const all = read(KEYS.dayOverrides) || {};
  return all[usuario] || {};
}

export function getDayOverride(usuario, dateStr) {
  const overrides = getDayOverrides(usuario);
  return overrides[dateStr] || null;
}

export function setDayOverride(usuario, dateStr, override) {
  const all = read(KEYS.dayOverrides) || {};
  if (!all[usuario]) all[usuario] = {};
  all[usuario][dateStr] = override;
  write(KEYS.dayOverrides, all);
  bumpVersion();
}

export function clearDayOverride(usuario, dateStr) {
  const all = read(KEYS.dayOverrides) || {};
  if (all[usuario]) {
    delete all[usuario][dateStr];
    write(KEYS.dayOverrides, all);
    bumpVersion();
  }
}

// ── Scheduling ──────────────────────────────

const DIAS_NOMBRES = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miercoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sabado',
};

export function getRutinaHoy(usuario) {
  const hoy = new Date().getDay(); // 0=Dom, 1=Lun, ...
  const plan = getPlanSemanal(usuario);
  const tipoHoy = plan[hoy]; // 'gimnasio' | 'cross' | undefined

  if (!tipoHoy) return null; // rest day

  const rutinas = getRutinas();

  // First try: programmed routine for this day + user
  const programada = rutinas.find((r) => Number(r.diaSemana) === hoy && r.usuario === usuario);
  if (programada) return programada;

  // Fallback: first library routine of matching type + user
  return rutinas.find((r) => r.tipo === tipoHoy && r.usuario === usuario && r.diaSemana == null) || null;
}

export function getProximoEntrenamiento(usuario) {
  const hoy = new Date().getDay();
  const plan = getPlanSemanal(usuario);
  const rutinas = getRutinas();

  // Check next 7 days (starting tomorrow)
  for (let i = 1; i <= 7; i++) {
    const d = (hoy + i) % 7;
    const tipo = plan[d];
    if (!tipo) continue;

    // Find a routine for that day
    const rut =
      rutinas.find((r) => Number(r.diaSemana) === d && r.usuario === usuario) ||
      rutinas.find((r) => r.tipo === tipo && r.usuario === usuario && r.diaSemana == null);
    if (rut) return { rutina: rut, diaNombre: DIAS_NOMBRES[d], tipo };
  }
  return null;
}

export function getUltimaSesionDeRutina(rutinaId) {
  const sesiones = getSesionesByRutina(rutinaId);
  return sesiones.length > 0 ? sesiones[0] : null; // already sorted newest first
}

// ── Workout activo ───────────────────────────

export function getWorkoutActivo() {
  return read(KEYS.workoutActivo);
}

export function saveWorkoutActivo(data) {
  write(KEYS.workoutActivo, data);
}

export function clearWorkoutActivo() {
  localStorage.removeItem(KEYS.workoutActivo);
  bumpVersion();
}

// ── Vueltas helpers (backward-compatible) ───

/** Normalize exercise to array of rounds (old format has single repsReal/pesoRealKg) */
export function getEjVueltas(ej) {
  // Velocidad/HIIT exercises don't have vueltas
  if (ej.pasadas || ej.roundResults) return [];
  if (ej.vueltas?.length > 0) return ej.vueltas;
  return [{ repsReal: ej.repsReal ?? 0, pesoRealKg: ej.pesoRealKg ?? 0 }];
}

/** Best round by weight (for PRs, charts, history display) */
export function getEjBestRound(ej) {
  const vueltas = getEjVueltas(ej);
  if (vueltas.length === 0) return { repsReal: 0, pesoRealKg: 0 };
  return vueltas.reduce((best, v) => v.pesoRealKg > best.pesoRealKg ? v : best, vueltas[0]);
}

// ── Stats helpers ───────────────────────────

export function getPersonalRecords(usuario) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  const records = {}; // { nombre: { maxPeso, fecha } }
  for (const s of sesiones) {
    for (const c of s.circuitos) {
      for (const ej of c.ejercicios) {
        // Skip cardio exercises (velocidad/HIIT don't have weight PRs)
        const ejTipo = ej.tipo || c.tipo || 'normal';
        if (ejTipo !== 'normal') continue;
        const best = getEjBestRound(ej);
        const key = ej.nombre;
        if (!records[key] || best.pesoRealKg > records[key].maxPeso) {
          records[key] = { maxPeso: best.pesoRealKg, fecha: s.fecha };
        }
      }
    }
  }
  return records;
}

export function calcVolumenSesion(sesion) {
  return sesion.circuitos.reduce(
    (sum, c) => sum + c.ejercicios.reduce((s, ej) => {
      // Skip cardio exercises for volume calculation
      const ejTipo = ej.tipo || c.tipo || 'normal';
      if (ejTipo !== 'normal') return s;
      const vueltas = getEjVueltas(ej);
      return s + vueltas.reduce((vs, v) => vs + (v.repsReal * v.pesoRealKg), 0);
    }, 0),
    0,
  );
}

export function getPreviousSesion(sesion) {
  const all = getSesionesByRutina(sesion.rutinaId);
  const idx = all.findIndex((s) => s.id === sesion.id);
  return idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
}

// ── Routine stats (duration/calories aggregation) ──

export function getRutinaStats(rutinaId) {
  const sesiones = getSesionesByRutina(rutinaId);
  if (!sesiones.length) return null;
  const durations = sesiones.filter((s) => s.duracionMin).map((s) => s.duracionMin);
  const calories = sesiones.filter((s) => s.calorias).map((s) => s.calorias);
  return {
    avgDuracion: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    avgCalorias: calories.length ? Math.round(calories.reduce((a, b) => a + b, 0) / calories.length) : null,
    totalSesiones: sesiones.length,
  };
}

// ── Cycle tracking (done marking) ───────────────

const CYCLE_KEY = 'gym_cycle_start';

export function getCycleStart(usuario, tipo) {
  const all = read(CYCLE_KEY) || {};
  const key = `${usuario}::${tipo}`;
  return all[key] || '2000-01-01T00:00:00.000Z'; // epoch = everything counts
}

export function resetCycle(usuario, tipo) {
  const all = read(CYCLE_KEY) || {};
  const key = `${usuario}::${tipo}`;
  all[key] = new Date().toISOString();
  write(CYCLE_KEY, all);
}

export function isRutinaDoneInCycle(rutinaId, usuario, tipo) {
  const cycleStart = getCycleStart(usuario, tipo);
  const sesiones = getSesionesByRutina(rutinaId);
  return sesiones.some((s) => new Date(s.fecha) >= new Date(cycleStart));
}

export function checkCycleComplete(usuario, tipo) {
  const rutinas = getRutinas().filter((r) =>
    (r.tipo || 'gimnasio') === tipo &&
    r.usuario === usuario &&
    r.numero // only library routines (have numero)
  );
  if (rutinas.length === 0) return false;
  const allDone = rutinas.every((r) => isRutinaDoneInCycle(r.id, usuario, tipo));
  if (allDone) {
    resetCycle(usuario, tipo);
    return true;
  }
  return false;
}

// ── Plan generado (training plans) ────────────

export function getPlanGenerado(usuario) {
  const all = read(KEYS.planGenerado) || {};
  return all[usuario] || null;
}

export function savePlanGenerado(usuario, plan) {
  const all = read(KEYS.planGenerado) || {};
  plan.updatedAt = new Date().toISOString();
  all[usuario] = plan;
  write(KEYS.planGenerado, all);
  bumpVersion();
}

export function deletePlanGenerado(usuario) {
  const all = read(KEYS.planGenerado) || {};
  delete all[usuario];
  write(KEYS.planGenerado, all);
  bumpVersion();
}

// ── Progressive overload tracking ────────────

const PROGRESION_KEY = 'gym_ejercicio_progresion';

export function getProgresion(usuario, nombre) {
  const all = read(PROGRESION_KEY) || {};
  return all[usuario]?.[nombre] || null;
}

export function saveProgresion(usuario, nombre, data) {
  const all = read(PROGRESION_KEY) || {};
  if (!all[usuario]) all[usuario] = {};
  all[usuario][nombre] = { ...data, updatedAt: new Date().toISOString() };
  write(PROGRESION_KEY, all);
}

export function getAllProgresiones(usuario) {
  const all = read(PROGRESION_KEY) || {};
  return all[usuario] || {};
}

// ── Soft-delete purge (remove items deleted > 30 days ago) ──

const PURGE_DAYS = 30;

export function purgeDeleted() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PURGE_DAYS);

  let changed = false;

  const rutinas = _allRutinas();
  const rutinasBefore = rutinas.length;
  const rutinasAfter = rutinas.filter((r) => !r.deleted || new Date(r.deletedAt) > cutoff);
  if (rutinasAfter.length < rutinasBefore) {
    write(KEYS.rutinas, rutinasAfter);
    changed = true;
  }

  const sesiones = _allSesiones();
  const sesionesBefore = sesiones.length;
  const sesionesAfter = sesiones.filter((s) => !s.deleted || new Date(s.deletedAt) > cutoff);
  if (sesionesAfter.length < sesionesBefore) {
    write(KEYS.sesiones, sesionesAfter);
    changed = true;
  }

  if (changed) bumpVersion();
}
