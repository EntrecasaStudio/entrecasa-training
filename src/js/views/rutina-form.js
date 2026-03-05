import { getRutinaById, saveRutina, getUsuarioActivo } from '@/store.js';
import { generateId } from '@/id.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';
import { buscarEjerciciosPorCategorias, addEjercicioCustom } from '@js/ejercicios-catalogo.js';
import { showModal } from '@js/components/modal.js';
import { showToast } from '@js/components/toast.js';

const GRUPOS_MUSCULARES = ['Pecho', 'Espalda', 'Piernas', 'Core', 'Brazos', 'Glúteos', 'Hombros'];
const MIN_EJERCICIOS = 2;
const MAX_EJERCICIOS = 4;
const MIN_REPS = 6;
const MAX_REPS = 15;

// Map form grupoMuscular → catalog categorías
const GRUPO_A_CATEGORIAS = {
  Pecho: ['Pecho'],
  Espalda: ['Espalda'],
  Piernas: ['Piernas', 'Glúteos'],
  Core: ['Core'],
  Brazos: ['Brazos', 'Hombros'],
  'Glúteos': ['Glúteos'],
  Hombros: ['Hombros'],
};

function crearEjercicioVacio() {
  return { id: generateId(), nombre: '', repsObjetivo: 10, pesoKg: 0 };
}

function crearCircuitoVacio() {
  return {
    id: generateId(),
    grupoMuscular: 'Pecho',
    ejercicios: [crearEjercicioVacio(), crearEjercicioVacio()],
  };
}

// State local to this view
let rutina = null;
let activePicker = null; // { circIdx, ejIdx } or null
let pickerQuery = '';
let isDirty = false;

function renderPicker(circIdx, ejIdx) {
  const circ = rutina.circuitos[circIdx];
  const categorias = GRUPO_A_CATEGORIAS[circ.grupoMuscular] || [circ.grupoMuscular];
  const resultados = buscarEjerciciosPorCategorias(categorias, pickerQuery);
  const q = pickerQuery.trim().toLowerCase();

  // Check if exact match exists
  const exactMatch = q && resultados.some((e) => e.nombre.toLowerCase() === q);

  const items = resultados
    .map(
      (e) => `
    <button class="ej-picker-option" data-action="select-ejercicio"
            data-circ="${circIdx}" data-ej="${ejIdx}" data-nombre="${e.nombre}">
      <span class="ej-picker-option-name">${e.nombre}</span>
      <span class="ej-item-type ${e.tipo}">${e.tipo === 'maquina' ? 'Máquina' : 'Funcional'}</span>
    </button>
  `,
    )
    .join('');

  const addBtn =
    q && !exactMatch
      ? `<button class="ej-picker-add" data-action="add-custom-ejercicio"
                  data-circ="${circIdx}" data-ej="${ejIdx}" data-nombre="${pickerQuery.trim()}">
           + Agregar "${pickerQuery.trim()}"
         </button>`
      : '';

  return `
    <div class="ej-picker-panel">
      <div class="ej-picker-header">
        <input type="text" class="input ej-picker-search" placeholder="Buscar ejercicio..."
               value="${pickerQuery}" autofocus>
        <button class="ej-picker-close" data-action="close-picker">${icon.close}</button>
      </div>
      <div class="ej-picker-list">
        ${items || '<div class="ej-picker-empty">No hay ejercicios en esta categoría</div>'}
      </div>
      ${addBtn}
    </div>
  `;
}

function renderEjercicio(ej, circIdx, ejIdx, totalEj) {
  const isPickerOpen =
    activePicker && activePicker.circIdx === circIdx && activePicker.ejIdx === ejIdx;

  const triggerClass = ej.nombre ? 'ej-picker-trigger has-value' : 'ej-picker-trigger';
  const canMoveUp = ejIdx > 0;
  const canMoveDown = ejIdx < totalEj - 1;

  return `
    <div class="ejercicio-form-row" data-circ="${circIdx}" data-ej="${ejIdx}">
      <div class="ej-picker-wrap">
        <button class="${triggerClass}" data-action="open-picker"
                data-circ="${circIdx}" data-ej="${ejIdx}">
          ${ej.nombre || 'Seleccionar ejercicio...'}
        </button>
        ${isPickerOpen ? renderPicker(circIdx, ejIdx) : ''}
      </div>
      <div class="ejercicio-form-fields">
        <div class="ej-reorder">
          <button class="btn-reorder" data-action="move-ejercicio-up" data-circ="${circIdx}" data-ej="${ejIdx}"
                  ${canMoveUp ? '' : 'disabled'} title="Mover arriba">${icon.chevronUp || '▲'}</button>
          <button class="btn-reorder" data-action="move-ejercicio-down" data-circ="${circIdx}" data-ej="${ejIdx}"
                  ${canMoveDown ? '' : 'disabled'} title="Mover abajo">${icon.chevronDown || '▼'}</button>
        </div>
        <div class="field field-sm">
          <label class="input-label">Reps</label>
          <input type="number" class="input" inputmode="numeric" min="${MIN_REPS}" max="${MAX_REPS}"
                 value="${ej.repsObjetivo}" data-field="repsObjetivo" data-circ="${circIdx}" data-ej="${ejIdx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Kg</label>
          <input type="number" class="input" inputmode="decimal" min="0" step="0.5"
                 value="${ej.pesoKg}" data-field="pesoKg" data-circ="${circIdx}" data-ej="${ejIdx}">
        </div>
        <button class="btn-remove" data-action="remove-ejercicio" data-circ="${circIdx}" data-ej="${ejIdx}"
                title="Eliminar ejercicio">${icon.close}</button>
      </div>
    </div>
  `;
}

