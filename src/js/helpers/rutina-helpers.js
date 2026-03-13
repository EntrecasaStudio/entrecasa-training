import { getRutinaById, getRutinas, getUltimaSesionDeRutina, assignRutinaADia, clearRutinaDelDia, setPlanDia, getUsuarioActivo, getPlanSemanal, duplicateRutina, deleteRutina, setDayOverride, clearDayOverride, getRutinaStats } from '@/store.js';
import { navigate, refreshCurrentTab } from '@/router.js';
import { icon } from '@js/icons.js';
import { showToastAction } from '@js/components/toast.js';
import { showModal } from '@js/components/modal.js';

// ── Helpers ──────────────────────────────────

/** Always returns grupoMuscular as an array (backward compat) */
export function normalizeGrupos(circuit) {
  const g = circuit.grupoMuscular;
  if (!g) return [];
  return Array.isArray(g) ? g : [g];
}

// ── Tag class mapping ────────────────────────

export const TAG_CLASS = {
  Core: 'tag-core',
  Piernas: 'tag-piernas',
  Pecho: 'tag-pecho',
  Espalda: 'tag-espalda',
  Brazos: 'tag-brazos',
  'Glúteos': 'tag-gluteos',
  Hombros: 'tag-hombros',
  Cardio: 'tag-cardio',
};

// ── Day labels ───────────────────────────────

export const DIAS_LABEL = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miercoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sabado',
  0: 'Domingo',
};

export const DIAS_ABREV = {
  1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D',
};

export const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0]; // Lun→Dom

// ── Display name helpers ────────────────────

/** Strip "Día X - " prefix from routine name for cleaner display */
export function getDisplayName(rutina) {
  if (!rutina || !rutina.nombre) return '';
  const match = rutina.nombre.match(/^Día \d+ [-–] (.+)$/i);
  return match ? match[1] : rutina.nombre;
}

/** Format routine number as coded string: G#001-H, C#005-M, etc. */
export function formatNumero(n, rutina) {
  if (!n) return '';
  const prefix = rutina?.tipo === 'cross' ? 'C' : 'G';
  const suffix = rutina?.usuario === 'Nat' ? 'M' : 'H';
  return `${prefix}#${String(n).padStart(3, '0')}-${suffix}`;
}

/** Render difficulty peppers */
export function renderPicante(level) {
  if (!level) return '';
  return `<span class="rutina-picante">${'🌶️'.repeat(level)}</span>`;
}

/** Render routine stats line (avg duration, calories, sessions) */
export function renderRutinaStatsLine(rutinaId) {
  const stats = getRutinaStats(rutinaId);
  if (!stats) return '';
  const parts = [];
  if (stats.avgDuracion) parts.push(`~${stats.avgDuracion} min`);
  if (stats.avgCalorias) parts.push(`~${stats.avgCalorias} kcal`);
  if (stats.totalSesiones) parts.push(`${stats.totalSesiones} sesion${stats.totalSesiones > 1 ? 'es' : ''}`);
  return parts.length ? `<div class="rutina-stats-line">${parts.join(' · ')}</div>` : '';
}

/** Get emoji icon for routine type */
export function getTipoIcon(tipo) {
  return tipo === 'gimnasio' ? '🏋️' : tipo === 'cross' ? '🏃' : '';
}

// ── Shared render helpers ────────────────────

export function renderTags(rutina, small = false) {
  const grupos = [...new Set(rutina.circuitos.flatMap((c) => normalizeGrupos(c)))];
  const sizeClass = small ? 'tag-sm' : '';
  return grupos
    .map((g) => `<span class="tag ${sizeClass} ${TAG_CLASS[g] || ''}">${g}</span>`)
    .join('');
}

export function renderLastDone(rutina) {
  const sesion = getUltimaSesionDeRutina(rutina.id);
  if (!sesion) return '<span class="rutina-last-done">Sin registros</span>';
  const date = new Date(sesion.fecha);
  const dias = Math.floor((Date.now() - date.getTime()) / 86400000);
  const label = dias === 0 ? 'Hoy' : dias === 1 ? 'Ayer' : `Hace ${dias} dias`;
  return `<span class="rutina-last-done">${label}</span>`;
}

// ── Preview modal ────────────────────────────

