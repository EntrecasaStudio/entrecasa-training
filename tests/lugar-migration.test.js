import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

// Mock localStorage
const store = {};
const mockLocalStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

vi.mock('@js/services/sync.js', () => ({ queueSync: vi.fn() }));

describe('Lugar Migration (v34)', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('all seeded routines have a lugar field', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const sinLugar = rutinas.filter((r) => !r.lugar);
    expect(sinLugar).toHaveLength(0);
  });

  it('gimnasio routines without SPORT_FITNESS get VILO_GYM', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const gymRutinas = rutinas.filter((r) => r.tipo === 'gimnasio' && !r.pushPull);
    // All non-SF gym routines should be VILO_GYM or SPORT_FITNESS
    for (const r of gymRutinas) {
      expect(['VILO_GYM', 'SPORT_FITNESS']).toContain(r.lugar);
    }
  });

  it('cross routines have a lugar assigned (RIO or SPORT_FITNESS)', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    // Biblioteca cross routines → RIO, seeded funcional SF routines → SPORT_FITNESS
    const crossRutinas = rutinas.filter((r) => r.tipo === 'cross');
    expect(crossRutinas.length).toBeGreaterThan(0);
    for (const r of crossRutinas) {
      expect(['RIO', 'SPORT_FITNESS']).toContain(r.lugar);
    }
  });

  it('Sport Fitness routines keep SPORT_FITNESS lugar', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const sfRutinas = rutinas.filter((r) => r.pushPull);
    expect(sfRutinas.length).toBeGreaterThan(0);
    for (const r of sfRutinas) {
      expect(r.lugar).toBe('SPORT_FITNESS');
    }
  });

  it('migration fixes existing routines with lugar=null', async () => {
    // Simulate old data with null lugar
    const oldRutinas = [
      { id: 'r1', nombre: 'Push Day 🏋️', tipo: 'gimnasio', lugar: null, numero: 1, usuario: 'Lean', circuitos: [] },
      { id: 'r2', nombre: 'Cross Río 🏃', tipo: 'cross', lugar: null, numero: 2, usuario: 'Lean', circuitos: [] },
    ];
    store.gym_rutinas = JSON.stringify(oldRutinas);
    store.gym_seed_version = '1'; // force migration to run

    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();

    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const r1 = rutinas.find((r) => r.nombre?.includes('Push Day'));
    const r2 = rutinas.find((r) => r.nombre?.includes('Cross Río'));

    if (r1) expect(r1.lugar).toBeTruthy();
    if (r2) expect(r2.lugar).toBeTruthy();
  });

  it('VILO_GYM routines get HIIT circuit appended via migration', async () => {
    // Simulate existing data at old seed version to trigger migration
    const oldVilo = [
      {
        id: 'v1', nombre: 'Push Pecho 🏋️', tipo: 'gimnasio', lugar: 'VILO_GYM',
        numero: 1, usuario: 'Lean',
        circuitos: [
          { id: 'c1', grupoMuscular: ['Core'], ejercicios: [{ id: 'e1', nombre: 'Plancha', tipo: 'normal' }] },
          { id: 'c2', grupoMuscular: ['Pecho'], ejercicios: [{ id: 'e2', nombre: 'Press de pecho', tipo: 'normal' }] },
          { id: 'c3', grupoMuscular: ['Piernas'], ejercicios: [{ id: 'e3', nombre: 'Sentadilla', tipo: 'normal' }] },
          { id: 'c4', grupoMuscular: ['Brazos'], ejercicios: [{ id: 'e4', nombre: 'Triceps', tipo: 'normal' }] },
        ],
      },
    ];
    store.gym_rutinas = JSON.stringify(oldVilo);
    store.gym_seed_version = '1'; // force migration

    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();

    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const r = rutinas.find((r) => r.id === 'v1');
    if (r) {
      // Should have gained a HIIT circuit
      const hasHiit = (r.circuitos || []).some((c) =>
        (c.ejercicios || []).some((e) => e.tipo === 'velocidad' || e.tipo === 'hiit')
      );
      expect(hasHiit).toBe(true);
      expect(r.circuitos.length).toBe(5); // 4 original + 1 HIIT
    }
  });

  it('completed routines are not modified by HIIT migration', async () => {
    // Simulate a completed Vilo routine (has a session)
    const completedRutina = {
      id: 'completed-vilo-1',
      nombre: 'Vilo Completed 🏋️',
      tipo: 'gimnasio',
      lugar: 'VILO_GYM',
      numero: 9999,
      usuario: 'Lean',
      circuitos: [
        { id: 'c1', grupoMuscular: ['Core'], ejercicios: [{ id: 'e1', nombre: 'Plancha', tipo: 'normal' }] },
        { id: 'c2', grupoMuscular: ['Pecho'], ejercicios: [{ id: 'e2', nombre: 'Press', tipo: 'normal' }] },
      ],
    };
    const session = { id: 's1', rutinaId: 'completed-vilo-1', fecha: '2026-01-01' };
    store.gym_rutinas = JSON.stringify([completedRutina]);
    store.gym_sesiones = JSON.stringify([session]);
    store.gym_seed_version = '1';

    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();

    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const r = rutinas.find((r) => r.id === 'completed-vilo-1');
    // Original circuit count should be preserved (not modified)
    if (r) {
      expect(r.circuitos.length).toBe(2);
    }
  });
});

describe('Calendar push/pull assignment', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('Semana 1 Lunes asigna Press', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const overrides = JSON.parse(store.gym_day_overrides || '{}');

    // Find the first Monday override for Lean
    const leanOverrides = overrides['Lean'] || {};
    const mondays = Object.entries(leanOverrides)
      .filter(([d]) => new Date(d + 'T12:00:00').getDay() === 1)
      .sort(([a], [b]) => a.localeCompare(b));

    expect(mondays.length).toBeGreaterThan(0);
    // First Monday should be PRESS (week 1 = even = Mon is press)
    const [, firstMon] = mondays[0];
    expect(firstMon.pushPull).toBe('press');
  });

  it('Semana 2 Lunes asigna Pull', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const overrides = JSON.parse(store.gym_day_overrides || '{}');

    const leanOverrides = overrides['Lean'] || {};
    const mondays = Object.entries(leanOverrides)
      .filter(([d]) => new Date(d + 'T12:00:00').getDay() === 1)
      .sort(([a], [b]) => a.localeCompare(b));

    expect(mondays.length).toBeGreaterThanOrEqual(2);
    // Second Monday should be PULL (week 2 = odd = Mon is pull)
    const [, secondMon] = mondays[1];
    expect(secondMon.pushPull).toBe('pull');
  });

  it('all day_overrides for gym days point to SPORT_FITNESS routines', async () => {
    const { seedIfEmpty } = await import('@/seed.js');
    seedIfEmpty();
    const overrides = JSON.parse(store.gym_day_overrides || '{}');
    const rutinas = JSON.parse(store.gym_rutinas || '[]');
    const rutinaMap = new Map(rutinas.map((r) => [r.id, r]));

    for (const usuario of ['Lean', 'Nat']) {
      const userOv = overrides[usuario] || {};
      for (const [, ov] of Object.entries(userOv)) {
        if (ov.tipo !== 'gimnasio') continue;
        const rutina = rutinaMap.get(ov.rutinaId);
        expect(rutina).toBeTruthy();
        expect(rutina?.lugar).toBe('SPORT_FITNESS');
      }
    }
  });
});
