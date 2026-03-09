import { CATEGORIAS, getEjerciciosPorCategoria, addEjercicioCustom } from '@js/ejercicios-catalogo.js';
import { getSesiones, getUsuarioActivo, getNotaEjercicio, getEjBestRound, getEjercicioMeta } from '@/store.js';
import { showExerciseDetail } from '@js/helpers/ejercicio-detail.js';
import { getMuscleSvgCropped } from '@js/helpers/muscle-illustrations.js';
import { icon } from '@js/icons.js';

/**
 * Build a map of exercise name → { reps, peso, fecha } from the user's most recent sessions.
 */
function buildLastUsedMap() {
  const usuario = getUsuarioActivo();
  const sesiones = getSesiones().filter((s) => !s.usuario || s.usuario === usuario);
  const map = {};
  // sesiones already sorted newest first
  for (const sesion of sesiones) {
    for (const circ of sesion.circuitos) {
      for (const ej of circ.ejercicios) {
        if (!map[ej.nombre]) {
          const best = getEjBestRound(ej);
          map[ej.nombre] = {
            reps: best.repsReal,
            peso: best.pesoRealKg,
            fecha: sesion.fecha,
          };
        }
      }
    }
  }
  return map;
}

const TAG_CLASS = {
  Core: 'tag-core',
  Piernas: 'tag-piernas',
  Pecho: 'tag-pecho',
  Espalda: 'tag-espalda',
  Brazos: 'tag-brazos',
  'Glúteos': 'tag-gluteos',
  Hombros: 'tag-hombros',
  Cardio: 'tag-cardio',
};

// Map category → CSS color variable (matches ejercicio-detail)
const CATEGORY_COLORS = {
  Core: 'var(--color-tag-core)',
  Piernas: 'var(--color-tag-piernas)',
  Pecho: 'var(--color-tag-pecho)',
  Espalda: 'var(--color-tag-espalda)',
  Brazos: 'var(--color-tag-brazos)',
  'Glúteos': 'var(--color-tag-gluteos)',
  Hombros: 'var(--color-tag-hombros)',
  Cardio: 'var(--color-tag-cardio)',
};

function renderCategorySection(cat, ejercicios, collapsed, lastUsedMap = {}) {
  const tagClass = TAG_CLASS[cat] || '';
  const muscleSvg = getMuscleSvgCropped(cat, 36);
  const muscleColor = CATEGORY_COLORS[cat] || 'var(--color-accent)';
  const illustration = muscleSvg
    ? `<span class="ej-category-muscle" style="--muscle-color: ${muscleColor}" data-3d-grupo="${cat}" data-3d-size="36">${muscleSvg}</span>`
    : '';

  return `
    <div class="ej-category" data-cat="${cat}">
      <button class="ej-category-header" data-action="toggle-cat" data-cat="${cat}">
        <span class="ej-category-left">
          ${illustration}
          <span class="ej-category-name">${cat}</span>
        </span>
        <span class="ej-category-right">
          <span class="tag ${tagClass} tag-count">${ejercicios.length}</span>
          <span class="ej-chevron ${collapsed ? '' : 'open'}">▸</span>
        </span>
      </button>
      <div class="ej-category-list ${collapsed ? 'collapsed' : ''}">
        ${ejercicios
          .map((e) => {
            const last = lastUsedMap[e.nombre];
            const lastInfo = last
              ? `<span class="ej-item-last">${last.reps}r &middot; ${last.peso}kg</span>`
              : '';
            const hasNota = getNotaEjercicio(e.nombre) ? `<span class="ej-item-note">${icon.edit}</span>` : '';
            const ejMeta = getEjercicioMeta(e.nombre);
            const ejLabel = ejMeta.displayName || e.nombre;
            return `
              <div class="ej-item" data-action="show-detail" data-nombre="${e.nombre}">
                <span class="ej-item-name">${ejLabel}${lastInfo}${hasNota}</span>
                <span class="ej-item-type ${e.tipo}">${e.tipo === 'maquina' ? 'M' : 'F'}</span>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function showNewExerciseModal(onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-title">Nuevo ejercicio</div>
      <div class="modal-body">
        <div class="field">
          <label class="field-label">Nombre</label>
          <input type="text" class="input" id="new-ej-nombre" placeholder="Nombre del ejercicio">
        </div>
        <div class="field">
          <label class="field-label">Categoría</label>
          <select class="input" id="new-ej-cat">
            ${CATEGORIAS.map((c) => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label class="field-label">Tipo</label>
          <select class="input" id="new-ej-tipo">
            <option value="funcional">Funcional</option>
            <option value="maquina">Máquina</option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-new-ej="cancel">Cancelar</button>
        <button class="btn btn-primary" data-new-ej="save">Crear</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    const input = overlay.querySelector('#new-ej-nombre');
    if (input) input.focus();
  });

  const close = () => {
    overlay.classList.add('modal-closing');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-new-ej="cancel"]')) {
      close();
      return;
    }
    if (e.target.closest('[data-new-ej="save"]')) {
      const nombre = overlay.querySelector('#new-ej-nombre').value.trim();
      const cat = overlay.querySelector('#new-ej-cat').value;
      const tipo = overlay.querySelector('#new-ej-tipo').value;
      if (!nombre) return;
      addEjercicioCustom(nombre, cat, tipo);
      close();
      if (onDone) onDone();
    }
  });
}

