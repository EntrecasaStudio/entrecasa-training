import { generateId } from './id.js';
import { getBibliotecaRutinas } from '@js/rutinas-biblioteca.js';

/**
 * Rutinas iniciales basadas en el programa de entrenamiento funcional.
 * Se crean 2 variantes (Lean y Nat):
 *   - 3 programadas (L/Mi/V) con diaSemana asignado
 *   - 139 de biblioteca (112 Gimnasio + 27 Cross Training) desde Notion
 *
 * Scheduling: Push=Lunes(1), Pull=Miercoles(3), Full=Viernes(5)
 */

function ej(nombre, repsObjetivo, pesoKg = 0) {
  return { id: generateId(), nombre, repsObjetivo, pesoKg };
}

function circ(grupoMuscular, ejercicios) {
  return { id: generateId(), grupoMuscular, ejercicios };
}

let _seedNumero = 0; // auto-increment for seed routines

function rutina(nombre, usuario, diaSemana, circuitos, { tipo = 'gimnasio', lugar = 'VILO_GYM' } = {}) {
  _seedNumero++;
  return {
    id: generateId(),
    nombre,
    usuario,
    diaSemana,
    tipo,
    numero: _seedNumero,
    lugar,
    creada: new Date().toISOString(),
    circuitos,
  };
}

// ── Lean (pesos mas altos) — Programadas ─────

function rutinasLean() {
  return [
    // Push = Lunes (1)
    rutina('Push - Pecho / Triceps', 'Lean', 1, [
      circ('Core', [
        ej('Espinales con disco', 15),
        ej('Complex', 10),
        ej('Crunch lateral con bajada de cadera', 15),
      ]),
      circ('Piernas', [
        ej('Sumo con barra', 8, 70),
        ej('Peso muerto dividido', 12, 16),
        ej('Burpees', 12),
      ]),
      circ('Pecho', [
        ej('Press de pecho', 8, 55),
        ej('Pecho con polea doble', 8, 2.5),
        ej('Fondos de pecho en maquina', 8),
      ]),
      circ('Brazos', [
        ej('Empuje de hombros con barra en banco', 8, 25),
        ej('Elevaciones de hombro adelante', 10, 10),
        ej('Triceps con polea', 10, 30),
      ]),
    ]),

    // Pull = Miercoles (3)
    rutina('Pull - Espalda / Biceps', 'Lean', 3, [
      circ('Core', [
        ej('Complex', 10),
        ej('Estrella', 15),
        ej('Abdominal de pie con banda cruzada', 8, 16),
      ]),
      circ('Piernas', [
        ej('Sumo con barra', 8, 70),
        ej('Empuje de cadera en cajon', 12, 16),
      ]),
      circ('Espalda', [
        ej('Remo en maquina', 8, 65),
        ej('Dominadas abiertas', 8),
        ej('Empuje de hombros en maquina', 10, 40),
      ]),
      circ('Brazos', [
        ej('Biceps en banco', 8, 25),
        ej('Vuelos laterales', 10, 8),
        ej('Biceps alto en polea', 8, 25),
      ]),
    ]),

    // Full = Viernes (5)
    rutina('Full - Piernas / Espalda', 'Lean', 5, [
      circ('Core', [
        ej('Copenhague', 12),
        ej('Deadbug', 15),
        ej('Plancha en pelota', 15),
      ]),
      circ('Piernas', [
        ej('Sentadilla con barra', 8, 70),
        ej('Salto a cajon alto', 8),
      ]),
      circ('Piernas', [
        ej('Cuadriceps en maquina', 15, 45),
        ej('Isquiotibiales en maquina', 12, 40),
      ]),
      circ('Espalda', [
        ej('Dominadas abiertas en maquina', 8, 50),
        ej('Remo en maquina', 8, 65),
      ]),
      circ('Brazos', [
        ej('Biceps en banco', 8, 25),
        ej('Empuje de hombro en maquina', 8, 45),
      ]),
    ]),
  ];
}

// ── Biblioteca: 139 rutinas de Notion (importadas) ──

// ── Nat (pesos mas bajos) — Programadas ──────

