/**
 * Offline banner — shows a subtle bar when the device loses connection.
 * Auto-hides when reconnected.
 */

let banner = null;

function show() {
  if (banner) return;
  banner = document.createElement('div');
  banner.className = 'offline-banner';
  banner.setAttribute('role', 'alert');
  banner.textContent = 'Sin conexion — Tus cambios se guardan local';
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('offline-banner--visible'));
}

function hide() {
  if (!banner) return;
  banner.classList.remove('offline-banner--visible');
  banner.addEventListener('transitionend', () => {
    if (banner) { banner.remove(); banner = null; }
  }, { once: true });
}

export function mountOfflineBanner() {
  window.addEventListener('offline', show);
  window.addEventListener('online', hide);

  // Show immediately if already offline
  if (!navigator.onLine) show();
}