export function render() {
  const grouped = getEjerciciosPorCategoria(null);
  const total = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
  const lastUsedMap = buildLastUsedMap();

  return `
    <div class="view-header">
      <div class="view-header-row">
        <div>
          <h1 class="view-title">Ejercicios</h1>
          <span class="view-subtitle">${total} ejercicios</span>
        </div>
        <button class="btn-icon-header" data-action="new-ejercicio">${icon.plus}</button>
      </div>
    </div>

    <div class="ej-type-toggle">
      <button class="ej-type-btn active" data-action="filter-type" data-type="todos">Todos</button>
      <button class="ej-type-btn" data-action="filter-type" data-type="funcional">Funcional</button>
      <button class="ej-type-btn" data-action="filter-type" data-type="maquina">Máquinas</button>
    </div>

    <div class="ej-search-wrap">
      <input type="text" class="input ej-search" placeholder="Buscar ejercicio..." data-action="search" />
    </div>

    <div id="ej-list">
      ${CATEGORIAS.map((cat) => {
        const items = grouped[cat];
        if (!items) return '';
        return renderCategorySection(cat, items, false, lastUsedMap);
      }).join('')}
    </div>
  `;
}

export function mount() {
  const app = document.getElementById('app');
  let activeType = 'todos';
  let searchQuery = '';
  const collapsedCats = new Set(CATEGORIAS);

  const lastUsedMap = buildLastUsedMap();

  // Progressive 3D upgrade for category muscle illustrations (cropped view)
  function upgrade3D() {
    const els = document.querySelectorAll('[data-3d-grupo]');
    if (!els.length) return;
    els.forEach((el) => el.classList.add('loading-3d'));
    import('@js/helpers/muscle-3d.js').then(({ prerenderCroppedSingle3D }) => {
      els.forEach((el) => {
        const grupo = el.dataset['3dGrupo'];
        const size = parseInt(el.dataset['3dSize']) || 36;
        if (!grupo) return;
        prerenderCroppedSingle3D(grupo, size).then((html) => {
          if (el.isConnected) {
            el.innerHTML = html;
            el.classList.remove('loading-3d');
          }
        });
      });
    });
  }

  function rerender() {
    const tipo = activeType === 'todos' ? null : activeType;
    const grouped = getEjerciciosPorCategoria(tipo);
    const listEl = document.getElementById('ej-list');
    if (!listEl) return;

    // Apply search filter
    const q = searchQuery.toLowerCase();
    const filtered = {};
    for (const [cat, items] of Object.entries(grouped)) {
      const matches = q
        ? items.filter((e) => {
            const dn = getEjercicioMeta(e.nombre).displayName;
            return e.nombre.toLowerCase().includes(q) || (dn && dn.toLowerCase().includes(q));
          })
        : items;
      if (matches.length > 0) filtered[cat] = matches;
    }

    const total = Object.values(filtered).reduce((sum, arr) => sum + arr.length, 0);
    const subtitle = app.querySelector('.view-subtitle');
    if (subtitle) subtitle.textContent = `${total} ejercicios`;

    listEl.innerHTML = CATEGORIAS.map((cat) => {
      const items = filtered[cat];
      if (!items) return '';
      return renderCategorySection(cat, items, collapsedCats.has(cat), lastUsedMap);
    }).join('');

    upgrade3D();
  }

  function handleClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;

    switch (action) {
      case 'filter-type': {
        activeType = btn.dataset.type;
        app.querySelectorAll('.ej-type-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        rerender();
        break;
      }
      case 'toggle-cat': {
        const cat = btn.dataset.cat;
        if (collapsedCats.has(cat)) {
          collapsedCats.delete(cat);
        } else {
          collapsedCats.add(cat);
        }
        rerender();
        break;
      }
      case 'show-detail': {
        showExerciseDetail(btn.dataset.nombre);
        break;
      }
      case 'new-ejercicio': {
        showNewExerciseModal(rerender);
        break;
      }
    }
  }

  function handleInput(e) {
    if (e.target.dataset.action === 'search') {
      searchQuery = e.target.value;
      rerender();
    }
  }

  app.addEventListener('click', handleClick);
  app.addEventListener('input', handleInput);

  // Initial 3D upgrade
  upgrade3D();

  return () => {
    app.removeEventListener('click', handleClick);
    app.removeEventListener('input', handleInput);
  };
}
