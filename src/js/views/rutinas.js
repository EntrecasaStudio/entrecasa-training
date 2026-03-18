import {
  getRutinas,
  deleteRutina,
  restoreRutina,
  getUltimaSesionDeRutina,
  getUsuarioActivo,
  isRutinaDoneInCycle,
  checkCycleComplete,
  getRutinaStats,
} from '@/store.js';
import { navigate } from '@/router.js';
import { showToast, showToastAction } from '@js/components/toast.js';
import { icon, iconLg } from '@js/icons.js';
import {
  DIAS_LABEL,
  renderLastDone,
  showPreview,
  getDisplayName,
  formatNumero,
  getTipoIcon,
  normalizeGrupos,
  renderPicante,
  renderTags,
} from '@js/helpers/rutina-helpers.js';

// ── Module-level state ───────────────────────
let activeFilter = 'gimnasio';
let compactView = false;
let cardCounter = 0;
let searchQuery = '';
let sortBy = 'numero'; // 'numero' | 'picante' | 'duracion' | 'done'
let filterDone = 'all'; // 'all' | 'pending' | 'done'

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

  const stats = getRutinaStats(rutina.id);
  if (stats?.avgDuracion) parts.push(`~${stats.avgDuracion}min`);

  const ultimaSesion = getUltimaSesionDeRutina(rutina.id);
  if (ultimaSesion) {
    const ago = formatTimeAgo(ultimaSesion.fecha);
    if (ago) parts.push(ago);
  }

  return parts.join(' · ') || '';
}

/** Return all routines (H and M visible for both users) */
function filterByUser(rutinas) {
  return rutinas;
}

/** Check if routine is done in current cycle */
function isDone(rutina) {
  const usuario = getUsuarioActivo();
  const tipo = rutina.tipo || 'gimnasio';
  return isRutinaDoneInCycle(rutina.id, usuario, tipo);
}

/** Apply sort */
function applySorting(rutinas) {
  switch (sortBy) {
    case 'picante':
      return [...rutinas].sort((a, b) => (b.picante || 0) - (a.picante || 0));
    case 'duracion': {
      return [...rutinas].sort((a, b) => {
        const sa = getRutinaStats(a.id);
        const sb = getRutinaStats(b.id);
        return (sb?.avgDuracion || 0) - (sa?.avgDuracion || 0);
      });
    }
    case 'done':
      return [...rutinas].sort((a, b) => {
        const da = isDone(a) ? 1 : 0;
        const db = isDone(b) ? 1 : 0;
        return da - db; // undone first
      });
    default: // 'numero'
      return [...rutinas].sort((a, b) => (b.numero || 0) - (a.numero || 0));
  }
}

// ── Card renderers ───────────────────────────

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderCompactCard(rutina) {
  const displayName = capitalizeFirst(getDisplayName(rutina));
  const meta = getMetaText(rutina);
  const num = rutina.numero ? formatNumero(rutina.numero, rutina) : '';
  const delay = cardCounter++ * 40;
  const done = isDone(rutina);
  const picanteHtml = renderPicante(rutina.picante);

  return `
    <div class="animate-in" style="animation-delay:${delay}ms" data-rutina-id="${rutina.id}">
      <div class="rutina-compact ${done ? 'rutina-compact--done' : ''}" data-action="preview" data-id="${rutina.id}" style="cursor:pointer">
        <div class="rutina-compact-main">
          ${num ? `<div class="rutina-compact-code">${num} ${picanteHtml}</div>` : ''}
          <div class="rutina-compact-name">${displayName}</div>
          ${meta ? `<div class="rutina-compact-meta">${meta}</div>` : ''}
        </div>
        ${done ? '<span class="rutina-done-check">✓</span>' : ''}
      </div>
    </div>
  `;
}

function renderRutinaCard(rutina) {
  const displayName = capitalizeFirst(getDisplayName(rutina));
  const num = rutina.numero ? formatNumero(rutina.numero, rutina) : '';
  const { numCirc, numEj } = getRoutineStats(rutina);
  const picanteHtml = renderPicante(rutina.picante);

  const volantaParts = [num, `${numCirc}c · ${numEj}ej`].filter(Boolean);
  const volanta = volantaParts.join(' · ');

  const ultimaSesion = getUltimaSesionDeRutina(rutina.id);
  const lastDone = ultimaSesion ? formatTimeAgo(ultimaSesion.fecha) : '';

  const stats = getRutinaStats(rutina.id);
  const statsText = stats?.avgDuracion ? `~${stats.avgDuracion}min` : '';

  const delay = cardCounter++ * 60;
  const done = isDone(rutina);
  const tagsHtml = renderTags(rutina, true);

  return `
    <div class="animate-in" style="animation-delay:${delay}ms" data-rutina-id="${rutina.id}">
      <div class="rutina-card card ${done ? 'rutina-card--done' : ''}" data-rutina-id="${rutina.id}">
        <div class="rutina-card-body" data-action="preview" data-id="${rutina.id}" style="cursor:pointer">
          <div class="rutina-card-info">
            <div class="rutina-card-volanta">${volanta} ${picanteHtml}</div>
            <div class="rutina-card-name">${displayName}</div>
            ${lastDone || statsText ? `<div class="rutina-card-last">${[lastDone, statsText].filter(Boolean).join(' · ')}</div>` : ''}
            <div class="rutina-card-tags">${tagsHtml}</div>
          </div>
        </div>
        ${done ? '<span class="rutina-done-check">✓</span>' : ''}
      </div>
    </div>
  `;
}

