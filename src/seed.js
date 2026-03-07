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

function rutina(nombre, usuario, diaSemana, circuitos) {
  return {
    id: generateId(),
    nombre,
    usuario,
    diaSemana,
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


// ── Seed ──────────────────────────────────────

export function seedIfEmpty() {
  const KEY = 'gym_rutinas';
  const SEED_VERSION = 'gym_seed_version';
  const CURRENT_SEED_V = '6'; // Bump when seed data changes (6 = shared routines dedup)

  const seedRutinas = [
    ...rutinasLean(),
    ...rutinasNat(),
    ...getBibliotecaRutinas(),
  ];

  try {
    const existing = localStorage.getItem(KEY);
    const seedV = localStorage.getItem(SEED_VERSION);

    if (existing && seedV === CURRENT_SEED_V) {
      const parsed = JSON.parse(existing);
      if (parsed.length > 0) {
        seedPlan(); // ensure plan exists even on existing data
        return; // Already seeded with current version
      }
    }

    // Merge strategy: keep user-edited routines, add new seed routines
    if (existing) {
      try {
        let parsed = JSON.parse(existing);
        if (parsed.length > 0) {
          // ── Dedup: remove duplicate numeros (keep first occurrence) ──
          const seenNumeros = new Set();
          parsed = parsed.filter((r) => {
            if (r.numero) {
              const key = `${r.tipo || 'gimnasio'}::${r.numero}`;
              if (seenNumeros.has(key)) return false;
              seenNumeros.add(key);
            }
            return true;
          });

          // Find routines that already exist by numero
          const existingNumeros = new Set(
            parsed.filter((r) => r.numero).map((r) => `${r.tipo || 'gimnasio'}::${r.numero}`),
          );
          const existingNames = new Set(parsed.map((r) => r.nombre));
          // Only add routines that don't exist yet
          const newOnes = seedRutinas.filter((r) => {
            if (r.numero) return !existingNumeros.has(`${r.tipo || 'gimnasio'}::${r.numero}`);
            return !existingNames.has(r.nombre);
          });
          const merged = [...parsed, ...newOnes];
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
