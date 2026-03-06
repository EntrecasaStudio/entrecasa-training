/**
 * Avatar menu — Slack/Gmail-style account switcher.
 * Persistent top-left button that opens a dropdown to switch between users.
 */
import { icon } from '@js/icons.js';
import { getUsuarioActivo, setUsuarioActivo } from '@/store.js';
import { getCurrentUser, logout, switchAccount, auth } from '@js/services/firebase.js';
import { stopRealtimeSync, startRealtimeSync, downloadAllData } from '@js/services/sync.js';
import { navigate } from '@/router.js';
import { showToast } from '@js/components/toast.js';

// Users available in local mode
const LOCAL_USERS = ['Lean', 'Nat'];

let _container = null;
let _isOpen = false;

// ── Render ────────────────────────────────────

function getInitial(name) {
  return (name || '?')[0].toUpperCase();
}

function renderButton() {
  const usuario = getUsuarioActivo();
  const firebaseUser = getCurrentUser();

  // Use Firebase photo if available
  if (firebaseUser?.photoURL) {
    return `
      <button class="avatar-btn" id="avatar-btn" title="${usuario}">
        <img src="${firebaseUser.photoURL}" alt="" referrerpolicy="no-referrer" class="avatar-btn-img" />
      </button>
    `;
  }

  // Fallback: initial letter
  return `
    <button class="avatar-btn" id="avatar-btn" title="${usuario}">
      <span class="avatar-btn-initial">${getInitial(usuario)}</span>
    </button>
  `;
}

function renderDropdown() {
  const usuario = getUsuarioActivo();
  const firebaseUser = getCurrentUser();

  let items = '';

  if (firebaseUser) {
    // Firebase mode: show current account info + switch/logout
    const displayName = firebaseUser.displayName || usuario;
    const email = firebaseUser.email || '';
    const photoHTML = firebaseUser.photoURL
      ? `<img src="${firebaseUser.photoURL}" alt="" referrerpolicy="no-referrer" class="avatar-item-img" />`
      : `<span class="avatar-item-initial">${getInitial(displayName)}</span>`;

    items = `
      <div class="avatar-dropdown-current">
        ${photoHTML}
        <div class="avatar-dropdown-info">
          <span class="avatar-dropdown-name">${displayName}</span>
          <span class="avatar-dropdown-email">${email}</span>
        </div>
        <span class="avatar-item-check">${icon.check}</span>
      </div>
      <div class="avatar-dropdown-divider"></div>
      <button class="avatar-dropdown-action" data-avatar-action="switch-account">
        ${icon.user}
        <span>Cambiar cuenta</span>
      </button>
      <button class="avatar-dropdown-action avatar-dropdown-danger" data-avatar-action="logout">
        ${icon.logOut}
        <span>Cerrar sesion</span>
      </button>
    `;
  } else {
    // Local mode: list of users
    items = LOCAL_USERS.map((name) => {
      const isActive = name === usuario;
      return `
        <button class="avatar-user-item ${isActive ? 'active' : ''}" data-avatar-action="switch-user" data-user="${name}">
          <span class="avatar-item-initial">${getInitial(name)}</span>
          <span class="avatar-item-name">${name}</span>
          ${isActive ? `<span class="avatar-item-check">${icon.check}</span>` : ''}
        </button>
      `;
    }).join('');
  }

  return `
    <div class="avatar-backdrop" id="avatar-backdrop"></div>
    <div class="avatar-dropdown" id="avatar-dropdown">
      ${items}
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

  // Force reflow then add open class for animation
  const dropdown = document.getElementById('avatar-dropdown');
  if (dropdown) {
    dropdown.offsetHeight; // trigger reflow
    dropdown.classList.add('avatar-dropdown--open');
  }

  // Bind events
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
      // Safety fallback
      setTimeout(() => { if (wrap.parentNode) wrap.remove(); }, 200);
    } else {
      wrap.remove();
    }
  }
}

// ── Actions ───────────────────────────────────

async function handleDropdownClick(e) {
  const btn = e.target.closest('[data-avatar-action]');
  if (!btn) return;

  const action = btn.dataset.avatarAction;

  switch (action) {
    case 'switch-user': {
      const newUser = btn.dataset.user;
      if (newUser === getUsuarioActivo()) {
        closeMenu();
        return;
      }
      closeMenu();
      setUsuarioActivo(newUser);
      updateAvatarMenu();
      navigate('/');
      break;
    }

    case 'switch-account':
      closeMenu();
      try {
        await switchAccount();
      } catch (err) {
        if (err.code !== 'auth/popup-closed-by-user') {
          showToast('Error al cambiar cuenta');
          console.warn('[avatar-menu] switchAccount error:', err);
        }
      }
      break;

    case 'logout':
      closeMenu();
      if (confirm('¿Cerrar sesion?')) {
        logout();
      }
      break;
  }
}

// ── Public API ────────────────────────────────

/**
 * Mount the avatar menu in #avatar-menu-container.
 * Called once from main.js.
 */
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

/**
 * Re-render the avatar button (call after user switch / auth change).
 */
export function updateAvatarMenu() {
  if (!_container) return;
  _container.innerHTML = renderButton();
}

/**
 * Show/hide the avatar button (hide on fullscreen views like workout/login).
 */
export function setAvatarMenuVisible(show) {
  if (!_container) return;
  _container.style.display = show ? '' : 'none';
}
