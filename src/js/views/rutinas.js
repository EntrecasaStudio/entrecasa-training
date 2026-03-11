import {
  getRutinas,
  deleteRutina,
  getUltimaSesionDeRutina,
} from '@/store.js';
import { navigate } from '@/router.js';
import { showModal } from '@js/components/modal.js';
import { icon, iconLg } from '@js/icons.js';
import {
  DIAS_LABEL,
  renderLastDone,
  showPreview,
  getDisplayName,
  formatNumero,
  getTipoIcon,
  normalizeGrupos,
} from '@js/helpers/rutina-helpers.js';
import { getCompositeMuscleSvg } from '@js/helpers/muscle-illustrations.js';

// ── Module-level state ───────────────────────
let activeFilter = 'gimnasio';
let compactView = false;
let cardCounter = 0;
let searchQuery = '';

// ── Helpers ──────────────────────────────────

function getRoutineStats(rutina) {
  const numCirc = rutina.circuitos ? rutina.circuitos.length : 0;
  const numEj = rutina.circuitos
    ? rutina.circuitos.reduce((sum, c) => sum + (c.ejercicios ? c.ejercicios.length : 0), 0)
    : 0;
  return { numCirc, numEj };
}

function formatTimeAgo(fecha) {
  if (!fecha) return '';
  const diff = Date.now() - new Date(fecha).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days}d`;
  if (days < 30) return `Hace ${Math.floor(days / 7)}sem`;
  return `Hace ${Math.floor(days / 30)}m`;
}

function getMetaText(rutina) {
  const { numCirc, numEj } = getRoutineStats(rutina);
  const parts = [];
  if (numCirc > 0) parts.push(`${numCirc}c`);
  if (numEj > 0) parts.push(`${numEj}ej`);

  const ultimaSesion = getUltimaSesionDeRutina(rutina.id);
  if (ultimaSesion) {
    const ago = formatTimeAgo(ultimaSesion.fecha);
    if (ago) parts.push(ago);
  }

  return parts.join(' · ') || '';
}

// ── Card renderers ───────────────────────────

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTipoPrefix(rutina) {
  return rutina.tipo === 'cross' ? 'C' : 'G';
}

function renderCompactCard(rutina) {
  const displayName = capitalizeFirst(getDisplayName(rutina));
  const meta = getMetaText(rutina);
  const prefix = getTipoPrefix(rutina);
  const num = rutina.numero ? `${prefix}${formatNumero(rutina.numero)}` : '';
  const delay = cardCounter++ * 40;

  return `
    <div class="rutina-swipe-container animate-in" style="animation-delay:${delay}ms" data-rutina-id="${rutina.id}">
      <div class="rutina-swipe-action">
        <button class="rutina-swipe-delete" data-action="delete" data-id="${rutina.id}">${icon.trash}</button>
      </div>
      <div class="rutina-swipe-content">
        <div class="rutina-compact" data-action="preview" data-id="${rutina.id}" style="cursor:pointer">
          <div class="rutina-compact-main">
            ${num ? `<div class="rutina-compact-code">${num}</div>` : ''}
            <div class="rutina-compact-name">${displayName}</div>
            ${meta ? `<div class="rutina-compact-meta">${meta}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRutinaCard(rutina) {
  const displayName = capitalizeFirst(getDisplayName(rutina));
  const prefix = getTipoPrefix(rutina);
  const num = rutina.numero ? `${prefix}${formatNumero(rutina.numero)}` : '';
  const { numCirc, numEj } = getRoutineStats(rutina);

  const volantaParts = [num, `${numCirc}c · ${numEj}ej`].filter(Boolean);
  const volanta = volantaParts.join(' · ');

  const ultimaSesion = getUltimaSesionDeRutina(rutina.id);
  const lastDone = ultimaSesion ? formatTimeAgo(ultimaSesion.fecha) : '';

  const delay = cardCounter++ * 60;
  const grupos = [...new Set(rutina.circuitos.flatMap((c) => normalizeGrupos(c)))];

  return `
    <div class="rutina-swipe-container animate-in" style="animation-delay:${delay}ms" data-rutina-id="${rutina.id}">
      <div class="rutina-swipe-action">
        <button class="rutina-swipe-delete" data-action="delete" data-id="${rutina.id}">${icon.trash}</button>
      </div>
      <div class="rutina-swipe-content">
        <div class="rutina-card card" data-rutina-id="${rutina.id}">
          <div class="rutina-card-body" data-action="preview" data-id="${rutina.id}" style="cursor:pointer">
            <div class="rutina-card-info">
              <div class="rutina-card-volanta">${volanta}</div>
              <div class="rutina-card-name">${displayName}</div>
              ${lastDone ? `<div class="rutina-card-last">${lastDone}</div>` : ''}
            </div>
            <div class="rutina-card-illustration">${getCompositeMuscleSvg(grupos, 88)}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Render ────────────────────────────────────

export function render() {
  cardCounter = 0;
  const allRutinas = getRutinas();

  const gimnasio = allRutinas
    .filter((r) => r.tipo === 'gimnasio' || !r.tipo)
    .sort((a, b) => (b.numero || 0) - (a.numero || 0));

  const cross = allRutinas
    .filter((r) => r.tipo === 'cross')
    .sort((a, b) => (b.numero || 0) - (a.numero || 0));

  const gimCount = gimnasio.length;
  const crossCount = cross.length;

  const header = `
    <div class="rutinas-header">
      <h1 class="rutinas-title">Rutinas</h1>
      <div class="rutinas-header-actions">
        <button class="btn-icon-header" data-action="toggle-search" title="Buscar">
          ${icon.search}
        </button>
        <button class="btn-icon-header" data-action="new-rutina">
          ${icon.plus}
        </button>
      </div>
    </div>
    <div class="rutinas-search ${searchQuery ? 'open' : ''}" id="rutinas-search-wrap">
      <input type="text" class="rutinas-search-input" id="rutinas-search-input"
             placeholder="Buscar rutina..." value="${searchQuery}"
             data-action="search-rutina" autocomplete="off">
    </div>
  `;

  if (allRutinas.length === 0) {
    return `
      ${header}
      <div class="empty-state">
        <div class="empty-state-icon">${iconLg('kettlebell')}</div>
        <div class="empty-state-text">No tienes rutinas creadas.<br>Crea tu primera rutina para empezar.</div>
        <button class="btn btn-primary" data-action="new-rutina">${icon.plus} Nueva rutina</button>
      </div>`;
  }

  const toggle = `
    <div class="rutinas-filter-row">
      <div class="ej-type-toggle rutinas-filter-toggle">
        <button class="ej-type-btn ${activeFilter === 'gimnasio' ? 'active' : ''}" data-action="filter-rutina-type" data-type="gimnasio">
          Gimnasio <span class="rutina-filter-count">(${gimCount})</span>
        </button>
        <button class="ej-type-btn ${activeFilter === 'cross' ? 'active' : ''}" data-action="filter-rutina-type" data-type="cross">
          Cross <span class="rutina-filter-count">(${crossCount})</span>
        </button>
      </div>
      <div class="rutinas-view-modes">
        <button class="rutinas-view-btn ${compactView ? 'active' : ''}" data-action="set-view" data-view="compact" title="Vista compacta">${icon.list}</button>
        <button class="rutinas-view-btn ${!compactView ? 'active' : ''}" data-action="set-view" data-view="expanded" title="Vista expandida">${icon.grid}</button>
      </div>
    </div>
  `;

  let filtered = activeFilter === 'cross' ? cross : gimnasio;

  // Apply search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((r) => {
      const name = (r.nombre || '').toLowerCase();
      const num = formatNumero(r.numero).toLowerCase();
      return name.includes(q) || num.includes(q);
    });
  }

  const listClass = compactView ? 'rutinas-list rutinas-list--compact' : 'rutinas-list';
  const renderCard = compactView ? renderCompactCard : renderRutinaCard;

  const list = filtered.length > 0
    ? `<div class="${listClass}" id="rutinas-filtered-list">${filtered.map(renderCard).join('')}</div>`
    : `<div class="empty-state" id="rutinas-filtered-list">
        <div class="empty-state-text">${searchQuery ? 'No se encontraron rutinas.' : `No hay rutinas de ${activeFilter === 'cross' ? 'Cross Training' : 'Gimnasio'}.`}</div>
        ${!searchQuery ? `<button class="btn btn-primary" data-action="new-rutina">${icon.plus} Nueva rutina</button>` : ''}
      </div>`;

  return `
    ${header}
    ${toggle}
    ${list}
  `;
}

