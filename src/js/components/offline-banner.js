/**
 * Offline/sync status banner + sync dot indicator.
 * Shows status: offline (red), syncing (yellow pulse), synced (green).
 */
import { onSyncStatusChange, getSyncStatus } from '@js/services/sync.js';

let banner = null;
let dot = null;

function showBanner(text) {
  if (!text) { hideBanner(); return; }
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.setAttribute('role', 'alert');
    document.body.appendChild(banner);
  }
  banner.textContent = text;
  requestAnimationFrame(() => banner.classList.add('offline-banner--visible'));
}

function hideBanner() {
  if (!banner) return;
  banner.classList.remove('offline-banner--visible');
  banner.addEventListener('transitionend', () => {
    if (banner) { banner.remove(); banner = null; }
  }, { once: true });
}

function updateDot(status) {
  if (!dot) {
    dot = document.createElement('span');
    dot.className = 'sync-dot';
    const avatar = document.getElementById('avatar-menu-container');
    if (avatar) avatar.appendChild(dot);
  }
  dot.dataset.status = status;
}

function onStatusChange(status) {
  updateDot(status);
  if (status === 'offline') {
    showBanner('Sin conexion — Cambios guardados local');
  } else if (status === 'syncing') {
    showBanner('Sincronizando...');
    setTimeout(() => { if (getSyncStatus() !== 'offline') hideBanner(); }, 2500);
  } else {
    hideBanner();
  }
}

export function mountOfflineBanner() {
  onSyncStatusChange(onStatusChange);
  onStatusChange(getSyncStatus());
}
