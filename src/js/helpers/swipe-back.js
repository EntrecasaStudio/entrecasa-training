/**
 * Swipe-back gesture — swipe right to go back on non-tab views.
 * Mimics iOS edge-swipe navigation.
 */
import { setTransitionDirection } from '@/router.js';
import { haptic } from '@js/helpers/haptics.js';

const EDGE_ZONE = 30;       // px from left edge to start
const THRESHOLD = 60;       // px horizontal to trigger
const MAX_VERTICAL = 40;    // px vertical to cancel

let startX = 0;
let startY = 0;
let swiping = false;
let viewEl = null;

function onTouchStart(e) {
  const touch = e.touches[0];
  // Only start from the left edge
  if (touch.clientX > EDGE_ZONE) return;

  // Block swipe-back during active workout
  if (window.__workoutActive) return;

  startX = touch.clientX;
  startY = touch.clientY;
  swiping = true;

  // Find the current other-view element
  const container = document.getElementById('view-container');
  viewEl = container?.querySelector('.other-view:not([style*="display: none"])');
  if (viewEl) viewEl.classList.add('view-swiping');
}

function onTouchMove(e) {
  if (!swiping || !viewEl) return;

  const touch = e.touches[0];
  const dx = touch.clientX - startX;
  const dy = Math.abs(touch.clientY - startY);

  // Cancel if vertical movement is too large
  if (dy > MAX_VERTICAL) {
    cancelSwipe();
    return;
  }

  // Only move right
  if (dx < 0) return;

  // Interactive drag: move the view
  const progress = Math.min(dx / window.innerWidth, 1);
  viewEl.style.transform = `translateX(${dx}px)`;
  viewEl.style.opacity = 1 - progress * 0.3;
}

function onTouchEnd(e) {
  if (!swiping || !viewEl) return;

  const touch = e.changedTouches[0];
  const dx = touch.clientX - startX;

  if (dx >= THRESHOLD) {
    // Trigger back navigation
    haptic.light();
    setTransitionDirection('pop');

    // Animate out
    viewEl.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
    viewEl.style.transform = 'translateX(100%)';
    viewEl.style.opacity = '0';

    setTimeout(() => {
      history.back();
    }, 150);
  } else {
    // Snap back
    viewEl.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
    viewEl.style.transform = '';
    viewEl.style.opacity = '';
  }

  // Clean up after transition
  setTimeout(() => cancelSwipe(), 250);
}

function cancelSwipe() {
  if (viewEl) {
    viewEl.classList.remove('view-swiping');
    viewEl.style.transform = '';
    viewEl.style.opacity = '';
    viewEl.style.transition = '';
  }
  swiping = false;
  viewEl = null;
}

export function initSwipeBack() {
  const container = document.getElementById('view-container');
  if (!container) return;

  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, { passive: true });
  container.addEventListener('touchend', onTouchEnd, { passive: true });
}
