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

function rutina(nombre, usuario, diaSemana, circuitos, { tipo = 'gimnasio', lugar = 'VILO_GYM', pushPull = null } = {}) {
  _seedNumero++;
  const r = {
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
  if (pushPull) r.pushPull = pushPull;
  return r;
}

// ── Lean (pesos mas altos) — Programadas ─────

function rutinasLean() {
  return [
    // Push = Lunes (1)
    rutina('Push - Pecho / Triceps 🏋️', 'Lean', 1, [
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
    rutina('Pull - Espalda / Biceps 🏋️', 'Lean', 3, [
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
    rutina('Full - Piernas / Espalda 🏋️', 'Lean', 5, [
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
    rutina('Push - Pecho / Triceps 🏋️‍♀️', 'Nat', 1, [
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
    rutina('Pull - Espalda / Biceps 🏋️‍♀️', 'Nat', 3, [
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
    rutina('Full - Piernas / Espalda 🏋️‍♀️', 'Nat', 5, [
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


// ── Sport Fitness rutinas (5+1 structure) ──────

function sportCirc(grupo, ejercicios) {
  return { id: generateId(), grupoMuscular: Array.isArray(grupo) ? grupo : [grupo], ejercicios };
}

function velCirc() {
  return sportCirc('HIIT', [{
    id: generateId(), nombre: 'Pasadas de velocidad', tipo: 'velocidad',
    equipment: 'treadmill',
    velocidad: 12, tiempo: 60, descanso: 60, cantidadPasadas: 5, inclinacion: 1,
  }]);
}

function rutinasSportLean() {
  const PRESS = { tipo: 'gimnasio', lugar: 'SPORT_FITNESS', pushPull: 'press' };
  const PULL = { tipo: 'gimnasio', lugar: 'SPORT_FITNESS', pushPull: 'pull' };
  return [
    rutina('Press A — Pecho + Brazos 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sentadilla con barra', 8, 70), ej('Peso muerto rumano', 10, 50), ej('Plancha', 1)]),
      sportCirc('Pecho', [ej('Press de pecho', 8, 55), ej('Pecho con polea doble', 12, 10)]),
      sportCirc('Espalda', [ej('Remo en maquina', 10, 65), ej('Dominadas abiertas', 8)]),
      sportCirc('Hombros', [ej('Empuje de hombros con barra en banco', 8, 25), ej('Face pulls', 15, 10)]),
      sportCirc('Brazos', [ej('Biceps en banco', 10, 25), ej('Triceps con polea', 10, 30)]),
      velCirc(),
    ], PRESS),
    rutina('Pull A — Espalda + Hombros 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Peso muerto con barra', 6, 80), ej('Sumo con barra', 8, 70), ej('Deadbug', 12)]),
      sportCirc('Espalda', [ej('Dominadas abiertas', 8), ej('Remo alto en polea', 10, 40)]),
      sportCirc('Hombros', [ej('Elevaciones de hombro adelante', 10, 10), ej('Vuelos laterales', 12, 8)]),
      sportCirc('Pecho', [ej('Fondos de pecho en maquina', 10, 50), ej('Pecho con polea doble', 12, 10)]),
      sportCirc('Brazos', [ej('Biceps alto en polea', 10, 25), ej('Triceps con polea', 10, 30)]),
      velCirc(),
    ], PULL),
    rutina('Press B — Pecho + Brazos 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sentadilla con barra', 8, 70), ej('Zancadas con mancuernas', 10, 16), ej('Complex', 10)]),
      sportCirc('Pecho', [ej('Press de pecho', 8, 55), ej('Fondos de pecho en maquina', 10, 50)]),
      sportCirc('Brazos', [ej('Biceps en banco', 10, 25), ej('Biceps alto en polea', 10, 25)]),
      sportCirc('Espalda', [ej('Remo en maquina', 10, 65), ej('Remo alto en polea', 10, 40)]),
      sportCirc('Hombros', [ej('Empuje de hombros con barra en banco', 8, 25), ej('Elevaciones de hombro adelante', 10, 10)]),
      velCirc(),
    ], PRESS),
    rutina('Pull B — Espalda + Brazos 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Peso muerto rumano', 10, 50), ej('Sumo con barra', 8, 70), ej('Pallof press', 12)]),
      sportCirc('Espalda', [ej('Dominadas abiertas', 8), ej('Remo en maquina', 10, 65)]),
      sportCirc('Brazos', [ej('Triceps con polea', 10, 30), ej('Biceps en banco', 10, 25)]),
      sportCirc('Pecho', [ej('Press de pecho', 8, 55), ej('Pecho con polea doble', 12, 10)]),
      sportCirc('Hombros', [ej('Face pulls', 15, 10), ej('Vuelos laterales', 12, 8)]),
      velCirc(),
    ], PULL),
    rutina('Press C — Full Upper 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sentadilla con barra', 8, 70), ej('Peso muerto con barra', 6, 80), ej('Espinales con disco', 15)]),
      sportCirc('Pecho', [ej('Press de pecho', 8, 55), ej('Fondos de pecho en maquina', 10, 50)]),
      sportCirc('Espalda', [ej('Dominadas abiertas', 8), ej('Remo alto en polea', 10, 40)]),
      sportCirc('Hombros', [ej('Empuje de hombros con barra en banco', 8, 25), ej('Elevaciones de hombro adelante', 10, 10)]),
      sportCirc('Brazos', [ej('Biceps alto en polea', 10, 25), ej('Triceps con polea', 10, 30)]),
      velCirc(),
    ], PRESS),
    // ── 5 más para rotar ──
    rutina('Press D — Hombros + Pecho 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Peso muerto rumano', 10, 50), ej('Sentadilla con barra', 8, 70), ej('Deadbug', 12)]),
      sportCirc('Hombros', [ej('Empuje de hombros con barra en banco', 8, 25), ej('Vuelos laterales', 12, 8)]),
      sportCirc('Pecho', [ej('Press de pecho', 8, 55), ej('Fondos de pecho en maquina', 10, 50)]),
      sportCirc('Espalda', [ej('Remo alto en polea', 10, 40), ej('Dominadas abiertas', 8)]),
      sportCirc('Brazos', [ej('Triceps con polea', 10, 30), ej('Biceps en banco', 10, 25)]),
      velCirc(),
    ], PRESS),
    rutina('Pull C — Espalda + Pecho 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sumo con barra', 8, 70), ej('Peso muerto con barra', 6, 80), ej('Plancha', 1)]),
      sportCirc('Espalda', [ej('Remo en maquina', 10, 65), ej('Remo alto en polea', 10, 40)]),
      sportCirc('Pecho', [ej('Pecho con polea doble', 12, 10), ej('Press de pecho', 8, 55)]),
      sportCirc('Hombros', [ej('Face pulls', 15, 10), ej('Elevaciones de hombro adelante', 10, 10)]),
      sportCirc('Brazos', [ej('Biceps alto en polea', 10, 25), ej('Triceps con polea', 10, 30)]),
      velCirc(),
    ], PULL),
    rutina('Pull D — Brazos + Hombros 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sentadilla con barra', 8, 70), ej('Zancadas con mancuernas', 10, 16), ej('Complex', 10)]),
      sportCirc('Brazos', [ej('Biceps en banco', 10, 25), ej('Triceps con polea', 10, 30)]),
      sportCirc('Hombros', [ej('Empuje de hombros con barra en banco', 8, 25), ej('Face pulls', 15, 10)]),
      sportCirc('Pecho', [ej('Fondos de pecho en maquina', 10, 50), ej('Pecho con polea doble', 12, 10)]),
      sportCirc('Espalda', [ej('Dominadas abiertas', 8), ej('Remo en maquina', 10, 65)]),
      velCirc(),
    ], PULL),
    rutina('Press E — Pecho + Hombros 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Peso muerto con barra', 6, 80), ej('Sumo con barra', 8, 70), ej('Pallof press', 12)]),
      sportCirc('Pecho', [ej('Press de pecho', 8, 55), ej('Pecho con polea doble', 12, 10)]),
      sportCirc('Hombros', [ej('Vuelos laterales', 12, 8), ej('Elevaciones de hombro adelante', 10, 10)]),
      sportCirc('Espalda', [ej('Remo en maquina', 10, 65), ej('Remo alto en polea', 10, 40)]),
      sportCirc('Brazos', [ej('Biceps en banco', 10, 25), ej('Biceps alto en polea', 10, 25)]),
      velCirc(),
    ], PRESS),
    rutina('Pull E — Full Strength 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Peso muerto con barra', 6, 80), ej('Sentadilla con barra', 8, 70), ej('Espinales con disco', 15)]),
      sportCirc('Espalda', [ej('Dominadas abiertas', 8), ej('Remo en maquina', 10, 65)]),
      sportCirc('Pecho', [ej('Press de pecho', 8, 55), ej('Fondos de pecho en maquina', 10, 50)]),
      sportCirc('Brazos', [ej('Triceps con polea', 10, 30), ej('Biceps alto en polea', 10, 25)]),
      sportCirc('Hombros', [ej('Empuje de hombros con barra en banco', 8, 25), ej('Face pulls', 15, 10)]),
      velCirc(),
    ], PULL),
  ];
}

