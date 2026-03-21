import { getRutinaById, getRutinas, saveRutina, getUsuarioActivo, getEjercicioMeta, assignRutinaADia, setPlanDia } from '@/store.js';
import { generateId } from '@/id.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';
import { buscarEjerciciosPorCategorias, addEjercicioCustom, CATEGORIAS, ejerciciosCatalogo, getEjerciciosCustom, getTodosLosEjercicios } from '@js/ejercicios-catalogo.js';
import { showModal } from '@js/components/modal.js';
import { showToast } from '@js/components/toast.js';
import { showExerciseDetail } from '@js/helpers/ejercicio-detail.js';
import { formatNumero, autoGruposFromEjercicios, TAG_CLASS } from '@js/helpers/rutina-helpers.js';

// Categories that auto-detect as cardio/hiit exercise type
const CARDIO_CATEGORIES = ['Cardio'];
const HIIT_CATEGORIES = ['HIIT'];
const MIN_EJERCICIOS = 2;
const MAX_EJERCICIOS = 4;
const MIN_REPS = 6;
const MAX_REPS = 99;

let returnTo = '/rutinas';

function syncGruposFromEjercicios(circIdx) {
  const circ = rutina.circuitos[circIdx];
  if (!circ) return;
  const auto = autoGruposFromEjercicios(circ);
  if (auto.length > 0) circ.grupoMuscular = auto;
}

function crearEjercicioVacio() {
  return {
    id: generateId(),
    nombre: '',
    tipo: 'normal',
    series: [
      { reps: 8, pesoKg: 8 },
      { reps: 8, pesoKg: 8 },
      { reps: 8, pesoKg: 8 },
    ],
  };
}

function crearEjercicioCardio(tipo = 'velocidad') {
  const ej = { id: generateId(), nombre: '', tipo };
  if (tipo === 'velocidad') {
    ej.velocidad = 12; ej.tiempo = 30; ej.descanso = 60; ej.cantidadPasadas = 6;
  } else if (tipo === 'caminata') {
    ej.velocidad = 5; ej.tiempo = 120; ej.descanso = 30; ej.cantidadPasadas = 4;
  } else if (tipo === 'hiit') {
    ej.workTime = 40; ej.restTime = 20; ej.rounds = 3;
  }
  return ej;
}

function crearEjercicioPorTipo(tipo) {
  if (tipo === 'velocidad' || tipo === 'caminata' || tipo === 'hiit') return crearEjercicioCardio(tipo);
  return crearEjercicioVacio();
}

function crearCircuitoVacio() {
  return {
    id: generateId(),
    grupoMuscular: [],
    ejercicios: [crearEjercicioVacio(), crearEjercicioVacio()],
  };
}

// ── Migration: circuit-level cardio → exercise-level ──
function migrateCircuitCardioToExercise(circ) {
  const tipo = circ.tipo;
  if (!tipo || tipo === 'normal') return;
  // Copy circuit-level params to each exercise
  for (const ej of circ.ejercicios) {
    ej.tipo = tipo;
    if (tipo === 'velocidad' || tipo === 'caminata') {
      ej.velocidad = ej.velocidad ?? circ.velocidad ?? 12;
      ej.tiempo = ej.tiempo ?? circ.tiempo ?? 30;
      ej.descanso = ej.descanso ?? circ.descanso ?? 60;
      ej.cantidadPasadas = ej.cantidadPasadas ?? circ.cantidadPasadas ?? 6;
    } else if (tipo === 'hiit') {
      ej.workTime = ej.workTime ?? circ.workTime ?? 40;
      ej.restTime = ej.restTime ?? circ.restTime ?? 20;
      ej.rounds = ej.rounds ?? circ.rounds ?? 3;
    }
  }
  // Clean circuit-level cardio fields
  delete circ.tipo;
  delete circ.velocidad; delete circ.tiempo; delete circ.descanso; delete circ.cantidadPasadas;
  delete circ.workTime; delete circ.restTime; delete circ.rounds;
}

// State local to this view
let rutina = null;
let assignDay = null; // day number to auto-assign on save (from calendar)
let activePicker = null; // { circIdx, ejIdx } or null
let pickerQuery = '';
let pickerDisabledCats = new Set(); // categories the user toggled OFF in the picker
// activeGrupoDropdown removed — grupos are auto-derived from exercises
let isDirty = false;
let expandedFormEjs = new Set(); // tracks 'circIdx-ejIdx' keys for expanded series

function getPickerFilteredResults() {
  // All categories enabled by default, user can toggle off
  const enabledCats = CATEGORIAS.filter((c) => !pickerDisabledCats.has(c));
  return buscarEjerciciosPorCategorias(enabledCats, pickerQuery);
}

