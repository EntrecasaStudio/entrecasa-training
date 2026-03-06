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

function hideSplash() {
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
      // Keep existing stored user name (Lean/Nat) — only set if none stored
      const stored = localStorage.getItem('gym_usuario');
      if (!stored) {
        const nombre = user.displayName?.split(' ')[0] || 'Usuario';
        setUsuarioActivo(nombre);
      }
      // Upload existing local data to Firestore on first login
      try {
        await uploadAllData();
      } catch (err) {
        console.warn('[app] Initial upload failed:', err.message);
      }
      startRealtimeSync(() => {
        // Remote data changed — refresh if on home
        if (window.location.hash === '' || window.location.hash === '#/') {
          navigate('/');
        }
      });
    } else if (!auth) {
      // No Firebase — keep stored user or default to 'Lean'
      const stored = localStorage.getItem('gym_usuario');
      if (!stored) setUsuarioActivo('Lean');
    }

    updateAvatarMenu();

    // Init router now that auth state is known
    initRouter();
    hideSplash();
    return;
  }

  // ── Subsequent auth state changes (login / account switch) ──────
  if (user) {
    stopRealtimeSync();
    // Keep existing stored user name (Lean/Nat) — only set if none stored
    const stored = localStorage.getItem('gym_usuario');
    if (!stored) {
      setUsuarioActivo('Lean'); // default to Lean for new logins
    }
    // First login: upload local data; subsequent: download from Firestore
    try {
      await uploadAllData();
      await downloadAllData();
    } catch (err) {
      console.warn('[app] Sync after login failed:', err.message);
    }
    startRealtimeSync(() => {
      if (window.location.hash === '' || window.location.hash === '#/') {
        navigate('/');
      }
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
