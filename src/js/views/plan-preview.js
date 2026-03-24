/**
 * Plan Preview — Calendar view of generated plan for approval.
 */
import { getUsuarioActivo, getPlanGenerado } from '@/store.js';
import { navigate } from '@/router.js';

export function render() {
  const usuario = getUsuarioActivo();
  const plan = getPlanGenerado(usuario);

  if (!plan) {
    return `<div style="padding:var(--space-xl);text-align:center;color:var(--color-text-muted)">
      No hay plan generado.<br>
      <a href="#/plan/nuevo" style="color:var(--color-accent)">Crear uno</a>
    </div>`;
  }

  return `<div class="plan-preview">
    <h1>Plan Preview — ${usuario}</h1>
    <p>Status: ${plan.status}</p>
    <p>${plan.weeks?.length || 0} semanas</p>
  </div>`;
}

export function mount() {
  return () => {};
}
