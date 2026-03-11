/**
 * Theme manager — persists and applies CSS custom property overrides.
 */

const THEME_KEY = 'gym_theme';

const LIGHT_MODE = {
  '--color-bg': '#F5F0E8',
  '--color-surface': '#FFFFFF',
  '--color-surface-alt': '#EBEBEB',
  '--color-border': '#D4D4D4',
  '--color-text': '#1A1A1A',
  '--color-text-muted': '#666666',
};

const DARK_MODE = {
  '--color-bg': '#1A1A1A',
  '--color-surface': '#242424',
  '--color-surface-alt': '#2E2E2E',
  '--color-border': '#3A3A3A',
  '--color-text': '#F5F0E8',
  '--color-text-muted': '#ABABAB',
};

function getSaved() {
  try {
    return JSON.parse(localStorage.getItem(THEME_KEY)) || {};
  } catch {
    return {};
  }
}

function persist(overrides) {
  localStorage.setItem(THEME_KEY, JSON.stringify(overrides));
}

function applyToDOM(overrides) {
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(overrides)) {
    root.style.setProperty(prop, value);
  }
  // Also set bg on body for consistency
  if (overrides['--color-bg']) {
    document.body.style.backgroundColor = overrides['--color-bg'];
  }
}

/**
 * Apply specific CSS variable changes and persist.
 */
export function applyThemeChanges(changes) {
  const saved = getSaved();
  Object.assign(saved, changes);
  persist(saved);
  applyToDOM(changes);
}

/**
 * Switch to light mode.
 */
export function applyLightMode() {
  const saved = getSaved();
  Object.assign(saved, LIGHT_MODE);
  saved['--theme-mode'] = 'light';
  persist(saved);
  applyToDOM(LIGHT_MODE);
}

/**
 * Switch to dark mode (original).
 */
export function applyDarkMode() {
  const saved = getSaved();
  Object.assign(saved, DARK_MODE);
  saved['--theme-mode'] = 'dark';
  persist(saved);
  applyToDOM(DARK_MODE);
}

/**
 * Reset everything to defaults.
 */
export function resetTheme() {
  localStorage.removeItem(THEME_KEY);
  const root = document.documentElement;
  // Remove all inline style overrides
  root.removeAttribute('style');
  document.body.style.backgroundColor = '';
}

/**
 * Apply per-user accent color.
 * NAT → violet (#9b87f5), LEAN (default) → yellow (#FFCD00).
 */
const USER_ACCENTS = {
  Nat: { '--color-accent': '#9b87f5', '--color-accent-hover': '#8570e0' },
  Lean: { '--color-accent': '#FFCD00', '--color-accent-hover': '#E5B800' },
};

export function applyUserAccent(userName) {
  const accent = USER_ACCENTS[userName] || USER_ACCENTS.Lean;
  applyToDOM(accent);
}

/**
 * Load and apply saved theme on app startup.
 */
export function loadSavedTheme() {
  const saved = getSaved();
  if (Object.keys(saved).length > 0) {
    applyToDOM(saved);
  }
}