function rutinasSportNat() {
  const PRESS = { tipo: 'gimnasio', lugar: 'SPORT_FITNESS', pushPull: 'press' };
  const PULL = { tipo: 'gimnasio', lugar: 'SPORT_FITNESS', pushPull: 'pull' };
  return [
    rutina('Pull A — Glúteos + Espalda 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sentadilla con barra', 8, 40), ej('Peso muerto dividido con barra', 10, 30), ej('Plancha', 1)]),
      sportCirc('Glúteos', [ej('Empuje de cadera en cajon', 12, 30), ej('Aductores en maquina', 15, 30)]),
      sportCirc('Espalda', [ej('Remo en maquina', 10, 40), ej('Dominada en maquina ascensor', 8, 35)]),
      sportCirc('Hombros', [ej('Elevaciones de hombro adelante', 10, 5), ej('Face pulls', 15, 5)]),
      sportCirc('Brazos', [ej('Triceps con polea', 10, 20), ej('Biceps con mancuerna', 10, 8)]),
      velCirc(),
    ], PULL),
    rutina('Press A — Glúteos + Pecho 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sumo con rusas', 10, 20), ej('Peso muerto rumano', 10, 30), ej('Deadbug', 12)]),
      sportCirc('Glúteos', [ej('Empuje de cadera en cajon', 12, 30), ej('Gluteos patada en polea', 12, 15)]),
      sportCirc('Pecho', [ej('Pecho con polea doble', 12, 5), ej('Fondos de pecho suspendido en maquina', 10, 25)]),
      sportCirc('Espalda', [ej('Remo en maquina separado', 10, 30), ej('Dominada sentada en maquina', 8, 30)]),
      sportCirc('Brazos', [ej('Triceps con polea', 10, 20), ej('Biceps polea con bolitas', 10, 10)]),
      velCirc(),
    ], PRESS),
    rutina('Pull B — Glúteos + Hombros 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sentadilla con barra', 8, 40), ej('Zancadas con mancuernas', 10, 10), ej('Complex', 10)]),
      sportCirc('Glúteos', [ej('Aductores en maquina', 15, 30), ej('Empuje de cadera en cajon', 12, 30)]),
      sportCirc('Hombros', [ej('Elevaciones de hombro hacia arriba', 10, 5), ej('Face pulls', 15, 5)]),
      sportCirc('Espalda', [ej('Dominada en maquina ascensor', 8, 35), ej('Remo en maquina', 10, 40)]),
      sportCirc('Brazos', [ej('Biceps con mancuerna', 10, 8), ej('Triceps con polea', 10, 20)]),
      velCirc(),
    ], PULL),
    rutina('Press B — Glúteos + Brazos 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Peso muerto dividido con barra', 10, 30), ej('Sumo con rusas', 10, 20), ej('Pallof press', 12)]),
      sportCirc('Glúteos', [ej('Gluteos patada en polea', 12, 15), ej('Empuje de cadera en cajon', 12, 30)]),
      sportCirc('Brazos', [ej('Triceps con polea', 10, 20), ej('Biceps polea con bolitas', 10, 10)]),
      sportCirc('Pecho', [ej('Pecho con polea doble', 12, 5), ej('Fondos de pecho suspendido en maquina', 10, 25)]),
      sportCirc('Hombros', [ej('Elevaciones de hombro adelante', 10, 5), ej('Face pulls', 15, 5)]),
      velCirc(),
    ], PRESS),
    rutina('Press C — Full Body 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sentadilla con barra', 8, 40), ej('Peso muerto rumano', 10, 30), ej('Espinales con disco', 15)]),
      sportCirc('Glúteos', [ej('Empuje de cadera en cajon', 12, 30), ej('Aductores en maquina', 15, 30)]),
      sportCirc('Pecho', [ej('Pecho con polea doble', 12, 5), ej('Fondos de pecho suspendido en maquina', 10, 25)]),
      sportCirc('Espalda', [ej('Remo en maquina', 10, 40), ej('Dominada en maquina ascensor', 8, 35)]),
      sportCirc('Brazos', [ej('Triceps con polea', 10, 20), ej('Biceps con mancuerna', 10, 8)]),
      velCirc(),
    ], PRESS),
    // ── 5 más para rotar ──
    rutina('Pull C — Glúteos + Piernas 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sentadilla con barra', 8, 40), ej('Zancadas con mancuernas', 10, 10), ej('Complex', 10)]),
      sportCirc('Glúteos', [ej('Empuje de cadera en cajon', 12, 30), ej('Gluteos patada en polea', 12, 15)]),
      sportCirc('Espalda', [ej('Dominada en maquina ascensor', 8, 35), ej('Remo en maquina separado', 10, 30)]),
      sportCirc('Hombros', [ej('Face pulls', 15, 5), ej('Elevaciones de hombro hacia arriba', 10, 5)]),
      sportCirc('Brazos', [ej('Triceps con polea', 10, 20), ej('Biceps con mancuerna', 10, 8)]),
      velCirc(),
    ], PULL),
    rutina('Press D — Glúteos + Full 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Peso muerto rumano', 10, 30), ej('Sumo con rusas', 10, 20), ej('Plancha', 1)]),
      sportCirc('Glúteos', [ej('Aductores en maquina', 15, 30), ej('Empuje de cadera en cajon', 12, 30)]),
      sportCirc('Pecho', [ej('Fondos de pecho suspendido en maquina', 10, 25), ej('Pecho con polea doble', 12, 5)]),
      sportCirc('Espalda', [ej('Remo en maquina', 10, 40), ej('Dominada sentada en maquina', 8, 30)]),
      sportCirc('Hombros', [ej('Elevaciones de hombro adelante', 10, 5), ej('Face pulls', 15, 5)]),
      velCirc(),
    ], PRESS),
    rutina('Pull D — Espalda + Glúteos 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sentadilla con barra', 8, 40), ej('Peso muerto dividido con barra', 10, 30), ej('Deadbug', 12)]),
      sportCirc('Glúteos', [ej('Gluteos patada en polea', 12, 15), ej('Aductores en maquina', 15, 30)]),
      sportCirc('Espalda', [ej('Dominada en maquina ascensor', 8, 35), ej('Remo en maquina', 10, 40)]),
      sportCirc('Brazos', [ej('Biceps polea con bolitas', 10, 10), ej('Triceps con polea', 10, 20)]),
      sportCirc('Pecho', [ej('Pecho con polea doble', 12, 5), ej('Fondos de pecho suspendido en maquina', 10, 25)]),
      velCirc(),
    ], PULL),
    rutina('Press E — Brazos + Glúteos 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Sumo con rusas', 10, 20), ej('Zancadas con mancuernas', 10, 10), ej('Pallof press', 12)]),
      sportCirc('Glúteos', [ej('Empuje de cadera en cajon', 12, 30), ej('Gluteos patada en polea', 12, 15)]),
      sportCirc('Brazos', [ej('Triceps con polea', 10, 20), ej('Biceps con mancuerna', 10, 8)]),
      sportCirc('Hombros', [ej('Face pulls', 15, 5), ej('Vuelos laterales', 10, 5)]),
      sportCirc('Espalda', [ej('Remo en maquina separado', 10, 30), ej('Dominada sentada en maquina', 8, 30)]),
      velCirc(),
    ], PRESS),
    rutina('Pull E — Full Tono 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Peso muerto rumano', 10, 30), ej('Sentadilla con barra', 8, 40), ej('Espinales con disco', 15)]),
      sportCirc('Glúteos', [ej('Empuje de cadera en cajon', 12, 30), ej('Aductores en maquina', 15, 30)]),
      sportCirc('Espalda', [ej('Remo en maquina', 10, 40), ej('Dominada en maquina ascensor', 8, 35)]),
      sportCirc('Pecho', [ej('Pecho con polea doble', 12, 5), ej('Fondos de pecho suspendido en maquina', 10, 25)]),
      sportCirc('Brazos', [ej('Biceps con mancuerna', 10, 8), ej('Triceps con polea', 10, 20)]),
      velCirc(),
    ], PULL),
  ];
}

