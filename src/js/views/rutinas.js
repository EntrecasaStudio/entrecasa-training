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
// SVG fallback removed — 3D renders directly via mount3DViewers()

// ── Module-level state ───────────────────────
let activeFilter = 'gimnasio';
let compactView = false;
let cardCounter = 0;

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

function renderCompactCard(rutina) {
  const displayName = getDisplayName(rutina);
  const meta = getMetaText(rutina);
  const num = formatNumero(rutina.numero);
  const metaParts = [num, meta].filter(Boolean).join(' · ');
  const delay = cardCounter++ * 40;

  return `
    <div class="rutina-compact animate-in" style="animation-delay:${delay}ms" data-rutina-id="${rutina.id}">
      <div class="rutina-compact-main" data-action="preview" data-id="${rutina.id}" style="cursor:pointer">
        <div class="rutina-compact-name">${displayName}</div>
        ${metaParts ? `<div class="rutina-compact-meta">${metaParts}</div>` : ''}
      </div>
      <div class="rutina-compact-actions">
        <button class="btn-icon-action" data-action="start" data-id="${rutina.id}">${icon.play}</button>
      </div>
    </div>
  `;
}

function renderRutinaCard(rutina) {
  const displayName = getDisplayName(rutina);
  const num = formatNumero(rutina.numero);
  const { numCirc, numEj } = getRoutineStats(rutina);

  const volantaParts = [num, `${numCirc}c · ${numEj}ej`].filter(Boolean);
  const volanta = volantaParts.join(' · ');

  const ultimaSesion = getUltimaSesionDeRutina(rutina.id);
  const lastDone = ultimaSesion ? formatTimeAgo(ultimaSesion.fecha) : '';

  const delay = cardCounter++ * 60;
  const grupos = [...new Set(rutina.circuitos.flatMap((c) => normalizeGrupos(c)))];

  return `
    <div class="rutina-card card animate-in" style="animation-delay:${delay}ms" data-rutina-id="${rutina.id}">
      <div class="rutina-card-body" data-action="preview" data-id="${rutina.id}" style="cursor:pointer">
        <div class="rutina-card-info">
          <div class="rutina-card-volanta">${volanta}</div>
          <div class="rutina-card-name">${displayName}</div>
          ${lastDone ? `<div class="rutina-card-last">${lastDone}</div>` : ''}
        </div>
        <div class="rutina-card-illustration" data-3d-grupos="${grupos.join(',')}" data-3d-size="110">
          <div class="skeleton skeleton-3d-placeholder"></div>
        </div>
      </div>
      <button class="rutina-card-play" data-action="start" data-id="${rutina.id}">${icon.play}</button>
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
      <button class="btn-icon-header" data-action="new-rutina">
        ${icon.plus}
      </button>
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

  const filtered = activeFilter === 'cross' ? cross : gimnasio;
  const listClass = compactView ? 'rutinas-list rutinas-list--compact' : 'rutinas-list';
  const renderCard = compactView ? renderCompactCard : renderRutinaCard;

  const list = filtered.length > 0
    ? `<div class="${listClass}" id="rutinas-filtered-list">${filtered.map(renderCard).join('')}</div>`
    : `<div class="empty-state" id="rutinas-filtered-list">
        <div class="empty-state-text">No hay rutinas de ${activeFilter === 'cross' ? 'Cross Training' : 'Gimnasio'}.</div>
        <button class="btn btn-primary" data-action="new-rutina">${icon.plus} Nueva rutina</button>
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

  // Rotating 3D viewers for muscle illustrations
  let viewer3dCleanups = [];

  function cleanup3DViewers() {
    viewer3dCleanups.forEach((fn) => fn());
    viewer3dCleanups = [];
  }

  function mount3DViewers() {
    cleanup3DViewers();
    const els = document.querySelectorAll('[data-3d-grupos]');
    if (!els.length) return;
    import('@js/helpers/muscle-3d.js').then(({ mountRotating3D }) => {
      Array.from(els).forEach((el) => {
        const grupos = el.dataset['3dGrupos'].split(',').filter(Boolean);
        const size = parseInt(el.dataset['3dSize']) || 28;
        if (!grupos.length) return;
        mountRotating3D(el, grupos, size).then((cleanup) => {
          viewer3dCleanups.push(cleanup);
        });
      });
    });
  }

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

    const filtered = activeFilter === 'cross' ? cross : gimnasio;
    const renderCard = compactView ? renderCompactCard : renderRutinaCard;

    if (filtered.length > 0) {
      container.className = compactView ? 'rutinas-list rutinas-list--compact' : 'rutinas-list';
      container.innerHTML = filtered.map(renderCard).join('');
    } else {
      container.className = 'empty-state';
      container.innerHTML = `
        <div class="empty-state-text">No hay rutinas de ${activeFilter === 'cross' ? 'Cross Training' : 'Gimnasio'}.</div>
        <button class="btn btn-primary" data-action="new-rutina">${icon.plus} Nueva rutina</button>
      `;
    }

    mount3DViewers();
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
      case 'start':
      case 'preview':
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

  // Initial 3D mount
  mount3DViewers();

  return () => {
    cleanup3DViewers();
    app.removeEventListener('click', handleClick);
  };
}
