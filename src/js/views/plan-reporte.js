/**
 * Plan Report — Progress comparison (baseline vs final).
 */
import { getUsuarioActivo, getPlanGenerado } from '@/store.js';

export function render() {
  const usuario = getUsuarioActivo();
  const plan = getPlanGenerado(usuario);

  if (!plan) {
    return `<div style="padding:var(--space-xl);text-align:center;color:var(--color-text-muted)">
      No hay plan para reportar.
    </div>`;
  }

  return `<div class="plan-reporte">
    <h1>Reporte — ${usuario}</h1>
    <p>Status: ${plan.status}</p>
  </div>`;
}

export function mount() {
  return () => {};
}