function renderCircuito(circ, idx) {
  const opciones = GRUPOS_MUSCULARES.map(
    (g) => `<option value="${g}" ${circ.grupoMuscular === g ? 'selected' : ''}>${g}</option>`,
  ).join('');

  const totalEj = circ.ejercicios.length;
  const ejercicios = circ.ejercicios.map((ej, ejIdx) => renderEjercicio(ej, idx, ejIdx, totalEj)).join('');
  const canAdd = circ.ejercicios.length < MAX_EJERCICIOS;

  return `
    <div class="card circuito-form-card" data-circuito-idx="${idx}">
      <div class="circuito-form-header">
        <span class="circuito-form-number">${idx + 1}</span>
        <select class="input" data-action="change-grupo" data-circ="${idx}">
          ${opciones}
        </select>
        <button class="btn-remove" data-action="remove-circuito" data-circ="${idx}"
                title="Eliminar circuito" style="${rutina.circuitos.length <= 1 ? 'visibility:hidden' : ''}">${icon.trash}</button>
      </div>
      <div class="ejercicios-list">
        ${ejercicios}
      </div>
      <button class="add-ejercicio-btn" data-action="add-ejercicio" data-circ="${idx}"
              ${canAdd ? '' : 'disabled'}>
        + Agregar ejercicio ${canAdd ? '' : `(max ${MAX_EJERCICIOS})`}
      </button>
    </div>
  `;
}

export function render(params) {
  const isEdit = params.mode === 'editar';

  if (isEdit && params.id) {
    const existing = getRutinaById(params.id);
    if (existing) {
      rutina = JSON.parse(JSON.stringify(existing));
    } else {
      navigate('/');
      return '';
    }
  } else {
    rutina = {
      id: generateId(),
      nombre: '',
      tipo: 'gimnasio',
      usuario: getUsuarioActivo(),
      diaSemana: null,
      creada: new Date().toISOString(),
      circuitos: [crearCircuitoVacio()],
    };
  }

  activePicker = null;
  pickerQuery = '';
  isDirty = false;

  return renderForm(isEdit);
}

function renderForm(isEdit) {
  const circuitos = rutina.circuitos.map((c, i) => renderCircuito(c, i)).join('');

  return `
    <div class="view-header">
      <button class="btn-back" data-action="back">${icon.back}</button>
      <div class="view-header-title">${isEdit ? 'Editar Rutina' : 'Nueva Rutina'}</div>
    </div>

    <div class="form-section">
      <label class="input-label">Nombre de la rutina</label>
      <input type="text" class="input" id="rutina-nombre" placeholder="Ej: Pecho y espalda"
             value="${rutina.nombre}">
    </div>

    <div class="form-section">
      <label class="input-label">Tipo</label>
      <div class="user-toggle" data-active="${rutina.tipo === 'cross' ? '1' : '0'}">
        <button class="user-toggle-btn ${rutina.tipo !== 'cross' ? 'active' : ''}" data-action="set-tipo" data-tipo="gimnasio">🏋️ Gimnasio</button>
        <button class="user-toggle-btn ${rutina.tipo === 'cross' ? 'active' : ''}" data-action="set-tipo" data-tipo="cross">🏃 Cross</button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Circuitos</div>
      <div id="circuitos-container">
        ${circuitos}
      </div>
      <button class="add-circuito-btn" data-action="add-circuito">+ Agregar circuito</button>
    </div>

    <div class="form-footer">
      <button class="btn btn-primary btn-full" data-action="save">Guardar Rutina</button>
      ${isEdit ? '<button class="btn btn-ghost btn-full" data-action="back">Cancelar</button>' : ''}
    </div>
  `;
}

