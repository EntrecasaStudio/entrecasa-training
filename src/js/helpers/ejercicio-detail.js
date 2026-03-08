import { getNotaEjercicio, saveNotaEjercicio, getEjercicioMeta, saveEjercicioMeta } from '@/store.js';
import { DESCRIPCIONES } from '@js/ejercicios-descripciones.js';
import { ejerciciosCatalogo, updateEjercicioTipo } from '@js/ejercicios-catalogo.js';
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

export function showExerciseDetail(nombre, { onSave } = {}) {
  const ej = findEjercicio(nombre);
  if (!ej) return;

  const defaultDesc = DESCRIPCIONES[nombre] || '';
  const meta = getEjercicioMeta(nombre);
  const desc = meta.descripcion != null ? meta.descripcion : defaultDesc;
  const nota = getNotaEjercicio(nombre);
  const tipoLabel = ej.tipo === 'maquina' ? 'Máquina' : 'Funcional';

  // Muscle illustration — full body, 120px
  const muscleSvg = ej.categoria ? getMuscleSvg(ej.categoria, 120, { allMuscles: true }) : '';
  const muscleColor = CATEGORY_COLORS[ej.categoria] || 'var(--color-accent)';

  const illustrationHtml = muscleSvg
    ? `<div class="ej-detail-illustration" style="--muscle-color: ${muscleColor}">${muscleSvg}</div>`
    : '';

  // Notes dot indicator
  const notaDot = nota ? '<span class="ej-detail-notes-dot"></span>' : '';

  // Current tipo (check meta override first, then catalog)
  const currentTipo = meta.tipo || ej.tipo;
  const currentTipoLabel = currentTipo === 'maquina' ? 'Máquina' : 'Funcional';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box ej-detail-modal">
      ${illustrationHtml}
      <div class="ej-detail-header">
        <div class="ej-detail-name">${nombre}</div>
        <div class="ej-detail-badges">
          <span class="tag tag-sm">${ej.categoria}</span>
        </div>
      </div>
      <div class="ej-detail-separator"></div>
      <div class="ej-detail-desc-section">
        <div class="ej-detail-desc-text" data-desc-display>${desc || '<span class="ej-detail-desc-empty">Sin descripción</span>'}</div>
        <button class="btn btn-ghost btn-xs ej-detail-desc-edit-btn" data-action="edit-desc">${icon.edit} Editar</button>
        <textarea class="ej-detail-desc-textarea hidden" placeholder="Descripción del ejercicio..." rows="3">${desc}</textarea>
      </div>
      <div class="ej-detail-tipo-toggle">
        <button class="ej-detail-tipo-btn ${currentTipo === 'funcional' ? 'active' : ''}" data-set-tipo="funcional">Funcional</button>
        <button class="ej-detail-tipo-btn ${currentTipo === 'maquina' ? 'active' : ''}" data-set-tipo="maquina">Máquina</button>
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
        <button class="ej-detail-notes-toggle" data-toggle="notes">
          <span class="ej-detail-notes-icon-wrap">
            ${icon.edit}
            ${notaDot}
          </span>
          <span class="ej-detail-notes-label-text">Mis notas</span>
          <span class="ej-detail-chevron" data-chevron="notes">${icon.chevronDown}</span>
        </button>
        <div class="ej-detail-collapsible collapsed" data-body="notes">
          <textarea class="ej-detail-textarea" placeholder="Agrega tus notas personales..." rows="3">${nota}</textarea>
        </div>
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

    // Edit description button — switch from text to textarea
    if (e.target.closest('[data-action="edit-desc"]')) {
      const display = overlay.querySelector('[data-desc-display]');
      const editBtn = overlay.querySelector('[data-action="edit-desc"]');
      const textarea = overlay.querySelector('.ej-detail-desc-textarea');
      if (display) display.classList.add('hidden');
      if (editBtn) editBtn.classList.add('hidden');
      if (textarea) {
        textarea.classList.remove('hidden');
        setTimeout(() => textarea.focus(), 100);
      }
      return;
    }

    // Tipo toggle (funcional / maquina)
    const tipoBtn = e.target.closest('[data-set-tipo]');
    if (tipoBtn) {
      overlay.querySelectorAll('.ej-detail-tipo-btn').forEach((b) => b.classList.remove('active'));
      tipoBtn.classList.add('active');
      return;
    }

    // Toggle notes
    if (e.target.closest('[data-toggle="notes"]')) {
      const body = overlay.querySelector('[data-body="notes"]');
      const chevron = overlay.querySelector('[data-chevron="notes"]');
      const toggle = overlay.querySelector('[data-toggle="notes"]');
      body.classList.toggle('collapsed');
      chevron.classList.toggle('open');
      toggle.classList.toggle('active');
      // Auto-focus textarea when expanding
      if (!body.classList.contains('collapsed')) {
        const ta = body.querySelector('textarea');
        setTimeout(() => ta && ta.focus(), 200);
      }
      return;
    }

    if (e.target.closest('[data-detail-save]')) {
      // Save notes
      const notaTextarea = overlay.querySelector('.ej-detail-textarea');
      saveNotaEjercicio(nombre, notaTextarea.value);

      // Save description + params + tipo
      const descTextarea = overlay.querySelector('.ej-detail-desc-textarea');
      const usaPeso = overlay.querySelector('[data-param="usaPeso"]').checked;
      const usaChaleco = overlay.querySelector('[data-param="usaChaleco"]').checked;
      const activeTipoBtn = overlay.querySelector('.ej-detail-tipo-btn.active');
      const newTipo = activeTipoBtn ? activeTipoBtn.dataset.setTipo : currentTipo;

      saveEjercicioMeta(nombre, {
        usaPeso,
        usaChaleco,
        descripcion: descTextarea.value,
        tipo: newTipo,
      });

      // Also update the catalog entry tipo
      updateEjercicioTipo(nombre, newTipo);

      close();
      if (onSave) onSave();
    }
  });
}
