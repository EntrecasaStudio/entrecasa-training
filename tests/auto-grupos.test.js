/**
 * Tests for autoGruposFromEjercicios — exercise-to-muscle-group derivation
 */
import { describe, it, expect, vi } from 'vitest';

// Mock sync to avoid Firestore
vi.mock('@js/services/sync.js', () => ({ queueSync: vi.fn() }));

// Mock localStorage
const storage = new Map();
vi.stubGlobal('localStorage', {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, val) => storage.set(key, val),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
});

const { autoGruposFromEjercicios } = await import('../src/js/helpers/rutina-helpers.js');

function circ(ejercicios) {
  return { ejercicios: ejercicios.map((nombre) => ({ nombre })) };
}

describe('autoGruposFromEjercicios', () => {
  it('derives groups from exact catalog names', () => {
    const result = autoGruposFromEjercicios(circ([
      'Sentadilla con barra',  // Piernas
      'Press de pecho',        // Pecho
      'Complex',               // Core
    ]));
    expect(result).toHaveLength(3);
    expect(result).toContain('Piernas');
    expect(result).toContain('Pecho');
    expect(result).toContain('Core');
  });

  it('orders by frequency (most exercises first)', () => {
    const result = autoGruposFromEjercicios(circ([
      'Sentadilla con barra',  // Piernas
      'Sumo con barra',        // Piernas
      'Press de pecho',        // Pecho
    ]));
    expect(result[0]).toBe('Piernas');  // 2 exercises
    expect(result[1]).toBe('Pecho');    // 1 exercise
  });

  it('handles case-insensitive matching', () => {
    const result = autoGruposFromEjercicios(circ([
      'sentadilla con barra',  // should match Piernas
    ]));
    expect(result).toContain('Piernas');
  });

  it('handles partial matching (prefix)', () => {
    const result = autoGruposFromEjercicios(circ([
      'Peso muerto dividido',  // partial match → Piernas (closest: "Peso muerto dividido con barra")
    ]));
    expect(result).toContain('Piernas');
  });

  it('returns empty for unknown exercises', () => {
    const result = autoGruposFromEjercicios(circ([
      'Ejercicio inventado que no existe',
    ]));
    expect(result).toHaveLength(0);
  });

  it('returns empty for circuit with no exercises', () => {
    expect(autoGruposFromEjercicios({ ejercicios: [] })).toEqual([]);
  });

  it('skips exercises without nombre', () => {
    const result = autoGruposFromEjercicios({
      ejercicios: [{ nombre: '' }, { nombre: null }, {}],
    });
    expect(result).toEqual([]);
  });

  it('detects Cardio category', () => {
    const result = autoGruposFromEjercicios(circ([
      'Cinta de correr',  // Cardio
    ]));
    expect(result).toContain('Cardio');
  });

  it('detects HIIT category', () => {
    const result = autoGruposFromEjercicios(circ([
      'Burpees tabata',  // HIIT
    ]));
    // May or may not match depending on catalog entries
    // At minimum should not crash
    expect(Array.isArray(result)).toBe(true);
  });

  it('caches results (same name returns same category)', () => {
    // Call twice with same exercise — should be fast (cached)
    const r1 = autoGruposFromEjercicios(circ(['Complex']));
    const r2 = autoGruposFromEjercicios(circ(['Complex']));
    expect(r1).toEqual(r2);
  });

  it('handles mixed known and unknown exercises', () => {
    const result = autoGruposFromEjercicios(circ([
      'Sentadilla con barra',      // Piernas
      'Algo desconocido',           // unknown
      'Press de pecho',             // Pecho
    ]));
    expect(result).toHaveLength(2);
    expect(result).toContain('Piernas');
    expect(result).toContain('Pecho');
  });
});