// ── Cross/Funcional Sport Fitness (indoor, rain days) ──────

function rutinasCrossLean() {
  const PRESS = { tipo: 'cross', lugar: 'SPORT_FITNESS', pushPull: 'press' };
  const PULL = { tipo: 'cross', lugar: 'SPORT_FITNESS', pushPull: 'pull' };
  return [
    rutina('Cross Press A — KB + TRX 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Kettlebell goblet squat', 10, 24), ej('Kettlebell sumo deadlift', 10, 24), ej('Ab wheel rollout', 10)]),
      sportCirc('Pecho', [ej('Flexiones de pecho', 15), ej('TRX chest press', 12)]),
      sportCirc('Hombros', [ej('Kettlebell clean and press', 8, 16), ej('TRX face pull', 12)]),
      sportCirc('Brazos', [ej('TRX curl de biceps', 10), ej('Flexiones diamante', 10)]),
      sportCirc('Core', [ej('Mountain climbers', 20), ej('Bear crawl', 10)]),
      velCirc(),
    ], PRESS),
    rutina('Cross Pull A — KB + Barra 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Kettlebell front squat', 10, 20), ej('Jumping lunges', 10), ej('Kettlebell turkish get-up', 5, 16)]),
      sportCirc('Espalda', [ej('Dominadas en barra', 8), ej('Kettlebell row', 10, 20)]),
      sportCirc('Espalda', [ej('TRX row', 12), ej('Banda pull apart', 15)]),
      sportCirc('Brazos', [ej('Banda curl de biceps', 12), ej('TRX triceps extension', 10)]),
      sportCirc('Core', [ej('Plancha en codos', 1), ej('Deadbug', 12)]),
      velCirc(),
    ], PULL),
    rutina('Cross Press B — Calistenia 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Box jumps', 8), ej('Sentadilla con salto', 12), ej('Ab wheel rollout', 10)]),
      sportCirc('Pecho', [ej('Dips en paralelas', 10), ej('Flexiones de pecho', 15)]),
      sportCirc('Hombros', [ej('Kettlebell snatch', 8, 16), ej('Banda press de pecho', 12)]),
      sportCirc('Brazos', [ej('Flexiones diamante', 10), ej('TRX curl de biceps', 10)]),
      sportCirc('Core', [ej('Mountain climbers', 20), ej('Kettlebell turkish get-up', 5, 16)]),
      velCirc(),
    ], PRESS),
    rutina('Cross Pull B — Bandas + TRX 🏋️', 'Lean', null, [
      sportCirc(['Piernas', 'Core'], [ej('Kettlebell goblet squat', 10, 24), ej('Saltos laterales', 12), ej('Plancha en codos', 1)]),
      sportCirc('Espalda', [ej('Dominadas en barra', 8), ej('Banda remo', 12)]),
      sportCirc('Hombros', [ej('Kettlebell clean and press', 8, 16), ej('TRX face pull', 12)]),
      sportCirc('Brazos', [ej('Banda triceps pushdown', 12), ej('Banda curl de biceps', 12)]),
      sportCirc('Core', [ej('Bear crawl', 10), ej('Copenhague', 10)]),
      velCirc(),
    ], PULL),
  ];
}