function reRender() {
  const app = document.getElementById('app');
  const isEdit = !!getRutinaById(rutina.id);
  app.innerHTML = renderForm(isEdit);

  // Focus picker search if open and scroll into view
  if (activePicker) {
    const panel = app.querySelector('.ej-picker-panel');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const searchInput = panel.querySelector('.ej-picker-search');
      if (searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
      }
    }
  }
}

function syncFromInputs() {
  // Sync rutina name
  const nameInput = document.getElementById('rutina-nombre');
  if (nameInput) rutina.nombre = nameInput.value.trim();

  // Sync all exercise numeric fields (nombre is handled by picker)
  document.querySelectorAll('.ejercicio-form-row').forEach((row) => {
    const ci = parseInt(row.dataset.circ);
    const ei = parseInt(row.dataset.ej);
    if (!rutina.circuitos[ci] || !rutina.circuitos[ci].ejercicios[ei]) return;

    row.querySelectorAll('[data-field]').forEach((input) => {
      const field = input.dataset.field;
      const val = input.value;
      if (field === 'repsObjetivo') {
        rutina.circuitos[ci].ejercicios[ei].repsObjetivo = parseInt(val) || MIN_REPS;
      } else if (field === 'pesoKg') {
        rutina.circuitos[ci].ejercicios[ei].pesoKg = parseFloat(val) || 0;
      }
    });
  });
}

function validate() {
  if (!rutina.nombre) return 'Ingresa un nombre para la rutina.';
  for (let i = 0; i < rutina.circuitos.length; i++) {
    const circ = rutina.circuitos[i];
    for (let j = 0; j < circ.ejercicios.length; j++) {
      if (!circ.ejercicios[j].nombre.trim()) {
        return `Circuito ${i + 1}: el ejercicio ${j + 1} necesita un nombre.`;
      }
      const reps = circ.ejercicios[j].repsObjetivo;
      if (reps < MIN_REPS || reps > MAX_REPS) {
        return `Circuito ${i + 1}, ejercicio ${j + 1}: las repeticiones deben ser entre ${MIN_REPS} y ${MAX_REPS}.`;
      }
    }
  }
  return null;
}

function selectEjercicio(circIdx, ejIdx, nombre) {
  rutina.circuitos[circIdx].ejercicios[ejIdx].nombre = nombre;
  activePicker = null;
  pickerQuery = '';
  reRender();
}

