/**
 * Tests for store.js — CRUD, soft-delete, restore, purge
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const storage = new Map();
const localStorageMock = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, val) => storage.set(key, val),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock queueSync (no Firestore in tests)
vi.mock('@js/services/sync.js', () => ({
  queueSync: vi.fn(),
}));

// Import store after mocks
const {
  getRutinas, getRutinaById, saveRutina, deleteRutina, restoreRutina,
  getSesiones, getSesionById, saveSesion, updateSesion, deleteSesion, restoreSesion,
  purgeDeleted, getUsuarioActivo, setUsuarioActivo,
  assignRutinaADia, clearRutinaDelDia,
} = await import('../src/store.js');

// ── Helpers ──

function makeRutina(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    nombre: 'Test Rutina',
    tipo: 'gimnasio',
    usuario: 'Lean',
    diaSemana: null,
    creada: new Date().toISOString(),
    circuitos: [],
    ...overrides,
  };
}

function makeSesion(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    rutinaId: 'rut-1',
    rutinaNombre: 'Test Sesion',
    usuario: 'Lean',
    fecha: new Date().toISOString(),
    circuitos: [],
    ...overrides,
  };
}

// ── Tests ──

describe('Rutinas CRUD', () => {
  beforeEach(() => storage.clear());

  it('starts with empty rutinas', () => {
    expect(getRutinas()).toEqual([]);
  });

  it('saves and retrieves a rutina', () => {
    const r = makeRutina({ nombre: 'Push Day' });
    saveRutina(r);
    expect(getRutinas()).toHaveLength(1);
    expect(getRutinaById(r.id).nombre).toBe('Push Day');
  });

  it('updates an existing rutina', () => {
    const r = makeRutina({ nombre: 'V1' });
    saveRutina(r);
    r.nombre = 'V2';
    saveRutina(r);
    expect(getRutinas()).toHaveLength(1);
    expect(getRutinaById(r.id).nombre).toBe('V2');
  });

  it('sets updatedAt on save', () => {
    const r = makeRutina();
    saveRutina(r);
    expect(getRutinaById(r.id).updatedAt).toBeDefined();
  });
});

describe('Rutinas soft-delete', () => {
  beforeEach(() => storage.clear());

  it('soft-deletes: item invisible but in storage', () => {
    const r = makeRutina();
    saveRutina(r);
    deleteRutina(r.id);

    expect(getRutinas()).toHaveLength(0);
    expect(getRutinaById(r.id)).toBeNull();

    // Still in raw storage
    const raw = JSON.parse(localStorage.getItem('gym_rutinas'));
    expect(raw).toHaveLength(1);
    expect(raw[0].deleted).toBe(true);
    expect(raw[0].deletedAt).toBeDefined();
  });

  it('restores a soft-deleted rutina', () => {
    const r = makeRutina();
    saveRutina(r);
    deleteRutina(r.id);
    expect(getRutinas()).toHaveLength(0);

    restoreRutina(r.id);
    expect(getRutinas()).toHaveLength(1);
    expect(getRutinaById(r.id).deleted).toBeUndefined();
  });

  it('delete is idempotent', () => {
    const r = makeRutina();
    saveRutina(r);
    deleteRutina(r.id);
    deleteRutina(r.id); // second delete shouldn't error
    expect(getRutinas()).toHaveLength(0);
  });
});

describe('Sesiones CRUD', () => {
  beforeEach(() => storage.clear());

  it('saves and retrieves sesiones sorted by fecha desc', () => {
    const s1 = makeSesion({ fecha: '2026-03-01T10:00:00Z' });
    const s2 = makeSesion({ fecha: '2026-03-10T10:00:00Z' });
    saveSesion(s1);
    saveSesion(s2);

    const all = getSesiones();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(s2.id); // newer first
  });

  it('updates a sesion', () => {
    const s = makeSesion();
    saveSesion(s);
    s.duracionMin = 45;
    updateSesion(s);
    expect(getSesionById(s.id).duracionMin).toBe(45);
  });

  it('sets updatedAt on save and update', async () => {
    const s = makeSesion();
    saveSesion(s);
    expect(getSesionById(s.id).updatedAt).toBeDefined();

    const before = getSesionById(s.id).updatedAt;
    await new Promise((r) => setTimeout(r, 5)); // ensure different timestamp
    s.duracionMin = 30;
    updateSesion(s);
    expect(getSesionById(s.id).updatedAt).not.toBe(before);
  });
});

describe('Sesiones soft-delete', () => {
  beforeEach(() => storage.clear());

  it('soft-deletes and restores a sesion', () => {
    const s = makeSesion();
    saveSesion(s);
    deleteSesion(s.id);
    expect(getSesiones()).toHaveLength(0);

    restoreSesion(s.id);
    expect(getSesiones()).toHaveLength(1);
  });
});

describe('purgeDeleted', () => {
  beforeEach(() => storage.clear());

  it('removes items deleted > 30 days ago', () => {
    const old = makeRutina();
    old.deleted = true;
    old.deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

    const recent = makeRutina();
    recent.deleted = true;
    recent.deletedAt = new Date().toISOString();

    const active = makeRutina();

    localStorage.setItem('gym_rutinas', JSON.stringify([old, recent, active]));

    purgeDeleted();

    const raw = JSON.parse(localStorage.getItem('gym_rutinas'));
    expect(raw).toHaveLength(2); // recent + active kept, old purged
    expect(raw.find((r) => r.id === old.id)).toBeUndefined();
  });

  it('does nothing if no deleted items', () => {
    const r = makeRutina();
    saveRutina(r);
    purgeDeleted();
    expect(getRutinas()).toHaveLength(1);
  });
});

describe('assignRutinaADia', () => {
  beforeEach(() => storage.clear());

  it('assigns a rutina to a day for a specific user', () => {
    const r = makeRutina({ usuario: 'Lean' });
    saveRutina(r);
    assignRutinaADia(r.id, 1, 'Lean');

    const updated = getRutinaById(r.id);
    expect(updated.diaSemana).toBe(1);
  });

  it('clears previous assignment for same day + user', () => {
    const r1 = makeRutina({ usuario: 'Lean' });
    const r2 = makeRutina({ usuario: 'Lean' });
    saveRutina(r1);
    saveRutina(r2);

    assignRutinaADia(r1.id, 1, 'Lean');
    assignRutinaADia(r2.id, 1, 'Lean');

    expect(getRutinaById(r1.id).diaSemana).toBeNull();
    expect(getRutinaById(r2.id).diaSemana).toBe(1);
  });

  it('does not affect other users assignments', () => {
    const rLean = makeRutina({ usuario: 'Lean' });
    const rNat = makeRutina({ usuario: 'Nat' });
    saveRutina(rLean);
    saveRutina(rNat);

    assignRutinaADia(rLean.id, 1, 'Lean');
    assignRutinaADia(rNat.id, 1, 'Nat');

    expect(getRutinaById(rLean.id).diaSemana).toBe(1);
    expect(getRutinaById(rNat.id).diaSemana).toBe(1);
  });
});

describe('Usuario activo', () => {
  beforeEach(() => storage.clear());

  it('defaults to Lean', () => {
    expect(getUsuarioActivo()).toBe('Lean');
  });

  it('persists usuario change', () => {
    setUsuarioActivo('Nat');
    expect(getUsuarioActivo()).toBe('Nat');
  });
});
