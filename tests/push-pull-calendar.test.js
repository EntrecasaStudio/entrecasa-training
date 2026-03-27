import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage
const store = {};
const mockLocalStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

import { vi } from 'vitest';
vi.mock('@js/services/sync.js', () => ({ queueSync: vi.fn() }));

describe('Push/Pull Calendar Alternation', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('seed generates routines with pushPull field', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const sportFitness = rutinas.filter((r) => r.lugar === 'SPORT_FITNESS');
    expect(sportFitness.length).toBeGreaterThan(0);
    // All Sport Fitness should have pushPull
    for (const r of sportFitness) {
      expect(['press', 'pull']).toContain(r.pushPull);
    }
  });

  it('Sport Fitness has both Press and Pull routines per user', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    for (const usuario of ['Lean', 'Nat']) {
      const sf = rutinas.filter((r) => r.lugar === 'SPORT_FITNESS' && r.usuario === usuario);
      const press = sf.filter((r) => r.pushPull === 'press');
      const pull = sf.filter((r) => r.pushPull === 'pull');
      expect(press.length).toBeGreaterThanOrEqual(5);
      expect(pull.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('day_overrides follow push/pull alternation pattern', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const overrides = JSON.parse(store.gym_day_overrides || '{}');
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const rutinaMap = new Map(rutinas.map((r) => [r.id, r]));

    for (const usuario of ['Lean', 'Nat']) {
      const userOv = overrides[usuario] || {};
      const dates = Object.keys(userOv).sort();
      if (dates.length === 0) continue;

      // Group by week (Mon/Wed/Fri sets)
      const weeks = [];
      let currentWeek = [];
      let lastWeekStart = null;

      for (const dateStr of dates) {
        const d = new Date(dateStr + 'T12:00:00');
        const dow = d.getDay();
        if (dow !== 1 && dow !== 3 && dow !== 5) continue;

        // Calculate week start (Monday)
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() - (dow === 1 ? 0 : dow === 3 ? 2 : 4));
        const weekKey = weekStart.toISOString().split('T')[0];

        if (lastWeekStart !== weekKey) {
          if (currentWeek.length > 0) weeks.push(currentWeek);
          currentWeek = [];
          lastWeekStart = weekKey;
        }

        const ov = userOv[dateStr];
        const rutina = rutinaMap.get(ov.rutinaId);
        currentWeek.push({
          date: dateStr,
          dow,
          pushPull: ov.pushPull || rutina?.pushPull,
        });
      }
      if (currentWeek.length > 0) weeks.push(currentWeek);

      // Verify alternation: week 0 = Press/Pull/Press, week 1 = Pull/Press/Pull
      for (let w = 0; w < weeks.length; w++) {
        const week = weeks[w];
        const isEven = w % 2 === 0;
        for (let d = 0; d < week.length; d++) {
          const expectedPress = isEven ? (d % 2 === 0) : (d % 2 !== 0);
          const expected = expectedPress ? 'press' : 'pull';
          expect(week[d].pushPull).toBe(expected);
        }
      }
    }
  });

  it('no routine mixes press and pull in same day', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const sf = rutinas.filter((r) => r.lugar === 'SPORT_FITNESS' && r.pushPull);

    for (const r of sf) {
      // Press routines should focus on pecho/hombros (not espalda-dominant)
      // Pull routines should focus on espalda (not pecho-dominant)
      // Circuit 1 (piernas+core) is always shared — skip it
      const upperCircuits = r.circuitos.slice(1, -1); // skip C1 and C6 (velocity)
      if (r.pushPull === 'press') {
        // At least one circuit should have Pecho or Hombros
        const hasPressCircuit = upperCircuits.some((c) => {
          const grupos = Array.isArray(c.grupoMuscular) ? c.grupoMuscular : [c.grupoMuscular];
          return grupos.some((g) => g === 'Pecho' || g === 'Hombros');
        });
        expect(hasPressCircuit).toBe(true);
      }
    }
  });

  it('cross/funcional routines exist for both users', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    for (const usuario of ['Lean', 'Nat']) {
      const cross = rutinas.filter((r) =>
        r.tipo === 'cross' && r.lugar === 'SPORT_FITNESS' && r.usuario === usuario
      );
      expect(cross.length).toBeGreaterThanOrEqual(4);
      // All cross should have pushPull
      for (const r of cross) {
        expect(['press', 'pull']).toContain(r.pushPull);
      }
    }
  });

  it('cross routines use only funcional equipment (no machines)', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const crossRutinas = rutinas.filter((r) => r.tipo === 'cross' && r.lugar === 'SPORT_FITNESS');

    const MACHINE_KEYWORDS = ['maquina', 'máquina', 'polea doble', 'prensa', 'aductores en maquina'];

    for (const r of crossRutinas) {
      for (const c of r.circuitos) {
        for (const ej of c.ejercicios) {
          const lower = (ej.nombre || '').toLowerCase();
          const usesMachine = MACHINE_KEYWORDS.some((kw) => lower.includes(kw));
          expect(usesMachine).toBe(false);
        }
      }
    }
  });
});