function rutinasCrossNat() {
  const PRESS = { tipo: 'cross', lugar: 'SPORT_FITNESS', pushPull: 'press' };
  const PULL = { tipo: 'cross', lugar: 'SPORT_FITNESS', pushPull: 'pull' };
  return [
    rutina('Cross Press A — KB + TRX 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Kettlebell goblet squat', 10, 16), ej('Kettlebell sumo deadlift', 10, 16), ej('Plancha en codos', 1)]),
      sportCirc('Pecho', [ej('TRX chest press', 10), ej('Banda press de pecho', 12)]),
      sportCirc('Hombros', [ej('Kettlebell clean and press', 8, 8), ej('TRX face pull', 12)]),
      sportCirc('Glúteos', [ej('Banda hip thrust', 15), ej('Banda lateral walk', 15)]),
      sportCirc('Brazos', [ej('TRX curl de biceps', 10), ej('Banda triceps pushdown', 12)]),
      velCirc(),
    ], PRESS),
    rutina('Cross Pull A — KB + Barra 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Kettlebell front squat', 10, 12), ej('Banda sentadilla', 12), ej('Deadbug', 12)]),
      sportCirc('Espalda', [ej('TRX row', 12), ej('Banda remo', 12)]),
      sportCirc('Espalda', [ej('Banda pull apart', 15), ej('Kettlebell row', 10, 12)]),
      sportCirc('Glúteos', [ej('Banda hip thrust', 15), ej('Banda lateral walk', 15)]),
      sportCirc('Brazos', [ej('Banda curl de biceps', 12), ej('TRX triceps extension', 10)]),
      velCirc(),
    ], PULL),
    rutina('Cross Press B — Calistenia 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Kettlebell goblet squat', 10, 16), ej('Jumping lunges', 8), ej('Ab wheel rollout', 8)]),
      sportCirc('Pecho', [ej('Flexiones de pecho', 10), ej('TRX chest press', 10)]),
      sportCirc('Hombros', [ej('Kettlebell clean and press', 8, 8), ej('TRX face pull', 12)]),
      sportCirc('Glúteos', [ej('Banda lateral walk', 15), ej('Banda hip thrust', 15)]),
      sportCirc('Brazos', [ej('Flexiones diamante', 8), ej('Banda curl de biceps', 12)]),
      velCirc(),
    ], PRESS),
    rutina('Cross Pull B — Bandas 🏋️‍♀️', 'Nat', null, [
      sportCirc(['Piernas', 'Core'], [ej('Banda sentadilla', 12), ej('Kettlebell sumo deadlift', 10, 16), ej('Plancha en codos', 1)]),
      sportCirc('Espalda', [ej('Banda remo', 12), ej('TRX row', 12)]),
      sportCirc('Hombros', [ej('TRX face pull', 12), ej('Banda pull apart', 15)]),
      sportCirc('Glúteos', [ej('Banda hip thrust', 15), ej('Banda lateral walk', 15)]),
      sportCirc('Brazos', [ej('TRX triceps extension', 10), ej('TRX curl de biceps', 10)]),
      velCirc(),
    ], PULL),
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
  const CURRENT_SEED_V = '35'; // 35 = add C6 velocidad to SPORT_FITNESS routines missing it

  const seedRutinas = [
    ...rutinasLean(),
    ...rutinasNat(),
    ...getBibliotecaRutinas(),
    ...rutinasSportLean(),
    ...rutinasSportNat(),
    ...rutinasCrossLean(),
    ...rutinasCrossNat(),
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
      const hasMissingSFC6 = parsed.some((r) =>
        r.lugar === 'SPORT_FITNESS' && !r.custom && !r.deleted
        && (r.circuitos || []).length < 6
        && !(r.circuitos || []).some((c) =>
          (c.ejercicios || []).some((e) => e.tipo === 'velocidad' || e.tipo === 'hiit')
        )
      );
      const needsMigration = parsed.some((r) => r.numero && !r.usuario)
        || !hasNatVariants
        || libraryCount < EXPECTED_LIBRARY * 0.9
        || hasMissingSFC6;
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
          // Compare names without emojis to avoid false positives from v20 migration
          const stripEmoji = (s) => (s || '').replace(/[\u{1F300}-\u{1FAFF}\u{FE0F}\u{200D}]/gu, '').trim();
          for (const r of parsed) {
            if (r.numero && !r.custom) {
              const seed = seedRutinas.find((s) => s.numero === r.numero && s.tipo === r.tipo && s.usuario === r.usuario);
              if (seed && stripEmoji(r.nombre) !== stripEmoji(seed.nombre)) {
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
          // v34: also fix null lugar (old code set null for non-matching routines)
          for (const r of parsed) {
            if (r.lugar) continue; // already has a valid lugar — skip
            if (r.lugar === 'SPORT_FITNESS') continue; // never overwrite SF
            const nombre = (r.nombre || '').toLowerCase();
            const tipo = r.tipo || 'gimnasio';
            if (nombre.includes('🇺🇾') || nombre.includes('uruguay')) {
              r.lugar = 'URUGUAY';
            } else if (tipo === 'cross' || nombre.includes('río') || nombre.includes('rio')) {
              r.lugar = 'RIO';
            } else if (tipo === 'gimnasio') {
              r.lugar = 'VILO_GYM';
            }
            // else: unknown tipo — leave it undefined (will be fixed in v34 pass below)
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

          // ── Migration v20: add emojis to routine names (post-merge) ──
          for (const r of merged) {
            if (!r.nombre || r.custom) continue;
            const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(r.nombre);
            if (!hasEmoji && r.tipo === 'gimnasio') {
              r.nombre += r.usuario === 'Nat' ? ' 🏋️‍♀️' : ' 🏋️';
            }
          }

          // ── Migration v22: full rebuild Sport Fitness rutinas (5+1 structure) ──
          // C1: 2 piernas + 1 core | C2-C5: 2 ej upper body | C6: velocidad
          // Nat: C2 = glúteos, C3-C5 = upper body
          if (!seedV || parseInt(seedV, 10) < 22) {
            const sesiones = JSON.parse(localStorage.getItem('gym_sesiones') || '[]');
            const doneIds = new Set(sesiones.map((s) => s.rutinaId));

            // Exercise pools for rebuilding circuits
            const LEGS = [
              { n: 'Sentadilla con barra', r: 8 }, { n: 'Peso muerto rumano', r: 10 },
              { n: 'Peso muerto con barra', r: 6 }, { n: 'Zancadas con mancuernas', r: 10 },
              { n: 'Sumo con barra', r: 8 }, { n: 'Peso muerto dividido con barra', r: 10 },
            ];
            const CORE_EJS = [
              { n: 'Plancha', r: 1 }, { n: 'Deadbug', r: 12 },
              { n: 'Pallof press', r: 12 }, { n: 'Complex', r: 10 },
            ];
            const UPPER = {
              Pecho: [{ n: 'Press de pecho', r: 8 }, { n: 'Pecho con polea doble', r: 12 }, { n: 'Fondos de pecho en maquina', r: 10 }],
              Espalda: [{ n: 'Remo en maquina', r: 10 }, { n: 'Dominadas abiertas', r: 8 }, { n: 'Remo alto en polea', r: 10 }],
              Hombros: [{ n: 'Empuje de hombros con barra en banco', r: 8 }, { n: 'Elevaciones de hombro adelante', r: 10 }, { n: 'Face pulls', r: 15 }],
              Brazos: [{ n: 'Biceps en banco', r: 10 }, { n: 'Triceps con polea', r: 10 }, { n: 'Biceps alto en polea', r: 10 }],
            };
            const GLUT = [
              { n: 'Hip thrust con barra', r: 10 }, { n: 'Empuje de cadera en cajon', r: 12 },
              { n: 'Aductores en maquina', r: 15 }, { n: 'Gluteos patada en polea', r: 12 },
            ];

            function mkEj(t) {
              return {
                id: generateId(), nombre: t.n, repsObjetivo: t.r, pesoKg: 0,
                tipo: 'normal', series: [{ reps: t.r, pesoKg: 0 }, { reps: t.r, pesoKg: 0 }, { reps: t.r, pesoKg: 0 }],
              };
            }
            function mkCirc(grupo, ejercicios) {
              return { id: generateId(), grupoMuscular: Array.isArray(grupo) ? grupo : [grupo], ejercicios };
            }
            function pickN(arr, n) {
              const shuffled = [...arr].sort(() => Math.random() - 0.5);
              return shuffled.slice(0, n);
            }
            const VEL_CIRC = () => mkCirc('Cardio', [{
              id: generateId(), nombre: 'Pasadas de velocidad', tipo: 'velocidad',
              velocidad: 12, tiempo: 60, descanso: 30, cantidadPasadas: 3, inclinacion: 0,
            }]);

            // Upper body rotation: each routine gets a different combo
            const UPPER_COMBOS_M = [
              ['Pecho', 'Espalda', 'Hombros', 'Brazos'],
              ['Espalda', 'Pecho', 'Brazos', 'Hombros'],
              ['Pecho', 'Hombros', 'Espalda', 'Brazos'],
              ['Espalda', 'Brazos', 'Pecho', 'Hombros'],
              ['Hombros', 'Espalda', 'Pecho', 'Brazos'],
              ['Pecho', 'Brazos', 'Hombros', 'Espalda'],
            ];
            const UPPER_COMBOS_F = [
              ['Glúteos', 'Pecho', 'Espalda', 'Brazos'],
              ['Glúteos', 'Espalda', 'Hombros', 'Brazos'],
              ['Glúteos', 'Pecho', 'Hombros', 'Brazos'],
            ];

            let mIdx = 0, fIdx = 0;
            for (const r of merged) {
              if (r.lugar !== 'SPORT_FITNESS' || r.tipo !== 'gimnasio') continue;
              if (doneIds.has(r.id)) continue;
              if (!r.circuitos) continue;
              // Skip routines that already have 6 circuits — their content is correct
              if ((r.circuitos || []).length >= 6) continue;

              const isNat = r.usuario === 'Nat';
              const combo = isNat
                ? UPPER_COMBOS_F[fIdx++ % UPPER_COMBOS_F.length]
                : UPPER_COMBOS_M[mIdx++ % UPPER_COMBOS_M.length];

              // C1: 2 piernas + 1 core
              const c1 = mkCirc(['Piernas', 'Core'], [
                ...pickN(LEGS, 2).map(mkEj),
                mkEj(pickN(CORE_EJS, 1)[0]),
              ]);

              // C2-C5: from combo
              const upperCircs = combo.map((grupo) => {
                if (grupo === 'Glúteos') {
                  return mkCirc('Glúteos', pickN(GLUT, 2).map(mkEj));
                }
                const pool = UPPER[grupo];
                if (!pool) return null;
                return mkCirc(grupo, pickN(pool, 2).map(mkEj));
              }).filter(Boolean);

              // C6: velocidad
              r.circuitos = [c1, ...upperCircs.slice(0, 4), VEL_CIRC()];
              r.updatedAt = new Date().toISOString();
            }
          }

          // ── Force Sport Fitness as default for Lu/Mi/Vi ──
          {
            const gymDays = [1, 3, 5];
            const now = new Date().toISOString();
            for (const usuario of ['Lean', 'Nat']) {
              // Clear ALL diaSemana assignments for this user (start fresh)
              for (const r of merged) {
                if (r.usuario === usuario && r.diaSemana != null) {
                  r.diaSemana = null;
                  r.updatedAt = now;
                }
              }
              // Assign Sport Fitness Press/Pull to gym days:
              // Lu=Press, Mi=Pull, Vi=Press (default week pattern)
              const pressRutinas = merged.filter((r) =>
                r.lugar === 'SPORT_FITNESS' && r.usuario === usuario
                && r.tipo === 'gimnasio' && r.pushPull === 'press' && !r.deleted
              );
              const pullRutinas = merged.filter((r) =>
                r.lugar === 'SPORT_FITNESS' && r.usuario === usuario
                && r.tipo === 'gimnasio' && r.pushPull === 'pull' && !r.deleted
              );
              if (pressRutinas.length === 0 || pullRutinas.length === 0) continue;
              // Lu=Press[0], Mi=Pull[0], Vi=Press[1]
              const assignments = [
                { day: 1, r: pressRutinas[0] },
                { day: 3, r: pullRutinas[0] },
                { day: 5, r: pressRutinas[1] || pressRutinas[0] },
              ];
              for (const { day, r } of assignments) {
                r.diaSemana = day;
                r.updatedAt = now;
              }
            }

            // Also force plan semanal to gimnasio for Lu/Mi/Vi
            const planKey = 'gym_plan_semanal';
            const plan = JSON.parse(localStorage.getItem(planKey) || '{}');
            for (const usuario of ['Lean', 'Nat']) {
              if (!plan[usuario]) plan[usuario] = {};
              plan[usuario][1] = 'gimnasio'; // Lunes
              plan[usuario][3] = 'gimnasio'; // Miercoles
              plan[usuario][5] = 'gimnasio'; // Viernes
            }
            localStorage.setItem(planKey, JSON.stringify(plan));
          }

          // ── v30: Delete old-name Sport Fitness routines (pre push/pull rename) ──
          {
            const sesiones = JSON.parse(localStorage.getItem('gym_sesiones') || '[]');
            const doneIds = new Set(sesiones.map((s) => s.rutinaId));
            const before = merged.length;
            merged = merged.filter((r) => {
              if (r.lugar !== 'SPORT_FITNESS') return true;
              if (doneIds.has(r.id)) return true; // keep completed
              if (r.pushPull) return true; // new push/pull routine
              if (r.nombre?.includes('Press') || r.nombre?.includes('Pull')) return true;
              return false; // remove old-name SF routines
            });
            if (merged.length < before) {
              console.log(`[seed] v30: removed ${before - merged.length} old Sport Fitness routines`);
            }
          }

          // v30 override regeneration moved to post-merge (see below)

          // ── Migration v24→v26: clean up ejercicio meta ──
          // Remove bloated meta entries from old Notion-style exercise names
          // Only keep entries for exercises that exist in current rutinas
          {
            const META_KEY = 'gym_ejercicio_meta';
            const meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
            const activeNames = new Set();
            for (const r of merged) {
              for (const c of (r.circuitos || [])) {
                for (const e of (c.ejercicios || [])) {
                  if (e.nombre) activeNames.add(e.nombre);
                }
              }
            }
            // Remove entries for exercises that don't exist in any rutina
            let cleaned = false;
            for (const nombre of Object.keys(meta)) {
              if (!activeNames.has(nombre)) {
                delete meta[nombre];
                cleaned = true;
              }
            }
            if (cleaned) localStorage.setItem(META_KEY, JSON.stringify(meta));

            // Set usaPeso for all exercises that use weight (machines, barbells, dumbbells, etc.)
            const PESO_KW = ['barra', 'mancuerna', 'rusas', 'disco', 'peso', 'polea', 'maquina', 'máquina', 'press', 'curl', 'remo', 'fondos', 'aductores', 'elevaciones', 'vuelos', 'biceps', 'triceps', 'sentadilla', 'sumo', 'empuje', 'dominada', 'jalon', 'hip thrust', 'gluteos'];
            const NO_PESO = ['burpees', 'plancha', 'copenhague', 'deadbug', 'salto', 'complex', 'estrella', 'ruedita', 'ballwall'];
            for (const nombre of activeNames) {
              const lower = nombre.toLowerCase();
              if (lower.includes('velocidad') || lower.includes('pasada')) continue;
              const isNoPeso = NO_PESO.some((n) => lower === n || lower.startsWith(n));
              if (isNoPeso) continue;
              const shouldUsePeso = PESO_KW.some((kw) => lower.includes(kw));
              if (shouldUsePeso) {
                if (!meta[nombre]) meta[nombre] = { usaPeso: false, usaChaleco: false };
                meta[nombre].usaPeso = true;
              }
            }
            localStorage.setItem(META_KEY, JSON.stringify(meta));
          }

          // ── Migration v34: fix lugar for ALL merged routines (incl. newOnes) ──
          // buildFromNotion now sets lugar, but existing localStorage items may still
          // have lugar=null or lugar=undefined from before this fix.
          {
            function _assignLugar(r) {
              if (r.lugar && r.lugar !== 'null') return; // already valid
              const nombre = (r.nombre || '').toLowerCase();
              const tipo = r.tipo || 'gimnasio';
              if (nombre.includes('🇺🇾') || nombre.includes('uruguay')) {
                r.lugar = 'URUGUAY';
              } else if (tipo === 'cross' || nombre.includes('río') || nombre.includes('rio')) {
                r.lugar = 'RIO';
              } else if (tipo === 'gimnasio') {
                // Check if it should be SPORT_FITNESS by pushPull field (SF seeded routines have this)
                r.lugar = r.pushPull ? 'SPORT_FITNESS' : 'VILO_GYM';
              }
            }
            for (const r of merged) _assignLugar(r);
            console.log('[seed] v34: lugar fixed for', merged.filter((r) => !r.lugar).length, 'remaining untagged');
          }

          // ── Migration v34b: add HIIT circuit to VILO_GYM gym routines missing it ──
          // Bring 4-5 circuit biblioteca routines to 6 circuits by appending a
          // velocidad (HIIT) circuit. Non-destructive — existing circuits unchanged.
          {
            const sesiones34 = JSON.parse(localStorage.getItem('gym_sesiones') || '[]');
            const doneIds34 = new Set(sesiones34.map((s) => s.rutinaId));
            let hiitAdded = 0;
            for (const r of merged) {
              if (r.custom) continue;
              if (doneIds34.has(r.id)) continue; // don't touch completed routines
              if (r.tipo !== 'gimnasio') continue;
              if (r.lugar !== 'VILO_GYM') continue; // only biblioteca/Vilo routines
              const circCount = (r.circuitos || []).length;
              if (circCount >= 6) continue;
              // Check if already has a velocidad circuit
              const hasHiit = (r.circuitos || []).some((c) =>
                (c.ejercicios || []).some((e) => e.tipo === 'velocidad' || e.tipo === 'hiit')
              );
              if (hasHiit) continue;
              // Add velocidad (treadmill interval) circuit
              r.circuitos = [
                ...(r.circuitos || []),
                {
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
                },
              ];
              r.updatedAt = new Date().toISOString();
              hiitAdded++;
            }
            if (hiitAdded > 0) console.log(`[seed] v34b: added HIIT circuit to ${hiitAdded} VILO_GYM routines`);
          }

          // ── Migration v35: add C6 velocidad to SPORT_FITNESS routines missing it ──
          // Non-destructive: only appends the circuit, never replaces C1-C5.
          // Covers routines that were seeded before velCirc() was part of SF seed.
          {
            const sesiones35 = JSON.parse(localStorage.getItem('gym_sesiones') || '[]');
            const doneIds35 = new Set(sesiones35.map((s) => s.rutinaId));
            let sfC6Added = 0;
            for (const r of merged) {
              if (r.custom) continue;
              if (doneIds35.has(r.id)) continue;
              if (r.lugar !== 'SPORT_FITNESS') continue;
              const circCount = (r.circuitos || []).length;
              if (circCount >= 6) continue;
              const hasVel = (r.circuitos || []).some((c) =>
                (c.ejercicios || []).some((e) => e.tipo === 'velocidad' || e.tipo === 'hiit')
              );
              if (hasVel) continue;
              r.circuitos = [
                ...(r.circuitos || []),
                {
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
                },
              ];
              r.updatedAt = new Date().toISOString();
              sfC6Added++;
            }
            if (sfC6Added > 0) console.log(`[seed] v35: added C6 to ${sfC6Added} SPORT_FITNESS routines`);
          }

          // ── FINAL: Regenerate day_overrides with push/pull alternation ──
          // Uses shared _seedOverrides() — runs on the FINAL merged array
          // (called after localStorage.setItem below to use correct IDs)
          // Note: called explicitly after save below

          localStorage.setItem(KEY, JSON.stringify(merged));
          localStorage.setItem(SEED_VERSION, CURRENT_SEED_V);
          seedPlan(); // ensure plan exists
          _seedOverrides(merged); // regenerate push/pull overrides with final IDs
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
  _seedOverrides(seedRutinas); // generate push/pull overrides even on fresh seed
}

/**
 * Generate (or regenerate) gym_day_overrides from a given rutinas array.
 * Assigns Sport Fitness Press/Pull routines to Mon/Wed/Fri for 4 weeks.
 * Shared between fresh seed and migration paths.
 */
function _seedOverrides(rutinas) {
  const OV_KEY = 'gym_day_overrides';
  const gymDows = [1, 3, 5];
  const existingOv = JSON.parse(localStorage.getItem(OV_KEY) || '{}');
  const todayStr = new Date().toISOString().split('T')[0];

  for (const usuario of ['Lean', 'Nat']) {
    if (!existingOv[usuario]) existingOv[usuario] = {};

    // Clear future overrides to regenerate with correct IDs
    for (const dateStr of Object.keys(existingOv[usuario])) {
      if (dateStr > todayStr) delete existingOv[usuario][dateStr];
    }

    const pressRutinas = rutinas.filter((r) =>
      r.lugar === 'SPORT_FITNESS' && r.usuario === usuario
      && r.tipo === 'gimnasio' && r.pushPull === 'press' && !r.deleted
    );
    const pullRutinas = rutinas.filter((r) =>
      r.lugar === 'SPORT_FITNESS' && r.usuario === usuario
      && r.tipo === 'gimnasio' && r.pushPull === 'pull' && !r.deleted
    );
    if (pressRutinas.length === 0 || pullRutinas.length === 0) continue;

    let pressIdx = 0, pullIdx = 0;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    for (let w = 0; w < 4; w++) {
      const isEvenWeek = w % 2 === 0;
      for (let di = 0; di < gymDows.length; di++) {
        const dow = gymDows[di];
        const d = new Date(tomorrow);
        d.setDate(d.getDate() + w * 7);
        while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const isPress = isEvenWeek ? (di % 2 === 0) : (di % 2 !== 0);
        let r;
        if (isPress) {
          r = pressRutinas[pressIdx % pressRutinas.length];
          pressIdx++;
        } else {
          r = pullRutinas[pullIdx % pullRutinas.length];
          pullIdx++;
        }
        existingOv[usuario][dateStr] = { rutinaId: r.id, tipo: 'gimnasio', pushPull: r.pushPull };
      }
    }
  }
  localStorage.setItem(OV_KEY, JSON.stringify(existingOv));
}

function seedPlan() {
  const PLAN_KEY = 'gym_plan_semanal';
  const existing = localStorage.getItem(PLAN_KEY);
  // Lu/Mi/Vi = Sport Fitness (gimnasio), Sáb = funcional Río (cross), resto libre
  const targetPlan = {
    Lean: { 1: 'gimnasio', 3: 'gimnasio', 5: 'gimnasio', 6: 'cross' },
    Nat: { 1: 'gimnasio', 3: 'gimnasio', 5: 'gimnasio', 6: 'cross' },
  };
  if (!existing) {
    localStorage.setItem(PLAN_KEY, JSON.stringify(targetPlan));
    return;
  }
  // Update existing plan to add Sáb if not set
  try {
    const plan = JSON.parse(existing);
    let changed = false;
    for (const u of ['Lean', 'Nat']) {
      if (!plan[u]) plan[u] = {};
      if (!plan[u][6]) { plan[u][6] = 'cross'; changed = true; }
    }
    if (changed) localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {}
}
