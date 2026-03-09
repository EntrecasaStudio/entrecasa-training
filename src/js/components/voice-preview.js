import { showModal } from '@js/components/modal.js';
import { saveRutina } from '@/store.js';
import { showToast } from '@js/components/toast.js';
import { navigate } from '@/router.js';

/**
 * Show a preview modal for a voice-generated routine.
 * @param {Object} rutina - { nombre, circuitos, usuario, tipo }
 */
export function showVoicePreview(rutina) {
  const circuitosHTML = rutina.circuitos.map((c, i) => {
    const ejHTML = c.ejercicios.map((ej) =>
      `<div class="voice-preview-ej">
        <span class="voice-preview-ej-name">${ej.nombre}</span>
      </div>`
    ).join('');

    return `
      <div class="voice-preview-circuit">
        <div class="voice-preview-circuit-header">${i + 1}. ${Array.isArray(c.grupoMuscular) ? c.grupoMuscular.join(', ') : c.grupoMuscular}</div>
        ${ejHTML}
      </div>
    `;
  }).join('');

  const totalEj = rutina.circuitos.reduce((s, c) => s + c.ejercicios.length, 0);

  const body = `
    <div class="voice-preview-label">Rutina generada por voz</div>
    <div class="voice-preview-name">${rutina.nombre}</div>
    <div class="voice-preview-meta">${rutina.circuitos.length} circuitos · ${totalEj} ejercicios</div>
    <div class="voice-preview-circuits">${circuitosHTML}</div>
  `;

  showModal({
    title: 'Nueva rutina',
    body,
    confirmText: 'Guardar rutina',
    cancelText: 'Descartar',
    onConfirm: () => {
      // Add missing fields and save
      rutina.id = crypto.randomUUID();
      rutina.creada = new Date().toISOString();
      rutina.diaSemana = null;

      // Ensure each exercise has a pesoKg field
      for (const c of rutina.circuitos) {
        for (const ej of c.ejercicios) {
          ej.pesoKg = ej.pesoKg || 0;
          ej.repsObjetivo = ej.repsObjetivo || 10;
        }
      }

      saveRutina(rutina);
      showToast('Rutina guardada');
      navigate('/rutinas');
    },
  });
}
