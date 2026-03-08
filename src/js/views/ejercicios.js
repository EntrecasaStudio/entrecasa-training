import { CATEGORIAS, getEjerciciosPorCategoria } from '@js/ejercicios-catalogo.js';
import { getSesiones, getUsuarioActivo, getNotaEjercicio, getEjBestRound } from '@/store.js';
import { showExerciseDetail } from '@js/helpers/ejercicio-detail.js';
import { getMuscleSvgCropped } from '@js/helpers/muscle-illustrations.js';

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
};

function renderCategorySection(cat, ejercicios, collapsed, lastUsedMap = {}) {
  const tagClass = TAG_CLASS[cat] || '';
  const muscleSvg = getMuscleSvgCropped(cat, 36);
  const muscleColor = CATEGORY_COLORS[cat] || 'var(--color-accent)';
  const illustration = muscleSvg
    ? `<span class="ej-category-muscle" style="--muscle-color: ${muscleColor}">${muscleSvg}</span>`
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
            const hasNota = getNotaEjercicio(e.nombre) ? '<span class="ej-item-note">📝</span>' : '';
            return `
              <div class="ej-item" data-action="show-detail" data-nombre="${e.nombre}">
                <span class="ej-item-name">${e.nombre}${lastInfo}${hasNota}</span>
                <span class="ej-item-type ${e.tipo}">${e.tipo === 'maquina' ? 'Máquina' : 'Funcional'}</span>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

export function render() {
  const grouped = getEjerciciosPorCategoria(null);
  const total = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
  const lastUsedMap = buildLastUsedMap();

  return `
    <div class="view-header">
      <h1 class="view-title">Ejercicios</h1>
      <span class="view-subtitle">${total} ejercicios</span>
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
  const collapsedCats = new Set();

  const lastUsedMap = buildLastUsedMap();

  function rerender() {
    const tipo = activeType === 'todos' ? null : activeType;
    const grouped = getEjerciciosPorCategoria(tipo);
    const listEl = document.getElementById('ej-list');
    if (!listEl) return;

    // Apply search filter
    const q = searchQuery.toLowerCase();
    const filtered = {};
    for (const [cat, items] of Object.entries(grouped)) {
      const matches = q ? items.filter((e) => e.nombre.toLowerCase().includes(q)) : items;
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

  return () => {
    app.removeEventListener('click', handleClick);
    app.removeEventListener('input', handleInput);
  };
}