export function showPreview(rutinaId, { from, dia: optDia } = {}) {
  const rutina = getRutinaById(rutinaId);
  if (!rutina) return;

  const circuitsHtml = rutina.circuitos
    .map(
      (c, i) => {
        const circTipo = c.tipo || 'normal';
        const typeBadge = circTipo !== 'normal' ? `<span class="preview-type-badge ${circTipo}">${circTipo === 'velocidad' ? 'Vel' : circTipo === 'caminata' ? 'Cam' : 'HIIT'}</span>` : '';
        const chalecoBadge = c.chaleco ? `<span class="preview-chaleco-badge">🦺${c.chalecoPeso ? ` ${c.chalecoPeso}` : ''}</span>` : '';

        const grupos = normalizeGrupos(c);
        const tagsHtml = grupos.map((g) => `<span class="tag tag-sm ${TAG_CLASS[g] || ''}">${g}</span>`).join('');
        const colorSlug = (TAG_CLASS[grupos[0]] || 'tag-core').replace('tag-', '');

        const exercisesHtml = c.ejercicios.map((ej) => {
          return `<div class="preview-exercise">${ej.nombre}</div>`;
        }).join('');

        return `
          <div class="preview-circuit preview-circuit-color-${colorSlug}">
            <div class="preview-circuit-bar"></div>
            <div class="preview-circuit-content">
              <div class="preview-circuit-header">
                <span class="preview-circuit-num">${i + 1}</span>
                ${tagsHtml}
                ${typeBadge}
                ${chalecoBadge}
              </div>
              <div class="preview-exercises">${exercisesHtml}</div>
            </div>
          </div>
        `;
      },
    )
    .join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box preview-modal" role="dialog" aria-modal="true">
      <button class="ej-detail-close-x" data-preview-cancel>${icon.close}</button>
      <div class="modal-title">${rutina.nombre}</div>
      ${renderRutinaStatsLine(rutina.id)}
      <div class="modal-body"><div class="preview-body">${circuitsHtml}</div></div>
      <div class="preview-modal-actions">
        <button class="btn-icon-action btn-icon-action--danger" data-preview-delete title="Eliminar">${icon.trash}</button>
        <button class="btn-icon-action" data-preview-edit title="Editar">${icon.edit}</button>
        <button class="btn-icon-action" data-preview-duplicate title="Duplicar">${icon.copy}</button>
        <button class="btn-icon-action" data-preview-calendar title="Asignar día">${icon.calendar}</button>
        ${from === 'home' ? `<button class="btn-icon-action" data-preview-cambiar title="Cambiar rutina">${icon.swap}</button>` : ''}
        <button class="btn-icon-action btn-icon-action--primary" data-preview-start title="Iniciar">${icon.play}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = (cb) => {
    overlay.classList.add('modal-closing');
    let closed = false;
    const handleClose = () => { if (closed) return; closed = true; overlay.remove(); if (cb) cb(); };
    overlay.addEventListener('animationend', handleClose, { once: true });
    setTimeout(handleClose, 400);
  };

  const editFrom = from === 'home' ? '?from=home' : '';

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-preview-cancel]')) {
      close();
    } else if (e.target.closest('[data-preview-start]')) {
      close(() => navigate(`/workout/${rutinaId}`));
    } else if (e.target.closest('[data-preview-edit]')) {
      close(() => navigate(`/rutina/editar/${rutinaId}${editFrom}`));
    } else if (e.target.closest('[data-preview-duplicate]')) {
      const copia = duplicateRutina(rutinaId);
      if (copia) {
        close(() => {
          refreshCurrentTab();
          showToastAction(
            `Rutina duplicada: ${copia.nombre}`,
            'Deshacer',
            () => {
              deleteRutina(copia.id);
              refreshCurrentTab();
            },
            { duration: 8000 }
          );
        });
      }
    } else if (e.target.closest('[data-preview-calendar]')) {
      // Open day picker for this routine
      close(() => showRoutineDayPicker(rutina));
    } else if (e.target.closest('[data-preview-delete]')) {
      showModal({
        title: 'Eliminar rutina',
        body: 'Esta accion no se puede deshacer.',
        confirmText: 'Eliminar',
        danger: true,
        onConfirm: () => {
          deleteRutina(rutinaId);
          close(() => refreshCurrentTab());
        },
      });
    } else if (e.target.closest('[data-preview-cambiar]')) {
      const d = optDia != null ? optDia : rutina.diaSemana;
      if (d != null) {
        const usuario = getUsuarioActivo();
        const plan = getPlanSemanal(usuario);
        const tipoActual = plan[d] || rutina.tipo || 'gimnasio';
        close(() => showDayAssignmentModal(usuario, d, tipoActual, () => {
          refreshCurrentTab();
        }));
      } else {
        close();
      }
    }
  });
}

// ── Day assignment modal ─────────────────────

