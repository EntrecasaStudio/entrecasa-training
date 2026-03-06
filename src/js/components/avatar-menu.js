/**
 * Avatar menu — Gmail-style multi-account switcher.
 * Remembers known Google accounts and lets you switch without re-entering passwords.
 * Each Google account maps to a profile (Lean/Nat) via uid.
 */
import { icon } from '@js/icons.js';
import { getUsuarioActivo, setUsuarioActivo } from '@/store.js';
import { getCurrentUser, logout, switchAccount, auth } from '@js/services/firebase.js';
import { navigate } from '@/router.js';
import { showToast } from '@js/components/toast.js';

const KNOWN_ACCOUNTS_KEY = 'gym_known_accounts';

let _container = null;
let _isOpen = false;

// ── Known accounts storage ───────────────────

function getKnownAccounts() {
  try {
    return JSON.parse(localStorage.getItem(KNOWN_ACCOUNTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveKnownAccounts(accounts) {
  localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(accounts));
}

/**
 * Register/update a Google account in the known list.
 * Auto-assigns a profile name (Lean for first, Nat for second).
 * Returns the assigned profile name.
 */
export function registerAccount(user) {
  if (!user) return null;
  const accounts = getKnownAccounts();
  const existing = accounts.find((a) => a.uid === user.uid);

  if (existing) {
    // Update display info
    existing.displayName = user.displayName || existing.displayName;
    existing.email = user.email || existing.email;
    existing.photoURL = user.photoURL || existing.photoURL;
    saveKnownAccounts(accounts);
    return existing.profile;
  }

  // New account — assign profile
  const usedProfiles = accounts.map((a) => a.profile);
  const profile = !usedProfiles.includes('Lean') ? 'Lean' : 'Nat';

  accounts.push({
    uid: user.uid,
    displayName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    profile,
  });
  saveKnownAccounts(accounts);
  return profile;
}

// ── Render ────────────────────────────────────

function getInitial(name) {
  return (name || '?')[0].toUpperCase();
}

function renderButton() {
  const usuario = getUsuarioActivo();
  const firebaseUser = getCurrentUser();

  if (firebaseUser?.photoURL) {
    return `
      <button class="avatar-btn" id="avatar-btn" title="${usuario}">
        <img src="${firebaseUser.photoURL}" alt="" referrerpolicy="no-referrer" class="avatar-btn-img" />
      </button>
    `;
  }

  return `
    <button class="avatar-btn" id="avatar-btn" title="${usuario}">
      <span class="avatar-btn-initial">${getInitial(usuario)}</span>
    </button>
  `;
}

function renderAccountItem(account, isActive) {
  const photoHTML = account.photoURL
    ? `<img src="${account.photoURL}" alt="" referrerpolicy="no-referrer" class="avatar-item-img" />`
    : `<span class="avatar-item-initial">${getInitial(account.profile)}</span>`;

  return `
    <button class="avatar-account-item ${isActive ? 'active' : ''}" data-avatar-action="switch-to" data-uid="${account.uid}">
      ${photoHTML}
      <div class="avatar-account-info">
        <span class="avatar-account-name">${account.profile}</span>
        <span class="avatar-account-email">${account.email}</span>
      </div>
      ${isActive ? `<span class="avatar-item-check">${icon.check}</span>` : ''}
    </button>
  `;
}

function renderDropdown() {
  const firebaseUser = getCurrentUser();
  const accounts = getKnownAccounts();

  let items = '';

  if (firebaseUser && accounts.length > 0) {
    // Gmail mode: show all known accounts
    const accountItems = accounts.map((a) =>
      renderAccountItem(a, a.uid === firebaseUser.uid),
    ).join('');

    items = `
      ${accountItems}
      <div class="avatar-dropdown-divider"></div>
      <button class="avatar-dropdown-action" data-avatar-action="add-account">
        ${icon.plus}
        <span>Agregar cuenta</span>
      </button>
      <button class="avatar-dropdown-action avatar-dropdown-danger" data-avatar-action="logout">
        ${icon.logOut}
        <span>Cerrar sesion</span>
      </button>
    `;
  } else if (firebaseUser) {
    // Logged in but no known accounts yet (shouldn't happen normally)
    items = `
      <button class="avatar-dropdown-action" data-avatar-action="add-account">
        ${icon.plus}
        <span>Agregar cuenta</span>
      </button>
      <button class="avatar-dropdown-action avatar-dropdown-danger" data-avatar-action="logout">
        ${icon.logOut}
        <span>Cerrar sesion</span>
      </button>
    `;
  } else {
    // Not logged in (local mode fallback)
    const LOCAL_USERS = ['Lean', 'Nat'];
    const usuario = getUsuarioActivo();
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

async function handleDropdownClick(e) {
  const btn = e.target.closest('[data-avatar-action]');
  if (!btn) return;

  const action = btn.dataset.avatarAction;

  switch (action) {
    case 'switch-to': {
      const uid = btn.dataset.uid;
      const current = getCurrentUser();
      if (current && current.uid === uid) {
        closeMenu();
        return;
      }
      closeMenu();
      try {
        await switchAccount();
        // onAuthStateChanged in main.js handles the rest
      } catch (err) {
        if (err.code !== 'auth/popup-closed-by-user') {
          showToast('Error al cambiar cuenta');
        }
      }
      break;
    }

    case 'add-account':
      closeMenu();
      try {
        await switchAccount();
      } catch (err) {
        if (err.code !== 'auth/popup-closed-by-user') {
          showToast('Error al agregar cuenta');
        }
      }
      break;

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

    case 'logout':
      closeMenu();
      if (confirm('¿Cerrar sesion?')) {
        logout();
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