function rutinasNat() {
  return [
    // Push = Lunes (1)
    rutina('Push - Pecho / Triceps', 'Nat', 1, [
      circ('Core', [
        ej('Espinales con disco', 15),
        ej('Complex', 10),
        ej('Crunch lateral con bajada de cadera', 15),
      ]),
      circ('Piernas', [
        ej('Peso muerto dividido con barra', 8, 40),
        ej('Sumo con rusas', 10, 20),
      ]),
      circ('Pecho', [
        ej('Pecho con polea doble', 10, 5),
        ej('Fondos de pecho suspendido en maquina', 8, 30),
      ]),
      circ('Piernas', [
        ej('Aductores en maquina', 15, 30),
      ]),
      circ('Brazos', [
        ej('Elevaciones de hombro adelante', 10, 5),
        ej('Elevaciones de hombro hacia arriba', 10, 5),
        ej('Triceps con polea', 10, 20),
      ]),
    ]),

    // Pull = Miercoles (3)
    rutina('Pull - Espalda / Biceps', 'Nat', 3, [
      circ('Core', [
        ej('Complex', 10),
        ej('Copenhague', 8),
      ]),
      circ('Piernas', [
        ej('Peso muerto dividido con barra', 8, 40),
        ej('Empuje de cadera en cajon', 12, 16),
      ]),
      circ('Espalda', [
        ej('Dominada en maquina ascensor', 8, 35),
        ej('Remo en maquina separado', 10, 25),
      ]),
      circ('Brazos', [
        ej('Dominada sentada en maquina', 10, 15),
        ej('Biceps polea con bolitas', 12, 25),
        ej('Empuje de hombro en maquina', 8, 15),
      ]),
    ]),

    // Full = Viernes (5)
    rutina('Full - Piernas / Espalda', 'Nat', 5, [
      circ('Core', [
        ej('Copenhague', 12),
        ej('Deadbug', 15),
        ej('Plancha en codos', 15),
      ]),
      circ('Piernas', [
        ej('Sentadilla con barra', 8, 45),
        ej('Sentadilla con salto', 10),
      ]),
      circ('Espalda', [
        ej('Dominada en maquina ascensor', 8, 35),
        ej('Isquiotibiales en maquina', 15, 20),
        ej('Remo alto en polea', 10, 20),
      ]),
      circ('Brazos', [
        ej('Vuelos laterales', 12, 2),
        ej('Biceps con mancuerna', 10, 6),
        ej('Fondos de triceps con disco', 15, 10),
      ]),
    ]),
  ];
}


// ── Derive muscle groups from exercise names (for migration) ──