const MONTH_ABREV = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function showDayAssignmentModal(usuario, dia, tipoActual, onDone, { date, dateOverride } = {}) {
  const diaLabel = DIAS_LABEL[dia];
  let currentTipo = tipoActual || 'gimnasio';

  // ── Selection state (persisted only on close) ──
  let selectedMode = tipoActual ? 'rutina' : 'descanso';
  let selectedRutinaId = null;
  let searchQuery = '';

  // Pre-populate: find currently assigned routine
  const allRutinas = getRutinas();
  const currentlyAssigned = allRutinas.find((r) => Number(r.diaSemana) === Number(dia));
  if (currentlyAssigned) {
    selectedRutinaId = currentlyAssigned.id;
    currentTipo = currentlyAssigned.tipo || currentTipo;
    selectedMode = 'rutina';
  }

  // ── Title ──
  let titleText = diaLabel;
  if (date) {
    titleText = `${diaLabel} ${date.getDate()} ${MONTH_ABREV[date.getMonth()]}`;
  }

  // ── Helpers ──
  function getRoutinesForTipo(tipo) {
    return getRutinas()
      .filter((r) => r.tipo === tipo)
      .sort((a, b) => (b.numero || 0) - (a.numero || 0));
  }

  function renderList() {
    let rutinas = getRoutinesForTipo(currentTipo);
    if (searchQuery) {
      rutinas = rutinas.filter((r) => getDisplayName(r).toLowerCase().includes(searchQuery));
    }
    const tipoNombre = currentTipo === 'gimnasio' ? 'Gimnasio' : 'Cross';

    if (rutinas.length === 0) {
      return `<div class="day-assign-empty">${searchQuery ? 'Sin resultados' : `No hay rutinas de ${tipoNombre}`}</div>`;
    }

    return rutinas.map((r) => {
      const isActive = r.id === selectedRutinaId ? ' active' : '';
      const code = formatNumero(r.numero, r);
      const name = getDisplayName(r);
      return `
        <div class="day-assign-option${isActive}" data-assign-rutina="${r.id}">
          ${code ? `<span class="day-assign-option-code">${code}</span>` : ''}
          <span class="day-assign-option-name">${name}</span>
          <button class="day-assign-option-info" data-assign-info="${r.id}" title="Ver detalle">
            ${icon.info}
          </button>
        </div>`;
    }).join('');
  }

  function updateModeUI() {
    overlay.querySelectorAll('[data-assign-mode]').forEach((b) => {
      b.classList.toggle('active', b.dataset.assignMode === selectedMode);
    });
    const rutinaSection = overlay.querySelector('.day-assign-rutina-section');
    if (rutinaSection) {
      if (selectedMode === 'rutina') {
        // Show: expand section
        rutinaSection.classList.remove('day-assign-section-hidden');
        rutinaSection.classList.add('day-assign-section-visible');
      } else {
        // Hide: collapse section
        rutinaSection.classList.remove('day-assign-section-visible');
        rutinaSection.classList.add('day-assign-section-hidden');
      }
    }
  }

  function updateList() {
    const listEl = overlay.querySelector('.day-assign-list');
    if (listEl) listEl.innerHTML = renderList();
    overlay.querySelectorAll('[data-assign-tipo]').forEach((b) => {
      b.classList.toggle('active', b.dataset.assignTipo === currentTipo);
    });
  }

  // ── Count routines per type ──
  const gimCount = getRoutinesForTipo('gimnasio').length;
  const crossCount = getRoutinesForTipo('cross').length;

  // ── Build modal HTML ──
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box day-assign-modal" role="dialog" aria-modal="true">
      <button class="ej-detail-close-x" data-assign-close>${icon.close}</button>
      <div class="modal-title">${titleText}</div>
      <div class="modal-body">
        <div class="day-assign-body">
          <div class="ej-type-toggle day-assign-status-toggle">
            <button class="ej-type-btn ${selectedMode === 'rutina' ? 'active' : ''}" data-assign-mode="rutina">
              <span class="day-assign-btn-icon">${icon.checkCircle}</span> Rutina
            </button>
            <button class="ej-type-btn ${selectedMode === 'libre' ? 'active' : ''}" data-assign-mode="libre">
              <span class="day-assign-btn-icon">${icon.close}</span> Libre
            </button>
            <button class="ej-type-btn ${selectedMode === 'descanso' ? 'active' : ''}" data-assign-mode="descanso">
              <span class="day-assign-btn-icon">${icon.moon}</span> Descanso
            </button>
          </div>
          <div class="day-assign-rutina-section ${selectedMode === 'rutina' ? 'day-assign-section-visible' : 'day-assign-section-hidden'}">
            <div class="ej-type-toggle day-assign-tipo-toggle">
              <button class="ej-type-btn ${currentTipo === 'gimnasio' ? 'active' : ''}" data-assign-tipo="gimnasio">
                Gimnasio <span class="day-assign-tipo-count">(${gimCount})</span>
              </button>
              <button class="ej-type-btn ${currentTipo === 'cross' ? 'active' : ''}" data-assign-tipo="cross">
                Cross <span class="day-assign-tipo-count">(${crossCount})</span>
              </button>
            </div>
            <input type="text" class="day-assign-search" placeholder="Buscar rutina..." autocomplete="off">
            <div class="day-assign-list">${renderList()}</div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── Close + apply ──
  const close = () => {
    overlay.classList.add('modal-closing');
    let closed = false;
    const handleClose = () => { if (closed) return; closed = true; overlay.remove(); };
    overlay.addEventListener('animationend', handleClose, { once: true });
    setTimeout(handleClose, 400);
  };

  function applyAndClose() {
    const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null;

    if (dateOverride && dateStr) {
      // Date-specific override (collapsed calendar view)
      if (selectedMode === 'libre' || selectedMode === 'descanso') {
        setDayOverride(usuario, dateStr, { tipo: null });
      } else if (selectedMode === 'rutina' && selectedRutinaId) {
        setDayOverride(usuario, dateStr, { tipo: currentTipo, rutinaId: selectedRutinaId });
      }
    } else {
      // Weekly pattern (expanded calendar view / default)
      if (selectedMode === 'libre' || selectedMode === 'descanso') {
        clearRutinaDelDia(dia, usuario);
        setPlanDia(usuario, dia, null);
      } else if (selectedMode === 'rutina' && selectedRutinaId) {
        setPlanDia(usuario, dia, currentTipo);
        assignRutinaADia(selectedRutinaId, dia, usuario);
      }
    }
    close();
    onDone();
  }

  // ── Search input ──
  overlay.addEventListener('input', (e) => {
    if (e.target.matches('.day-assign-search')) {
      searchQuery = e.target.value.toLowerCase();
      updateList();
    }
  });

  // ── Click handler ──
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { applyAndClose(); return; }

    // Close X
    if (e.target.closest('[data-assign-close]')) { applyAndClose(); return; }

    // Info button → open preview on top
    const infoBtn = e.target.closest('[data-assign-info]');
    if (infoBtn) {
      e.stopPropagation();
      showPreview(infoBtn.dataset.assignInfo);
      return;
    }

    // Routine selection → highlight only
    const assignBtn = e.target.closest('[data-assign-rutina]');
    if (assignBtn && !e.target.closest('[data-assign-info]')) {
      selectedRutinaId = assignBtn.dataset.assignRutina;
      overlay.querySelectorAll('[data-assign-rutina]').forEach((el) => {
        el.classList.toggle('active', el.dataset.assignRutina === selectedRutinaId);
      });
      return;
    }

    // Mode toggle (Rutina / Libre / Descanso) — visual only
    const modeBtn = e.target.closest('[data-assign-mode]');
    if (modeBtn) {
      selectedMode = modeBtn.dataset.assignMode;
      if (selectedMode !== 'rutina') selectedRutinaId = null;
      updateModeUI();
      return;
    }

    // Tipo toggle (Gimnasio / Cross)
    const tipoBtn = e.target.closest('[data-assign-tipo]');
    if (tipoBtn) {
      const newTipo = tipoBtn.dataset.assignTipo;
      if (newTipo !== currentTipo) {
        currentTipo = newTipo;
        updateList();
      }
      return;
    }
  });
}

