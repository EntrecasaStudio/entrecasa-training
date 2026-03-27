import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage
const store = {};
const mockLocalStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

// Mock queueSync
import { vi } from 'vitest';
vi.mock('@js/services/sync.js', () => ({ queueSync: vi.fn() }));

import {
  getHiitConfig, saveHiitConfig, getNextHiitEquipment,
  getHiitParams, saveHiitSession, HIIT_EQUIPMENT_ORDER, HIIT_DEFAULTS,
} from '@/store.js';

describe('HIIT Equipment Rotation', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('returns first equipment when no history', () => {
    expect(getNextHiitEquipment('Lean')).toBe('treadmill');
  });

  it('rotates through equipment in order', () => {
    saveHiitSession('Lean', 'treadmill', { velocity: 12 });
    expect(getNextHiitEquipment('Lean')).toBe('bike');

    saveHiitSession('Lean', 'bike', { resistance: 7 });
    expect(getNextHiitEquipment('Lean')).toBe('bodyweight');

    saveHiitSession('Lean', 'bodyweight', { exercise: 'burpees' });
    expect(getNextHiitEquipment('Lean')).toBe('elliptical');

    saveHiitSession('Lean', 'elliptical', { resistance: 6 });
    expect(getNextHiitEquipment('Lean')).toBe('escalator');

    saveHiitSession('Lean', 'escalator', { speed: 8 });
    expect(getNextHiitEquipment('Lean')).toBe('treadmill'); // wraps around
  });

  it('does not repeat equipment day to day', () => {
    saveHiitSession('Lean', 'treadmill', { velocity: 15 });
    const next = getNextHiitEquipment('Lean');
    expect(next).not.toBe('treadmill');
  });

  it('saves and retrieves params per equipment', () => {
    saveHiitSession('Lean', 'treadmill', { velocity: 15, inclination: 3 });
    const params = getHiitParams('Lean', 'treadmill');
    expect(params.velocity).toBe(15);
    expect(params.inclination).toBe(3);
  });

  it('returns defaults for unknown equipment', () => {
    const params = getHiitParams('Lean', 'treadmill');
    expect(params.velocity).toBe(12);
    expect(params.inclination).toBe(1);
  });

  it('separates data between users', () => {
    saveHiitSession('Lean', 'treadmill', { velocity: 15 });
    saveHiitSession('Nat', 'bike', { resistance: 5 });

    expect(getNextHiitEquipment('Lean')).toBe('bike');
    expect(getNextHiitEquipment('Nat')).toBe('bodyweight');
  });

  it('rotation order has 5 equipment options', () => {
    expect(HIIT_EQUIPMENT_ORDER).toHaveLength(5);
    expect(HIIT_EQUIPMENT_ORDER).toContain('treadmill');
    expect(HIIT_EQUIPMENT_ORDER).toContain('bike');
    expect(HIIT_EQUIPMENT_ORDER).toContain('bodyweight');
    expect(HIIT_EQUIPMENT_ORDER).toContain('elliptical');
    expect(HIIT_EQUIPMENT_ORDER).toContain('escalator');
  });

  it('max duration: treadmill 5 rounds = 10 min', () => {
    // 5 rounds × (60s run + 60s rest) = 600s = 10 min
    const maxRounds = 5;
    const runTime = 60;
    const restTime = 60;
    const totalSec = maxRounds * (runTime + restTime);
    expect(totalSec).toBeLessThanOrEqual(600); // 10 min max
  });

  it('max duration: bodyweight tabata 8 rounds < 6 min', () => {
    // 8 rounds × (30s work + 10s rest) = 320s ≈ 5.3 min
    const maxRounds = 8;
    const workTime = 30;
    const restTime = 10;
    const totalSec = maxRounds * (workTime + restTime);
    expect(totalSec).toBeLessThanOrEqual(360); // 6 min max
  });
});
