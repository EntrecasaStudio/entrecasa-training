import { queueSync } from '@js/services/sync.js';

const KEYS = {
  rutinas: 'gym_rutinas',
  sesiones: 'gym_sesiones',
  workoutActivo: 'gym_workout_activo',
  usuario: 'gym_usuario',
  planSemanal: 'gym_plan_semanal',
  dayOverrides: 'gym_day_overrides',
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

// ── Rutinas ──────────────────────────────────

export function getRutinas() {
  return read(KEYS.rutinas) || [];
}

export function getRutinaById(id) {
  return getRutinas().find((r) => r.id === id) || null;
}

export function saveRutina(rutina) {
  const rutinas = getRutinas();
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
  const rutinas = getRutinas().filter((r) => r.id !== id);
  write(KEYS.rutinas, rutinas);
  bumpVersion();
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
  rutinas.push(copia);
  write(KEYS.rutinas, rutinas);
  bumpVersion();
  return copia;
}

// ── Sesiones ─────────────────────────────────

export function getSesiones() {
  const sesiones = read(KEYS.sesiones) || [];
  return sesiones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export function getSesionById(id) {
  return (read(KEYS.sesiones) || []).find((s) => s.id === id) || null;
}

export function getSesionesByRutina(rutinaId) {
  return getSesiones().filter((s) => s.rutinaId === rutinaId);
}

export function saveSesion(sesion) {
  const sesiones = read(KEYS.sesiones) || [];
  sesiones.push(sesion);
  write(KEYS.sesiones, sesiones);
  bumpVersion();
}

export function updateSesion(sesion) {
  const sesiones = read(KEYS.sesiones) || [];
  const idx = sesiones.findIndex((s) => s.id === sesion.id);
  if (idx >= 0) {
    sesiones[idx] = sesion;
    write(KEYS.sesiones, sesiones);
    bumpVersion();
  }
}

export function deleteSesion(id) {
  const sesiones = read(KEYS.sesiones) || [];
  write(KEYS.sesiones, sesiones.filter((s) => s.id !== id));
  bumpVersion();
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

export function assignRutinaADia(rutinaId, dia, _usuario) {
  const rutinas = getRutinas();
  // Clear any routine currently assigned to this day (shared routines)
  for (const r of rutinas) {
    if (Number(r.diaSemana) === Number(dia)) {
      r.diaSemana = null;
    }
  }
  // Assign the new one
  const target = rutinas.find((r) => r.id === rutinaId);
  if (target) target.diaSemana = Number(dia);
  write(KEYS.rutinas, rutinas);
  bumpVersion();
}

export function clearRutinaDelDia(dia, _usuario) {
  const rutinas = getRutinas();
  for (const r of rutinas) {
    if (Number(r.diaSemana) === Number(dia)) {
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

  // First try: programmed routine for this day
  const programada = rutinas.find((r) => Number(r.diaSemana) === hoy);
  if (programada) return programada;

  // Fallback: first library routine of matching type
  return rutinas.find((r) => r.tipo === tipoHoy && r.diaSemana == null) || null;
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
      rutinas.find((r) => Number(r.diaSemana) === d) ||
      rutinas.find((r) => r.tipo === tipo && r.diaSemana == null);
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
      // Skip non-normal circuits (velocidad/HIIT don't have weight PRs)
      if ((c.tipo || 'normal') !== 'normal') continue;
      for (const ej of c.ejercicios) {
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
    (sum, c) => {
      // Skip non-normal circuits for volume calculation
      if ((c.tipo || 'normal') !== 'normal') return sum;
      return sum + c.ejercicios.reduce((s, ej) => {
        const vueltas = getEjVueltas(ej);
        return s + vueltas.reduce((vs, v) => vs + (v.repsReal * v.pesoRealKg), 0);
      }, 0);
    },
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
