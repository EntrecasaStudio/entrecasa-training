/**
 * Plan Generator — Creates training plans based on wizard config.
 *
 * Methodology:
 * - Minimum effective volume: 2-3 sets per muscle group per session
 * - Reps: 6-12 for hypertrophy
 * - Rest: 60-90s isolation / 2-3min compounds
 * - Target duration: 60-70min per session
 * - No core circuit at start — core via compounds + 2 accesory exercises max
 * - Exercises grouped by gym floor to minimize walking
 * - Deload every N weeks (configurable, default 5)
 */

import { generateId } from '@/id.js';
import { ejerciciosCatalogo } from '@js/ejercicios-catalogo.js';

// ── Exercise templates per muscle group ──────────

const EXERCISE_POOL = {
  Pecho: {
    compound: [
      { nombre: 'Press de banca con barra', reps: 8, peso: 0 },
      { nombre: 'Press de banca con mancuernas', reps: 10, peso: 0 },
      { nombre: 'Press inclinado con mancuernas', reps: 10, peso: 0 },
      { nombre: 'Pecho en banco inclinado con barra', reps: 8, peso: 0 },
    ],
    isolation: [
      { nombre: 'Aperturas en polea', reps: 12, peso: 0 },
      { nombre: 'Pecho con polea doble', reps: 12, peso: 0 },
      { nombre: 'Fondos de pecho en paralelas', reps: 10, peso: 0 },
    ],
  },
  Espalda: {
    compound: [
      { nombre: 'Dominadas abiertas', reps: 8, peso: 0 },
      { nombre: 'Remo con barra', reps: 10, peso: 0 },
      { nombre: 'Peso muerto con barra', reps: 6, peso: 0 },
      { nombre: 'Remo con mancuerna', reps: 10, peso: 0 },
    ],
    isolation: [
      { nombre: 'Jalon al pecho', reps: 10, peso: 0 },
      { nombre: 'Remo en polea baja', reps: 12, peso: 0 },
      { nombre: 'Remo en maquina', reps: 12, peso: 0 },
    ],
  },
  Piernas: {
    compound: [
      { nombre: 'Sentadilla con barra', reps: 8, peso: 0 },
      { nombre: 'Peso muerto rumano', reps: 10, peso: 0 },
      { nombre: 'Zancadas con mancuernas', reps: 10, peso: 0 },
      { nombre: 'Bulgarian split squat', reps: 10, peso: 0 },
    ],
    isolation: [
      { nombre: 'Prensa de piernas', reps: 12, peso: 0 },
      { nombre: 'Cuadriceps en maquina', reps: 12, peso: 0 },
      { nombre: 'Isquiotibiales en maquina', reps: 12, peso: 0 },
    ],
  },
  'Glúteos': {
    compound: [
      { nombre: 'Hip thrust con barra', reps: 10, peso: 0 },
      { nombre: 'Sentadilla sumo con mancuerna', reps: 12, peso: 0 },
    ],
    isolation: [
      { nombre: 'Gluteos patada en polea', reps: 12, peso: 0 },
      { nombre: 'Gluteos patada lateral en polea', reps: 12, peso: 0 },
      { nombre: 'Gluteos en maquina', reps: 12, peso: 0 },
    ],
  },
  Hombros: {
    compound: [
      { nombre: 'Press militar con mancuernas', reps: 10, peso: 0 },
      { nombre: 'Press militar con barra', reps: 8, peso: 0 },
    ],
    isolation: [
      { nombre: 'Elevaciones laterales con mancuernas', reps: 15, peso: 0 },
      { nombre: 'Face pulls', reps: 15, peso: 0 },
      { nombre: 'Vuelos laterales', reps: 12, peso: 0 },
    ],
  },
  Brazos: {
    compound: [],
    isolation: [
      { nombre: 'Biceps con barra', reps: 10, peso: 0 },
      { nombre: 'Curl de biceps con mancuernas', reps: 12, peso: 0 },
      { nombre: 'Curl martillo', reps: 12, peso: 0 },
      { nombre: 'Triceps con polea', reps: 12, peso: 0 },
      { nombre: 'Extension de triceps sobre cabeza', reps: 12, peso: 0 },
      { nombre: 'Triceps frances en banco con barra', reps: 10, peso: 0 },
    ],
  },
  Core: {
    compound: [],
    isolation: [
      { nombre: 'Plancha', reps: 1, peso: 0 },
      { nombre: 'Deadbug', reps: 12, peso: 0 },
      { nombre: 'Pallof press', reps: 12, peso: 0 },
    ],
  },
};