// ── Render ────────────────────────────────────

export function render() {
  cardCounter = 0;
  const allRutinas = filterByUser(getRutinas());

  const gimnasio = allRutinas.filter((r) => r.tipo === 'gimnasio' || !r.tipo);
  const cross = allRutinas.filter((r) => r.tipo === 'cross');

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

  const sortFilterRow = `
    <div class="rutinas-sort-row">
      <select class="rutinas-sort-select" data-action="sort-rutinas" id="rutinas-sort-select">
        <option value="numero" ${sortBy === 'numero' ? 'selected' : ''}>Número</option>
        <option value="picante" ${sortBy === 'picante' ? 'selected' : ''}>Dificultad</option>
        <option value="duracion" ${sortBy === 'duracion' ? 'selected' : ''}>Duración</option>
        <option value="done" ${sortBy === 'done' ? 'selected' : ''}>Pendientes</option>
      </select>
      <div class="rutinas-filter-chips">
        <button class="rutinas-filter-chip ${filterDone === 'all' ? 'active' : ''}" data-action="filter-done" data-value="all">Todas</button>
        <button class="rutinas-filter-chip ${filterDone === 'pending' ? 'active' : ''}" data-action="filter-done" data-value="pending">Pendientes</button>
        <button class="rutinas-filter-chip ${filterDone === 'done' ? 'active' : ''}" data-action="filter-done" data-value="done">Hechas</button>
      </div>
    </div>
  `;

  let filtered = activeFilter === 'cross' ? cross : gimnasio;

  // Apply search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((r) => {
      const name = (r.nombre || '').toLowerCase();
      const num = formatNumero(r.numero, r).toLowerCase();
      return name.includes(q) || num.includes(q);
    });
  }

  // Apply done filter
  if (filterDone === 'pending') {
    filtered = filtered.filter((r) => !isDone(r));
  } else if (filterDone === 'done') {
    filtered = filtered.filter((r) => isDone(r));
  }

  // Apply sorting
  filtered = applySorting(filtered);

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
    ${sortFilterRow}
    ${list}
  `;
}

// ── Mount ─────────────────────────────────────

export function mount() {
  const app = document.getElementById('app');

  function rerender() {
    cardCounter = 0;
    const allRutinas = filterByUser(getRutinas());

    const gimnasio = allRutinas.filter((r) => r.tipo === 'gimnasio' || !r.tipo);
    const cross = allRutinas.filter((r) => r.tipo === 'cross');

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

    // Update sort select
    const sortSelect = document.getElementById('rutinas-sort-select');
    if (sortSelect) sortSelect.value = sortBy;

    // Update filter chips
    document.querySelectorAll('[data-action="filter-done"]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.value === filterDone);
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
        const num = formatNumero(r.numero, r).toLowerCase();
        return name.includes(q) || num.includes(q);
      });
    }

    // Apply done filter
    if (filterDone === 'pending') {
      filtered = filtered.filter((r) => !isDone(r));
    } else if (filterDone === 'done') {
      filtered = filtered.filter((r) => isDone(r));
    }

    // Apply sorting
    filtered = applySorting(filtered);

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
        showPreview(id);
        break;
      case 'edit':
        navigate(`/rutina/editar/${id}`);
        break;
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
      case 'filter-done': {
        const newVal = btn.dataset.value;
        if (newVal !== filterDone) {
          filterDone = newVal;
          rerender();
        }
        break;
      }
      case 'delete':
        deleteRutina(id);
        rerender();
        showToastAction('Rutina eliminada', 'Deshacer', () => {
          restoreRutina(id);
          rerender();
        }, { duration: 6000 });
        break;
    }
  };

  app.addEventListener('click', handleClick);

  // Sort select listener
  const handleChange = (e) => {
    if (e.target.id === 'rutinas-sort-select') {
      sortBy = e.target.value;
      rerender();
    }
  };
  app.addEventListener('change', handleChange);

  // Search input listener
  const handleSearchInput = (e) => {
    if (e.target.id === 'rutinas-search-input') {
      searchQuery = e.target.value;
      rerender();
    }
  };
  app.addEventListener('input', handleSearchInput);

  // Check cycle completion on mount
  const usuario = getUsuarioActivo();
  if (checkCycleComplete(usuario, activeFilter)) {
    showToast('Completaste todas las rutinas de ' + (activeFilter === 'cross' ? 'Cross' : 'Gimnasio') + '! Nuevo ciclo iniciado.');
  }

  return () => {
    app.removeEventListener('click', handleClick);
    app.removeEventListener('change', handleChange);
    app.removeEventListener('input', handleSearchInput);
  };
}
