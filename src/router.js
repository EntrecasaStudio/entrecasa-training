import { getDataVersion } from '@/store.js';
import { setActiveTab, setNavBarVisible } from '@js/components/nav-bar.js';
import { getCurrentUser } from '@js/services/firebase.js';

// ── Route definitions ───────────────────────────

const TAB_ROUTES = {
  '#/':          { tab: 'entrenamiento', load: () => import('@js/views/home.js') },
  '#/rutinas':   { tab: 'rutinas',       load: () => import('@js/views/rutinas.js') },
  '#/progreso':  { tab: 'progreso',      load: () => import('@js/views/progreso.js') },
  '#/ejercicios':{ tab: 'ejercicios',    load: () => import('@js/views/ejercicios.js') },
  '#/historial': { tab: 'historial',     load: () => import('@js/views/historial.js') },
};

const OTHER_ROUTES = [
  { pattern: /^#\/rutina\/nueva$/,         load: () => import('@js/views/rutina-form.js'), params: { mode: 'crear' } },
  { pattern: /^#\/rutina\/editar\/(.+)$/,  load: () => import('@js/views/rutina-form.js'), params: { mode: 'editar' } },
  { pattern: /^#\/workout\/(.+)$/,         load: () => import('@js/views/workout.js'), fullscreen: true },
  { pattern: /^#\/summary\/(.+)$/,         load: () => import('@js/views/workout-summary.js') },
  { pattern: /^#\/sesion\/(.+)$/,          load: () => import('@js/views/sesion-detalle.js') },
  { pattern: /^#\/login$/,                 load: () => import('@js/views/login.js'), fullscreen: true },
];

// ── View cache for tabs ─────────────────────────

// { el: HTMLElement, cleanup: fn|null, dataVersion: number }
const viewCache = new Map();
let currentCleanup = null;
let currentViewEl = null;
let isTransitioning = false;

function getContainer() {
  return document.getElementById('view-container');
}

// ── Tab route handling (with cache) ─────────────

async function handleTabRoute(hashKey, tabDef) {
  const container = getContainer();
  if (!container) return;

  // Show nav bar for tab routes
  setNavBarVisible(true);
  setActiveTab(tabDef.tab);

  const dataVer = getDataVersion();
  const cached = viewCache.get(hashKey);

  // Cache hit: data is fresh, just show/hide
  if (cached && cached.dataVersion === dataVer) {
    // Clean up previous non-cached view if any
    if (currentCleanup && currentViewEl && !currentViewEl.dataset.tabKey) {
      currentCleanup();
      currentCleanup = null;
      currentViewEl.remove();
      currentViewEl = null;
    }

    // Hide all tab wrappers, show the cached one
    showTabWrapper(container, cached.el);
    currentViewEl = cached.el;
    currentCleanup = cached.cleanup;
    return;
  }

  // Cache miss or stale: destroy old cache entry, render fresh
  if (cached) {
    if (cached.cleanup) cached.cleanup();
    cached.el.remove();
    viewCache.delete(hashKey);
  }

  // Clean up current view
  cleanupCurrentView(container);

  const mod = await tabDef.load();
  const wrapper = document.createElement('div');
  wrapper.className = 'tab-view';
  wrapper.dataset.tabKey = hashKey;
  wrapper.innerHTML = mod.render({});

  container.appendChild(wrapper);
  showTabWrapper(container, wrapper);

  // Enter animation
  wrapper.classList.add('view-entering');
  wrapper.addEventListener('animationend', () => {
    wrapper.classList.remove('view-entering');
    isTransitioning = false;
  }, { once: true });

  const cleanup = mod.mount ? (mod.mount({}) || null) : null;

  viewCache.set(hashKey, { el: wrapper, cleanup, dataVersion: dataVer });
  currentViewEl = wrapper;
  currentCleanup = cleanup;
}

function showTabWrapper(container, activeEl) {
  // Hide all children
  for (const child of container.children) {
    child.style.display = 'none';
  }
  activeEl.style.display = '';
}

// ── Non-tab route handling (no cache) ───────────

async function handleOtherRoute(route, hash) {
  const container = getContainer();
  if (!container) return;

  const match = hash.match(route.pattern);
  if (!match) return;

  // Show/hide nav bar
  setNavBarVisible(!route.fullscreen);

  // Clean up current view
  cleanupCurrentView(container);

  // Exit animation
  if (container.children.length && !isTransitioning) {
    isTransitioning = true;
    container.classList.add('view-exiting');
    await new Promise((r) => setTimeout(r, 120));
    container.classList.remove('view-exiting');
  }

  // Hide all cached tab wrappers
  for (const child of container.children) {
    child.style.display = 'none';
  }

  const mod = await route.load();
  const params = { ...(route.params || {}), id: match[1] || null };

  const wrapper = document.createElement('div');
  wrapper.className = 'other-view';
  wrapper.innerHTML = mod.render(params);
  container.appendChild(wrapper);

  // Enter animation
  wrapper.classList.add('view-entering');
  wrapper.addEventListener('animationend', () => {
    wrapper.classList.remove('view-entering');
    isTransitioning = false;
  }, { once: true });

  const cleanup = mod.mount ? (mod.mount(params) || null) : null;
  currentViewEl = wrapper;
  currentCleanup = cleanup;
}

function cleanupCurrentView(container) {
  if (currentCleanup && currentViewEl) {
    // If it's a cached tab view, don't destroy — just hide
    if (currentViewEl.dataset.tabKey) {
      currentViewEl.style.display = 'none';
    } else {
      // Non-tab view: destroy
      currentCleanup();
      currentViewEl.remove();
    }
  }
  currentCleanup = null;
  currentViewEl = null;
}

// ── Main router ─────────────────────────────────

async function handleRoute() {
  let hash = window.location.hash || '#/';

  // Normalize: bare '#' or '' → '#/'
  if (hash === '#' || hash === '') hash = '#/';

  // ── Auth guard ───────────────────────
  if (hash !== '#/login' && !getCurrentUser()) {
    window.location.hash = '#/login';
    return;
  }
  if (hash === '#/login' && getCurrentUser()) {
    window.location.hash = '#/';
    return;
  }

  // 1. Check tab routes (exact match)
  if (TAB_ROUTES[hash]) {
    await handleTabRoute(hash, TAB_ROUTES[hash]);
    return;
  }

  // 2. Check other routes (regex match)
  for (const route of OTHER_ROUTES) {
    if (hash.match(route.pattern)) {
      await handleOtherRoute(route, hash);
      return;
    }
  }

  // 3. Fallback
  navigate('/');
}

/**
 * Re-render the current tab view in-place (no animation, no flicker).
 * Used after in-page data changes (e.g., day assignment).
 */
export async function refreshCurrentTab() {
  let hash = window.location.hash || '#/';
  if (hash === '#' || hash === '') hash = '#/';

  const tabDef = TAB_ROUTES[hash];
  if (!tabDef) return; // not on a tab route

  const container = getContainer();
  if (!container) return;

  const cached = viewCache.get(hash);

  // Cleanup old
  if (cached) {
    if (cached.cleanup) cached.cleanup();
    cached.el.remove();
    viewCache.delete(hash);
  }

  // Render fresh — no animation
  const mod = await tabDef.load();
  const wrapper = document.createElement('div');
  wrapper.className = 'tab-view';
  wrapper.dataset.tabKey = hash;
  wrapper.innerHTML = mod.render({});

  container.appendChild(wrapper);
  showTabWrapper(container, wrapper);

  const cleanup = mod.mount ? (mod.mount({}) || null) : null;
  const dataVer = getDataVersion();
  viewCache.set(hash, { el: wrapper, cleanup, dataVersion: dataVer });
  currentViewEl = wrapper;
  currentCleanup = cleanup;
}

export function navigate(path) {
  const target = path.startsWith('#') ? path : '#' + path;
  if (window.location.hash === target) {
    handleRoute(); // Force re-render on same route
  } else {
    window.location.hash = path;
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
