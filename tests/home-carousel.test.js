/**
 * Tests for home.js — carousel render + defaultUsaPeso integration
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── localStorage mock ──────────────────────────────────────────────
const storage = new Map();
const localStorageMock = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, val) => storage.set(key, val),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
vi.stubGlobal('localStorage', localStorageMock);

// ── Module mocks ───────────────────────────────────────────────────
vi.mock('@js/services/sync.js', () => ({ queueSync: vi.fn() }));
vi.mock('@js/services/firebase.js', () => ({ getCurrentUser: vi.fn(() => ({ uid: 'test' })), auth: null }));
vi.mock('@js/components/nav-bar.js', () => ({ updateMainButton: vi.fn(), setNavBarVisible: vi.fn(), setActiveTab: vi.fn() }));
vi.mock('@js/components/avatar-menu.js', () => ({ updateAvatarMenu: vi.fn(), setAvatarMenuVisible: vi.fn() }));
vi.mock('@js/helpers/rutina-helpers.js', () => ({
  renderTags: vi.fn(() => ''),
  renderLastDone: vi.fn(() => ''),
  showPreview: vi.fn(),
  showDayAssignmentModal: vi.fn(),
  formatNumero: vi.fn((n) => n ? `C#${n}` : ''),
  normalizeGrupos: vi.fn(() => []),
}));
vi.mock('@js/helpers/stats-helpers.js', () => ({
  getWeeklyStreak: vi.fn(() => 3),
  getSessionsThisWeek: vi.fn(() => 2),
  getPlannedDaysThisWeek: vi.fn(() => 4),
  getDaysSinceLastSession: vi.fn(() => 1),
  getMonthActivity: vi.fn(() => []),
  getSessionsForDate: vi.fn(() => []),
  getPlannedRoutineForDate: vi.fn(() => null),
  getMonthPlannedDays: vi.fn(() => []),
}));

import { render } from '@js/views/home.js';

// ── Tests ──────────────────────────────────────────────────────────

describe('home carousel', () => {
  beforeEach(() => {
    storage.clear();
    storage.set('gym_usuario', 'Lean');
    storage.set('gym_rutinas', JSON.stringify([]));
    storage.set('gym_plan_semanal', JSON.stringify({}));
  });

  it('renders a .user-carousel container', () => {
    const html = render({});
    expect(html).toContain('user-carousel');
  });

  it('renders exactly 2 slides — one per user', () => {
    const html = render({});
    const matches = html.match(/user-carousel-slide/g) || [];
    expect(matches.length).toBe(2);
  });

  it('renders a slide for Lean and one for Nat', () => {
    const html = render({});
    expect(html).toContain('data-usuario="Lean"');
    expect(html).toContain('data-usuario="Nat"');
  });

  it('renders dot indicators for carousel', () => {
    const html = render({});
    const dots = html.match(/user-carousel-dot/g) || [];
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  it('renders exactly one active dot', () => {
    const html = render({});
    const activeDots = (html.match(/user-carousel-dot active/g) || []).length;
    expect(activeDots).toBe(1);
  });

  it('does not render <details> or <summary> elements (no expand/collapse)', () => {
    const html = render({});
    expect(html).not.toContain('<details');
    expect(html).not.toContain('<summary');
  });

  it('renders user-card inside each slide', () => {
    const html = render({});
    const cards = html.match(/class="user-card"/g) || [];
    expect(cards.length).toBe(2);
  });

  it('renders circuit list directly (no chevron)', () => {
    const html = render({});
    expect(html).not.toContain('user-summary-chevron');
  });
});