// ── Mount ─────────────────────────────────────

export function mount() {
  const app = document.getElementById('app');


  function rerender() {
    cardCounter = 0;
    const allRutinas = getRutinas();

    const gimnasio = allRutinas
      .filter((r) => r.tipo === 'gimnasio' || !r.tipo)
      .sort((a, b) => (b.numero || 0) - (a.numero || 0));

    const cross = allRutinas
      .filter((r) => r.tipo === 'cross')
      .sort((a, b) => (b.numero || 0) - (a.numero || 0));

    // Update toggle counts
    const toggleBtns = document.querySelectorAll('[data-action="filter-rutina-type"]');
    toggleBtns.forEach((btn) => {
      const type = btn.dataset.type;
      const count = type === 'cross' ? cross.length : gimnasio.length;
      const countEl = btn.querySelector('.rutina-filter-count');
      if (countEl) countEl.textContent = `(${count})`;
      btn.classList.toggle('active', type === activeFilter);
    });

    // Update view mode buttons
    document.querySelectorAll('[data-action="set-view"]').forEach((btn) => {
      const isCompact = btn.dataset.view === 'compact';
      btn.classList.toggle('active', isCompact === compactView);
    });

    // Re-render list
    const container = document.getElementById('rutinas-filtered-list');
    if (!container) return;

    let filtered = activeFilter === 'cross' ? cross : gimnasio;

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const name = (r.nombre || '').toLowerCase();
        const num = formatNumero(r.numero).toLowerCase();
        return name.includes(q) || num.includes(q);
      });
    }

    const renderCard = compactView ? renderCompactCard : renderRutinaCard;

    if (filtered.length > 0) {
      container.className = compactView ? 'rutinas-list rutinas-list--compact' : 'rutinas-list';
      container.innerHTML = filtered.map(renderCard).join('');
    } else {
      container.className = 'empty-state';
      container.innerHTML = `
        <div class="empty-state-text">${searchQuery ? 'No se encontraron rutinas.' : `No hay rutinas de ${activeFilter === 'cross' ? 'Cross Training' : 'Gimnasio'}.`}</div>
        ${!searchQuery ? `<button class="btn btn-primary" data-action="new-rutina">${icon.plus} Nueva rutina</button>` : ''}
      `;
    }

  }

  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
      case 'new-rutina':
        navigate('/rutina/nueva');
        break;
      case 'preview':
        if (swipeBlocked) return;
        // Close any open swipes on tap
        closeAllSwipes();
        showPreview(id);
        break;
      case 'edit':
        navigate(`/rutina/editar/${id}`);
        break;
      /* duplicate moved to preview modal */
      case 'filter-rutina-type': {
        const newFilter = btn.dataset.type;
        if (newFilter !== activeFilter) {
          activeFilter = newFilter;
          rerender();
        }
        break;
      }
      case 'set-view': {
        const newView = btn.dataset.view === 'compact';
        if (newView !== compactView) {
          compactView = newView;
          rerender();
        }
        break;
      }
      case 'toggle-search': {
        const wrap = document.getElementById('rutinas-search-wrap');
        if (wrap) {
          const isOpen = wrap.classList.toggle('open');
          if (isOpen) {
            const input = document.getElementById('rutinas-search-input');
            if (input) setTimeout(() => input.focus(), 100);
          } else {
            searchQuery = '';
            rerender();
          }
        }
        break;
      }
      case 'delete':
        showModal({
          title: 'Eliminar rutina',
          body: 'Esta accion no se puede deshacer.',
          confirmText: 'Eliminar',
          danger: true,
          onConfirm: () => {
            deleteRutina(id);
            rerender();
          },
        });
        break;
    }
  };

  app.addEventListener('click', handleClick);

  // Search input listener
  const handleSearchInput = (e) => {
    if (e.target.id === 'rutinas-search-input') {
      searchQuery = e.target.value;
      rerender();
    }
  };
  app.addEventListener('input', handleSearchInput);

  // ── Swipe-to-delete touch handling ──────────
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeTarget = null;
  let swipeDeltaX = 0;
  let swipeActive = false;
  let swipeBlocked = false; // blocks click after swipe gesture
  let wasSwiped = false; // tracks if target was already swiped open on touch start
  let directionLocked = false; // true once we decide vertical-vs-horizontal

  const SWIPE_DEAD_ZONE = 30; // px — large dead zone prevents accidental swipe on tap

  function closeAllSwipes(except) {
    document.querySelectorAll('.rutina-swipe-content.swiped').forEach((el) => {
      if (el !== except) {
        el.style.transform = '';
        el.classList.remove('swiped');
      }
    });
  }

  const handleTouchStart = (e) => {
    const content = e.target.closest('.rutina-swipe-content');
    if (!content) return;
    swipeTarget = content;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipeDeltaX = 0;
    swipeActive = false;
    directionLocked = false;
    wasSwiped = content.classList.contains('swiped');
  };

  const handleTouchMove = (e) => {
    if (!swipeTarget) return;
    const dx = e.touches[0].clientX - swipeStartX;
    const dy = e.touches[0].clientY - swipeStartY;

    // First meaningful move — lock direction
    if (!directionLocked) {
      if (Math.abs(dx) < SWIPE_DEAD_ZONE && Math.abs(dy) < SWIPE_DEAD_ZONE) return;

      directionLocked = true;

      // Vertical scroll wins — abort swipe entirely
      if (Math.abs(dy) >= Math.abs(dx)) {
        swipeTarget = null;
        return;
      }

      // Only left swipe activates (right swipe on already-swiped card is ok)
      if (dx > 0 && !wasSwiped) {
        swipeTarget = null;
        return;
      }

      swipeActive = true;
      swipeTarget.style.transition = 'none';
      closeAllSwipes(swipeTarget);
    }

    if (!swipeActive) return;
    e.preventDefault();

    // Only allow left swipe (negative dx), cap at -80
    swipeDeltaX = Math.max(-80, Math.min(0, dx));
    swipeTarget.style.transform = `translateX(${swipeDeltaX}px)`;
  };

  const handleTouchEnd = () => {
    if (!swipeTarget) return;
    swipeTarget.style.transition = '';
    if (swipeDeltaX < -40) {
      // Snap open
      swipeTarget.style.transform = 'translateX(-80px)';
      swipeTarget.classList.add('swiped');
    } else {
      // Snap closed
      swipeTarget.style.transform = '';
      swipeTarget.classList.remove('swiped');
    }

    // Block the subsequent click event if swipe was active or card was already swiped open
    if (swipeActive || wasSwiped) {
      swipeBlocked = true;
      setTimeout(() => { swipeBlocked = false; }, 300);
    }

    swipeTarget = null;
    swipeActive = false;
    directionLocked = false;
    wasSwiped = false;
  };

  app.addEventListener('touchstart', handleTouchStart, { passive: true });
  app.addEventListener('touchmove', handleTouchMove, { passive: false });
  app.addEventListener('touchend', handleTouchEnd);

  return () => {
    app.removeEventListener('click', handleClick);
    app.removeEventListener('input', handleSearchInput);
    app.removeEventListener('touchstart', handleTouchStart);
    app.removeEventListener('touchmove', handleTouchMove);
    app.removeEventListener('touchend', handleTouchEnd);
  };
}
