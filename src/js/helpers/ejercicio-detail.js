import { getNotaEjercicio, saveNotaEjercicio } from '@/store.js';
import { DESCRIPCIONES } from '@js/ejercicios-descripciones.js';
import { ejerciciosCatalogo } from '@js/ejercicios-catalogo.js';
import { getEjerciciosCustom } from '@js/ejercicios-catalogo.js';

function findEjercicio(nombre) {
  return [...ejerciciosCatalogo, ...getEjerciciosCustom()].find((e) => e.nombre === nombre);
}

export function showExerciseDetail(nombre) {
  const ej = findEjercicio(nombre);
  if (!ej) return;

  const desc = DESCRIPCIONES[nombre] || '';
  const nota = getNotaEjercicio(nombre);
  const tipoLabel = ej.tipo === 'maquina' ? 'Máquina' : 'Funcional';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box ej-detail-modal">
      <div class="ej-detail-header">
        <div class="ej-detail-name">${nombre}</div>
        <div class="ej-detail-badges">
          <span class="tag tag-sm">${ej.categoria}</span>
          <span class="ej-detail-tipo ${ej.tipo}">${tipoLabel}</span>
        </div>
      </div>
      ${desc ? `<div class="ej-detail-desc">${desc}</div>` : ''}
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
      const textarea = overlay.querySelector('.ej-detail-textarea');
      saveNotaEjercicio(nombre, textarea.value);
      close();
    }
  });
}
