/**
 * Biblioteca de rutinas importada desde Notion.
 * 113 rutinas de Gimnasio + 32 de Cross Training.
 * Cada rutina genera 2 variantes: H (Lean) y M (Nat).
 * Ejercicios reales extraídos de cada página de Notion.
 * Incluye dificultad (picante 🌶️) extraída de Notion.
 */
import { generateId } from '@/id.js';
import notionData from '@/data/notion-routines.json';

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

// ── Assign muscle group to each circuit ─────────

function assignCircuitGrupo(circuitName, routineGrupos, circuitIndex) {
  const cn = circuitName.toLowerCase();
  if (cn.includes('core')) return 'Core';

  // Distribute non-Core groups across non-Core circuits
  const nonCore = routineGrupos.filter((g) => g !== 'Core');
  if (nonCore.length === 0) return 'Core';
  return nonCore[(circuitIndex - 1) % nonCore.length] || nonCore[0];
}

// ── Parse chaleco (vest) info from circuit name ──

function parseChalecoFromName(circuitName) {
  const cn = circuitName.toLowerCase();
  const hasChaleco = cn.includes('chaleco') || cn.includes('🦺');
  if (!hasChaleco) return { chaleco: false, chalecoPeso: null };

  // Extract optional weight: "chaleco 10 kg" or "con chaleco x 14kg"
  const pesoMatch = circuitName.match(/chaleco\s+(?:x\s*)?(\d+)\s*kg/i);
  return {
    chaleco: true,
    chalecoPeso: pesoMatch ? `${pesoMatch[1]}kg` : null,
  };
}

// ── Build one rutina variant from Notion data ───

function buildFromNotion(entry, usuario) {
  const tipo = entry.t === 'C' ? 'cross' : 'gimnasio';
  const variant = usuario === 'Lean' ? entry.H : entry.M;
  const routineGrupos = parseGrupos(entry.n);

  const circuitos = variant.map((c, i) => {
    const grupo = assignCircuitGrupo(c.n, routineGrupos, i);
    const { chaleco, chalecoPeso } = parseChalecoFromName(c.n);

    const ejercicios = c.e.map((name) => ({
      id: generateId(),
      nombre: name,
      repsObjetivo: 10,
      pesoKg: 0,
    }));

    const circ = { id: generateId(), grupoMuscular: grupo, ejercicios };
    if (chaleco) {
      circ.chaleco = true;
      if (chalecoPeso) circ.chalecoPeso = chalecoPeso;
    }
    return circ;
  });

  return {
    id: generateId(),
    nombre: entry.n,
    diaSemana: null,
    tipo,
    numero: entry.num,
    picante: entry.p,
    usuario,
    creada: new Date().toISOString(),
    circuitos,
  };
}

// ── Public API ──────────────────────────────────

const gymData = notionData.filter((r) => r.t === 'G');
const crossData = notionData.filter((r) => r.t === 'C');

let _cache = null;

export function getBibliotecaRutinas() {
  if (_cache) return _cache;

  const result = [];

  for (const entry of gymData) {
    result.push(buildFromNotion(entry, 'Lean'));
    result.push(buildFromNotion(entry, 'Nat'));
  }

  for (const entry of crossData) {
    result.push(buildFromNotion(entry, 'Lean'));
    result.push(buildFromNotion(entry, 'Nat'));
  }

  _cache = result;
  return result;
}

export const GYM_COUNT = gymData.length;
export const CROSS_COUNT = crossData.length;