export function mount(params) {
  const app = document.getElementById('app');

  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const circIdx = parseInt(btn.dataset.circ);

    switch (action) {
      case 'back':
        if (isDirty) {
          showModal({
            title: 'Descartar cambios',
            body: 'Tienes cambios sin guardar. ¿Deseas descartarlos?',
            confirmText: 'Descartar',
            cancelText: 'Seguir editando',
            danger: true,
            onConfirm: () => navigate('/rutinas'),
          });
        } else {
          navigate('/rutinas');
        }
        break;

      case 'set-tipo': {
        syncFromInputs();
        rutina.tipo = btn.dataset.tipo;
        isDirty = true;
        reRender();
        break;
      }

      case 'add-circuito':
        syncFromInputs();
        isDirty = true;
        activePicker = null;
        pickerQuery = '';
        rutina.circuitos.push(crearCircuitoVacio());
        reRender();
        break;

      case 'remove-circuito':
        if (rutina.circuitos.length > 1) {
          syncFromInputs();
          isDirty = true;
          activePicker = null;
          rutina.circuitos.splice(circIdx, 1);
          reRender();
        }
        break;

      case 'add-ejercicio':
        if (rutina.circuitos[circIdx].ejercicios.length < MAX_EJERCICIOS) {
          syncFromInputs();
          isDirty = true;
          activePicker = null;
          rutina.circuitos[circIdx].ejercicios.push(crearEjercicioVacio());
          reRender();
        }
        break;

      case 'remove-ejercicio': {
        const ejIdx = parseInt(btn.dataset.ej);
        if (rutina.circuitos[circIdx].ejercicios.length > MIN_EJERCICIOS) {
          syncFromInputs();
          isDirty = true;
          activePicker = null;
          rutina.circuitos[circIdx].ejercicios.splice(ejIdx, 1);
          reRender();
        }
        break;
      }

      case 'open-picker': {
        const ejIdx = parseInt(btn.dataset.ej);
        syncFromInputs();
        // Toggle if same picker, open if different
        if (activePicker && activePicker.circIdx === circIdx && activePicker.ejIdx === ejIdx) {
          activePicker = null;
          pickerQuery = '';
        } else {
          activePicker = { circIdx, ejIdx };
          pickerQuery = '';
        }
        reRender();
        break;
      }

      case 'select-ejercicio': {
        const ejIdx = parseInt(btn.dataset.ej);
        syncFromInputs();
        isDirty = true;
        selectEjercicio(circIdx, ejIdx, btn.dataset.nombre);
        break;
      }

      case 'add-custom-ejercicio': {
        const ejIdx = parseInt(btn.dataset.ej);
        const nombre = btn.dataset.nombre;
        const circ = rutina.circuitos[circIdx];
        // Use first category in mapping as default for custom exercise
        const categorias = GRUPO_A_CATEGORIAS[circ.grupoMuscular] || [circ.grupoMuscular];
        const categoria = categorias[0];
        syncFromInputs();
        isDirty = true;
        addEjercicioCustom(nombre, categoria);
        selectEjercicio(circIdx, ejIdx, nombre);
        break;
      }

      case 'close-picker':
        activePicker = null;
        pickerQuery = '';
        reRender();
        break;

      case 'move-ejercicio-up': {
        const ejIdx = parseInt(btn.dataset.ej);
        if (ejIdx > 0) {
          syncFromInputs();
          isDirty = true;
          const arr = rutina.circuitos[circIdx].ejercicios;
          [arr[ejIdx - 1], arr[ejIdx]] = [arr[ejIdx], arr[ejIdx - 1]];
          activePicker = null;
          reRender();
        }
        break;
      }

      case 'move-ejercicio-down': {
        const ejIdx = parseInt(btn.dataset.ej);
        const arr = rutina.circuitos[circIdx].ejercicios;
        if (ejIdx < arr.length - 1) {
          syncFromInputs();
          isDirty = true;
          [arr[ejIdx], arr[ejIdx + 1]] = [arr[ejIdx + 1], arr[ejIdx]];
          activePicker = null;
          reRender();
        }
        break;
      }

      case 'save':
        syncFromInputs();
        {
          const error = validate();
          if (error) {
            showToast(error, 'error');
            return;
          }
          saveRutina(rutina);
          showToast('Rutina guardada');
          navigate('/rutinas');
        }
        break;
    }
  };

  const handleChange = (e) => {
    if (e.target.matches('[data-action="change-grupo"]')) {
      const circIdx = parseInt(e.target.dataset.circ);
      rutina.circuitos[circIdx].grupoMuscular = e.target.value;
      isDirty = true;
      // Close picker when group changes (exercises will differ)
      if (activePicker && activePicker.circIdx === circIdx) {
        activePicker = null;
        pickerQuery = '';
      }
    }
    // Mark dirty on any numeric field change
    if (e.target.matches('[data-field]')) {
      isDirty = true;
    }
  };

  const handleInput = (e) => {
    if (e.target.matches('.ej-picker-search')) {
      pickerQuery = e.target.value;
      // Re-render just the picker list without full reRender (for performance)
      const panel = e.target.closest('.ej-picker-panel');
      if (panel && activePicker) {
        const { circIdx, ejIdx } = activePicker;
        const circ = rutina.circuitos[circIdx];
        const categorias = GRUPO_A_CATEGORIAS[circ.grupoMuscular] || [circ.grupoMuscular];
        const resultados = buscarEjerciciosPorCategorias(categorias, pickerQuery);
        const q = pickerQuery.trim().toLowerCase();
        const exactMatch = q && resultados.some((r) => r.nombre.toLowerCase() === q);

        const listEl = panel.querySelector('.ej-picker-list');
        if (listEl) {
          listEl.innerHTML = resultados.length
            ? resultados
                .map(
                  (r) => `
                <button class="ej-picker-option" data-action="select-ejercicio"
                        data-circ="${circIdx}" data-ej="${ejIdx}" data-nombre="${r.nombre}">
                  <span class="ej-picker-option-name">${r.nombre}</span>
                  <span class="ej-item-type ${r.tipo}">${r.tipo === 'maquina' ? 'Máquina' : 'Funcional'}</span>
                </button>
              `,
                )
                .join('')
            : '<div class="ej-picker-empty">Sin resultados</div>';
        }

        // Update or create add button
        const existingAdd = panel.querySelector('.ej-picker-add');
        if (existingAdd) existingAdd.remove();

        if (q && !exactMatch) {
          const addBtn = document.createElement('button');
          addBtn.className = 'ej-picker-add';
          addBtn.dataset.action = 'add-custom-ejercicio';
          addBtn.dataset.circ = circIdx;
          addBtn.dataset.ej = ejIdx;
          addBtn.dataset.nombre = pickerQuery.trim();
          addBtn.textContent = `+ Agregar "${pickerQuery.trim()}"`;
          panel.appendChild(addBtn);
        }
      }
    }
  };

  app.addEventListener('click', handleClick);
  app.addEventListener('change', handleChange);
  app.addEventListener('input', handleInput);

  return () => {
    app.removeEventListener('click', handleClick);
    app.removeEventListener('change', handleChange);
    app.removeEventListener('input', handleInput);
    rutina = null;
    activePicker = null;
    pickerQuery = '';
  };
}
