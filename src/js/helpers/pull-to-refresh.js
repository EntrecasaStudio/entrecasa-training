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
  indicator.innerHTML = `<span class="ptr-icon">${icon.refresh}</span>`;
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
    const rotation = progress * 360;
    indicator.style.transform = `translateX(-50%) translateY(${translateY}px)`;
    indicator.classList.add('ptr-visible');

    // Rotate icon based on pull progress
    const iconEl = indicator.querySelector('.ptr-icon');
    if (iconEl) iconEl.style.transform = `rotate(${rotation}deg)`;

    if (dy >= PULL_THRESHOLD) {
      indicator.style.borderColor = 'var(--color-accent)';
      indicator.classList.add('ptr-ready');
    } else {
      indicator.style.borderColor = '';
      indicator.classList.remove('ptr-ready');
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
