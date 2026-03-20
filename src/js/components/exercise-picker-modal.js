import { buscarEjerciciosPorCategorias, CATEGORIAS } from '@js/ejercicios-catalogo.js';
import { icon } from '@js/icons.js';

// Map grupoMuscular → catalog categories (matches rutina-form)
const GRUPO_A_CATEGORIAS = {
  Pecho: ['Pecho'],
  Espalda: ['Espalda'],
  Piernas: ['Piernas', 'Glúteos'],
  Core: ['Core'],
  Brazos: ['Brazos', 'Hombros'],
  'Glúteos': ['Glúteos'],
  Hombros: ['Hombros'],
};

/**
 * Show a modal picker for selecting an exercise.
 * @param {{ grupoMuscular: string, onSelect: (nombre: string) => void }} opts
 */
export function showExercisePickerModal({ grupoMuscular, onSelect }) {
  const existing = document.getElementById('exercise-picker-modal');
  if (existing) existing.remove();

  let query = '';
  // null/undefined grupoMuscular → show ALL categories
  const categorias = grupoMuscular
    ? [...new Set((Array.isArray(grupoMuscular) ? grupoMuscular : [grupoMuscular]).flatMap((g) => GRUPO_A_CATEGORIAS[g] || [g]))]
    : CATEGORIAS;

  const overlay = document.createElement('div');
  overlay.id = 'exercise-picker-modal';
  overlay.className = 'modal-overlay';

  function renderList() {
    const results = buscarEjerciciosPorCategorias(categorias, query);
    if (results.length === 0) {
      return '<div class="exercise-picker-empty">Sin resultados</div>';
    }
    return results
      .map(
        (e) => `
      <button class="ej-picker-option" data-picker-select="${e.nombre}">
        <span class="ej-picker-option-name">${e.nombre}</span>
        <span class="ej-item-type ${e.tipo}">${e.tipo === 'maquina' ? 'Máquina' : 'Funcional'}</span>
      </button>
    `,
      )
      .join('');
  }

  overlay.innerHTML = `
    <div class="modal-box exercise-picker-box">
      <div class="exercise-picker-header">
        <div class="modal-title">Cambiar ejercicio</div>
        <button class="exercise-picker-close-btn" data-picker-cancel>${icon.close}</button>
      </div>
      <input type="text" class="input ej-picker-search" placeholder="Buscar ejercicio..." value="" autofocus>
      <div class="ej-picker-list" id="exercise-picker-list">${renderList()}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Focus search
  requestAnimationFrame(() => {
    const input = overlay.querySelector('.ej-picker-search');
    if (input) input.focus();
  });

  function close(cb) {
    overlay.classList.add('modal-closing');
    overlay.addEventListener(
      'animationend',
      () => {
        overlay.removeEventListener('click', handleClick);
        overlay.removeEventListener('input', handleInput);
        overlay.remove();
        if (cb) cb();
      },
      { once: true },
    );
  }

  function handleClick(e) {
    const selectBtn = e.target.closest('[data-picker-select]');
    if (selectBtn) {
      const nombre = selectBtn.dataset.pickerSelect;
      close(() => onSelect(nombre));
      return;
    }
    if (e.target.closest('[data-picker-cancel]') || e.target === overlay) {
      close();
    }
  }

  function handleInput(e) {
    if (e.target.matches('.ej-picker-search')) {
      query = e.target.value;
      const list = document.getElementById('exercise-picker-list');
      if (list) list.innerHTML = renderList();
    }
  }

  overlay.addEventListener('click', handleClick);
  overlay.addEventListener('input', handleInput);
}
