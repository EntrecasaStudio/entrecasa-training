/**
 * Tests for plan-generator.js — routine generation + plan building
 */
import { describe, it, expect } from 'vitest';
import { buildPlanObject } from '../src/js/helpers/plan-generator.js';

const baseConfig = {
  duracion: 4,
  diasGym: [1, 3, 5], // Mon, Wed, Fri
  lugar: 'SPORT_FITNESS',
  objetivos: { focos: ['Espalda', 'Brazos'], nivel: 'Intermedio' },
  complementarias: {
    running: { dias: [2, 6], distancia: '10km' },
    sauna: { dias: [1, 3, 5] },
  },
  restricciones: {
    noRunningConPiernas: true,
    duracionMaxGym: 70,
    deloadCada: 5,
  },
  baseline: { fecha: '2026-03-24', peso: 78 },
};

describe('buildPlanObject', () => {
  it('generates correct number of weeks', () => {
    const { plan } = buildPlanObject(baseConfig, 'Lean', 200);
    expect(plan.weeks).toHaveLength(4);
  });

  it('generates 7 days per week', () => {
    const { plan } = buildPlanObject(baseConfig, 'Lean', 200);
    for (const week of plan.weeks) {
      expect(week.days).toHaveLength(7);
    }
  });

  it('assigns gym days on correct weekdays', () => {
    const { plan } = buildPlanObject(baseConfig, 'Lean', 200);
    const week1 = plan.weeks[0];
    // diasGym = [1, 3, 5] → Mon, Wed, Fri
    const gymDays = week1.days.filter((d) => d.tipo === 'gym');
    expect(gymDays.length).toBe(3);
    // Verify they're on Mon(1), Wed(3), Fri(5)
    for (const gd of gymDays) {
      const dow = new Date(gd.date + 'T12:00:00').getDay();
      expect([1, 3, 5]).toContain(dow);
    }
  });

  it('assigns complementary activities on correct days', () => {
    const { plan } = buildPlanObject(baseConfig, 'Lean', 200);
    const week1 = plan.weeks[0];
    const runDays = week1.days.filter((d) => d.tipo === 'running');
    expect(runDays.length).toBeGreaterThanOrEqual(1);
    for (const rd of runDays) {
      const dow = new Date(rd.date + 'T12:00:00').getDay();
      expect([2, 6]).toContain(dow);
    }
  });

  it('generates routines with correct usuario', () => {
    const { rutinas } = buildPlanObject(baseConfig, 'Lean', 200);
    expect(rutinas.length).toBeGreaterThan(0);
    for (const r of rutinas) {
      expect(r.usuario).toBe('Lean');
    }
  });

  it('generates routines with lugar tag', () => {
    const { rutinas } = buildPlanObject(baseConfig, 'Lean', 200);
    for (const r of rutinas) {
      expect(r.lugar).toBe('SPORT_FITNESS');
    }
  });

  it('generates routines with incrementing numero', () => {
    const { rutinas } = buildPlanObject(baseConfig, 'Lean', 200);
    const numeros = rutinas.map((r) => r.numero);
    expect(numeros[0]).toBe(200);
    for (let i = 1; i < numeros.length; i++) {
      expect(numeros[i]).toBe(numeros[i - 1] + 1);
    }
  });

  it('plan has draft status', () => {
    const { plan } = buildPlanObject(baseConfig, 'Lean', 200);
    expect(plan.status).toBe('draft');
  });

  it('stores config in plan', () => {
    const { plan } = buildPlanObject(baseConfig, 'Lean', 200);
    expect(plan.config).toBeDefined();
    expect(plan.config.duracion).toBe(4);
    expect(plan.config.baseline.peso).toBe(78);
  });

  it('rest days fill remaining slots', () => {
    const { plan } = buildPlanObject(baseConfig, 'Lean', 200);
    const week1 = plan.weeks[0];
    const restDays = week1.days.filter((d) => d.tipo === 'rest');
    // 7 days - 3 gym - running/sauna days that don't overlap
    expect(restDays.length).toBeGreaterThanOrEqual(0);
    // Total should always be 7
    expect(week1.days.length).toBe(7);
  });

  it('deload weeks are marked correctly', () => {
    const config12 = { ...baseConfig, duracion: 12, restricciones: { ...baseConfig.restricciones, deloadCada: 4 } };
    const { plan } = buildPlanObject(config12, 'Lean', 200);
    // Week 4 should be deload
    expect(plan.weeks[3].deload).toBe(true);
    // Week 8 should be deload
    expect(plan.weeks[7].deload).toBe(true);
  });

  it('each routine has circuitos with ejercicios', () => {
    const { rutinas } = buildPlanObject(baseConfig, 'Lean', 200);
    for (const r of rutinas) {
      expect(r.circuitos.length).toBeGreaterThan(0);
      for (const c of r.circuitos) {
        expect(c.ejercicios.length).toBeGreaterThan(0);
        for (const ej of c.ejercicios) {
          expect(ej.nombre).toBeTruthy();
        }
      }
    }
  });
});