function deriveGruposFromNames(exerciseNames) {
  const freq = new Map();
  for (const name of exerciseNames) {
    const n = name.toLowerCase();
    const groups = [];
    if (n.includes('pecho') || n.includes('press de pecho') || n.includes('banco') || n.includes('fondos de pecho')) groups.push('Pecho');
    if (n.includes('espalda') || n.includes('serrucho') || n.includes('remo') || n.includes('pullup') || n.includes('dominada')) groups.push('Espalda');
    if (n.includes('pierna') || n.includes('sentadilla') || n.includes('bulgara') || n.includes('estocada') || n.includes('sumo') || n.includes('cuádricep') || n.includes('cuadricep') || n.includes('isquio') || n.includes('peso muerto') || n.includes('aductor')) groups.push('Piernas');
    if (n.includes('core') || n.includes('abdom') || n.includes('abmat') || n.includes('plancha') || n.includes('deadbug') || n.includes('hollow') || n.includes('copenha') || n.includes('espinal') || n.includes('complex') || n.includes('estrella') || n.includes('crunch') || n.includes('ruedita') || n.includes('ballwall')) groups.push('Core');
    if (n.includes('bíceps') || n.includes('biceps') || n.includes('tríceps') || n.includes('triceps') || n.includes('curl') || n.includes('martillo') || n.includes('inflador') || n.includes('francés')) groups.push('Brazos');
    if (n.includes('glúteo') || n.includes('gluteo') || n.includes('hip thrust') || n.includes('puente') || n.includes('cadera')) groups.push('Glúteos');
    if (n.includes('hombro') || n.includes('lateral') || n.includes('frontal') || n.includes('vuelo')) groups.push('Hombros');
    if (n.includes('corrida') || n.includes('cinta') || n.includes('bici') || n.includes('remo ergo')) groups.push('Cardio');
    if (n.includes('burpee') || n.includes('wall ball') || n.includes('trineo') || n.includes('salto')) groups.push('Piernas');
    for (const g of groups) freq.set(g, (freq.get(g) || 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
}

// ── Seed ──────────────────────────────────────

export function seedIfEmpty() {
  const KEY = 'gym_rutinas';
  const SEED_VERSION = 'gym_seed_version';
  const CURRENT_SEED_V = '19'; // 19 = lugar tag on rutinas

  const seedRutinas = [
    ...rutinasLean(),
    ...rutinasNat(),
    ...getBibliotecaRutinas(),
  ];

  // Expected library count: both H and M variants
  const EXPECTED_LIBRARY = seedRutinas.filter((r) => r.numero).length;

  try {
    const existing = localStorage.getItem(KEY);
    const seedV = localStorage.getItem(SEED_VERSION);

    if (existing && seedV === CURRENT_SEED_V) {
      const parsed = JSON.parse(existing);
      // Check data integrity:
      // 1) Library routines must have usuario field
      // 2) Must have both H and M variants (enough library routines)
      const libraryCount = parsed.filter((r) => r.numero).length;
      const hasNatVariants = parsed.some((r) => r.numero && r.usuario === 'Nat');
      const needsMigration = parsed.some((r) => r.numero && !r.usuario)
        || !hasNatVariants
        || libraryCount < EXPECTED_LIBRARY * 0.9;
      if (parsed.length > 0 && !needsMigration) {
        seedPlan(); // ensure plan exists even on existing data
        return; // Already seeded with current version
      }
    }

    // Merge strategy: keep user-edited routines, add new seed routines
    if (existing) {
      try {
        let parsed = JSON.parse(existing);
        if (parsed.length > 0) {
          // ── Migration v7: strip "Día X - " prefix from names ──
          for (const r of parsed) {
            const m = r.nombre && r.nombre.match(/^Día \d+ [-–] (.+)$/i);
            if (m) r.nombre = m[1];
          }

          // ── Migration v8: add picante field, set usuario on library routines ──
          for (const r of parsed) {
            if (r.picante === undefined) r.picante = 0;
          }

          // ── Migration v14: mark user-created routines with `custom` flag ──
          // Library routines have numeros from the Notion seed (1-113).
          // Any routine with a higher numero is user-created and must be preserved.
          const libraryNumeros = new Set(seedRutinas.filter((r) => r.numero).map((r) => r.numero));
          for (const r of parsed) {
            if (r.numero && !libraryNumeros.has(r.numero) && !r.custom) {
              r.custom = true;
            }
          }

          // ── Migration v14b: protect user-modified library routines ──
          // If a library routine was edited (has different name/circuitos), mark as custom
          for (const r of parsed) {
            if (r.numero && !r.custom) {
              const seed = seedRutinas.find((s) => s.numero === r.numero && s.tipo === r.tipo && s.usuario === r.usuario);
              if (seed && r.nombre !== seed.nombre) {
                r.custom = true; // user renamed it — protect from replacement
              }
            }
          }

          // ── Migration v15: cardio mode per-exercise (not per-circuit) ──
          for (const r of parsed) {
            for (const circ of (r.circuitos || [])) {
              const ct = circ.tipo;
              if (ct && ct !== 'normal') {
                for (const ej of circ.ejercicios) {
                  ej.tipo = ej.tipo || ct;
                  if (ct === 'velocidad' || ct === 'caminata') {
                    ej.velocidad = ej.velocidad ?? circ.velocidad ?? 12;
                    ej.tiempo = ej.tiempo ?? circ.tiempo ?? 30;
                    ej.descanso = ej.descanso ?? circ.descanso ?? 60;
                    ej.cantidadPasadas = ej.cantidadPasadas ?? circ.cantidadPasadas ?? 6;
                  } else if (ct === 'hiit') {
                    ej.workTime = ej.workTime ?? circ.workTime ?? 40;
                    ej.restTime = ej.restTime ?? circ.restTime ?? 20;
                    ej.rounds = ej.rounds ?? circ.rounds ?? 3;
                  }
                }
                delete circ.tipo;
                delete circ.velocidad; delete circ.tiempo; delete circ.descanso; delete circ.cantidadPasadas;
                delete circ.workTime; delete circ.restTime; delete circ.rounds;
              }
              // Ensure all exercises have tipo
              for (const ej of circ.ejercicios) {
                if (!ej.tipo) ej.tipo = 'normal';
              }
            }
          }

          // ── Migration v18: assign numero to routines missing it ──
          {
            const maxNum = parsed.reduce((m, r) => Math.max(m, r.numero || 0), 0);
            let next = Math.max(maxNum, seedRutinas.reduce((m, r) => Math.max(m, r.numero || 0), 0)) + 1;
            for (const r of parsed) {
              if (!r.numero) {
                r.numero = next++;
                r.tipo = r.tipo || 'gimnasio';
                r.updatedAt = new Date().toISOString();
              }
            }
          }

          // ── Migration v19: assign lugar tag to rutinas ──
          for (const r of parsed) {
            if (r.lugar === undefined) {
              const nombre = (r.nombre || '').toLowerCase();
              const tipo = r.tipo || 'gimnasio';
              if (nombre.includes('🇺🇾') || nombre.includes('uruguay')) {
                r.lugar = 'URUGUAY';
              } else if (tipo === 'cross' || nombre.includes('río') || nombre.includes('rio')) {
                r.lugar = 'RIO';
              } else if (tipo === 'gimnasio') {
                r.lugar = 'VILO_GYM';
              } else {
                r.lugar = null;
              }
            }
          }

          // ── Migration v16: recalculate grupoMuscular from exercise names ──
          for (const r of parsed) {
            for (const circ of (r.circuitos || [])) {
              const derived = deriveGruposFromNames(circ.ejercicios.map((e) => e.nombre).filter(Boolean));
              if (derived.length > 0) {
                circ.grupoMuscular = derived;
              }
            }
          }

          // ── Migration v10-12: rebuild library routines ──
          // v10 = chaleco flag on cross circuits
          // v11 = proper H/M usuario field on ALL library routines
          // v12 = fix missing M (Nat) variants + clean titles
          // Remove ALL old library routines and replace with fresh seed.
          // Preserve user-created routines (those without `numero`).
          let userCopies = [];
          const needsLibraryRebuild = !seedV
            || parseInt(seedV, 10) < 14
            || parsed.some((r) => r.numero && !r.usuario)
            || !parsed.some((r) => r.numero && r.usuario === 'Nat');
          if (needsLibraryRebuild) {
            // Keep user-created routines: those without `numero`, OR those
            // explicitly marked as custom (user-created copies get `custom: true`).
            userCopies = [];
            parsed = parsed.filter((r) => !r.numero || r.custom);
          }

          // ── Dedup: remove duplicate numeros (keep first per tipo+usuario) ──
          const seenNumeros = new Set();
          parsed = parsed.filter((r) => {
            if (r.numero) {
              const key = `${r.tipo || 'gimnasio'}::${r.numero}::${r.usuario || ''}`;
              if (seenNumeros.has(key)) return false;
              seenNumeros.add(key);
            }
            return true;
          });

          // Find routines that already exist by numero+tipo+usuario
          const existingNumeros = new Set(
            parsed.filter((r) => r.numero).map((r) => `${r.tipo || 'gimnasio'}::${r.numero}::${r.usuario || ''}`),
          );
          const existingNames = new Set(parsed.map((r) => `${r.nombre}::${r.usuario || ''}`));
          // Only add routines that don't exist yet
          const newOnes = seedRutinas.filter((r) => {
            if (r.numero) return !existingNumeros.has(`${r.tipo || 'gimnasio'}::${r.numero}::${r.usuario || ''}`);
            return !existingNames.has(`${r.nombre}::${r.usuario || ''}`);
          });
          // Merge: programmed + new library + user copies at the end
          const merged = [...parsed, ...newOnes, ...userCopies];
          localStorage.setItem(KEY, JSON.stringify(merged));
          localStorage.setItem(SEED_VERSION, CURRENT_SEED_V);
          seedPlan(); // ensure plan exists
          return;
        }
      } catch {
        // corrupted, fall through to full overwrite
      }
    }
  } catch {
    // corrupted data, overwrite
  }

  localStorage.setItem(SEED_VERSION, CURRENT_SEED_V);
  localStorage.setItem(KEY, JSON.stringify(seedRutinas));
  seedPlan();
}

function seedPlan() {
  const PLAN_KEY = 'gym_plan_semanal';
  if (localStorage.getItem(PLAN_KEY)) return;
  const defaultPlan = {
    Lean: { 1: 'gimnasio', 3: 'gimnasio', 5: 'gimnasio' },
    Nat: { 1: 'gimnasio', 3: 'gimnasio', 5: 'gimnasio' },
  };
  localStorage.setItem(PLAN_KEY, JSON.stringify(defaultPlan));
}
