/**
 * Catálogo completo de ejercicios extraído del programa de entrenamiento funcional (Notion).
 * Cada ejercicio tiene: nombre, categoria, tipo (funcional | maquina).
 *
 * Categorías: Core, Piernas, Glúteos, Pecho, Espalda, Hombros, Brazos
 * Tipos: funcional (peso libre / corporal), maquina (polea, máquina, etc.)
 */

export const CATEGORIAS = [
  'Core',
  'Piernas',
  'Glúteos',
  'Pecho',
  'Espalda',
  'Hombros',
  'Brazos',
  'Cardio',
];

export const ejerciciosCatalogo = [
  // ── Core ──────────────────────────────────────
  { nombre: 'Espinales con disco', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Complex', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Crunch lateral con bajada de cadera', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Deadbug', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Deadbug alternado y junto', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Copenhague', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Plancha en pelota', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Plancha en codos', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Estrella', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Estrella lateral con mancuerna', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Ruedita con subida de rodillas', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Abdominal de pie con banda cruzada', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Abdominales con elevacion de piernas', categoria: 'Core', tipo: 'funcional' },
  { nombre: 'Ballwall', categoria: 'Core', tipo: 'funcional' },

  // ── Piernas ───────────────────────────────────
  { nombre: 'Sentadilla con barra', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Sentadilla con salto', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Sentadilla y estocada alternada con peso', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Sentadilla con estocada y salto atras', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Sumo con barra', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Sumo con rusas', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Sumo con mancuerna al medio', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Peso muerto con barra', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Peso muerto dividido con barra', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Peso muerto dividido con rusas', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Peso muerto a una pierna', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Estocada hacia atras con barra', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Estocada atras en aire con anillas', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Estocada lateral con salto', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Estocadas alternadas', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Bulgaras con rusas', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Subida a banco alternando', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Salto a cajon alto', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Salto con sentadilla en el lugar', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Saltos laterales', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Cuadriceps en maquina', categoria: 'Piernas', tipo: 'maquina' },
  { nombre: 'Isquiotibiales en maquina', categoria: 'Piernas', tipo: 'maquina' },
  { nombre: 'Aductores en maquina', categoria: 'Piernas', tipo: 'maquina' },
  { nombre: 'Gemelos en maquina', categoria: 'Piernas', tipo: 'maquina' },
  { nombre: 'Empuje de cadera en cajon', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Elevacion de rodillas en cama elastica', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Trineo ida y vuelta', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Burpees', categoria: 'Piernas', tipo: 'funcional' },
  { nombre: 'Bandita dura con rodilla externa', categoria: 'Piernas', tipo: 'funcional' },

  // ── Glúteos ───────────────────────────────────
  { nombre: 'Gluteos en maquina', categoria: 'Glúteos', tipo: 'maquina' },
  { nombre: 'Gluteo en maquina por pierna', categoria: 'Glúteos', tipo: 'maquina' },
  { nombre: 'Gluteos patada en polea', categoria: 'Glúteos', tipo: 'maquina' },
  { nombre: 'Gluteos patada lateral en polea', categoria: 'Glúteos', tipo: 'maquina' },

  // ── Pecho ─────────────────────────────────────
  { nombre: 'Press de pecho', categoria: 'Pecho', tipo: 'maquina' },
  { nombre: 'Pecho con polea doble', categoria: 'Pecho', tipo: 'maquina' },
  { nombre: 'Pecho con brazos estirados en maquina', categoria: 'Pecho', tipo: 'maquina' },
  { nombre: 'Pecho en maquina dividida', categoria: 'Pecho', tipo: 'maquina' },
  { nombre: 'Pecho en banco inclinado con barra', categoria: 'Pecho', tipo: 'funcional' },
  { nombre: 'Fondos de pecho en paralelas', categoria: 'Pecho', tipo: 'funcional' },
  { nombre: 'Fondos de pecho con bandita', categoria: 'Pecho', tipo: 'funcional' },
  { nombre: 'Fondos de pecho en maquina', categoria: 'Pecho', tipo: 'maquina' },
  { nombre: 'Fondos de pecho suspendido en maquina', categoria: 'Pecho', tipo: 'maquina' },
  { nombre: 'Flexiones en paralelas', categoria: 'Pecho', tipo: 'funcional' },
  { nombre: 'Caminata a plancha con salto', categoria: 'Pecho', tipo: 'funcional' },

  // ── Espalda ───────────────────────────────────
  { nombre: 'Remo en maquina', categoria: 'Espalda', tipo: 'maquina' },
  { nombre: 'Remo en maquina separado', categoria: 'Espalda', tipo: 'maquina' },
  { nombre: 'Remo alto en polea', categoria: 'Espalda', tipo: 'maquina' },
  { nombre: 'Remo con soga bajando acostado', categoria: 'Espalda', tipo: 'funcional' },
  { nombre: 'Remo con barra', categoria: 'Espalda', tipo: 'funcional' },
  { nombre: 'Dominadas abiertas', categoria: 'Espalda', tipo: 'funcional' },
  { nombre: 'Dominadas abiertas en maquina', categoria: 'Espalda', tipo: 'maquina' },
  { nombre: 'Dominada en maquina ascensor', categoria: 'Espalda', tipo: 'maquina' },
  { nombre: 'Dominada sentada en maquina', categoria: 'Espalda', tipo: 'maquina' },
  { nombre: 'Espalda trayendo en maquina dividida', categoria: 'Espalda', tipo: 'maquina' },
  { nombre: 'Espalda abriendo brazos en maquina', categoria: 'Espalda', tipo: 'maquina' },
  { nombre: 'Serrucho', categoria: 'Espalda', tipo: 'funcional' },

  // ── Hombros ───────────────────────────────────
  { nombre: 'Empuje de hombro en maquina', categoria: 'Hombros', tipo: 'maquina' },
  { nombre: 'Empuje de hombros con barra en banco', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Hombros empuje con mancuerna', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Hombros empuje hacia arriba en maquina', categoria: 'Hombros', tipo: 'maquina' },
  { nombre: 'Hombros sentado con mancuerna', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Hombros abriendo brazos estirados', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Hombro con rodilla apoyada', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Press de hombro inclinado con barra', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Elevaciones de hombro adelante', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Elevaciones de hombro hacia arriba', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Elevaciones de hombro redondo', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Elevaciones de hombro sentada', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Elevacion de hombros frontal con disco', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Vuelos laterales', categoria: 'Hombros', tipo: 'funcional' },
  { nombre: 'Vuelos frontales', categoria: 'Hombros', tipo: 'funcional' },

  // ── Brazos (Bíceps) ───────────────────────────
  { nombre: 'Biceps en banco con barra', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Biceps en banco inclinado', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Biceps con barra', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Biceps con mancuerna', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Biceps mancuerna sosteniendo a 90', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Biceps en polea', categoria: 'Brazos', tipo: 'maquina' },
  { nombre: 'Biceps en polea con soga', categoria: 'Brazos', tipo: 'maquina' },
  { nombre: 'Biceps polea con bolitas', categoria: 'Brazos', tipo: 'maquina' },
  { nombre: 'Biceps alto en polea', categoria: 'Brazos', tipo: 'maquina' },

  // ── Brazos (Tríceps) ──────────────────────────
  { nombre: 'Triceps con polea', categoria: 'Brazos', tipo: 'maquina' },
  { nombre: 'Triceps con polea pegado', categoria: 'Brazos', tipo: 'maquina' },
  { nombre: 'Triceps alto en polea', categoria: 'Brazos', tipo: 'maquina' },
  { nombre: 'Triceps con bocha en polea', categoria: 'Brazos', tipo: 'maquina' },
  { nombre: 'Triceps frances en banco con barra', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Triceps french press con barra corta', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Triceps hacia arriba con mancuerna', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Fondos de triceps con disco', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Fondos de triceps en anillas', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Fondos de triceps en suspension', categoria: 'Brazos', tipo: 'funcional' },
  { nombre: 'Fondos de triceps entre cajas con disco', categoria: 'Brazos', tipo: 'funcional' },

  // ── Cardio ──────────────────────────────────
  { nombre: 'Pasadas de velocidad', categoria: 'Cardio', tipo: 'funcional' },
  { nombre: 'Corrida continua', categoria: 'Cardio', tipo: 'funcional' },
  { nombre: 'Caminata en cinta', categoria: 'Cardio', tipo: 'funcional' },
  { nombre: 'Bicicleta fija', categoria: 'Cardio', tipo: 'maquina' },
  { nombre: 'Eliptico', categoria: 'Cardio', tipo: 'maquina' },
  { nombre: 'Remo ergometro', categoria: 'Cardio', tipo: 'maquina' },
  { nombre: 'Saltar la soga', categoria: 'Cardio', tipo: 'funcional' },
  { nombre: 'Escalador', categoria: 'Cardio', tipo: 'funcional' },
];

// ── Custom exercises (user-created, persisted in localStorage) ──

const CUSTOM_KEY = 'gym_ejercicios_custom';

export function getEjerciciosCustom() {
  return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
}

export function addEjercicioCustom(nombre, categoria, tipo = 'funcional') {
  const custom = getEjerciciosCustom();
  // Avoid duplicates
  if (custom.some((e) => e.nombre.toLowerCase() === nombre.toLowerCase())) return;
  custom.push({ nombre, categoria, tipo });
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
}

/**
 * Update the tipo (funcional/maquina) of an exercise.
 * If it's a custom exercise, updates in localStorage.
 * For catalog exercises, stores override in custom key.
 */
export function updateEjercicioTipo(nombre, tipo) {
  const custom = getEjerciciosCustom();
  const idx = custom.findIndex((e) => e.nombre === nombre);
  if (idx >= 0) {
    custom[idx].tipo = tipo;
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
  }
  // For catalog exercises, the tipo override is stored in ejercicio_meta
}

/**
 * Returns ALL exercises: base catalog + custom.
 */
export function getTodosLosEjercicios() {
  return [...ejerciciosCatalogo, ...getEjerciciosCustom()];
}

/**
 * Search exercises filtered by an array of categories and optional query.
 * @param {string[]} categorias
 * @param {string} query
 * @returns {Array}
 */
export function buscarEjerciciosPorCategorias(categorias, query = '') {
  const todos = getTodosLosEjercicios();
  const q = query.toLowerCase().trim();
  return todos.filter(
    (e) => categorias.includes(e.categoria) && (!q || e.nombre.toLowerCase().includes(q)),
  );
}

/**
 * Devuelve los ejercicios agrupados por categoría.
 * @param {string|null} tipo - 'funcional', 'maquina', o null para todos
 * @returns {Object.<string, Array>}
 */
export function getEjerciciosPorCategoria(tipo = null) {
  const todos = getTodosLosEjercicios();
  const filtrados = tipo ? todos.filter((e) => e.tipo === tipo) : todos;

  const grouped = {};
  for (const cat of CATEGORIAS) {
    const items = filtrados.filter((e) => e.categoria === cat);
    if (items.length > 0) {
      grouped[cat] = items;
    }
  }
  return grouped;
}
