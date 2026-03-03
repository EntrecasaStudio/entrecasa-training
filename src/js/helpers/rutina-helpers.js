import { getRutinaById, getUltimaSesionDeRutina } from '@/store.js';
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
    confirmText: `${icon.dumbbell} Iniciar`,
    cancelText: 'Volver',
    onConfirm: () => navigate(`/workout/${rutinaId}`),
    html: true,
  });
}
