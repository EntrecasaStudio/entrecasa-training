/**
 * Sync service — bidirectional localStorage ↔ Firestore.
 * Offline-first: localStorage is the local source of truth.
 * Firestore syncs in background when online.
 */
import { db, getCurrentUser } from './firebase.js';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Keys to sync (localStorage key → Firestore field name)
const SYNC_KEYS = {
  gym_rutinas: 'rutinas',
  gym_sesiones: 'sesiones',
  gym_plan_semanal: 'planSemanal',
  gym_notas_ejercicios: 'notasEjercicios',
  gym_theme: 'theme',
};

// Debounce timers per key
const _timers = {};
const DEBOUNCE_MS = 2000;

// Snapshot unsubscriber
let _unsubscribe = null;

// Flag to prevent sync loops (remote update → localStorage write → sync trigger)
let _suppressSync = false;

// ── Upload ──────────────────────────────

function getDocRef() {
  const user = getCurrentUser();
  if (!user) return null;
  return doc(db, 'users', user.uid);
}

/**
 * Upload a specific localStorage key to Firestore.
 */
async function uploadKey(key) {
  const ref = getDocRef();
  if (!ref) return;

  const field = SYNC_KEYS[key];
  if (!field) return;

  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : null;
    await setDoc(ref, { [field]: data, lastUpdated: Date.now() }, { merge: true });
  } catch (err) {
    console.warn('[sync] upload error:', key, err.message);
  }
}

/**
 * Upload ALL synced data to Firestore.
 */
export async function uploadAllData() {
  const ref = getDocRef();
  if (!ref) return;

  const payload = { lastUpdated: Date.now() };
  for (const [key, field] of Object.entries(SYNC_KEYS)) {
    try {
      const raw = localStorage.getItem(key);
      payload[field] = raw ? JSON.parse(raw) : null;
    } catch {
      payload[field] = null;
    }
  }

  // Add user profile
  const user = getCurrentUser();
  if (user) {
    payload.profile = {
      nombre: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
    };
  }

  try {
    await setDoc(ref, payload, { merge: true });
    console.log('[sync] uploaded all data');
  } catch (err) {
    console.warn('[sync] upload all error:', err.message);
  }
}

// ── Download ────────────────────────────

/**
 * Download ALL data from Firestore to localStorage.
 * Returns true if data was found, false if empty/new user.
 */
export async function downloadAllData() {
  const ref = getDocRef();
  if (!ref) return false;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const data = snap.data();
    _suppressSync = true;

    for (const [key, field] of Object.entries(SYNC_KEYS)) {
      if (data[field] !== undefined && data[field] !== null) {
        localStorage.setItem(key, JSON.stringify(data[field]));
      }
    }

    _suppressSync = false;
    console.log('[sync] downloaded all data');
    return true;
  } catch (err) {
    _suppressSync = false;
    console.warn('[sync] download error:', err.message);
    return false;
  }
}

// ── Real-time listener ──────────────────

/**
 * Start listening for remote changes. When Firestore data changes
 * (from another device), update localStorage and call onUpdate().
 */
export function startRealtimeSync(onUpdate) {
  stopRealtimeSync();

  const ref = getDocRef();
  if (!ref) return;

  _unsubscribe = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();
    _suppressSync = true;

    let changed = false;
    for (const [key, field] of Object.entries(SYNC_KEYS)) {
      if (data[field] === undefined || data[field] === null) continue;

      const remoteJSON = JSON.stringify(data[field]);
      const localJSON = localStorage.getItem(key);

      if (remoteJSON !== localJSON) {
        localStorage.setItem(key, remoteJSON);
        changed = true;
      }
    }

    _suppressSync = false;

    if (changed && onUpdate) {
      onUpdate();
    }
  }, (err) => {
    console.warn('[sync] realtime error:', err.message);
  });
}

export function stopRealtimeSync() {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
}

// ── Debounced sync trigger ──────────────

/**
 * Queue a sync for a specific localStorage key.
 * Called by store.js after every write. Debounced to avoid excessive writes.
 */
export function queueSync(key) {
  if (_suppressSync) return;
  if (!SYNC_KEYS[key]) return;
  if (!getCurrentUser()) return;

  clearTimeout(_timers[key]);
  _timers[key] = setTimeout(() => uploadKey(key), DEBOUNCE_MS);
}

/**
 * Check if sync is available (user is logged in + Firebase configured).
 */
export function isSyncAvailable() {
  return !!getCurrentUser();
}
