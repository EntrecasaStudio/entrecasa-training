import { getRutinaById, getRutinas, getUltimaSesionDeRutina, assignRutinaADia, clearRutinaDelDia, setPlanDia } from '@/store.js';
import { navigate } from '@/router.js';
import { showModal } from '@js/components/modal.js';
import { icon } from '@js/icons.js';

// ── Tag class mapping ────────────────────────

export const TAG_CLASS = {
  Core: 'tag-core',
  Piernas: 'tag-piernas',
  Pecho: 'tag-pecho',
  Espalda: 'tag-espalda',
  Brazos: 'tag-brazos',
  'Glúteos': 'tag-gluteos',
  Hombros: 'tag-hombros',
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
  const grupos = [...new Set(rutina.circuitos.map((c) => c.grupoMuscular))];
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

export function showPreview(rutinaId) {
  const rutina = getRutinaById(rutinaId);
  if (!rutina) return;

  const circuitsHtml = rutina.circuitos
    .map(
      (c, i) => `
      <div class="preview-circuit">
        <div class="preview-circuit-header">
          <span class="preview-circuit-num">${i + 1}</span>
          <span class="tag ${TAG_CLASS[c.grupoMuscular] || ''}">${c.grupoMuscular}</span>
        </div>
        <div class="preview-exercises">
          ${c.ejercicios.map((ej) => `<div class="preview-exercise">${ej.nombre} <span class="preview-exercise-meta">${ej.repsObjetivo}r &middot; ${ej.pesoKg}kg</span></div>`).join('')}
        </div>
      </div>
    `,
    )
    .join('');

  showModal({
    title: rutina.nombre,
    body: `<div class="preview-body">${circuitsHtml}</div>`,
    confirmText: `${icon.kettlebell} Iniciar`,
    cancelText: 'Volver',
    onConfirm: () => navigate(`/workout/${rutinaId}`),
    html: true,
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
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
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
