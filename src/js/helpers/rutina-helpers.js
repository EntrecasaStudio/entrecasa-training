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
  const otroTipo = tipoActual === 'gimnasio' ? 'cross' : 'gimnasio';
  const otroIcon = otroTipo === 'gimnasio' ? '🏋️' : '🏃';
  const otroLabel = otroTipo === 'gimnasio' ? 'Gimnasio' : 'Cross';
  const tipoIcon = tipoActual === 'gimnasio' ? '🏋️' : '🏃';

  // Get routines matching current type (shared between users)
  const rutinas = getRutinas().filter((r) => r.tipo === tipoActual);
  const assigned = rutinas.find((r) => r.diaSemana === dia);

  const rutinasHtml = rutinas.map((r) => {
    const isActive = assigned && r.id === assigned.id ? 'active' : '';
    return `<button class="day-assign-option ${isActive}" data-assign-rutina="${r.id}">${r.nombre}</button>`;
  }).join('');

  const tipoNombre = tipoActual === 'gimnasio' ? 'Gimnasio' : 'Cross';
  const emptyMsg = `<div style="color:var(--color-text-muted);padding:var(--space-sm) 0">No hay rutinas de ${tipoNombre}</div>`;

  const bodyHtml = `
    <div class="day-assign-body">
      <div class="day-assign-quick-actions">
        <button class="day-assign-quick-btn day-assign-quick-switch" data-assign-switch="${otroTipo}">
          <span class="day-assign-quick-icon">${otroIcon}</span>
          <span>${otroLabel}</span>
        </button>
        <button class="day-assign-quick-btn day-assign-quick-clear" data-assign-clear>
          <span class="day-assign-quick-icon">✕</span>
          <span>Sin rutina</span>
        </button>
        <button class="day-assign-quick-btn day-assign-quick-rest" data-assign-rest>
          <span class="day-assign-quick-icon">😴</span>
          <span>Descanso</span>
        </button>
      </div>
      <div class="day-assign-divider"></div>
      <div class="day-assign-section-label">${tipoIcon} Rutinas de ${tipoNombre}</div>
      ${rutinasHtml || emptyMsg}
    </div>
  `;

  // Use a custom modal with event delegation
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">${diaLabel}</div>
      <div class="modal-body">${bodyHtml}</div>
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

    const btn = e.target.closest('[data-assign-rutina]');
    if (btn) {
      assignRutinaADia(btn.dataset.assignRutina, dia, usuario);
      close();
      onDone();
      return;
    }

    if (e.target.closest('[data-assign-switch]')) {
      clearRutinaDelDia(dia, usuario);
      setPlanDia(usuario, dia, otroTipo);
      close();
      onDone();
      return;
    }

    if (e.target.closest('[data-assign-clear]')) {
      clearRutinaDelDia(dia, usuario);
      setPlanDia(usuario, dia, null); // also clear the day plan type
      close();
      onDone();
      return;
    }

    if (e.target.closest('[data-assign-rest]')) {
      clearRutinaDelDia(dia, usuario);
      setPlanDia(usuario, dia, null);
      close();
      onDone();
      return;
    }
  });
}