// ── Routine day picker (from preview) ──────

function showRoutineDayPicker(rutina) {
  const usuario = getUsuarioActivo();
  const currentDia = rutina.diaSemana;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box day-picker-modal" role="dialog" aria-modal="true">
      <button class="ej-detail-close-x" data-picker-close>${icon.close}</button>
      <div class="modal-title">Asignar día</div>
      <div class="modal-body">
        <div class="day-picker-subtitle">${getDisplayName(rutina)}</div>
        <div class="day-picker-grid">
          ${DIAS_ORDEN.map((d) => {
            const isActive = currentDia === d;
            return `<button class="day-picker-btn${isActive ? ' active' : ''}" data-picker-dia="${d}">${DIAS_LABEL[d]}</button>`;
          }).join('')}
          <button class="day-picker-btn day-picker-btn--clear${currentDia == null ? ' active' : ''}" data-picker-dia="none">Sin día</button>
        </div>
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
    if (e.target === overlay || e.target.closest('[data-picker-close]')) {
      close();
      return;
    }
    const btn = e.target.closest('[data-picker-dia]');
    if (btn) {
      const val = btn.dataset.pickerDia;
      if (val === 'none') {
        clearRutinaDelDia(currentDia, usuario);
      } else {
        const dia = Number(val);
        const tipo = rutina.tipo || 'gimnasio';
        setPlanDia(usuario, dia, tipo);
        assignRutinaADia(rutina.id, dia, usuario);
      }
      close(() => refreshCurrentTab());
    }
  });
}
