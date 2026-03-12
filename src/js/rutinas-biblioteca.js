/**
 * Biblioteca de rutinas importada desde Notion.
 * 112 rutinas de Gimnasio + 28 de Cross Training.
 * Cada rutina genera 2 variantes: H (Lean/hombre) y M (Nat/mujer).
 * Incluye dificultad (picante 🌶️) extraída de Notion.
 */
import { generateId } from '@/id.js';
import { ejerciciosCatalogo } from '@js/ejercicios-catalogo.js';

// ── Raw Notion data: [numero, titulo, picante] ──────────
// picante: 0 = fácil, 1 = 🌶️, 2 = 🌶️🌶️, 3 = 🌶️🌶️🌶️

const GYM = [
  [1, 'Press / empuje', 0],
  [2, 'Pull / tracción', 0],
  [3, 'Press / empuje', 0],
  [4, 'Pull / tracción', 0],
  [5, 'Press / empuje', 0],
  [6, 'Press / empuje - Máquinas', 0],
  [7, 'Pull / tracción', 0],
  [8, 'Press / empuje', 0],
  [9, 'Press / empuje', 0],
  [10, 'Press / empuje', 0],
  [11, 'Pull / tracción', 0],
  [12, 'Pull / Push', 0],
  [13, 'Pull / Push', 0],
  [14, 'Pull / Push', 0],
  [15, 'Press / empuje', 1],
  [16, 'Pull / Push', 0],
  [17, 'Press / Pull / Push', 0],
  [18, 'Press / Pull / Push', 0],
  [19, 'Press / Pull / Push', 0],
  [20, 'Press / Pull / Push', 0],
  [21, 'Pull / tracción', 0],
  [22, 'Press / empuje', 0],
  [23, 'tracción / empuje', 1],
  [24, 'Press / empuje', 1],
  [25, 'tracción / empuje', 1],
  [26, 'tracción / empuje', 1],
  [27, 'Full functional', 2],
  [28, 'Press / empuje', 0],
  [29, 'Press / empuje', 0],
  [30, 'Pull / tracción', 0],
  [31, 'Press / empuje', 0],
  [32, 'Press / empuje', 0],
  [33, 'Pull / tracción', 0],
  [34, 'Press / empuje', 0],
  [35, 'Pull / tracción', 0],
  [36, 'Press / empuje', 0],
  [37, 'tracción / empuje', 1],
  [38, 'tracción / empuje', 1],
  [39, 'tracción / empuje', 2],
  [40, 'Pull / tracción', 0],
  [41, 'Press / empuje', 2],
  [42, 'tracción / empuje', 2],
  [43, 'empuje - máquinas', 0],
  [44, 'tracción / empuje', 1],
  [45, 'empuje', 0],
  [46, 'tracción / empuje', 1],
  [47, 'Pull / tracción', 0],
  [48, 'empuje', 0],
  [49, 'Press / empuje - Máquinas', 0],
  [50, 'Pull / tracción', 0],
  [51, 'empuje - URU', 0],
  [52, 'empuje - URU', 0],
  [53, 'Pull / tracción - URU', 0],
  [54, 'empuje - URU larga', 3],
  [55, 'empuje - tracción', 2],
  [56, 'tracción larga', 3],
  [57, 'empuje - tracción', 2],
  [58, 'empuje - tracción', 2],
  [59, 'empuje - tracción larga', 3],
  [60, 'tracción', 1],
  [60, 'empuje', 1],
  [61, 'empuje', 3],
  [62, 'empuje / tracción / salto', 0],
  [63, 'tracción / espalda / piernas', 0],
  [64, 'empuje / pecho', 0],
  [65, 'tracción / espalda / piernas', 0],
  [66, 'piernas / bíceps / espalda', 1],
  [67, 'pecho / tríceps', 0],
  [68, 'piernas / pecho / hombros / tríceps', 0],
  [69, 'espalda / bíceps', 0],
  [70, 'pecho / bíceps / hombros', 1],
  [71, 'espalda / bíceps / piernas', 0],
  [72, 'pecho / bíceps / hombros', 0],
  [73, 'espalda / bíceps / piernas', 0],
  [74, 'pecho / tríceps / hombros', 0],
  [75, 'espalda / bíceps', 0],
  [76, 'espalda / bíceps', 0],
  [77, 'pecho / tríceps / hombros', 2],
  [78, 'espalda / bíceps / piernas', 1],
  [79, 'pecho / tríceps / hombros', 0],
  [80, 'pecho / tríceps / hombros', 1],
  [81, 'pecho / hombros / espalda', 2],
  [82, 'pecho / hombros / espalda / piernas', 1],
  [83, 'pecho / hombros / espalda / piernas', 1],
  [84, 'hombros / espalda / piernas', 0],
  [85, 'pecho / tríceps / hombros / piernas', 1],
  [86, 'espalda / bíceps / piernas', 1],
  [87, 'pecho / tríceps / hombros / piernas', 0],
  [88, 'pecho / tríceps / hombros / piernas', 0],
  [89, 'espalda / bíceps / piernas', 0],
  [90, 'pecho / tríceps / hombros / piernas', 0],
  [91, 'pecho / tríceps / hombros / piernas', 0],
  [92, 'espalda / bíceps / piernas', 0],
  [93, 'pecho / tríceps / hombros / piernas', 0],
  [94, 'espalda / bíceps / piernas', 1],
  [95, 'espalda / bíceps / piernas', 1],
  [96, 'espalda / bíceps / piernas', 0],
  [97, 'pecho / tríceps / hombros / piernas', 0],
  [98, 'espalda / bíceps / piernas', 0],
  [99, 'pecho / tríceps / hombros / piernas', 0],
  [100, 'espalda / bíceps / piernas', 0],
  [101, 'pecho / espalda / bíceps / hombros / piernas', 0],
  [102, 'pecho / hombros / piernas', 0],
  [103, 'pecho / hombros / piernas / brazos', 0],
  [104, 'espalda / bíceps / piernas', 0],
  [105, 'espalda / bíceps / piernas', 0],
  [106, 'pecho / hombros / piernas / brazos', 0],
  [107, 'pecho / hombros / piernas / brazos', 0],
  [108, 'espalda / bíceps / piernas', 0],
  [109, 'espalda / bíceps / piernas', 0],
  [110, 'pecho / hombros / piernas / brazos', 0],
  [111, 'pecho / hombros / piernas / brazos', 0],
  [112, 'espalda / bíceps / piernas', 0],
];