function renderPicker(circIdx, ejIdx) {
  const resultados = getPickerFilteredResults();
  const q = pickerQuery.trim().toLowerCase();

  // Check if exact match exists
  const exactMatch = q && resultados.some((e) => e.nombre.toLowerCase() === q);

  // Category filter chips — all categories, toggleable
  const catChips = CATEGORIAS.map((cat) => {
    const isOn = !pickerDisabledCats.has(cat);
    const cls = TAG_CLASS[cat] || '';
    return `<button class="picker-cat-chip tag ${cls} ${isOn ? '' : 'picker-cat-off'}"
                    data-action="toggle-picker-cat" data-cat="${cat}">${cat}</button>`;
  }).join('');

  const items = resultados
    .map(
      (e) => `
    <button class="ej-picker-option" data-action="select-ejercicio"
            data-circ="${circIdx}" data-ej="${ejIdx}" data-nombre="${e.nombre}">
      <span class="ej-picker-option-name">${e.nombre}</span>
      <span class="ej-picker-option-cat">${e.categoria}</span>
      <span class="ej-item-type ${e.tipo}">${e.tipo === 'maquina' ? 'M' : 'F'}</span>
      <span class="ej-picker-info" data-action="show-ejercicio-detail" data-nombre="${e.nombre}" title="Ver detalle">${icon.info}</span>
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
      <div class="picker-cat-chips">${catChips}</div>
      <div class="ej-picker-list">
        ${items || '<div class="ej-picker-empty">Sin resultados</div>'}
      </div>
      ${addBtn}
    </div>
  `;
}

// Per-exercise cardio params (inline below the exercise name)
function renderEjCardioParams(ej, circIdx, ejIdx) {
  const tipo = ej.tipo || 'normal';
  if (tipo === 'velocidad' || tipo === 'caminata') {
    return `
      <div class="circuit-params ej-cardio-params">
        <div class="field field-sm">
          <label class="input-label">Vel</label>
          <input type="number" class="input" inputmode="numeric" min="1"
                 value="${ej.velocidad ?? 12}" data-ej-field="velocidad" data-circ="${circIdx}" data-ej="${ejIdx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Seg</label>
          <input type="number" class="input" inputmode="numeric" min="1"
                 value="${ej.tiempo ?? 30}" data-ej-field="tiempo" data-circ="${circIdx}" data-ej="${ejIdx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Desc</label>
          <input type="number" class="input" inputmode="numeric" min="0"
                 value="${ej.descanso ?? 60}" data-ej-field="descanso" data-circ="${circIdx}" data-ej="${ejIdx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Pasadas</label>
          <input type="number" class="input" inputmode="numeric" min="1"
                 value="${ej.cantidadPasadas ?? 6}" data-ej-field="cantidadPasadas" data-circ="${circIdx}" data-ej="${ejIdx}">
        </div>
      </div>
    `;
  }
  if (tipo === 'hiit') {
    return `
      <div class="circuit-params ej-cardio-params">
        <div class="field field-sm">
          <label class="input-label">Work</label>
          <input type="number" class="input" inputmode="numeric" min="1"
                 value="${ej.workTime ?? 40}" data-ej-field="workTime" data-circ="${circIdx}" data-ej="${ejIdx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Rest</label>
          <input type="number" class="input" inputmode="numeric" min="0"
                 value="${ej.restTime ?? 20}" data-ej-field="restTime" data-circ="${circIdx}" data-ej="${ejIdx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Rondas</label>
          <input type="number" class="input" inputmode="numeric" min="1"
                 value="${ej.rounds ?? 3}" data-ej-field="rounds" data-circ="${circIdx}" data-ej="${ejIdx}">
        </div>
      </div>
    `;
  }
  return '';
}

function renderEjFields(ej, circIdx, ejIdx) {
  const ejTipo = ej.tipo || 'normal';

  // Cardio/HIIT exercises — show specific params (no type toggle needed, auto-detected from category)
  if (ejTipo === 'velocidad' || ejTipo === 'caminata' || ejTipo === 'hiit') {
    return renderEjCardioParams(ej, circIdx, ejIdx);
  }

  // Normal — collapsible series section
  const series = ej.series || [{ reps: ej.repsObjetivo || 8, pesoKg: ej.pesoKg || 0 }];
  const ejKey = `${circIdx}-${ejIdx}`;
  const isExpanded = expandedFormEjs.has(ejKey);
  const summaryText = `${series.length} series · ${series[0].reps} reps · ${series[0].pesoKg}kg`;

  const seriesRows = series.map((s, sIdx) => `
    <div class="ej-serie-row">
      <span class="ej-serie-label">S${sIdx + 1}</span>
      <div class="field field-sm">
        <label class="input-label">Reps</label>
        <input type="number" class="input" inputmode="numeric" min="${MIN_REPS}" max="${MAX_REPS}"
               value="${s.reps}" data-field="serie-reps" data-circ="${circIdx}" data-ej="${ejIdx}" data-serie="${sIdx}">
      </div>
      <div class="field field-sm">
        <label class="input-label">Kg</label>
        <input type="number" class="input" inputmode="decimal" min="0" step="0.5"
               value="${s.pesoKg}" data-field="serie-peso" data-circ="${circIdx}" data-ej="${ejIdx}" data-serie="${sIdx}">
      </div>
      ${series.length > 1 ? `<button class="btn-remove-sm" data-action="remove-form-serie" data-circ="${circIdx}" data-ej="${ejIdx}" data-serie="${sIdx}" title="Quitar serie">${icon.close}</button>` : '<span class="btn-remove-sm-placeholder"></span>'}
    </div>
  `).join('');

  return `
    <div class="ej-series-section">
      <button class="ej-series-toggle" data-action="toggle-form-series" data-circ="${circIdx}" data-ej="${ejIdx}">
        <span class="ej-series-chevron ${isExpanded ? 'expanded' : ''}">${icon.chevronDown}</span>
        ${summaryText}
      </button>
      <div class="ej-series-content" ${isExpanded ? '' : 'style="display:none"'}>
        ${seriesRows}
        <button class="ej-series-add-btn" data-action="add-form-serie" data-circ="${circIdx}" data-ej="${ejIdx}">+ Serie</button>
      </div>
    </div>
  `;
}

function renderEjercicio(ej, circIdx, ejIdx, totalEj) {
  const isPickerOpen =
    activePicker && activePicker.circIdx === circIdx && activePicker.ejIdx === ejIdx;

  const triggerClass = ej.nombre ? 'ej-picker-trigger has-value' : 'ej-picker-trigger';

  // Info icon inside the field, X button outside
  const infoInside = ej.nombre ? `<span class="ej-picker-inline-info" data-action="ej-info" data-circ="${circIdx}" data-ej="${ejIdx}" title="Ver detalle">${icon.info}</span>` : '';
  const canRemove = totalEj > 1;
  const removeBtn = `<button class="ej-picker-action-btn ej-picker-remove-btn" data-action="remove-ejercicio" data-circ="${circIdx}" data-ej="${ejIdx}" title="Eliminar ejercicio"${canRemove ? '' : ' disabled'}>${icon.close}</button>`;

  // Drag handle for reordering exercises
  const dragHandle = totalEj > 1
    ? `<span class="drag-handle drag-handle-ej" data-circ="${circIdx}" data-ej="${ejIdx}">${icon.grip}</span>`
    : '';

  const ejFields = renderEjFields(ej, circIdx, ejIdx);
  const fieldsSection = ejFields ? `<div class="ejercicio-form-fields">${ejFields}</div>` : '';

  return `
    <div class="ejercicio-form-row" data-circ="${circIdx}" data-ej="${ejIdx}">
      <div class="ej-picker-wrap">
        <div class="ej-picker-row">
          ${dragHandle}
          <div class="ej-picker-field">
            <button class="${triggerClass}" data-action="open-picker"
                    data-circ="${circIdx}" data-ej="${ejIdx}">
              ${ej.nombre || 'Seleccionar ejercicio...'}
            </button>
            ${infoInside}
          </div>
          ${removeBtn}
        </div>
        ${isPickerOpen ? renderPicker(circIdx, ejIdx) : ''}
      </div>
      ${fieldsSection}
    </div>
  `;
}

function renderCircuito(circ, idx) {
  // Auto-derive grupos from exercises (frequency-ordered, read-only)
  const grupos = autoGruposFromEjercicios(circ);
  if (grupos.length > 0) circ.grupoMuscular = grupos;

  const tagsHtml = grupos.map((g) => {
    const cls = TAG_CLASS[g] || '';
    return `<span class="tag ${cls} circuito-grupo-tag">${g}</span>`;
  }).join('');

  const totalEj = circ.ejercicios.length;
  const ejercicios = circ.ejercicios.map((ej, ejIdx) => renderEjercicio(ej, idx, ejIdx, totalEj)).join('');
  const canAdd = circ.ejercicios.length < MAX_EJERCICIOS;

  // Drag handle for circuit reordering
  const circDragHandle = rutina.circuitos.length > 1
    ? `<span class="drag-handle drag-handle-circ" data-circ="${idx}">${icon.grip}</span>`
    : '';

  return `
    <div class="card circuito-form-card" data-circuito-idx="${idx}">
      <div class="circuito-form-header">
        ${circDragHandle}
        <span class="circuito-form-number">${idx + 1}</span>
        <div class="circuito-grupo-tags">
          ${tagsHtml}
        </div>
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
  returnTo = params.from === 'home' ? '/' : '/rutinas';

  if (isEdit && params.id) {
    const existing = getRutinaById(params.id);
    if (existing) {
      rutina = JSON.parse(JSON.stringify(existing));
      // Migrate old per-exercise params to circuit level (backward compat)
      migrateCircuitParams(rutina);
    } else {
      navigate('/');
      return '';
    }
  } else {
    rutina = {
      id: generateId(),
      nombre: '',
      tipo: params.tipo || 'gimnasio',
      usuario: params.usuario || getUsuarioActivo(),
      diaSemana: null,
      creada: new Date().toISOString(),
      circuitos: [crearCircuitoVacio()],
    };
  }

  // If coming from calendar with a day, auto-assign on save
  assignDay = params.day != null ? Number(params.day) : null;

  activePicker = null;
  pickerQuery = '';
  isDirty = false;

  return renderForm(isEdit);
}

/** Migrate old routines: circuit-level cardio → exercise-level */
function migrateCircuitParams(rut) {
  for (const circ of rut.circuitos) {
    migrateCircuitCardioToExercise(circ);
    // Ensure all exercises have a tipo field
    for (const ej of circ.ejercicios) {
      if (!ej.tipo) ej.tipo = 'normal';
    }
  }
}

function renderForm(isEdit) {
  const circuitos = rutina.circuitos.map((c, i) => renderCircuito(c, i)).join('');

  return `
    <div class="view-header">
      <button class="btn-back" data-action="back">${icon.back}</button>
      <div class="view-header-title">${isEdit ? 'Editar Rutina' : 'Nueva Rutina'}</div>
    </div>

    <div class="form-section">
      <div class="form-name-row">
        <label class="input-label">Nombre de la rutina</label>
        ${rutina.numero ? `<span class="form-routine-code">${formatNumero(rutina.numero, rutina)}</span>` : ''}
      </div>
      <input type="text" class="input" id="rutina-nombre" data-field="nombre" placeholder="Ej: Pecho y espalda"
             value="${rutina.nombre}">
    </div>

    <div class="form-section form-tipo-usuario-row">
      <div class="form-tipo-col">
        <label class="input-label">Tipo</label>
        <div class="ej-type-toggle">
          <button class="ej-type-btn ${rutina.tipo !== 'cross' ? 'active' : ''}" data-action="set-tipo" data-tipo="gimnasio">Gimnasio</button>
          <button class="ej-type-btn ${rutina.tipo === 'cross' ? 'active' : ''}" data-action="set-tipo" data-tipo="cross">Cross</button>
        </div>
      </div>
      <div class="form-usuario-col">
        <label class="input-label">Usuario</label>
        <div class="ej-type-toggle ej-toggle-sm ${rutina.usuario === 'Nat' ? 'toggle-nat' : ''}">
          <button class="ej-type-btn ${rutina.usuario !== 'Nat' ? 'active' : ''}" data-action="set-usuario" data-usuario="Lean">H</button>
          <button class="ej-type-btn ${rutina.usuario === 'Nat' ? 'active' : ''}" data-action="set-usuario" data-usuario="Nat">M</button>
        </div>
      </div>
    </div>

    <div class="form-section">
      <label class="input-label">Dificultad</label>
      <div class="form-picante-bar">
        ${[1, 2, 3].map((lvl) => `
          <button class="form-picante-btn ${(rutina.picante || 0) >= lvl ? 'active' : ''}"
                  data-action="set-picante" data-level="${lvl}">
            ${'🌶️'.repeat(lvl)}
          </button>
        `).join('')}
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
      <button class="btn btn-ghost btn-full" data-action="back">${isEdit ? 'Cerrar' : 'Descartar'}</button>
    </div>
  `;
}

function reRender() {
  // Target the view wrapper so #view-container and nav-bar stay intact
  const el = document.querySelector('.other-view') || document.getElementById('app');
  const isEdit = !!getRutinaById(rutina.id);
  el.innerHTML = renderForm(isEdit);

  // Focus picker search if open and scroll into view
  if (activePicker) {
    const panel = el.querySelector('.ej-picker-panel');
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

  // Integer fields (normal exercise types only now)
  const INT_FIELDS = ['repsObjetivo'];

  // Sync all exercise numeric fields (nombre is handled by picker)
  document.querySelectorAll('.ejercicio-form-row').forEach((row) => {
    const ci = parseInt(row.dataset.circ);
    const ei = parseInt(row.dataset.ej);
    if (!rutina.circuitos[ci] || !rutina.circuitos[ci].ejercicios[ei]) return;
    const ej = rutina.circuitos[ci].ejercicios[ei];

    row.querySelectorAll('[data-field]').forEach((input) => {
      const field = input.dataset.field;
      const val = input.value;
      if (INT_FIELDS.includes(field)) {
        ej[field] = parseInt(val) || 0;
      } else if (field === 'pesoKg') {
        ej.pesoKg = parseFloat(val) || 0;
      } else if (field === 'serie-reps') {
        const sIdx = parseInt(input.dataset.serie);
        if (!ej.series) ej.series = [{ reps: ej.repsObjetivo || 8, pesoKg: ej.pesoKg || 0 }];
        if (ej.series[sIdx]) ej.series[sIdx].reps = parseInt(val) || 0;
      } else if (field === 'serie-peso') {
        const sIdx = parseInt(input.dataset.serie);
        if (!ej.series) ej.series = [{ reps: ej.repsObjetivo || 8, pesoKg: ej.pesoKg || 0 }];
        if (ej.series[sIdx]) ej.series[sIdx].pesoKg = parseFloat(val) || 0;
      }
    });
  });

  // Sync per-exercise cardio params
  document.querySelectorAll('[data-ej-field]').forEach((input) => {
    const ci = parseInt(input.dataset.circ);
    const ei = parseInt(input.dataset.ej);
    const field = input.dataset.ejField;
    if (rutina.circuitos[ci]?.ejercicios[ei]) {
      rutina.circuitos[ci].ejercicios[ei][field] = parseInt(input.value) || 0;
    }
  });
}

function validate() {
  if (!rutina.nombre) return 'Ingresa un nombre para la rutina.';
  for (let i = 0; i < rutina.circuitos.length; i++) {
    const circ = rutina.circuitos[i];

    for (let j = 0; j < circ.ejercicios.length; j++) {
      const ej = circ.ejercicios[j];
      if (!ej.nombre.trim()) {
        return `Circuito ${i + 1}: el ejercicio ${j + 1} necesita un nombre.`;
      }
      const ejTipo = ej.tipo || 'normal';
      if (ejTipo === 'velocidad' || ejTipo === 'caminata') {
        if ((ej.velocidad || 0) <= 0) return `Circuito ${i + 1}, ej ${j + 1}: velocidad debe ser > 0.`;
        if ((ej.cantidadPasadas || 0) <= 0) return `Circuito ${i + 1}, ej ${j + 1}: pasadas debe ser > 0.`;
      } else if (ejTipo === 'hiit') {
        if ((ej.workTime || 0) <= 0) return `Circuito ${i + 1}, ej ${j + 1}: tiempo de trabajo debe ser > 0.`;
        if ((ej.rounds || 0) <= 0) return `Circuito ${i + 1}, ej ${j + 1}: rondas debe ser > 0.`;
      } else {
        const series = ej.series || [];
        if (series.length === 0) return `Circuito ${i + 1}, ej ${j + 1}: necesita al menos 1 serie.`;
        for (const s of series) {
          if (s.reps < MIN_REPS || s.reps > MAX_REPS) {
            return `Circuito ${i + 1}, ejercicio ${j + 1}: las repeticiones deben ser entre ${MIN_REPS} y ${MAX_REPS}.`;
          }
        }
      }
    }
  }
  return null;
}

function selectEjercicio(circIdx, ejIdx, nombre) {
  const ej = rutina.circuitos[circIdx].ejercicios[ejIdx];
  ej.nombre = nombre;
  // Auto-detect exercise type from category
  const allEj = getTodosLosEjercicios();
  const catEntry = allEj.find((e) => e.nombre === nombre);
  if (catEntry) {
    if (CARDIO_CATEGORIES.includes(catEntry.categoria) && (ej.tipo || 'normal') === 'normal') {
      ej.tipo = 'velocidad';
      ej.velocidad = ej.velocidad ?? 12;
      ej.tiempo = ej.tiempo ?? 30;
      ej.descanso = ej.descanso ?? 60;
      ej.cantidadPasadas = ej.cantidadPasadas ?? 6;
    } else if (HIIT_CATEGORIES.includes(catEntry.categoria) && (ej.tipo || 'normal') === 'normal') {
      ej.tipo = 'hiit';
      ej.workTime = ej.workTime ?? 40;
      ej.restTime = ej.restTime ?? 20;
      ej.rounds = ej.rounds ?? 3;
    }
  }
  syncGruposFromEjercicios(circIdx);
  activePicker = null;
  pickerQuery = '';
  pickerDisabledCats = new Set();
  reRender();
}

function getNextNumero(tipo) {
  const all = getRutinas().filter((r) => r.tipo === (tipo || 'gimnasio'));
  const max = all.reduce((m, r) => Math.max(m, r.numero || 0), 0);
  return max + 1;
}

function showSaveOptionsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const num = formatNumero(rutina.numero, rutina);
  const nextNum = formatNumero(getNextNumero(rutina.tipo), rutina);
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-title">Guardar cambios</div>
      <div class="modal-body">¿Cómo querés guardar los cambios?</div>
      <div class="modal-actions-vertical">
        <button class="btn btn-primary btn-full" data-save-opt="update">Guardar en rutina ${num}</button>
        <button class="btn btn-ghost btn-full" data-save-opt="new">Guardar como nueva ${nextNum}</button>
        <button class="btn btn-ghost btn-full" data-save-opt="cancel">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = (cb) => {
    overlay.classList.add('modal-closing');
    let closed = false;
    const done = () => { if (closed) return; closed = true; overlay.remove(); if (cb) cb(); };
    overlay.addEventListener('animationend', done, { once: true });
    setTimeout(done, 400);
  };

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-save-opt]');
    if (e.target === overlay) { close(); return; }
    if (!btn) return;

    switch (btn.dataset.saveOpt) {
      case 'update':
        close(() => {
          saveRutina(rutina);
          isDirty = false;
          showToast('Rutina actualizada');
          navigate(returnTo);
        });
        break;
      case 'new':
        close(() => {
          const copia = JSON.parse(JSON.stringify(rutina));
          copia.id = generateId();
          copia.numero = getNextNumero(rutina.tipo);
          copia.diaSemana = null;
          copia.custom = true;
          saveRutina(copia);
          // Auto-assign to calendar day if created from calendar
          if (assignDay != null) {
            assignRutinaADia(copia.id, assignDay, copia.usuario);
            setPlanDia(copia.usuario, assignDay, copia.tipo);
          }
          isDirty = false;
          showToast(`Rutina ${formatNumero(copia.numero, copia)} creada`);
          navigate(returnTo);
        });
        break;
      case 'cancel':
        close();
        break;
    }
  });
}

function showExitEditModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-title">Cambios sin guardar</div>
      <div class="modal-body">Tenés cambios sin guardar. ¿Qué querés hacer?</div>
      <div class="modal-actions-vertical">
        <button class="btn btn-primary btn-full" data-exit-opt="save">Guardar cambios</button>
        <button class="btn btn-ghost btn-full" data-exit-opt="continue">Seguir editando</button>
        <button class="btn btn-ghost btn-full workout-exit-discard" data-exit-opt="discard">Descartar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = (cb) => {
    overlay.classList.add('modal-closing');
    let closed = false;
    const done = () => { if (closed) return; closed = true; overlay.remove(); if (cb) cb(); };
    overlay.addEventListener('animationend', done, { once: true });
    setTimeout(done, 400);
  };

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-exit-opt]');
    if (e.target === overlay) { close(); return; }
    if (!btn) return;

    switch (btn.dataset.exitOpt) {
      case 'save':
        close(() => {
          syncFromInputs();
          const error = validate();
          if (error) {
            showToast(error, 'error');
            return;
          }
          const isEditing = !!getRutinaById(rutina.id);
          if (isEditing) {
            showSaveOptionsModal();
          } else {
            if (!rutina.numero) rutina.numero = getNextNumero(rutina.tipo);
            rutina.custom = true;
            saveRutina(rutina);
            isDirty = false;
            showToast('Rutina guardada');
            navigate(returnTo);
          }
        });
        break;
      case 'continue':
        close();
        break;
      case 'discard':
        close(() => {
          isDirty = false;
          showToast('Cambios descartados');
          navigate(returnTo);
        });
        break;
    }
  });
}

// ── Drag & Drop for reordering ─────────────────────

function initDragHandlers(app) {
  let dragState = null;

  const handleTouchStart = (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;

    const isCirc = handle.classList.contains('drag-handle-circ');
    const row = isCirc
      ? handle.closest('.circuito-form-card')
      : handle.closest('.ejercicio-form-row');
    if (!row) return;

    syncFromInputs();

    const rect = row.getBoundingClientRect();
    const touch = e.touches[0];
    const parent = row.parentElement;
    const siblings = [...parent.children].filter((c) =>
      isCirc ? c.classList.contains('circuito-form-card') : c.classList.contains('ejercicio-form-row')
    );
    const startIdx = siblings.indexOf(row);
    if (startIdx < 0) return;

    dragState = {
      type: isCirc ? 'circuito' : 'ejercicio',
      circIdx: parseInt(handle.dataset.circ),
      startIdx,
      currentIdx: startIdx,
      el: row,
      parent,
      siblings,
      startY: touch.clientY,
      rowH: rect.height,
      scrollStart: parent.closest('.other-view')?.scrollTop || window.scrollY,
    };

    row.classList.add('drag-active');
    // Add placeholder gap for all OTHER siblings
    siblings.forEach((s, i) => {
      if (i !== startIdx) s.style.transition = 'transform 0.2s ease';
    });

    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    if (!dragState) return;
    e.preventDefault();

    const touch = e.touches[0];
    const dy = touch.clientY - dragState.startY;
    dragState.el.style.transform = `translateY(${dy}px)`;
    dragState.el.style.zIndex = '100';
    dragState.el.style.position = 'relative';

    // Determine new index based on movement
    const halfH = dragState.rowH / 2;
    let newIdx = dragState.startIdx + Math.round(dy / dragState.rowH);
    newIdx = Math.max(0, Math.min(newIdx, dragState.siblings.length - 1));

    if (newIdx !== dragState.currentIdx) {
      dragState.currentIdx = newIdx;
      // Shift siblings visually
      dragState.siblings.forEach((s, i) => {
        if (s === dragState.el) return;
        if (dragState.startIdx < newIdx) {
          // Dragging down: items between start and new move up
          s.style.transform = (i > dragState.startIdx && i <= newIdx) ? `translateY(-${dragState.rowH}px)` : '';
        } else {
          // Dragging up: items between new and start move down
          s.style.transform = (i >= newIdx && i < dragState.startIdx) ? `translateY(${dragState.rowH}px)` : '';
        }
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (!dragState) return;

    const { type, circIdx, startIdx, currentIdx, el, siblings } = dragState;

    // Reset styles
    el.classList.remove('drag-active');
    el.style.transform = '';
    el.style.zIndex = '';
    el.style.position = '';
    siblings.forEach((s) => {
      s.style.transform = '';
      s.style.transition = '';
    });

    if (startIdx !== currentIdx) {
      isDirty = true;
      if (type === 'circuito') {
        const [moved] = rutina.circuitos.splice(startIdx, 1);
        rutina.circuitos.splice(currentIdx, 0, moved);
      } else {
        const arr = rutina.circuitos[circIdx].ejercicios;
        const [moved] = arr.splice(startIdx, 1);
        arr.splice(currentIdx, 0, moved);
      }
      activePicker = null;
      reRender();
    }

    dragState = null;
  };

  app.addEventListener('touchstart', handleTouchStart, { passive: false });
  app.addEventListener('touchmove', handleTouchMove, { passive: false });
  app.addEventListener('touchend', handleTouchEnd);

  return () => {
    app.removeEventListener('touchstart', handleTouchStart);
    app.removeEventListener('touchmove', handleTouchMove);
    app.removeEventListener('touchend', handleTouchEnd);
  };
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
          showExitEditModal();
        } else {
          navigate(returnTo);
        }
        break;

      case 'set-tipo': {
        syncFromInputs();
        rutina.tipo = btn.dataset.tipo;
        isDirty = true;
        reRender();
        break;
      }

      case 'set-usuario': {
        syncFromInputs();
        rutina.usuario = btn.dataset.usuario;
        isDirty = true;
        reRender();
        break;
      }

      case 'set-picante': {
        syncFromInputs();
        const lvl = parseInt(btn.dataset.level);
        // Toggle: if same level clicked, clear it
        rutina.picante = rutina.picante === lvl ? 0 : lvl;
        isDirty = true;
        reRender();
        break;
      }

      case 'toggle-picker-cat': {
        const cat = btn.dataset.cat;
        if (pickerDisabledCats.has(cat)) {
          pickerDisabledCats.delete(cat);
        } else {
          pickerDisabledCats.add(cat);
        }
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
        syncFromInputs();
        isDirty = true;
        activePicker = null;
        if (rutina.circuitos[circIdx].ejercicios.length > 1) {
          rutina.circuitos[circIdx].ejercicios.splice(ejIdx, 1);
        } else {
          // Can't remove last — clear the exercise instead
          const ej = rutina.circuitos[circIdx].ejercicios[ejIdx];
          if (ej) {
            ej.nombre = '';
            ej.tipo = 'normal';
            ej.series = [{ reps: 8, pesoKg: 8 }, { reps: 8, pesoKg: 8 }, { reps: 8, pesoKg: 8 }];
          }
        }
        syncGruposFromEjercicios(circIdx);
        reRender();
        break;
      }

      case 'toggle-form-series': {
        const ejIdx = parseInt(btn.dataset.ej);
        const ejKey = `${circIdx}-${ejIdx}`;
        if (expandedFormEjs.has(ejKey)) {
          expandedFormEjs.delete(ejKey);
        } else {
          expandedFormEjs.add(ejKey);
        }
        const content = btn.closest('.ej-series-section')?.querySelector('.ej-series-content');
        if (content) {
          content.style.display = expandedFormEjs.has(ejKey) ? '' : 'none';
          const chevron = btn.querySelector('.ej-series-chevron');
          if (chevron) chevron.classList.toggle('expanded', expandedFormEjs.has(ejKey));
        }
        break;
      }

      case 'add-form-serie': {
        const ejIdx = parseInt(btn.dataset.ej);
        syncFromInputs();
        const ej = rutina.circuitos[circIdx]?.ejercicios[ejIdx];
        if (!ej) break;
        // Initialize series from legacy fields if missing
        if (!ej.series) {
          ej.series = [{ reps: ej.repsObjetivo || 8, pesoKg: ej.pesoKg || 0 }];
        }
        const last = ej.series[ej.series.length - 1];
        ej.series.push({ reps: last.reps, pesoKg: last.pesoKg });
        isDirty = true;
        // Ensure expanded
        expandedFormEjs.add(`${circIdx}-${ejIdx}`);
        reRender();
        break;
      }

      case 'remove-form-serie': {
        const ejIdx = parseInt(btn.dataset.ej);
        const sIdx = parseInt(btn.dataset.serie);
        syncFromInputs();
        const ej = rutina.circuitos[circIdx]?.ejercicios[ejIdx];
        if (!ej) break;
        if (!ej.series) {
          ej.series = [{ reps: ej.repsObjetivo || 8, pesoKg: ej.pesoKg || 0 }];
        }
        if (ej.series.length > 1) {
          ej.series.splice(sIdx, 1);
          isDirty = true;
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
          pickerDisabledCats = new Set();
        } else {
          activePicker = { circIdx, ejIdx };
          pickerQuery = '';
          pickerDisabledCats = new Set();
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
        // Use first enabled category in picker as default
        const enabledCats = CATEGORIAS.filter((c) => !pickerDisabledCats.has(c));
        const categoria = enabledCats.length > 0 ? enabledCats[0] : 'Core';
        syncFromInputs();
        isDirty = true;
        addEjercicioCustom(nombre, categoria);
        selectEjercicio(circIdx, ejIdx, nombre);
        break;
      }

      case 'close-picker':
        activePicker = null;
        pickerQuery = '';
        pickerDisabledCats = new Set();
        reRender();
        break;

      case 'ej-info': {
        const ejIdx = parseInt(btn.dataset.ej);
        const ej = rutina.circuitos[circIdx].ejercicios[ejIdx];
        if (ej && ej.nombre) {
          showExerciseDetail(ej.nombre);
        }
        break;
      }

      case 'clear-ejercicio': {
        const ejIdx = parseInt(btn.dataset.ej);
        syncFromInputs();
        isDirty = true;
        const ej = rutina.circuitos[circIdx].ejercicios[ejIdx];
        if (ej) {
          ej.nombre = '';
          ej.repsObjetivo = 10;
          ej.pesoKg = 0;
        }
        reRender();
        break;
      }

      case 'show-ejercicio-detail': {
        showExerciseDetail(btn.dataset.nombre);
        break;
      }

      case 'save': {
        // Show loading state on button
        const saveBtn = btn;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="btn-spinner"></span> Guardando...';

        syncFromInputs();
        const error = validate();
        if (error) {
          showToast(error, 'error');
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'Guardar Rutina';
          return;
        }
        const isEditing = !!getRutinaById(rutina.id);
        if (isEditing && isDirty) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'Guardar Rutina';
          showSaveOptionsModal();
        } else {
          // New rutina — assign next numero
          if (!rutina.numero) {
            rutina.numero = getNextNumero(rutina.tipo);
          }
          rutina.custom = true;
          saveRutina(rutina);
          // Auto-assign to calendar day if created from day-assignment modal
          if (assignDay != null) {
            assignRutinaADia(rutina.id, assignDay, rutina.usuario);
            setPlanDia(rutina.usuario, assignDay, rutina.tipo);
          }
          isDirty = false;
          showToast('Rutina guardada');
          navigate(returnTo);
        }
        break;
      }
    }
  };

  const handleChange = (e) => {
    // Mark dirty on any numeric field change
    if (e.target.matches('[data-field]') || e.target.matches('[data-circ-field]')) {
      isDirty = true;
    }
  };

  const handleInput = (e) => {
    // Track dirty on any field input (not just change/blur)
    if (e.target.matches('[data-field]') || e.target.matches('#rutina-nombre') || e.target.matches('[data-circ-field]')) {
      isDirty = true;
    }

    if (e.target.matches('.ej-picker-search')) {
      pickerQuery = e.target.value;
      // Re-render just the picker list without full reRender (for performance)
      const panel = e.target.closest('.ej-picker-panel');
      if (panel && activePicker) {
        const { circIdx, ejIdx } = activePicker;
        const resultados = getPickerFilteredResults();
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
                  <span class="ej-picker-option-cat">${r.categoria}</span>
                  <span class="ej-item-type ${r.tipo}">${r.tipo === 'maquina' ? 'M' : 'F'}</span>
                  <span class="ej-picker-info" data-action="show-ejercicio-detail" data-nombre="${r.nombre}" title="Ver detalle">${icon.info}</span>
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

  // Init drag & drop
  const cleanupDrag = initDragHandlers(app);

  return () => {
    app.removeEventListener('click', handleClick);
    app.removeEventListener('change', handleChange);
    app.removeEventListener('input', handleInput);
    cleanupDrag();
    rutina = null;
    activePicker = null;
    pickerQuery = '';
  };
}
