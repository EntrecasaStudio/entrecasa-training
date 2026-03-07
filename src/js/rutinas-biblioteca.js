/**
 * Biblioteca de rutinas importada desde Notion.
 * 112 rutinas de Gimnasio + 27 de Cross Training.
 * Genera circuitos automáticamente basados en los grupos musculares del título.
 */
import { generateId } from '@/id.js';
import { ejerciciosCatalogo } from '@js/ejercicios-catalogo.js';

// ── Raw Notion data: [numero, titulo] ──────────

const GYM = [
  [1, 'Press / empuje'],
  [2, 'Pull / tracción'],
  [3, 'Press / empuje'],
  [4, 'Pull / tracción'],
  [5, 'Press / empuje'],
  [6, 'Press / empuje - Máquinas'],
  [7, 'Pull / tracción'],
  [8, 'Press / empuje'],
  [9, 'Press / empuje'],
  [10, 'Press / empuje'],
  [11, 'Pull / tracción'],
  [12, 'Pull / Push'],
  [13, 'Pull / Push'],
  [14, 'Pull / Push'],
  [15, 'Press / empuje'],
  [16, 'Pull / Push'],
  [17, 'Press / Pull / Push'],
  [18, 'Press / Pull / Push'],
  [19, 'Press / Pull / Push'],
  [20, 'Press / Pull / Push'],
  [21, 'Pull / tracción'],
  [22, 'Press / empuje'],
  [23, 'tracción / empuje'],
  [24, 'Press / empuje'],
  [25, 'tracción / empuje'],
  [26, 'tracción / empuje'],
  [27, 'Full functional'],
  [28, 'Press / empuje'],
  [29, 'Press / empuje'],
  [30, 'Pull / tracción'],
  [31, 'Press / empuje'],
  [32, 'Press / empuje'],
  [33, 'Pull / tracción'],
  [34, 'Press / empuje'],
  [35, 'Pull / tracción'],
  [36, 'Press / empuje'],
  [37, 'tracción / empuje'],
  [38, 'tracción / empuje'],
  [39, 'tracción / empuje'],
  [40, 'Pull / tracción'],
  [41, 'Press / empuje'],
  [42, 'tracción / empuje'],
  [43, 'empuje - máquinas'],
  [44, 'tracción / empuje'],
  [45, 'empuje'],
  [46, 'tracción / empuje'],
  [47, 'Pull / tracción'],
  [48, 'empuje'],
  [49, 'Press / empuje - Máquinas'],
  [50, 'Pull / tracción'],
  [51, 'empuje - URU'],
  [52, 'empuje - URU'],
  [53, 'Pull / tracción - URU'],
  [54, 'empuje - URU larga'],
  [55, 'empuje - tracción'],
  [56, 'tracción larga'],
  [57, 'empuje - tracción'],
  [58, 'empuje - tracción'],
  [59, 'empuje - tracción larga'],
  [60, 'tracción'],
  [60, 'empuje'],
  [61, 'empuje'],
  [62, 'empuje / tracción / salto'],
  [63, 'tracción / espalda / piernas'],
  [64, 'empuje / pecho'],
  [65, 'tracción / espalda / piernas'],
  [66, 'piernas / bíceps / espalda'],
  [67, 'pecho / tríceps'],
  [68, 'piernas / pecho / hombros / tríceps'],
  [69, 'espalda / bíceps'],
  [70, 'pecho / bíceps / hombros'],
  [71, 'espalda / bíceps / piernas'],
  [72, 'pecho / bíceps / hombros'],
  [73, 'espalda / bíceps / piernas'],
  [74, 'pecho / tríceps / hombros'],
  [75, 'espalda / bíceps'],
  [76, 'espalda / bíceps'],
  [77, 'pecho / tríceps / hombros'],
  [78, 'espalda / bíceps / piernas'],
  [79, 'pecho / tríceps / hombros'],
  [80, 'pecho / tríceps / hombros'],
  [81, 'pecho / hombros / espalda'],
  [82, 'pecho / hombros / espalda / piernas'],
  [83, 'pecho / hombros / espalda / piernas'],
  [84, 'hombros / espalda / piernas'],
  [85, 'pecho / tríceps / hombros / piernas'],
  [86, 'espalda / bíceps / piernas'],
  [87, 'pecho / tríceps / hombros / piernas'],
  [88, 'pecho / tríceps / hombros / piernas'],
  [89, 'espalda / bíceps / piernas'],
  [90, 'pecho / tríceps / hombros / piernas'],
  [91, 'pecho / tríceps / hombros / piernas'],
  [92, 'espalda / bíceps / piernas'],
  [93, 'pecho / tríceps / hombros / piernas'],
  [94, 'espalda / bíceps / piernas'],
  [95, 'espalda / bíceps / piernas'],
  [96, 'espalda / bíceps / piernas'],
  [97, 'pecho / tríceps / hombros / piernas'],
  [98, 'espalda / bíceps / piernas'],
  [99, 'pecho / tríceps / hombros / piernas'],
  [100, 'espalda / bíceps / piernas'],
  [101, 'pecho / espalda / bíceps / hombros / piernas'],
  [102, 'pecho / hombros / piernas'],
  [103, 'pecho / hombros / piernas / brazos'],
  [104, 'espalda / bíceps / piernas'],
  [105, 'espalda / bíceps / piernas'],
  [106, 'pecho / hombros / piernas / brazos'],
  [107, 'pecho / hombros / piernas / brazos'],
  [108, 'espalda / bíceps / piernas'],
  [109, 'espalda / bíceps / piernas'],
  [110, 'pecho / hombros / piernas / brazos'],
  [111, 'pecho / hombros / piernas / brazos'],
  [112, 'espalda / bíceps / piernas'],
];

