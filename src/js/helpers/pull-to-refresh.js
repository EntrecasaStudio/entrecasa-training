/**
 * Pull-to-refresh for home view.
 * Pulls down from top to trigger data refresh.
 */
import { haptic } from '@js/helpers/haptics.js';
import { icon } from '@js/icons.js';

const PULL_THRESHOLD = 60;
const MAX_PULL = 100;

let startY = 0;
let pulling = false;
let refreshing = false;
let indicator = null;
let onRefreshCallback = null;

function createIndicator() {
  if (indicator) return;
  indicator = document.createElement('div');
  indicator.className = 'ptr-indicator';
  indicator.innerHTML = icon.refresh || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>';
  document.body.appendChild(indicator);
}

function removeIndicator() {
  if (indicator) {
    indicator.remove();
    indicator = null;
  }
}

function canPull() {
  // Only pull when scrolled to top
  const container = document.getElementById('view-container');
  if (!container) return false;
  return container.scrollTop <= 0 && window.scrollY <= 0;
}

function onTouchStart(e) {
  if (refreshing || !canPull()) return;
  startY = e.touches[0].clientY;
  pulling = true;
}

function onTouchMove(e) {
  if (!pulling || refreshing) return;

  const dy = e.touches[0].clientY - startY;
  if (dy < 0) { pulling = false; return; }

  const progress = Math.min(dy / MAX_PULL, 1);

  if (progress > 0.1) {
    createIndicator();
    const translateY = Math.min(dy * 0.5, 80);
    indicator.style.transform = `translateX(-50%) translateY(${translateY}px)`;
    indicator.classList.add('ptr-visible');

    if (dy >= PULL_THRESHOLD) {
      indicator.style.borderColor = 'var(--color-accent)';
    } else {
      indicator.style.borderColor = '';
    }
  }
}

async function onTouchEnd(e) {
  if (!pulling || refreshing) return;

  const dy = e.changedTouches[0].clientY - startY;
  pulling = false;

  if (dy >= PULL_THRESHOLD && indicator) {
    // Trigger refresh
    refreshing = true;
    haptic.medium();
    indicator.classList.add('ptr-loading');
    indicator.style.transform = `translateX(-50%) translateY(calc(env(safe-area-inset-top, 0px) + 12px))`;

    try {
      if (onRefreshCallback) await onRefreshCallback();
    } catch (err) {
      console.warn('[ptr] Refresh failed:', err.message);
    }

    // Hide after a minimum visible time
    await new Promise((r) => setTimeout(r, 400));
    refreshing = false;
    indicator.classList.remove('ptr-loading', 'ptr-visible');
    indicator.style.transform = '';
    setTimeout(removeIndicator, 200);
  } else {
    // Snap back
    if (indicator) {
      indicator.classList.remove('ptr-visible');
      indicator.style.transform = '';
      setTimeout(removeIndicator, 200);
    }
  }
}

/**
 * Initialize pull-to-refresh on a container.
 * @param {Function} onRefresh - async callback to execute on pull
 * @returns {Function} cleanup function
 */
export function initPullToRefresh(onRefresh) {
  onRefreshCallback = onRefresh;
  const container = document.getElementById('view-container');
  if (!container) return () => {};

  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, { passive: true });
  container.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    container.removeEventListener('touchstart', onTouchStart);
    container.removeEventListener('touchmove', onTouchMove);
    container.removeEventListener('touchend', onTouchEnd);
    removeIndicator();
    onRefreshCallback = null;
  };
}
