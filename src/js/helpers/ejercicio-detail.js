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
  Cardio: 'var(--color-tag-cardio)',
};

function findEjercicio(nombre) {
  return [...ejerciciosCatalogo, ...getEjerciciosCustom()].find((e) => e.nombre === nombre);
}

export function showExerciseDetail(nombre, { onSave } = {}) {
  const ej = findEjercicio(nombre)
    || { nombre, categoria: '', tipo: 'funcional' };

  const defaultDesc = DESCRIPCIONES[nombre] || '';
  const meta = getEjercicioMeta(nombre);
  const desc = meta.descripcion != null ? meta.descripcion : defaultDesc;
  const nota = getNotaEjercicio(nombre);
  const displayName = meta.displayName || nombre;
  const tipoLabel = ej.tipo === 'maquina' ? 'Máquina' : 'Funcional';

  // Muscle illustration — SVG silhouette
  const muscleColor = CATEGORY_COLORS[ej.categoria] || 'var(--color-accent)';
  const muscleSvg = ej.categoria ? getMuscleSvg(ej.categoria, 120) : '';
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
      <button class="ej-detail-close-x" data-detail-close>${icon.close}</button>
      <div class="ej-detail-top-tag">
        <span class="tag tag-sm">${ej.categoria}</span>
      </div>
      ${illustrationHtml}
      <div class="ej-detail-header">
        <div class="ej-detail-name" data-name-display>${displayName}</div>
        <input class="ej-detail-name-input hidden" type="text" value="${displayName}" data-name-input />
      </div>
      <div class="ej-detail-separator"></div>
      <div class="ej-detail-desc-section">
        <div class="ej-detail-desc-text" data-desc-display>${desc || '<span class="ej-detail-desc-empty">Sin descripción</span>'}</div>
        <button class="btn btn-ghost btn-xs ej-detail-desc-edit-btn" data-action="edit-desc">${icon.edit}</button>
        <textarea class="ej-detail-desc-textarea hidden" placeholder="Descripción del ejercicio..." rows="3">${desc}</textarea>
      </div>
      <div class="ej-detail-params">
        <div class="ej-type-toggle ej-detail-tipo-toggle">
          <button class="ej-type-btn ${currentTipo === 'funcional' ? 'active' : ''}" data-set-tipo="funcional">Funcional</button>
          <button class="ej-type-btn ${currentTipo === 'maquina' ? 'active' : ''}" data-set-tipo="maquina">Máquina</button>
        </div>
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
    </div>
  `;

  document.body.appendChild(overlay);

  // Auto-expand description textarea if empty (e.g. newly created exercise)
  if (!desc) {
    requestAnimationFrame(() => {
      const display = overlay.querySelector('[data-desc-display]');
      const editBtn = overlay.querySelector('[data-action="edit-desc"]');
      const textarea = overlay.querySelector('.ej-detail-desc-textarea');
      if (display) display.classList.add('hidden');
      if (editBtn) editBtn.classList.add('hidden');
      if (textarea) textarea.classList.remove('hidden');
    });
  }

  const close = () => {
    clearTimeout(_autoSaveTimer);
    autoSave(); // flush pending save
    overlay.classList.add('modal-closing');
    let closed = false;
    const handleClose = () => {
      if (closed) return;
      closed = true;
      overlay.remove();
      if (onSave) onSave();
    };
    overlay.addEventListener('animationend', handleClose, { once: true });
    setTimeout(handleClose, 400); // fallback if animation skips
  };

  // ── Auto-save: persist on every change (debounced for blur events) ──
  let _autoSaveTimer = null;
  function autoSaveDebounced() {
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(autoSave, 300);
  }
  function autoSave() {
    clearTimeout(_autoSaveTimer);
    const notaTextarea = overlay.querySelector('.ej-detail-textarea');
    const descTextarea = overlay.querySelector('.ej-detail-desc-textarea');
    const nameInput = overlay.querySelector('[data-name-input]');
    const usaPesoEl = overlay.querySelector('[data-param="usaPeso"]');
    const usaChalecoEl = overlay.querySelector('[data-param="usaChaleco"]');
    const activeTipoBtn = overlay.querySelector('.ej-detail-tipo-toggle .ej-type-btn.active');
    const newTipo = activeTipoBtn ? activeTipoBtn.dataset.setTipo : currentTipo;
    const newName = nameInput ? nameInput.value.trim() : '';

    if (notaTextarea) saveNotaEjercicio(nombre, notaTextarea.value);

    saveEjercicioMeta(nombre, {
      usaPeso: usaPesoEl ? usaPesoEl.checked : !!meta.usaPeso,
      usaChaleco: usaChalecoEl ? usaChalecoEl.checked : !!meta.usaChaleco,
      descripcion: descTextarea ? descTextarea.value : desc,
      tipo: newTipo,
      displayName: newName && newName !== nombre ? newName : undefined,
    });

    updateEjercicioTipo(nombre, newTipo);
  }

  // Auto-save on checkbox change
  overlay.querySelectorAll('.ej-param-cb').forEach((cb) => {
    cb.addEventListener('change', autoSave);
  });

  // Auto-save on textarea blur (debounced to avoid rapid-fire saves)
  const notaTA = overlay.querySelector('.ej-detail-textarea');
  if (notaTA) notaTA.addEventListener('blur', autoSaveDebounced);
  const descTA = overlay.querySelector('.ej-detail-desc-textarea');
  if (descTA) descTA.addEventListener('blur', autoSaveDebounced);

  // Auto-save on name blur (debounced)
  const nameIn = overlay.querySelector('[data-name-input]');
  if (nameIn) nameIn.addEventListener('blur', autoSaveDebounced);

  // ── Click handlers ──
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-detail-close]')) {
      close();
      return;
    }

    // Tap name to edit
    if (e.target.closest('[data-name-display]')) {
      const nameDiv = overlay.querySelector('[data-name-display]');
      const nameInput = overlay.querySelector('[data-name-input]');
      if (nameDiv && nameInput) {
        nameDiv.classList.add('hidden');
        nameInput.classList.remove('hidden');
        nameInput.focus();
        nameInput.select();
      }
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

    // Tipo toggle (funcional / maquina) — auto-save immediately
    const tipoBtn = e.target.closest('[data-set-tipo]');
    if (tipoBtn) {
      overlay.querySelectorAll('.ej-detail-tipo-toggle .ej-type-btn').forEach((b) => b.classList.remove('active'));
      tipoBtn.classList.add('active');
      autoSave();
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
      if (!body.classList.contains('collapsed')) {
        const ta = body.querySelector('textarea');
        setTimeout(() => ta && ta.focus(), 200);
      }
      return;
    }
  });
}
