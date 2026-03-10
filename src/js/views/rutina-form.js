import { getRutinaById, getRutinas, saveRutina, getUsuarioActivo, getEjercicioMeta } from '@/store.js';
import { generateId } from '@/id.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';
import { buscarEjerciciosPorCategorias, addEjercicioCustom, CATEGORIAS } from '@js/ejercicios-catalogo.js';
import { showModal } from '@js/components/modal.js';
import { showToast } from '@js/components/toast.js';
import { showExerciseDetail } from '@js/helpers/ejercicio-detail.js';
import { formatNumero, normalizeGrupos } from '@js/helpers/rutina-helpers.js';

const GRUPOS_MUSCULARES = ['Pecho', 'Espalda', 'Piernas', 'Core', 'Brazos', 'Glúteos', 'Hombros', 'Cardio'];
const GRUPO_COLOR_SLUG = {
  Pecho: 'pecho',
  Espalda: 'espalda',
  Piernas: 'piernas',
  Core: 'core',
  Brazos: 'brazos',
  'Glúteos': 'gluteos',
  Hombros: 'hombros',
  Cardio: 'cardio',
};
const MIN_EJERCICIOS = 2;
const MAX_EJERCICIOS = 4;
const MIN_REPS = 6;
const MAX_REPS = 99;

let returnTo = '/rutinas';

// Map form grupoMuscular → catalog categorías
const GRUPO_A_CATEGORIAS = {
  Pecho: ['Pecho'],
  Espalda: ['Espalda'],
  Piernas: ['Piernas', 'Glúteos'],
  Core: ['Core'],
  Brazos: ['Brazos', 'Hombros'],
  'Glúteos': ['Glúteos'],
  Hombros: ['Hombros'],
  Cardio: ['Piernas', 'Core', 'Pecho', 'Espalda', 'Brazos', 'Hombros', 'Glúteos'],
};

function crearEjercicioVacio() {
  return {
    id: generateId(),
    nombre: '',
    series: [
      { reps: 8, pesoKg: 8 },
      { reps: 8, pesoKg: 8 },
      { reps: 8, pesoKg: 8 },
    ],
  };
}

// HIIT/velocidad/caminata exercises are now just name selectors
// Params (workTime, restTime, rounds, velocidad, etc.) live at circuit level
function crearEjercicioSimple() {
  return { id: generateId(), nombre: '' };
}

function crearEjercicioPorTipo(tipo) {
  if (tipo === 'velocidad' || tipo === 'caminata' || tipo === 'hiit') return crearEjercicioSimple();
  return crearEjercicioVacio();
}

function crearCircuitoVacio(tipo = 'normal') {
  const circ = {
    id: generateId(),
    tipo,
    grupoMuscular: [],
    ejercicios: [crearEjercicioPorTipo(tipo), crearEjercicioPorTipo(tipo)],
  };
  // Circuit-level params for non-normal types
  if (tipo === 'hiit') {
    circ.workTime = 40;
    circ.restTime = 20;
    circ.rounds = 3;
  } else if (tipo === 'velocidad') {
    circ.velocidad = 12;
    circ.tiempo = 30;
    circ.descanso = 60;
    circ.cantidadPasadas = 6;
  } else if (tipo === 'caminata') {
    circ.velocidad = 5;
    circ.tiempo = 120;
    circ.descanso = 30;
    circ.cantidadPasadas = 4;
  }
  return circ;
}

// State local to this view
let rutina = null;
let activePicker = null; // { circIdx, ejIdx } or null
let pickerQuery = '';
let activeGrupoDropdown = null; // circIdx or null
let isDirty = false;
let expandedFormEjs = new Set(); // tracks 'circIdx-ejIdx' keys for expanded series

