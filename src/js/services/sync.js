/**
 * Sync service — bidirectional localStorage ↔ Firestore.
 * Offline-first: localStorage is the local source of truth.
 * Firestore syncs in background when online.
 *
 * Array fields (rutinas, sesiones) use item-level merge by ID
 * to support concurrent usage from multiple devices.
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
  gym_ejercicio_meta: 'ejercicioMeta',
  gym_day_overrides: 'dayOverrides',
};

// Keys that are arrays of items with `id` field — use item-level merge
const MERGEABLE_KEYS = new Set(['gym_rutinas', 'gym_sesiones']);

// Debounce timers per key
const _timers = {};
const DEBOUNCE_MS = 2000;

// Snapshot unsubscriber
let _unsubscribe = null;

// Flag to prevent sync loops (remote update → localStorage write → sync trigger)
let _suppressSync = false;

// Keys with pending local changes not yet uploaded — skip in onSnapshot
const _dirtyKeys = new Set();

// ── Connectivity & sync status ──────────
// Status: 'synced' | 'offline' | 'syncing' | 'pending'
let _syncStatus = navigator.onLine ? 'synced' : 'offline';
const _statusListeners = new Set();

export function getSyncStatus() { return _syncStatus; }

export function onSyncStatusChange(fn) {
  _statusListeners.add(fn);
  return () => _statusListeners.delete(fn);
}

function _setSyncStatus(status) {
  if (status === _syncStatus) return;
  _syncStatus = status;
  for (const fn of _statusListeners) try { fn(status); } catch {}
}

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[sync] Back online — flushing pending changes');
    _setSyncStatus('syncing');
    _flushOfflineQueue().then(() => {
      _setSyncStatus(_dirtyKeys.size > 0 ? 'pending' : 'synced');
    });
  });
  window.addEventListener('offline', () => {
    console.log('[sync] Went offline');
    _setSyncStatus('offline');
  });
}

/** Flush all dirty keys that accumulated while offline */
async function _flushOfflineQueue() {
  if (!navigator.onLine) return;
  const keys = [..._dirtyKeys];
  if (keys.length === 0) return;
  // Cancel debounce timers — upload immediately
  for (const key of Object.keys(_timers)) {
    clearTimeout(_timers[key]);
    delete _timers[key];
  }
  await Promise.all(keys.map((key) => uploadKey(key)));
}

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
  } finally {
    _dirtyKeys.delete(key);
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

// ── Item-level merge for arrays ─────────

/**
 * Merge two arrays of items by `id` field.
 * - Items only in remote → added to result
 * - Items only in local → kept in result
 * - Items in both → use the one with newer `updatedAt` (or `creada` / `deletedAt`);
 *   if no timestamps, remote wins (it's the latest uploaded from another device)
 *
 * Returns the merged array, or null if no merge was needed (arrays are identical).
 */
function mergeArraysById(localArr, remoteArr) {
  if (!Array.isArray(localArr) || !Array.isArray(remoteArr)) return remoteArr;

  const localMap = new Map(localArr.map((item) => [item.id, item]));
  const remoteMap = new Map(remoteArr.map((item) => [item.id, item]));
  const merged = new Map();

  // Add all remote items
  for (const [id, item] of remoteMap) {
    merged.set(id, item);
  }

  // Merge local items
  for (const [id, localItem] of localMap) {
    const remoteItem = remoteMap.get(id);
    if (!remoteItem) {
      // Only in local — keep it (will be uploaded on next sync)
      merged.set(id, localItem);
    } else {
      // In both — pick the newer one by comparing timestamps
      const localTs = localItem.updatedAt || localItem.deletedAt || localItem.creada || '';
      const remoteTs = remoteItem.updatedAt || remoteItem.deletedAt || remoteItem.creada || '';
      if (localTs > remoteTs) {
        merged.set(id, localItem);
      }
      // else remote wins (already set above)
    }
  }

  return [...merged.values()];
}

// ── Download ────────────────────────────

/**
 * Immediately flush all pending syncs (cancel debounce timers and upload now).
 */
async function flushPendingSyncs() {
  const keys = [..._dirtyKeys];
  if (keys.length === 0) return;

  // Cancel all debounce timers
  for (const key of Object.keys(_timers)) {
    clearTimeout(_timers[key]);
    delete _timers[key];
  }

  // Upload all dirty keys in parallel
  await Promise.all(keys.map((key) => uploadKey(key)));
}

/**
 * Download ALL data from Firestore to localStorage.
 * Returns true if data was found, false if empty/new user.
 * Flushes any pending local uploads first to avoid losing changes.
 */
export async function downloadAllData() {
  // Flush any pending local changes to Firestore first
  await flushPendingSyncs();

  const ref = getDocRef();
  if (!ref) return false;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const data = snap.data();
    _suppressSync = true;

    for (const [key, field] of Object.entries(SYNC_KEYS)) {
      // Skip keys with pending local changes to avoid overwriting
      if (_dirtyKeys.has(key)) continue;
      if (data[field] === undefined || data[field] === null) continue;

      if (MERGEABLE_KEYS.has(key) && Array.isArray(data[field])) {
        // Item-level merge for arrays (rutinas, sesiones)
        const localRaw = localStorage.getItem(key);
        const localArr = localRaw ? JSON.parse(localRaw) : [];
        const merged = mergeArraysById(localArr, data[field]);
        localStorage.setItem(key, JSON.stringify(merged));
      } else {
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

      // Skip keys with pending local changes to avoid overwriting with stale data
      if (_dirtyKeys.has(key)) continue;

      if (MERGEABLE_KEYS.has(key) && Array.isArray(data[field])) {
        // Item-level merge for arrays (rutinas, sesiones)
        const localRaw = localStorage.getItem(key);
        const localArr = localRaw ? JSON.parse(localRaw) : [];
        const merged = mergeArraysById(localArr, data[field]);
        const mergedJSON = JSON.stringify(merged);
        if (mergedJSON !== localRaw) {
          localStorage.setItem(key, mergedJSON);
          changed = true;
        }
      } else {
        const remoteJSON = JSON.stringify(data[field]);
        const localJSON = localStorage.getItem(key);
        if (remoteJSON !== localJSON) {
          localStorage.setItem(key, remoteJSON);
          changed = true;
        }
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

/** Clear all pending sync state (call on logout to prevent cross-account data leaks) */
export function clearSyncState() {
  for (const key of Object.keys(_timers)) {
    clearTimeout(_timers[key]);
    delete _timers[key];
  }
  _dirtyKeys.clear();
  _suppressSync = false;
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

  _dirtyKeys.add(key);

  if (!navigator.onLine) {
    // Offline — just mark as dirty, will flush when back online
    _setSyncStatus('offline');
    return;
  }

  _setSyncStatus('pending');
  clearTimeout(_timers[key]);
  _timers[key] = setTimeout(() => {
    _setSyncStatus('syncing');
    uploadKey(key).then(() => {
      if (_dirtyKeys.size === 0) _setSyncStatus('synced');
    });
  }, DEBOUNCE_MS);
}

/**
 * Check if sync is available (user is logged in + Firebase configured).
 */
export function isSyncAvailable() {
  return !!getCurrentUser();
}

// ── Flush on page unload / background to prevent data loss ──
function flushOnExit() {
  const keys = [..._dirtyKeys];
  if (keys.length === 0) return;
  for (const key of Object.keys(_timers)) {
    clearTimeout(_timers[key]);
    delete _timers[key];
  }
  // Fire-and-forget uploads (browser may cut these short, but it's best-effort)
  keys.forEach((key) => uploadKey(key));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushOnExit);
  // visibilitychange is more reliable on mobile (fires when switching apps/tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnExit();
  });
}