const CROSS = [
  [1, 'funcional', 0],
  [2, 'funcional', 0],
  [3, 'funcional', 0],
  [4, 'funcional', 0],
  [5, 'funcional', 0],
  [6, 'funcional', 0],
  [7, 'funcional', 0],
  [8, 'funcional', 0],
  [9, 'funcional', 0],
  [10, 'funcional', 0],
  [11, 'funcional', 0],
  [12, 'funcional', 0],
  [13, 'funcional', 0],
  [14, 'funcional', 0],
  [15, 'funcional', 1],
  [16, 'funcional', 0],
  [17, 'funcional', 1],
  [18, 'funcional', 0],
  [19, 'funcional', 0],
  [20, 'funcional', 0],
  [21, 'funcional', 0],
  [22, 'funcional', 0],
  [23, 'funcional', 0],
  [24, 'funcional', 0],
  [25, 'cross training', 0],
  [26, 'cross training', 0],
  [27, 'cross training', 0],
  [28, 'cross training', 3],
];

// ── Muscle group parser ─────────────────────────

function parseGrupos(titulo) {
  const t = titulo.toLowerCase();
  const g = new Set();

  if (t.includes('pecho')) g.add('Pecho');
  if (t.includes('espalda')) g.add('Espalda');
  if (t.includes('piernas')) g.add('Piernas');
  if (t.includes('bíceps') || t.includes('biceps')) g.add('Brazos');
  if (t.includes('tríceps') || t.includes('triceps')) g.add('Brazos');
  if (t.includes('brazos')) g.add('Brazos');
  if (t.includes('hombro')) g.add('Hombros');
  if (t.includes('glúteo') || t.includes('gluteo')) g.add('Glúteos');

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

  if (g.size > 0 && g.size < 3) {
    if ((t.includes('empuje') || t.includes('press')) && !g.has('Pecho')) {
      g.add('Pecho');
    }
    if ((t.includes('tracción') || t.includes('traccion') || t.includes('pull')) && !g.has('Espalda')) {
      g.add('Espalda');
    }
  }

  const result = ['Core', ...g];
  return [...new Set(result)];
}

// ── Exercise pool indexed by category ───────────

const _pool = {};
for (const e of ejerciciosCatalogo) {
  if (!_pool[e.categoria]) _pool[e.categoria] = [];
  _pool[e.categoria].push(e);
}

// ── Weight multipliers per user ─────────────────
const PESO_BASE = { Core: 5, Piernas: 40, Pecho: 35, Espalda: 40, Hombros: 20, Brazos: 20, 'Glúteos': 25 };
const NAT_WEIGHT_FACTOR = 0.6; // Nat uses ~60% of Lean's weights

// ── Build one rutina for a specific user ────────

function buildRutina(numero, titulo, tipo, picante, usuario, seed) {
  const grupos = parseGrupos(titulo);
  const isNat = usuario === 'Nat';
  const weightFactor = isNat ? NAT_WEIGHT_FACTOR : 1.0;

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
      const variance = 1 + ((seed + j) % 5 - 2) * 0.1;
      const peso = isFuncionalCore ? 0 : Math.round(base * variance * weightFactor);

      ejercicios.push({
        id: generateId(),
        nombre: cat.nombre,
        repsObjetivo: grupo === 'Core' ? 15 : (isNat ? 12 : 10),
        pesoKg: peso,
      });
    }

    return { id: generateId(), grupoMuscular: grupo, ejercicios };
  });

  return {
    id: generateId(),
    nombre: titulo,
    diaSemana: null,
    tipo,
    numero,
    picante,
    usuario,
    creada: new Date().toISOString(),
    circuitos,
  };
}

// ── Public API ──────────────────────────────────

let _cache = null;

export function getBibliotecaRutinas() {
  if (_cache) return _cache;

  const result = [];

  for (const [n, t, p] of GYM) {
    // H variant (Lean)
    result.push(buildRutina(n, t, 'gimnasio', p, 'Lean', n));
    // M variant (Nat)
    result.push(buildRutina(n, t, 'gimnasio', p, 'Nat', n + 1000));
  }

  for (const [n, t, p] of CROSS) {
    result.push(buildRutina(n, t, 'cross', p, 'Lean', n + 200));
    result.push(buildRutina(n, t, 'cross', p, 'Nat', n + 1200));
  }

  _cache = result;
  return result;
}

export const GYM_COUNT = GYM.length;
export const CROSS_COUNT = CROSS.length;
