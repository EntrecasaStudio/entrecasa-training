import './styles/reset.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/views.css';
import './styles/workout.css';
import './styles/animations.css';
import './styles/skeleton.css';

import { initRouter, navigate } from './router.js';
import { seedIfEmpty } from './seed.js';
import { mountNavBar } from '@js/components/nav-bar.js';
import { mountVoiceFab } from '@js/components/voice-fab.js';
import { mountAvatarMenu, updateAvatarMenu } from '@js/components/avatar-menu.js';
import { loadSavedTheme } from '@js/services/theme-manager.js';
import { onAuth, auth } from '@js/services/firebase.js';
import { startRealtimeSync, stopRealtimeSync, downloadAllData, uploadAllData } from '@js/services/sync.js';
import { setUsuarioActivo } from './store.js';
import { initSwipeBack } from '@js/helpers/swipe-back.js';
import { initPullToRefresh } from '@js/helpers/pull-to-refresh.js';
import { mountOfflineBanner } from '@js/components/offline-banner.js';

// ── Splash 3D kettlebell (loaded immediately) ──────────────
const splashStart = Date.now();
const MIN_SPLASH_MS = 1800; // minimum time to show splash so kettlebell is visible
const splashReadyP = import('@js/helpers/splash-3d.js').then(({ mountSplash3D }) => mountSplash3D()).catch(() => {});

// Seed initial rutinas from Notion data (only if empty)
seedIfEmpty();

// Load saved theme customizations
loadSavedTheme();

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
    setTimeout(() => splash.remove(), 500);
  }
}

onAuth(async (user) => {
  if (!authResolved) {
    authResolved = true;

    // First auth callback — user session restored (or null)
    if (user) {
      // Keep stored profile or default to 'Lean'
      if (!localStorage.getItem('gym_usuario')) setUsuarioActivo('Lean');
      // Sync with Firestore: download cloud data, upload local data
      try {
        const hadCloud = await downloadAllData();
        if (!hadCloud) await uploadAllData();
      } catch (err) {
        console.warn('[app] Initial sync failed:', err.message);
      }
      startRealtimeSync(() => {
        // Remote data changed — refresh current view
        const hash = window.location.hash || '#/';
        navigate(hash.replace('#', '') || '/');
      });
    } else if (!auth) {
      // No Firebase — keep stored user or default to 'Lean'
      if (!localStorage.getItem('gym_usuario')) setUsuarioActivo('Lean');
    }

    updateAvatarMenu();

    // Init router now that auth state is known
    initRouter();
    hideSplash();
    return;
  }

  // ── Subsequent auth state changes (login / logout) ──────
  if (user) {
    stopRealtimeSync();
    // Keep stored profile or default to 'Lean'
    if (!localStorage.getItem('gym_usuario')) setUsuarioActivo('Lean');
    // Sync data for this account
    try {
      await uploadAllData();
      await downloadAllData();
    } catch (err) {
      console.warn('[app] Sync after login failed:', err.message);
    }
    startRealtimeSync(() => {
      const hash = window.location.hash || '#/';
      navigate(hash.replace('#', '') || '/');
    });
    updateAvatarMenu();
    navigate('/');
  } else {
    stopRealtimeSync();
    updateAvatarMenu();
    navigate('/login');
  }
});

// Fallback: if Firebase never resolves (misconfigured), init after 10s
setTimeout(() => {
  if (!authResolved) {
    authResolved = true;
    console.warn('[app] Auth timeout — proceeding without Firebase');
    initRouter();
    hideSplash();
  }
}, 10000);
