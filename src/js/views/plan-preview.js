/**
 * Plan Preview — Calendar view of generated plan for approval.
 */
import { getUsuarioActivo, getPlanGenerado, savePlanGenerado, getRutinaById } from '@/store.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';
import { showToast } from '@js/components/toast.js';
import { haptic } from '@js/helpers/haptics.js';

const DIAS_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const TIPO_ICON = { gym: '🏋️', running: '🏃', rucking: '🎒', sauna: '🧖', yoga: '🧘', rest: '😴' };
const TIPO_CLASS = { gym: 'tipo-gym', running: 'tipo-run', rucking: 'tipo-ruck', sauna: 'tipo-sauna', yoga: 'tipo-yoga', rest: 'tipo-rest' };

export function render() {
  const usuario = getUsuarioActivo();
  const plan = getPlanGenerado(usuario);

  if (!plan) {
    return `<div class="plan-empty">
      <p>No hay plan generado.</p>
      <a class="btn btn-primary" href="#/plan/nuevo">Crear plan</a>
    </div>`;
  }

  const statusLabel = plan.status === 'draft' ? 'Borrador' : plan.status === 'active' ? 'Activo' : 'Completado';
  const baseline = plan.config?.baseline;

  return `
    <div class="plan-preview">
      <div class="plan-preview-header">
        <button class="btn-back" data-action="back">${icon.arrowLeft}</button>
        <div>
          <h1>Plan ${plan.config?.duracion || '?'} semanas</h1>
          <span class="plan-status plan-status-${plan.status}">${statusLabel}</span>
        </div>
      </div>

      ${baseline ? `
        <div class="plan-baseline card">
          <h3>Medidas iniciales</h3>
          <div class="plan-baseline-grid">
            ${baseline.peso ? `<div><strong>${baseline.peso}</strong><span>kg</span></div>` : ''}
            ${baseline.grasaCorporal ? `<div><strong>${baseline.grasaCorporal}</strong><span>% grasa</span></div>` : ''}
            ${baseline.cintura ? `<div><strong>${baseline.cintura}</strong><span>cm cint.</span></div>` : ''}
            ${baseline.pecho ? `<div><strong>${baseline.pecho}</strong><span>cm pecho</span></div>` : ''}
            ${baseline.brazo ? `<div><strong>${baseline.brazo}</strong><span>cm brazo</span></div>` : ''}
            ${baseline.muslo ? `<div><strong>${baseline.muslo}</strong><span>cm muslo</span></div>` : ''}
          </div>
        </div>
      ` : ''}

      <div class="plan-calendar">
        ${(plan.weeks || []).map((week) => `
          <div class="plan-week ${week.deload ? 'plan-week-deload' : ''}">
            <div class="plan-week-header">
              Semana ${week.weekNumber} ${week.deload ? '<span class="plan-deload-tag">DELOAD</span>' : ''}
            </div>
            <div class="plan-week-days">
              ${week.days.map((day) => {
                const date = new Date(day.date + 'T12:00:00');
                const dow = DIAS_CORTOS[date.getDay()];
                const dd = date.getDate();
                const rutina = day.rutinaId ? getRutinaById(day.rutinaId) : null;
                return `
                  <div class="plan-day ${TIPO_CLASS[day.tipo] || ''}">
                    <span class="plan-day-dow">${dow}</span>
                    <span class="plan-day-num">${dd}</span>
                    <span class="plan-day-icon">${TIPO_ICON[day.tipo] || ''}</span>
                    ${rutina ? `<span class="plan-day-name">${rutina.nombre}</span>` : ''}
                    ${day.notas ? `<span class="plan-day-note">${day.notas}</span>` : ''}
                  </div>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      ${plan.status === 'draft' ? `
        <div class="plan-actions">
          <button class="btn btn-primary btn-full" data-action="activate">Activar plan</button>
          <button class="btn btn-ghost btn-full" data-action="edit">Editar configuración</button>
          <button class="btn btn-ghost btn-full plan-delete-btn" data-action="delete">Eliminar plan</button>
        </div>
      ` : ''}
    </div>`;
}

export function mount() {
  const app = document.getElementById('view-container');
  const usuario = getUsuarioActivo();

  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    switch (btn.dataset.action) {
      case 'back':
        navigate('/');
        break;
      case 'activate': {
        const plan = getPlanGenerado(usuario);
        if (plan) {
          plan.status = 'active';
          savePlanGenerado(usuario, plan);
          haptic.heavy();
          showToast('Plan activado');
          navigate('/');
        }
        break;
      }
      case 'edit':
        navigate('/plan/nuevo');
        break;
      case 'delete': {
        if (confirm('¿Eliminar este plan?')) {
          savePlanGenerado(usuario, null);
          showToast('Plan eliminado');
          navigate('/');
        }
        break;
      }
    }
  };

  app.addEventListener('click', handleClick);
  return () => app.removeEventListener('click', handleClick);
}
