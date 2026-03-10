import { getRutinaById, getRutinas, getUltimaSesionDeRutina, assignRutinaADia, clearRutinaDelDia, setPlanDia, getUsuarioActivo, getPlanSemanal, duplicateRutina } from '@/store.js';
import { navigate, refreshCurrentTab } from '@/router.js';
import { icon } from '@js/icons.js';

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

/** Format routine number as 3-digit code */
export function formatNumero(n) {
  return n ? `#${String(n).padStart(3, '0')}` : '';
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

export function showPreview(rutinaId, { from } = {}) {
  const rutina = getRutinaById(rutinaId);
  if (!rutina) return;

  const circuitsHtml = rutina.circuitos
    .map(
      (c, i) => {
        const circTipo = c.tipo || 'normal';
        const typeBadge = circTipo !== 'normal' ? `<span class="preview-type-badge ${circTipo}">${circTipo === 'velocidad' ? 'Vel' : 'HIIT'}</span>` : '';

        const grupos = normalizeGrupos(c);
        const tagsHtml = grupos.map((g) => `<span class="tag ${TAG_CLASS[g] || ''}">${g}</span>`).join('');
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
      <div class="modal-body"><div class="preview-body">${circuitsHtml}</div></div>
      <div class="preview-modal-actions">
        <button class="btn-icon-action" data-preview-edit title="Editar">${icon.edit}</button>
        <button class="btn-icon-action" data-preview-duplicate title="Duplicar">${icon.copy}</button>
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
        close(() => refreshCurrentTab());
      }
    } else if (e.target.closest('[data-preview-cambiar]')) {
      const dia = rutina.diaSemana;
      if (dia != null) {
        const usuario = getUsuarioActivo();
        const plan = getPlanSemanal(usuario);
        const tipoActual = plan[dia] || rutina.tipo || 'gimnasio';
        close(() => showDayAssignmentModal(usuario, dia, tipoActual, () => {
          refreshCurrentTab();
        }));
      } else {
        close();
      }
    }
  });
}

// ── Day assignment modal ─────────────────────

export function showDayAssignmentModal(usuario, dia, tipoActual, onDone) {
  const diaLabel = DIAS_LABEL[dia];
  let currentTipo = tipoActual;

  // ── Helpers ──
  function getRoutinesForTipo(tipo) {
    return getRutinas()
      .filter((r) => r.tipo === tipo)
      .sort((a, b) => (b.numero || 0) - (a.numero || 0));
  }

  function renderList() {
    const rutinas = getRoutinesForTipo(currentTipo);
    const assigned = rutinas.find((r) => r.diaSemana === dia);
    const tipoNombre = currentTipo === 'gimnasio' ? 'Gimnasio' : 'Cross';

    if (rutinas.length === 0) {
      return `<div class="day-assign-empty">No hay rutinas de ${tipoNombre}</div>`;
    }

    return rutinas.map((r) => {
      const isActive = assigned && r.id === assigned.id ? ' active' : '';
      const code = formatNumero(r.numero);
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

  function updateList() {
    const listEl = overlay.querySelector('.day-assign-list');
    if (listEl) listEl.innerHTML = renderList();
    // Update tipo toggle active states
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
    <div class="modal-box day-assign-modal">
      <div class="modal-title">${diaLabel}</div>
      <div class="modal-body">
        <div class="day-assign-body">
          <div class="ej-type-toggle day-assign-status-toggle">
            <button class="ej-type-btn active" data-assign-mode="rutina">
              <span class="day-assign-btn-icon">${icon.checkCircle}</span> Rutina
            </button>
            <button class="ej-type-btn" data-assign-mode="libre">
              <span class="day-assign-btn-icon">${icon.close}</span> Libre
            </button>
            <button class="ej-type-btn" data-assign-mode="descanso">
              <span class="day-assign-btn-icon">${icon.moon}</span> Descanso
            </button>
          </div>
          <div class="ej-type-toggle day-assign-tipo-toggle">
            <button class="ej-type-btn ${currentTipo === 'gimnasio' ? 'active' : ''}" data-assign-tipo="gimnasio">
              Gimnasio <span class="day-assign-tipo-count">(${gimCount})</span>
            </button>
            <button class="ej-type-btn ${currentTipo === 'cross' ? 'active' : ''}" data-assign-tipo="cross">
              Cross <span class="day-assign-tipo-count">(${crossCount})</span>
            </button>
          </div>
          <div class="day-assign-list">${renderList()}</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    let closed = false;
    const handleClose = () => { if (closed) return; closed = true; overlay.remove(); };
    overlay.addEventListener('animationend', handleClose, { once: true });
    setTimeout(handleClose, 400);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { close(); return; }

    // ── Info button → open preview on top (modal stays) ──
    const infoBtn = e.target.closest('[data-assign-info]');
    if (infoBtn) {
      e.stopPropagation();
      showPreview(infoBtn.dataset.assignInfo);
      return;
    }

    // ── Assign routine ──
    const assignBtn = e.target.closest('[data-assign-rutina]');
    if (assignBtn && !e.target.closest('[data-assign-info]')) {
      setPlanDia(usuario, dia, currentTipo);
      assignRutinaADia(assignBtn.dataset.assignRutina, dia, usuario);
      close();
      onDone();
      return;
    }

    // ── Status toggle (Rutina / Libre / Descanso) ──
    const modeBtn = e.target.closest('[data-assign-mode]');
    if (modeBtn) {
      const mode = modeBtn.dataset.assignMode;
      if (mode === 'libre' || mode === 'descanso') {
        clearRutinaDelDia(dia, usuario);
        setPlanDia(usuario, dia, null);
        close();
        onDone();
        return;
      }
      // 'rutina' mode — just visual, already showing list
      return;
    }

    // ── Tipo toggle (Gimnasio / Cross) — in-place switch ──
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