function renderPicker(circIdx, ejIdx) {
  const circ = rutina.circuitos[circIdx];
  const gruposCats = normalizeGrupos(circ).flatMap((g) => GRUPO_A_CATEGORIAS[g] || [g]);
  const categorias = gruposCats.length > 0 ? [...new Set(gruposCats)] : [...CATEGORIAS];
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
      <div class="ej-picker-list">
        ${items || '<div class="ej-picker-empty">No hay ejercicios en esta categoría</div>'}
      </div>
      ${addBtn}
    </div>
  `;
}

// Circuit-level params section (for HIIT / velocidad / caminata)
function renderCircuitParams(circ, idx) {
  const tipo = circ.tipo || 'normal';
  if (tipo === 'velocidad' || tipo === 'caminata') {
    return `
      <div class="circuit-params">
        <div class="field field-sm">
          <label class="input-label">Vel</label>
          <input type="number" class="input" inputmode="numeric" min="1"
                 value="${circ.velocidad ?? 12}" data-circ-field="velocidad" data-circ="${idx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Seg</label>
          <input type="number" class="input" inputmode="numeric" min="1"
                 value="${circ.tiempo ?? 30}" data-circ-field="tiempo" data-circ="${idx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Desc</label>
          <input type="number" class="input" inputmode="numeric" min="0"
                 value="${circ.descanso ?? 60}" data-circ-field="descanso" data-circ="${idx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Pasadas</label>
          <input type="number" class="input" inputmode="numeric" min="1"
                 value="${circ.cantidadPasadas ?? 6}" data-circ-field="cantidadPasadas" data-circ="${idx}">
        </div>
      </div>
    `;
  }
  if (tipo === 'hiit') {
    return `
      <div class="circuit-params">
        <div class="field field-sm">
          <label class="input-label">Work</label>
          <input type="number" class="input" inputmode="numeric" min="1"
                 value="${circ.workTime ?? 40}" data-circ-field="workTime" data-circ="${idx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Rest</label>
          <input type="number" class="input" inputmode="numeric" min="0"
                 value="${circ.restTime ?? 20}" data-circ-field="restTime" data-circ="${idx}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Rondas</label>
          <input type="number" class="input" inputmode="numeric" min="1"
                 value="${circ.rounds ?? 3}" data-circ-field="rounds" data-circ="${idx}">
        </div>
      </div>
    `;
  }
  return '';
}

function renderEjFields(ej, circIdx, ejIdx, circTipo) {
  // Non-normal types: fields are at circuit level, nothing here
  if (circTipo === 'velocidad' || circTipo === 'caminata' || circTipo === 'hiit') {
    return '';
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

function renderEjercicio(ej, circIdx, ejIdx, totalEj, circTipo = 'normal') {
  const isPickerOpen =
    activePicker && activePicker.circIdx === circIdx && activePicker.ejIdx === ejIdx;

  const triggerClass = ej.nombre ? 'ej-picker-trigger has-value' : 'ej-picker-trigger';

  // Info icon inside the field, X button outside
  const infoInside = ej.nombre ? `<span class="ej-picker-inline-info" data-action="ej-info" data-circ="${circIdx}" data-ej="${ejIdx}" title="Ver detalle">${icon.info}</span>` : '';
  const canRemove = totalEj > MIN_EJERCICIOS;
  const removeBtn = `<button class="ej-picker-action-btn ej-picker-remove-btn" data-action="remove-ejercicio" data-circ="${circIdx}" data-ej="${ejIdx}" title="Eliminar ejercicio"${canRemove ? '' : ' disabled'}>${icon.close}</button>`;

  // Drag handle for reordering exercises
  const dragHandle = totalEj > 1
    ? `<span class="drag-handle drag-handle-ej" data-circ="${circIdx}" data-ej="${ejIdx}">${icon.grip}</span>`
    : '';

  const ejFields = renderEjFields(ej, circIdx, ejIdx, circTipo);
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
  const circTipo = circ.tipo || 'normal';
  const grupos = normalizeGrupos(circ);
  const colorSlug = grupos.length > 0 ? (GRUPO_COLOR_SLUG[grupos[0]] || 'pecho') : 'none';

  const tagsHtml = grupos.map((g) => {
    const slug = GRUPO_COLOR_SLUG[g] || 'pecho';
    return `<span class="tag tag-${slug} circuito-grupo-tag">${g}<span class="circuito-grupo-remove" data-action="remove-grupo" data-circ="${idx}" data-grupo="${g}">&times;</span></span>`;
  }).join('');

  const availableGrupos = GRUPOS_MUSCULARES.filter((g) => !grupos.includes(g));
  const addBtn = availableGrupos.length > 0
    ? `<button class="circuito-grupo-add-btn" data-action="toggle-grupo-dropdown" data-circ="${idx}">+</button>`
    : '';

  const dropdownHtml = activeGrupoDropdown === idx
    ? `<div class="circuito-grupo-dropdown">${availableGrupos.map((g) => {
        const slug = GRUPO_COLOR_SLUG[g] || 'pecho';
        return `<button class="tag tag-${slug} circuito-grupo-dropdown-option" data-action="add-grupo" data-circ="${idx}" data-grupo="${g}">${g}</button>`;
      }).join('')}</div>`
    : '';

  const totalEj = circ.ejercicios.length;
  const ejercicios = circ.ejercicios.map((ej, ejIdx) => renderEjercicio(ej, idx, ejIdx, totalEj, circTipo)).join('');
  const canAdd = circ.ejercicios.length < MAX_EJERCICIOS;

  const hasCardio = grupos.includes('Cardio');
  const circuitTypeToggle = hasCardio ? `
    <div class="ej-type-toggle circuit-tipo-toggle">
      <button class="ej-type-btn ${circTipo === 'velocidad' ? 'active' : ''}"
              data-action="set-circuit-tipo" data-circ="${idx}" data-tipo="velocidad">Velocidad</button>
      <button class="ej-type-btn ${circTipo === 'caminata' ? 'active' : ''}"
              data-action="set-circuit-tipo" data-circ="${idx}" data-tipo="caminata">Caminata</button>
      <button class="ej-type-btn ${circTipo === 'hiit' ? 'active' : ''}"
              data-action="set-circuit-tipo" data-circ="${idx}" data-tipo="hiit">HIIT</button>
    </div>
  ` : '';

  // Circuit-level params (shown after type toggle, before exercises)
  const circuitParams = hasCardio ? renderCircuitParams(circ, idx) : '';

  // Drag handle for circuit reordering
  const circDragHandle = rutina.circuitos.length > 1
    ? `<span class="drag-handle drag-handle-circ" data-circ="${idx}">${icon.grip}</span>`
    : '';

  return `
    <div class="card circuito-form-card circuito-color-${colorSlug}" data-circuito-idx="${idx}">
      <div class="circuito-form-header">
        ${circDragHandle}
        <span class="circuito-form-number circuito-num-${colorSlug}">${idx + 1}</span>
        <div class="circuito-grupo-tags">
          ${tagsHtml}
          ${addBtn}
          ${dropdownHtml}
        </div>
        <button class="btn-remove" data-action="remove-circuito" data-circ="${idx}"
                title="Eliminar circuito" style="${rutina.circuitos.length <= 1 ? 'visibility:hidden' : ''}">${icon.trash}</button>
      </div>
      ${circuitTypeToggle}
      ${circuitParams}
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
      tipo: 'gimnasio',
      usuario: getUsuarioActivo(),
      diaSemana: null,
      creada: new Date().toISOString(),
      circuitos: [crearCircuitoVacio()],
    };
  }

  activePicker = null;
  pickerQuery = '';
  activeGrupoDropdown = null;
  isDirty = false;

  return renderForm(isEdit);
}