const CROSS = [
  [1, 'funcional'],
  [2, 'funcional'],
  [3, 'funcional'],
  [4, 'funcional'],
  [5, 'funcional'],
  [6, 'funcional'],
  [7, 'funcional'],
  [8, 'funcional'],
  [9, 'funcional'],
  [10, 'funcional'],
  [11, 'funcional'],
  [12, 'funcional'],
  [13, 'funcional'],
  [14, 'funcional'],
  [15, 'funcional'],
  [16, 'funcional'],
  [17, 'funcional'],
  [18, 'funcional'],
  [19, 'funcional'],
  [20, 'funcional'],
  [21, 'funcional'],
  [22, 'funcional'],
  [23, 'funcional'],
  [24, 'funcional'],
  [25, 'cross training'],
  [26, 'cross training'],
  [27, 'cross training'],
  [28, 'cross training'],
];

// ── Muscle group parser ─────────────────────────

function parseGrupos(titulo) {
  const t = titulo.toLowerCase();
  const g = new Set();

  // Explicit muscle groups in title
  if (t.includes('pecho')) g.add('Pecho');
  if (t.includes('espalda')) g.add('Espalda');
  if (t.includes('piernas')) g.add('Piernas');
  if (t.includes('bíceps') || t.includes('biceps')) g.add('Brazos');
  if (t.includes('tríceps') || t.includes('triceps')) g.add('Brazos');
  if (t.includes('brazos')) g.add('Brazos');
  if (t.includes('hombro')) g.add('Hombros');
  if (t.includes('glúteo') || t.includes('gluteo')) g.add('Glúteos');

  // Generic patterns (only if no explicit groups found)
  if (g.size === 0) {
    if (t.includes('empuje') || t.includes('press') || t.includes('push')) {
      g.add('Pecho');
      g.add('Hombros');
      g.add('Brazos');
    }
    if (t.includes('tracción') || t.includes('traccion') || t.includes('pull')) {
      g.add('Espalda');
      g.add('Brazos');
    }
    if (t.includes('funcional') || t.includes('cross') || t.includes('full')) {
      g.add('Core');
      g.add('Piernas');
    }
  }

  // Mixed patterns with explicit + generic
  if (g.size > 0 && g.size < 3) {
    if ((t.includes('empuje') || t.includes('press')) && !g.has('Pecho')) {
      g.add('Pecho');
    }
    if ((t.includes('tracción') || t.includes('traccion') || t.includes('pull')) && !g.has('Espalda')) {
      g.add('Espalda');
    }
  }

  // Always include Core as base circuit for all routines
  const result = ['Core', ...g];
  return [...new Set(result)];
}

// ── Exercise pool indexed by category ───────────

const _pool = {};
for (const e of ejerciciosCatalogo) {
  if (!_pool[e.categoria]) _pool[e.categoria] = [];
  _pool[e.categoria].push(e);
}

// ── Average weights per grupo (shared routines) ──

const PESO_BASE = { Core: 5, Piernas: 40, Pecho: 35, Espalda: 40, Hombros: 20, Brazos: 20, 'Glúteos': 25 };

// ── Build one rutina ────────────────────────────

function buildRutina(numero, titulo, tipo, seed) {
  const grupos = parseGrupos(titulo);

  const circuitos = grupos.map((grupo, i) => {
    const pool = _pool[grupo] || _pool.Core;
    const ejCount = grupo === 'Core' ? 3 : 2;
    const offset = (seed * 3 + i * 7) % pool.length;

    const ejercicios = [];
    for (let j = 0; j < ejCount && j < pool.length; j++) {
      const idx = (offset + j) % pool.length;
      const cat = pool[idx];
      const isFuncionalCore = grupo === 'Core' && cat.tipo === 'funcional';
      const base = PESO_BASE[grupo] || 0;
      // Vary weight ±20% based on seed
      const variance = 1 + ((seed + j) % 5 - 2) * 0.1;
      const peso = isFuncionalCore ? 0 : Math.round(base * variance);

      ejercicios.push({
        id: generateId(),
        nombre: cat.nombre,
        repsObjetivo: grupo === 'Core' ? 15 : 10,
        pesoKg: peso,
      });
    }

    return { id: generateId(), grupoMuscular: grupo, ejercicios };
  });

  return {
    id: generateId(),
    nombre: `Día ${numero} - ${titulo}`,
    diaSemana: null,
    tipo,
    numero,
    creada: new Date().toISOString(),
    circuitos,
  };
}

// ── Public API ──────────────────────────────────

let _cache = null;

export function getBibliotecaRutinas() {
  if (_cache) return _cache;

  const result = [];

  for (const [n, t] of GYM) {
    result.push(buildRutina(n, t, 'gimnasio', n));
  }

  for (const [n, t] of CROSS) {
    result.push(buildRutina(n, t, 'cross', n + 200));
  }

  _cache = result;
  return result;
}

export const GYM_COUNT = GYM.length;
export const CROSS_COUNT = CROSS.length;
