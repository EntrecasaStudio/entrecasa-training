import { getNotaEjercicio, saveNotaEjercicio, getEjercicioMeta, saveEjercicioMeta } from '@/store.js';
import { DESCRIPCIONES } from '@js/ejercicios-descripciones.js';
import { ejerciciosCatalogo } from '@js/ejercicios-catalogo.js';
import { getEjerciciosCustom } from '@js/ejercicios-catalogo.js';
import { icon } from '@js/icons.js';
import { getMuscleSvg } from '@js/helpers/muscle-illustrations.js';

// Map category → CSS color variable
const CATEGORY_COLORS = {
  Core: 'var(--color-tag-core)',
  Piernas: 'var(--color-tag-piernas)',
  Pecho: 'var(--color-tag-pecho)',
  Espalda: 'var(--color-tag-espalda)',
  Brazos: 'var(--color-tag-brazos)',
  'Glúteos': 'var(--color-tag-gluteos)',
  Hombros: 'var(--color-tag-hombros)',
};

function findEjercicio(nombre) {
  return [...ejerciciosCatalogo, ...getEjerciciosCustom()].find((e) => e.nombre === nombre);
}

export function showExerciseDetail(nombre) {
  const ej = findEjercicio(nombre);
  if (!ej) return;

  const defaultDesc = DESCRIPCIONES[nombre] || '';
  const meta = getEjercicioMeta(nombre);
  const desc = meta.descripcion != null ? meta.descripcion : defaultDesc;
  const nota = getNotaEjercicio(nombre);
  const tipoLabel = ej.tipo === 'maquina' ? 'Máquina' : 'Funcional';

  // Muscle illustration for this category — full body with all muscles visible
  const muscleSvg = ej.categoria ? getMuscleSvg(ej.categoria, 80, { allMuscles: true }) : '';
  const muscleColor = CATEGORY_COLORS[ej.categoria] || 'var(--color-accent)';

  const illustrationHtml = muscleSvg
    ? `<div class="ej-detail-illustration" style="--muscle-color: ${muscleColor}">${muscleSvg}</div>`
    : '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box ej-detail-modal">
      ${illustrationHtml}
      <div class="ej-detail-header">
        <div class="ej-detail-name">${nombre}</div>
        <div class="ej-detail-badges">
          <span class="tag tag-sm">${ej.categoria}</span>
          <span class="ej-detail-tipo ${ej.tipo}">${tipoLabel}</span>
        </div>
      </div>
      <div class="ej-detail-desc-section">
        <label class="ej-detail-section-label">Descripción</label>
        <textarea class="ej-detail-desc-textarea" placeholder="Descripción del ejercicio..." rows="2">${desc}</textarea>
      </div>
      <div class="ej-detail-params">
        <span class="ej-detail-params-label">Parámetros</span>
        <label class="ej-param-toggle">
          <input type="checkbox" class="ej-param-cb" data-param="usaPeso" ${meta.usaPeso ? 'checked' : ''}>
          <span class="ej-param-icon">${icon.kettlebell}</span>
          <span class="ej-param-text">Usa peso</span>
        </label>
        <label class="ej-param-toggle">
          <input type="checkbox" class="ej-param-cb" data-param="usaChaleco" ${meta.usaChaleco ? 'checked' : ''}>
          <span class="ej-param-icon">${icon.vest}</span>
          <span class="ej-param-text">Puede usar chaleco</span>
        </label>
      </div>
      <div class="ej-detail-notes-section">
        <label class="ej-detail-notes-label">Mis notas</label>
        <textarea class="ej-detail-textarea" placeholder="Agrega tus notas personales..." rows="3">${nota}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" data-detail-close>Cerrar</button>
        <button class="btn btn-primary btn-sm" data-detail-save>Guardar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-detail-close]')) {
      close();
      return;
    }

    if (e.target.closest('[data-detail-save]')) {
      // Save notes
      const notaTextarea = overlay.querySelector('.ej-detail-textarea');
      saveNotaEjercicio(nombre, notaTextarea.value);

      // Save description + params
      const descTextarea = overlay.querySelector('.ej-detail-desc-textarea');
      const usaPeso = overlay.querySelector('[data-param="usaPeso"]').checked;
      const usaChaleco = overlay.querySelector('[data-param="usaChaleco"]').checked;
      saveEjercicioMeta(nombre, {
        usaPeso,
        usaChaleco,
        descripcion: descTextarea.value,
      });

      close();
    }
  });
}
