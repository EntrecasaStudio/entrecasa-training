/**
 * Avatar menu — profile switcher (Lean/Nat) + Google account info.
 * Profile switching is purely local (changes gym_usuario in localStorage).
 * No Google popup needed — both profiles share the same data store.
 */
import { icon } from '@js/icons.js';
import { getUsuarioActivo, setUsuarioActivo } from '@/store.js';
import { getCurrentUser, logout } from '@js/services/firebase.js';
import { navigate } from '@/router.js';
import { applyUserAccent } from '@js/services/theme-manager.js';

const PROFILES = ['Lean', 'Nat'];

const PROFILE_COLORS = {
  Lean: { bg: 'rgba(255,205,0,0.2)', fg: '#FFCD00' },
  Nat: { bg: 'rgba(155,135,245,0.2)', fg: '#9b87f5' },
};

let _container = null;
let _isOpen = false;

// ── Render ────────────────────────────────────

function getInitial(name) {
  return (name || '?')[0].toUpperCase();
}

function renderButton() {
  const usuario = getUsuarioActivo();

  // Always show the profile initial (L/N) — not the Google photo
  return `
    <button class="avatar-btn" id="avatar-btn" title="${usuario}">
      <span class="avatar-btn-initial">${getInitial(usuario)}</span>
    </button>
  `;
}

function renderProfileItem(name, isActive) {
  const c = PROFILE_COLORS[name] || PROFILE_COLORS.Lean;
  return `
    <button class="avatar-user-item ${isActive ? 'active' : ''}" data-avatar-action="switch-profile" data-profile="${name}">
      <span class="avatar-item-initial" style="background:${c.bg};color:${c.fg}">${getInitial(name)}</span>
      <span class="avatar-item-name">${name}</span>
      ${isActive ? `<span class="avatar-item-check" style="color:${c.fg}">${icon.check}</span>` : ''}
    </button>
  `;
}

function renderDropdown() {
  const firebaseUser = getCurrentUser();
  const usuario = getUsuarioActivo();

  // Profile switcher (always shown)
  const profileItems = PROFILES.map((name) =>
    renderProfileItem(name, name === usuario),
  ).join('');

  let googleSection = '';
  if (firebaseUser) {
    // Show Google account info + logout
    const photoHTML = firebaseUser.photoURL
      ? `<img src="${firebaseUser.photoURL}" alt="" referrerpolicy="no-referrer" class="avatar-item-img" />`
      : `<span class="avatar-item-initial">${getInitial(firebaseUser.displayName || firebaseUser.email)}</span>`;

    googleSection = `
      <div class="avatar-dropdown-divider"></div>
      <div class="avatar-account-info-row">
        ${photoHTML}
        <div class="avatar-account-info">
          <span class="avatar-account-name">${firebaseUser.displayName || ''}</span>
          <span class="avatar-account-email">${firebaseUser.email || ''}</span>
        </div>
      </div>
      <button class="avatar-dropdown-action avatar-dropdown-danger" data-avatar-action="logout">
        ${icon.logOut}
        <span>Cerrar sesion</span>
      </button>
    `;
  }

  return `
    <div class="avatar-backdrop" id="avatar-backdrop"></div>
    <div class="avatar-dropdown" id="avatar-dropdown">
      ${profileItems}
      ${googleSection}
    </div>
  `;
}

// ── Open / Close ──────────────────────────────

function openMenu() {
  if (_isOpen) return;
  _isOpen = true;

  const existing = document.getElementById('avatar-dropdown');
  if (existing) existing.remove();
  const existingBackdrop = document.getElementById('avatar-backdrop');
  if (existingBackdrop) existingBackdrop.remove();

  const wrap = document.createElement('div');
  wrap.id = 'avatar-dropdown-wrap';
  wrap.innerHTML = renderDropdown();
  document.body.appendChild(wrap);

  const dropdown = document.getElementById('avatar-dropdown');
  if (dropdown) {
    dropdown.offsetHeight;
    dropdown.classList.add('avatar-dropdown--open');
  }

  const backdrop = document.getElementById('avatar-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeMenu);
  }

  wrap.addEventListener('click', handleDropdownClick);
}

function closeMenu() {
  if (!_isOpen) return;
  _isOpen = false;

  const wrap = document.getElementById('avatar-dropdown-wrap');
  if (wrap) {
    const dropdown = wrap.querySelector('.avatar-dropdown');
    if (dropdown) {
      dropdown.classList.remove('avatar-dropdown--open');
      dropdown.classList.add('avatar-dropdown--closing');
      dropdown.addEventListener('animationend', () => wrap.remove(), { once: true });
      setTimeout(() => { if (wrap.parentNode) wrap.remove(); }, 200);
    } else {
      wrap.remove();
    }
  }
}

// ── Actions ───────────────────────────────────

function handleDropdownClick(e) {
  const btn = e.target.closest('[data-avatar-action]');
  if (!btn) return;

  const action = btn.dataset.avatarAction;

  switch (action) {
    case 'switch-profile': {
      const profile = btn.dataset.profile;
      closeMenu();
      if (profile === getUsuarioActivo()) return;
      setUsuarioActivo(profile);
      applyUserAccent(profile);
      updateAvatarMenu();
      navigate('/');
      break;
    }

    case 'logout':
      closeMenu();
      if (confirm('¿Cerrar sesion?')) {
        logout().catch((err) => console.warn('[auth] Logout error:', err.message));
      }
      break;
  }
}

// ── Public API ────────────────────────────────

export function mountAvatarMenu() {
  _container = document.getElementById('avatar-menu-container');
  if (!_container) return;

  _container.innerHTML = renderButton();

  _container.addEventListener('click', (e) => {
    if (e.target.closest('#avatar-btn')) {
      if (_isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }
  });
}

export function updateAvatarMenu() {
  if (!_container) return;
  _container.innerHTML = renderButton();
}

export function setAvatarMenuVisible(show) {
  if (!_container) return;
  _container.style.display = show ? '' : 'none';
}
