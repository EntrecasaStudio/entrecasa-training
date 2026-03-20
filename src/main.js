import './styles/reset.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/views.css';
import './styles/workout.css';
import './styles/animations.css';
import './styles/skeleton.css';

import { initRouter, navigate, clearViewCache } from './router.js';
import { seedIfEmpty } from './seed.js';
import { mountNavBar } from '@js/components/nav-bar.js';
import { mountVoiceFab } from '@js/components/voice-fab.js';
import { mountAvatarMenu, updateAvatarMenu } from '@js/components/avatar-menu.js';
import { loadSavedTheme, applyUserAccent } from '@js/services/theme-manager.js';
import { onAuth, auth } from '@js/services/firebase.js';
import { startRealtimeSync, stopRealtimeSync, downloadAllData, uploadAllData, clearSyncState } from '@js/services/sync.js';
import { setUsuarioActivo, getUsuarioActivo, purgeDeleted, getWorkoutActivo, saveWorkoutActivo } from './store.js';
import { initSwipeBack } from '@js/helpers/swipe-back.js';
import { initPullToRefresh } from '@js/helpers/pull-to-refresh.js';
import { mountOfflineBanner } from '@js/components/offline-banner.js';

// ── Global error handler — prevent silent crashes ──────────
window.addEventListener('unhandledrejection', (e) => {
  console.error('[app] Unhandled promise rejection:', e.reason);
  e.preventDefault(); // Don't crash the app
});
window.addEventListener('error', (e) => {
  console.error('[app] Uncaught error:', e.message, e.filename, e.lineno);
});

// ── Splash 3D kettlebell (loaded immediately) ──────────────
const splashStart = Date.now();
const MIN_SPLASH_MS = 2200; // minimum time to show splash so kettlebell is visible
const splashReadyP = import('@js/helpers/splash-3d.js').then(({ mountSplash3D }) => mountSplash3D()).catch(() => {});

// NOTE: seedIfEmpty() is NOT called here anymore — deferred until after Firestore sync
// to prevent overwriting cloud data on deploy/reload.

// Purge soft-deleted items older than 30 days
purgeDeleted();

// Load saved theme customizations + per-user accent
loadSavedTheme();
applyUserAccent(getUsuarioActivo());

// Register service worker with update detection
if ('serviceWorker' in navigator) {
  const swPath = import.meta.env.BASE_URL + 'sw.js';
  navigator.serviceWorker.register(swPath).then((reg) => {
    // Check for updates every 60s
    setInterval(() => reg.update(), 60000);
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if (newSW) {
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'activated') {
            // Save active workout before reload to prevent data loss
            const workout = getWorkoutActivo();
            if (workout) saveWorkoutActivo(workout);
            // New SW activated — reload to get fresh assets
            window.location.reload();
          }
        });
      }
    });
  }).catch(() => {});
}

// Mount persistent UI
mountNavBar();
mountVoiceFab();
mountAvatarMenu();
mountOfflineBanner();

// Gesture navigation
initSwipeBack();
initPullToRefresh(async () => {
  try {
    await downloadAllData();
  } catch (e) {
    // Offline or not logged in — ignore
  }
  // Re-render current view
  const hash = window.location.hash || '#/';
  if (hash === '#/' || hash === '#') navigate('/');
});

// ── Auth-aware initialization ──────────────

let authResolved = false;
let routerInitialized = false;

async function hideSplash() {
  // Wait for 3D kettlebell to render + minimum display time
  await splashReadyP;
  const elapsed = Date.now() - splashStart;
  if (elapsed < MIN_SPLASH_MS) {
    await new Promise((r) => setTimeout(r, MIN_SPLASH_MS - elapsed));
  }

  // Clean up 3D kettlebell renderer
  import('@js/helpers/splash-3d.js').then(({ cleanupSplash3D }) => cleanupSplash3D()).catch(() => {});
  const splash = document.getElementById('splash');
  if (splash) {
    splash.style.opacity = '0';
    splash.style.transform = 'scale(1.05)';
    splash.style.filter = 'blur(6px)';
    setTimeout(() => splash.remove(), 500);
  }
}

function safeInitRouter() {
  if (!routerInitialized) {
    routerInitialized = true;
    initRouter();
  }
}

/** Refresh current view unless user is actively editing/training */
function refreshViewIfSafe() {
  const hash = window.location.hash || '#/';
  const path = hash.replace('#', '') || '/';
  if (path.includes('/editar/') || path.includes('/nueva') || path.startsWith('/entrenamiento')) return;
  navigate(path);
}

onAuth(async (user) => {
  if (!authResolved) {
    authResolved = true;

    // First auth callback — user session restored (or null)
    if (user) {
      // Keep stored profile or default to 'Lean'
      if (!localStorage.getItem('gym_usuario')) setUsuarioActivo('Lean');
      // Sync with Firestore: download cloud data, then seed, then upload
      try {
        const hadCloud = await downloadAllData();
        // Seed AFTER download so we don't overwrite cloud data
        seedIfEmpty();
        if (hadCloud) {
          // Upload migrated data back to cloud so other devices get the fix
          await uploadAllData();
        } else {
          await uploadAllData();
        }
      } catch (err) {
        // Sync failed — still seed locally so app isn't empty
        seedIfEmpty();
        console.warn('[app] Initial sync failed:', err.message);
      }
      startRealtimeSync(() => {
        // Remote data changed — refresh current view
        refreshViewIfSafe();
      });
    } else if (!auth) {
      // No Firebase — seed locally, keep stored user or default to 'Lean'
      seedIfEmpty();
      if (!localStorage.getItem('gym_usuario')) setUsuarioActivo('Lean');
    }

    updateAvatarMenu();
    safeInitRouter();
    hideSplash();
    return;
  }

  // ── Subsequent auth state changes (login / logout) ──────
  if (user) {
    stopRealtimeSync();
    clearSyncState();
    clearViewCache(); // clear stale views from previous account
    // Keep stored profile or default to 'Lean'
    if (!localStorage.getItem('gym_usuario')) setUsuarioActivo('Lean');
    // Sync data for this account
    try {
      await uploadAllData();
      await downloadAllData();
      seedIfEmpty();
    } catch (err) {
      seedIfEmpty();
      console.warn('[app] Sync after login failed:', err.message);
    }
    startRealtimeSync(() => {
      refreshViewIfSafe();
    });
    updateAvatarMenu();
    navigate('/');
  } else {
    stopRealtimeSync();
    clearSyncState();
    clearViewCache(); // prevent cross-user cached data leaks
    updateAvatarMenu();
    navigate('/login');
  }
});

// Fallback: if Firebase never resolves (misconfigured), init after 10s
setTimeout(() => {
  if (!authResolved) {
    authResolved = true;
    console.warn('[app] Auth timeout — proceeding without Firebase');
    seedIfEmpty();
    safeInitRouter();
    hideSplash();
  }
}, 10000);
