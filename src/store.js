const KEYS = {
  rutinas: 'gym_rutinas',
  sesiones: 'gym_sesiones',
  workoutActivo: 'gym_workout_activo',
  usuario: 'gym_usuario',
  planSemanal: 'gym_plan_semanal',
};

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
}

export function deleteRutina(id) {
  const rutinas = getRutinas().filter((r) => r.id !== id);
  write(KEYS.rutinas, rutinas);
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
}

// ── Usuario activo ──────────────────────────

export function getUsuarioActivo() {
  return localStorage.getItem(KEYS.usuario) || 'Lean';
}

export function setUsuarioActivo(nombre) {
  localStorage.setItem(KEYS.usuario, nombre);
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

  const rutinas = getRutinas().filter((r) => r.usuario === usuario);

  // First try: programmed routine for this day
  const programada = rutinas.find((r) => r.diaSemana === hoy);
  if (programada) return programada;

  // Fallback: first library routine of matching type
  return rutinas.find((r) => r.tipo === tipoHoy && r.diaSemana == null) || null;
}

export function getProximoEntrenamiento(usuario) {
  const hoy = new Date().getDay();
  const plan = getPlanSemanal(usuario);
  const rutinas = getRutinas().filter((r) => r.usuario === usuario);

  // Check next 7 days (starting tomorrow)
  for (let i = 1; i <= 7; i++) {
    const d = (hoy + i) % 7;
    const tipo = plan[d];
    if (!tipo) continue;

    // Find a routine for that day
    const rut =
      rutinas.find((r) => r.diaSemana === d) ||
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
}

// ── Stats helpers ───────────────────────────

export function getPersonalRecords(usuario) {
  const sesiones = getSesiones().filter((s) => s.usuario === usuario);
  const records = {}; // { nombre: { maxPeso, fecha } }
  for (const s of sesiones) {
    for (const c of s.circuitos) {
      for (const ej of c.ejercicios) {
        const key = ej.nombre;
        if (!records[key] || ej.pesoRealKg > records[key].maxPeso) {
          records[key] = { maxPeso: ej.pesoRealKg, fecha: s.fecha };
        }
      }
    }
  }
  return records;
}

export function calcVolumenSesion(sesion) {
  return sesion.circuitos.reduce(
    (sum, c) => sum + c.ejercicios.reduce((s, ej) => s + ej.repsReal * ej.pesoRealKg, 0),
    0,
  );
}

export function getPreviousSesion(sesion) {
  const all = getSesionesByRutina(sesion.rutinaId);
  const idx = all.findIndex((s) => s.id === sesion.id);
  return idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
}
