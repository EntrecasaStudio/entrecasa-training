/**
 * Plan Wizard — 6-step wizard to generate a training plan.
 * Steps: 1) Baseline  2) Duration  3) Gym days  4) Location  5) Goals  6) Activities
 */
import { getUsuarioActivo } from '@/store.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';

export function render() {
  const usuario = getUsuarioActivo();
  return `
    <div class="plan-wizard">
      <div class="plan-wizard-header">
        <button class="btn-back" data-action="back">${icon.arrowLeft}</button>
        <h1>Nuevo Plan — ${usuario}</h1>
      </div>
      <div class="plan-wizard-body">
        <p style="color:var(--color-text-muted);text-align:center;padding:var(--space-xl)">
          Wizard en construccion.<br>Próximamente: 6 pasos para generar tu plan personalizado.
        </p>
      </div>
    </div>
  `;
}

export function mount() {
  const app = document.getElementById('view-container');
  app.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="back"]')) {
      navigate('/');
    }
  });
  return () => {};
}