/** Migrate old routines: move per-exercise params to circuit level */
function migrateCircuitParams(rut) {
  for (const circ of rut.circuitos) {
    const tipo = circ.tipo || 'normal';
    if (tipo === 'hiit' && circ.workTime == null) {
      const first = circ.ejercicios[0];
      if (first) {
        circ.workTime = first.workTime ?? 40;
        circ.restTime = first.restTime ?? 20;
        circ.rounds = first.rounds ?? 3;
      }
    }
    if ((tipo === 'velocidad' || tipo === 'caminata') && circ.velocidad == null) {
      const first = circ.ejercicios[0];
      if (first) {
        circ.velocidad = first.velocidad ?? 12;
        circ.tiempo = first.tiempo ?? 30;
        circ.descanso = first.descanso ?? 60;
        circ.cantidadPasadas = first.cantidadPasadas ?? 6;
      }
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
      <label class="input-label">Nombre de la rutina</label>
      <input type="text" class="input" id="rutina-nombre" data-field="nombre" placeholder="Ej: Pecho y espalda"
             value="${rutina.nombre}">
    </div>

    <div class="form-section">
      <label class="input-label">Tipo</label>
      <div class="ej-type-toggle">
        <button class="ej-type-btn ${rutina.tipo !== 'cross' ? 'active' : ''}" data-action="set-tipo" data-tipo="gimnasio">Gimnasio</button>
        <button class="ej-type-btn ${rutina.tipo === 'cross' ? 'active' : ''}" data-action="set-tipo" data-tipo="cross">Cross</button>
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

  // Sync circuit-level params (HIIT, velocidad, caminata)
  document.querySelectorAll('[data-circ-field]').forEach((input) => {
    const ci = parseInt(input.dataset.circ);
    const field = input.dataset.circField;
    if (rutina.circuitos[ci]) {
      rutina.circuitos[ci][field] = parseInt(input.value) || 0;
    }
  });
}

function validate() {
  if (!rutina.nombre) return 'Ingresa un nombre para la rutina.';
  for (let i = 0; i < rutina.circuitos.length; i++) {
    const circ = rutina.circuitos[i];
    const circTipo = circ.tipo || 'normal';

    // Validate circuit-level params
    if (circTipo === 'velocidad' || circTipo === 'caminata') {
      if ((circ.velocidad || 0) <= 0) return `Circuito ${i + 1}: velocidad debe ser > 0.`;
      if ((circ.cantidadPasadas || 0) <= 0) return `Circuito ${i + 1}: cantidad de pasadas debe ser > 0.`;
    } else if (circTipo === 'hiit') {
      if ((circ.workTime || 0) <= 0) return `Circuito ${i + 1}: tiempo de trabajo debe ser > 0.`;
      if ((circ.rounds || 0) <= 0) return `Circuito ${i + 1}: rondas debe ser > 0.`;
    }

    for (let j = 0; j < circ.ejercicios.length; j++) {
      const ej = circ.ejercicios[j];
      if (!ej.nombre.trim()) {
        return `Circuito ${i + 1}: el ejercicio ${j + 1} necesita un nombre.`;
      }
      if (circTipo === 'normal') {
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
  rutina.circuitos[circIdx].ejercicios[ejIdx].nombre = nombre;
  activePicker = null;
  pickerQuery = '';
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
  const num = formatNumero(rutina.numero);
  const nextNum = formatNumero(getNextNumero(rutina.tipo));
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
          saveRutina(copia);
          isDirty = false;
          showToast(`Rutina ${formatNumero(copia.numero)} creada`);
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

      case 'set-circuit-tipo': {
        syncFromInputs();
        const newTipo = btn.dataset.tipo;
        const oldTipo = rutina.circuitos[circIdx].tipo || 'normal';
        if (newTipo !== oldTipo) {
          rutina.circuitos[circIdx].tipo = newTipo;
          // Reset exercises to match new type
          rutina.circuitos[circIdx].ejercicios = [crearEjercicioPorTipo(newTipo), crearEjercicioPorTipo(newTipo)];
          // Set circuit-level params
          if (newTipo === 'hiit') {
            rutina.circuitos[circIdx].workTime = 40;
            rutina.circuitos[circIdx].restTime = 20;
            rutina.circuitos[circIdx].rounds = 3;
          } else if (newTipo === 'velocidad') {
            rutina.circuitos[circIdx].velocidad = 12;
            rutina.circuitos[circIdx].tiempo = 30;
            rutina.circuitos[circIdx].descanso = 60;
            rutina.circuitos[circIdx].cantidadPasadas = 6;
          } else if (newTipo === 'caminata') {
            rutina.circuitos[circIdx].velocidad = 5;
            rutina.circuitos[circIdx].tiempo = 120;
            rutina.circuitos[circIdx].descanso = 30;
            rutina.circuitos[circIdx].cantidadPasadas = 4;
          }
          isDirty = true;
          activePicker = null;
        }
        reRender();
        break;
      }

      case 'toggle-grupo-dropdown': {
        syncFromInputs();
        activeGrupoDropdown = activeGrupoDropdown === circIdx ? null : circIdx;
        reRender();
        break;
      }

      case 'add-grupo': {
        syncFromInputs();
        const grupo = btn.dataset.grupo;
        const grupos = normalizeGrupos(rutina.circuitos[circIdx]);
        if (!grupos.includes(grupo)) {
          rutina.circuitos[circIdx].grupoMuscular = [...grupos, grupo];
        }
        // Auto-switch to velocidad when Cardio is added and tipo is normal
        if (grupo === 'Cardio' && (rutina.circuitos[circIdx].tipo || 'normal') === 'normal') {
          rutina.circuitos[circIdx].tipo = 'velocidad';
          rutina.circuitos[circIdx].ejercicios = [crearEjercicioPorTipo('velocidad'), crearEjercicioPorTipo('velocidad')];
          rutina.circuitos[circIdx].velocidad = 12;
          rutina.circuitos[circIdx].tiempo = 30;
          rutina.circuitos[circIdx].descanso = 60;
          rutina.circuitos[circIdx].cantidadPasadas = 6;
        }
        isDirty = true;
        activeGrupoDropdown = null;
        if (activePicker && activePicker.circIdx === circIdx) {
          activePicker = null;
          pickerQuery = '';
        }
        reRender();
        break;
      }

      case 'remove-grupo': {
        syncFromInputs();
        const grupo = btn.dataset.grupo;
        const grupos = normalizeGrupos(rutina.circuitos[circIdx]);
        const newGrupos = grupos.filter((g) => g !== grupo);
        if (newGrupos.length > 0) {
          rutina.circuitos[circIdx].grupoMuscular = newGrupos;
          // Reset to normal when Cardio is removed and tipo is not normal
          if (grupo === 'Cardio' && (rutina.circuitos[circIdx].tipo || 'normal') !== 'normal') {
            rutina.circuitos[circIdx].tipo = 'normal';
            rutina.circuitos[circIdx].ejercicios = [crearEjercicioPorTipo('normal'), crearEjercicioPorTipo('normal')];
          }
          isDirty = true;
          if (activePicker && activePicker.circIdx === circIdx) {
            activePicker = null;
            pickerQuery = '';
          }
        }
        reRender();
        break;
      }

      case 'add-circuito':
        syncFromInputs();
        isDirty = true;
        activePicker = null;
        pickerQuery = '';
        activeGrupoDropdown = null;
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
          const circType = rutina.circuitos[circIdx].tipo || 'normal';
          rutina.circuitos[circIdx].ejercicios.push(crearEjercicioPorTipo(circType));
          reRender();
        }
        break;

      case 'remove-ejercicio': {
        const ejIdx = parseInt(btn.dataset.ej);
        syncFromInputs();
        isDirty = true;
        activePicker = null;
        if (rutina.circuitos[circIdx].ejercicios.length > MIN_EJERCICIOS) {
          rutina.circuitos[circIdx].ejercicios.splice(ejIdx, 1);
        } else {
          // Can't remove — clear the exercise instead
          const ej = rutina.circuitos[circIdx].ejercicios[ejIdx];
          if (ej) {
            ej.nombre = '';
            if (ej.series) ej.series = [{ reps: 8, pesoKg: 8 }, { reps: 8, pesoKg: 8 }, { reps: 8, pesoKg: 8 }];
          }
        }
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
        const gruposCatsC = normalizeGrupos(circ).flatMap((g) => GRUPO_A_CATEGORIAS[g] || [g]);
        const categoria = gruposCatsC.length > 0 ? gruposCatsC[0] : 'Core';
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
          saveRutina(rutina);
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
        const circ = rutina.circuitos[circIdx];
        const gruposCats = normalizeGrupos(circ).flatMap((g) => GRUPO_A_CATEGORIAS[g] || [g]);
        const categorias = gruposCats.length > 0 ? [...new Set(gruposCats)] : [...CATEGORIAS];
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
