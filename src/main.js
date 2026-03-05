import './styles/reset.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/views.css';
import './styles/workout.css';
import './styles/animations.css';

import { initRouter, navigate } from './router.js';
import { seedIfEmpty } from './seed.js';
import { mountNavBar } from '@js/components/nav-bar.js';
import { mountVoiceFab } from '@js/components/voice-fab.js';
import { loadSavedTheme } from '@js/services/theme-manager.js';
import { onAuth, auth } from '@js/services/firebase.js';
import { startRealtimeSync, stopRealtimeSync, downloadAllData } from '@js/services/sync.js';
import { setUsuarioActivo } from './store.js';

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

// ── Auth-aware initialization ──────────────

let authResolved = false;

function hideSplash() {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 500);
  }
}

onAuth(async (user) => {
  if (!authResolved) {
    authResolved = true;

    // First auth callback — user session restored (or null)
    if (user) {
      const nombre = user.displayName?.split(' ')[0] || 'Usuario';
      setUsuarioActivo(nombre);
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

    // Init router now that auth state is known
    initRouter();
    hideSplash();
    return;
  }

  // ── Subsequent auth state changes (account switch) ──────
  if (user) {
    stopRealtimeSync();
    const nombre = user.displayName?.split(' ')[0] || 'Usuario';
    setUsuarioActivo(nombre);
    try {
      await downloadAllData();
    } catch (err) {
      console.warn('[app] Download after switch failed:', err.message);
    }
    startRealtimeSync(() => {
      if (window.location.hash === '' || window.location.hash === '#/') {
        navigate('/');
      }
    });
    navigate('/');
  } else {
    stopRealtimeSync();
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