// ── Split templates ──────────────────────────

const SPLITS = {
  2: [
    { name: 'Full Body A', groups: ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Core'] },
    { name: 'Full Body B', groups: ['Espalda', 'Piernas', 'Glúteos', 'Brazos', 'Core'] },
  ],
  3: [
    { name: 'Tren Superior', groups: ['Pecho', 'Espalda', 'Hombros', 'Brazos'] },
    { name: 'Tren Inferior', groups: ['Piernas', 'Glúteos', 'Core'] },
    { name: 'Full Body', groups: ['Espalda', 'Pecho', 'Piernas', 'Brazos'] },
  ],
  4: [
    { name: 'Pecho + Triceps', groups: ['Pecho', 'Brazos', 'Hombros'] },
    { name: 'Espalda + Biceps', groups: ['Espalda', 'Brazos'] },
    { name: 'Piernas + Gluteos', groups: ['Piernas', 'Glúteos', 'Core'] },
    { name: 'Hombros + Full', groups: ['Hombros', 'Pecho', 'Espalda', 'Brazos'] },
  ],
  5: [
    { name: 'Pecho', groups: ['Pecho', 'Core'] },
    { name: 'Espalda', groups: ['Espalda'] },
    { name: 'Piernas', groups: ['Piernas', 'Glúteos'] },
    { name: 'Hombros + Brazos', groups: ['Hombros', 'Brazos'] },
    { name: 'Full Body', groups: ['Pecho', 'Espalda', 'Piernas', 'Core'] },
  ],
};

// ── Helpers ──────────────────────────────────

function pick(arr, n = 1) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function createEjercicio(template, series = 3) {
  return {
    id: generateId(),
    nombre: template.nombre,
    repsObjetivo: template.reps,
    pesoKg: template.peso,
    tipo: 'normal',
    series: Array.from({ length: series }, () => ({
      reps: template.reps,
      pesoKg: template.peso,
    })),
  };
}

function createCircuito(grupo, ejercicios) {
  return {
    id: generateId(),
    grupoMuscular: [grupo],
    ejercicios,
  };
}

// ── Main generator ──────────────────────────

/**
 * Generate a single routine for a given split day.
 * @param {object} splitDay - { name, groups }
 * @param {object} config - wizard config
 * @param {string} usuario
 * @returns {object} rutina object ready for saveRutina()
 */
// Mandatory starter circuit for Sport Fitness: 2 compound legs + 1 core
const STARTER_LEGS = [
  { nombre: 'Sentadilla con barra', reps: 8, peso: 0 },
  { nombre: 'Peso muerto rumano', reps: 10, peso: 0 },
  { nombre: 'Peso muerto con barra', reps: 6, peso: 0 },
  { nombre: 'Zancadas con mancuernas', reps: 10, peso: 0 },
];
const STARTER_CORE = [
  { nombre: 'Plancha', reps: 1, peso: 0 },
  { nombre: 'Deadbug', reps: 12, peso: 0 },
  { nombre: 'Pallof press', reps: 12, peso: 0 },
  { nombre: 'Complex', reps: 10, peso: 0 },
  { nombre: 'Espinales con disco', reps: 15, peso: 0 },
];

// ── User-specific exercise adjustments ──────
// Nat (45 years): avoid high-impact, prefer joint-safe, add rotator cuff work
const NAT_REPLACEMENTS = {
  'Sentadilla con salto': 'Sentadilla con barra',
  'Bulgarian split squat': 'Prensa de piernas',
  'Dominadas abiertas': 'Jalon al pecho',
};
const NAT_EXTRAS = [
  { nombre: 'Face pulls', reps: 15, peso: 0 }, // rotator cuff health
];

function applyUserProfile(ejercicios, usuario) {
  if (usuario !== 'Nat') return ejercicios;
  // Replace high-impact exercises
  return ejercicios.map((ej) => {
    const replacement = NAT_REPLACEMENTS[ej.nombre];
    if (replacement) return { ...ej, nombre: replacement };
    return ej;
  });
}

function generateRoutine(splitDay, config, usuario, numero) {
  const focos = config.objetivos?.focos || [];
  const circuitos = [];
  const lugar = config.lugar || 'SPORT_FITNESS';

  // Sport Fitness: all routines start with a legs + core circuit
  if (lugar === 'SPORT_FITNESS') {
    const legPicks = pick(STARTER_LEGS, 2);
    const corePick = pick(STARTER_CORE, 1);
    let starterEjs = [
      ...legPicks.map((t) => createEjercicio(t, 3)),
      ...corePick.map((t) => createEjercicio(t, 3)),
    ];
    starterEjs = applyUserProfile(starterEjs, usuario);
    circuitos.push(createCircuito('Piernas', starterEjs));
  }

  for (const grupo of splitDay.groups) {
    // Skip Piernas and Core if already covered by starter circuit (Sport Fitness)
    if (lugar === 'SPORT_FITNESS' && (grupo === 'Piernas' || grupo === 'Core')) continue;

    const pool = EXERCISE_POOL[grupo];
    if (!pool) continue;

    const isFocus = focos.includes(grupo.toLowerCase()) || focos.includes(grupo);
    const series = isFocus ? 3 : 2;

    // Pick 1 compound + 1 isolation (2 if focus group)
    const compounds = pick(pool.compound, 1);
    const isolations = pick(pool.isolation, isFocus ? 2 : 1);
    const selected = [...compounds, ...isolations].filter(Boolean);

    if (selected.length > 0) {
      let ejercicios = selected.map((t) => createEjercicio(t, series));
      ejercicios = applyUserProfile(ejercicios, usuario);
      circuitos.push(createCircuito(grupo, ejercicios));
    }
  }

  // Nat: extra glúteos/piernas circuit + face pulls for rotator cuff
  if (usuario === 'Nat') {
    if (splitDay.groups.includes('Hombros')) {
      const hasHombroCirc = circuitos.find((c) => c.grupoMuscular.includes('Hombros'));
      const hasFacePull = hasHombroCirc?.ejercicios.some((e) => e.nombre === 'Face pulls');
      if (hasHombroCirc && !hasFacePull) {
        hasHombroCirc.ejercicios.push(createEjercicio(NAT_EXTRAS[0], 3));
      }
    }
    // One extra glúteos/piernas circuit for Nat
    if (lugar === 'SPORT_FITNESS' && !splitDay.groups.includes('Piernas')) {
      const glutPool = EXERCISE_POOL['Glúteos'];
      if (glutPool) {
        const glutEjs = pick([...glutPool.compound, ...glutPool.isolation], 2);
        circuitos.push(createCircuito('Glúteos', glutEjs.map((t) => createEjercicio(t, 3))));
      }
    }
  }

  // Sport Fitness: ensure exactly 5 training circuits
  if (lugar === 'SPORT_FITNESS') {
    // Pad with additional upper-body circuits if needed
    while (circuitos.length < 5) {
      const extraGroups = ['Pecho', 'Espalda', 'Hombros', 'Brazos'];
      const usedGroups = new Set(circuitos.flatMap((c) => c.grupoMuscular));
      const available = extraGroups.filter((g) => !usedGroups.has(g));
      const nextGroup = available[0] || extraGroups[circuitos.length % extraGroups.length];
      const pool = EXERCISE_POOL[nextGroup];
      if (!pool) break;
      let ejs = [...pick(pool.compound, 1), ...pick(pool.isolation, 1)].filter(Boolean);
      ejs = applyUserProfile(ejs.map((t) => createEjercicio(t, 3)), usuario);
      circuitos.push(createCircuito(nextGroup, ejs));
    }
    // Trim to 5 if too many
    if (circuitos.length > 5) circuitos.length = 5;

    // Circuit 6: Velocidad (3 pasadas, 60s run, 30s rest)
    circuitos.push({
      id: generateId(),
      grupoMuscular: ['Cardio'],
      ejercicios: [{
        id: generateId(),
        nombre: 'Pasadas de velocidad',
        tipo: 'velocidad',
        velocidad: 12,
        tiempo: 60,
        descanso: 30,
        cantidadPasadas: 3,
        inclinacion: 0,
      }],
    });
  }

  return {
    id: generateId(),
    nombre: splitDay.name,
    usuario,
    tipo: 'gimnasio',
    lugar,
    numero,
    custom: true,
    diaSemana: null,
    creada: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    circuitos,
  };
}

/**
 * Generate a deload variant of a routine (70% volume = fewer sets).
 */
function generateDeloadRoutine(routine) {
  const deload = JSON.parse(JSON.stringify(routine));
  deload.id = generateId();
  deload.nombre = routine.nombre + ' (deload)';
  for (const circ of deload.circuitos) {
    for (const ej of circ.ejercicios) {
      // Reduce to 2 series, reduce reps by ~30%
      if (ej.series) {
        ej.series = ej.series.slice(0, 2);
        for (const s of ej.series) {
          s.reps = Math.max(4, Math.round(s.reps * 0.7));
        }
      }
      ej.repsObjetivo = Math.max(4, Math.round(ej.repsObjetivo * 0.7));
    }
  }
  return deload;
}

/**
 * Generate the full training plan.
 * @param {object} config - wizard config
 * @param {string} usuario
 * @param {number} startNumero - next available routine numero
 * @returns {{ weeks: array, rutinas: array, rutinasDeload: array }}
 */
export function generatePlan(config, usuario, startNumero) {
  const numDays = config.diasGym.length;
  const splitTemplate = SPLITS[numDays] || SPLITS[3];
  const duracion = config.duracion || 12;
  const deloadCada = config.restricciones?.deloadCada || 5;

  // Generate base routines (one per split day)
  let numero = startNumero;
  const rutinas = splitTemplate.map((splitDay) => {
    const r = generateRoutine(splitDay, config, usuario, numero++);
    return r;
  });

  // Generate deload variants
  const rutinasDeload = rutinas.map((r) => {
    const d = generateDeloadRoutine(r);
    d.numero = numero++;
    return d;
  });

  // Build weekly schedule
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  // Find next Monday
  while (startDate.getDay() !== 1) startDate.setDate(startDate.getDate() + 1);

  const weeks = [];
  const gymDaysSorted = [...config.diasGym].sort((a, b) => a - b);

  for (let w = 0; w < duracion; w++) {
    const isDeload = (w + 1) % deloadCada === 0;
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + w * 7);

    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      const dayOfWeek = date.getDay(); // 0=Sun
      const dateStr = date.toISOString().split('T')[0];

      // Check if it's a gym day
      const gymIdx = gymDaysSorted.indexOf(dayOfWeek);
      if (gymIdx >= 0) {
        const routineIdx = gymIdx % rutinas.length;
        const r = isDeload ? rutinasDeload[routineIdx] : rutinas[routineIdx];
        days.push({ date: dateStr, tipo: 'gym', rutinaId: r.id, notas: '' });
        continue;
      }

      // Check complementary activities
      const comp = config.complementarias || {};
      let tipo = 'rest';

      // Running — but not on leg days
      if (comp.running?.dias?.includes(dayOfWeek)) {
        const isLegDay = gymDaysSorted.some((gd, i) => {
          if (gd !== dayOfWeek) return false;
          const splitGroups = splitTemplate[i % splitTemplate.length]?.groups || [];
          return splitGroups.includes('Piernas');
        });
        if (!isLegDay || !config.restricciones?.noRunningConPiernas) {
          tipo = 'running';
        }
      }
      if (tipo === 'rest' && comp.rucking?.dias?.includes(dayOfWeek)) tipo = 'rucking';
      if (tipo === 'rest' && comp.yoga?.dias?.includes(dayOfWeek)) tipo = 'yoga';

      // Sauna can overlap with gym days — add as note
      const hasSauna = comp.sauna?.dias?.includes(dayOfWeek);

      days.push({
        date: dateStr,
        tipo,
        notas: hasSauna && tipo !== 'rest' ? 'Sauna post-entreno' : hasSauna ? 'Sauna' : '',
      });
    }

    weeks.push({ weekNumber: w + 1, deload: isDeload, days });
  }

  return { weeks, rutinas, rutinasDeload };
}

/**
 * Build the full plan object ready for savePlanGenerado().
 */
export function buildPlanObject(config, usuario, startNumero) {
  const { weeks, rutinas, rutinasDeload } = generatePlan(config, usuario, startNumero);
  const allRutinas = [...rutinas, ...rutinasDeload];

  return {
    plan: {
      id: generateId(),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config,
      weeks,
      rutinasGeneradas: allRutinas.map((r) => r.id),
    },
    rutinas: allRutinas,
  };
}
