/**
 * Plan Report — Progress comparison (baseline vs final) + stats.
 */
import { getUsuarioActivo, getPlanGenerado, savePlanGenerado, getSesiones, calcVolumenSesion } from '@/store.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';
import { showToast } from '@js/components/toast.js';

export function render() {
  const usuario = getUsuarioActivo();
  const plan = getPlanGenerado(usuario);

  if (!plan) {
    return `<div class="plan-empty"><p>No hay plan activo.</p><a class="btn btn-primary" href="#/">Volver</a></div>`;
  }

  const baseline = plan.config?.baseline || {};
  const final = plan.finalMedidas || null;
  const startDate = plan.weeks?.[0]?.days?.[0]?.date;
  const endDate = plan.weeks?.[plan.weeks.length - 1]?.days?.[6]?.date;

  // Calculate stats from sessions during plan period
  const sesiones = getSesiones().filter((s) => {
    if (s.usuario !== usuario) return false;
    if (!startDate || !endDate) return true;
    return s.fecha >= startDate && s.fecha <= endDate + 'T23:59:59';
  });

  const totalSessions = sesiones.length;
  const totalVolume = sesiones.reduce((sum, s) => sum + calcVolumenSesion(s), 0);
  const totalMinutes = sesiones.reduce((sum, s) => sum + (s.duracionMin || 0), 0);

  // Adherence: planned gym days vs completed
  const plannedGymDays = (plan.weeks || []).flatMap((w) => w.days).filter((d) => d.tipo === 'gym').length;
  const adherence = plannedGymDays > 0 ? Math.round((totalSessions / plannedGymDays) * 100) : 0;

  // Streak: max consecutive days with a session
  const sessionDates = new Set(sesiones.map((s) => s.fecha?.split('T')[0]));
  let maxStreak = 0;
  let currentStreak = 0;
  if (startDate && endDate) {
    const d = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    while (d <= end) {
      const ds = d.toISOString().split('T')[0];
      if (sessionDates.has(ds)) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
      else { currentStreak = 0; }
      d.setDate(d.getDate() + 1);
    }
  }

  function renderMetric(label, baseVal, finalVal, unit, better = 'lower') {
    if (!baseVal && !finalVal) return '';
    const diff = baseVal && finalVal ? (finalVal - baseVal).toFixed(1) : null;
    const diffClass = diff ? (better === 'lower' ? (diff < 0 ? 'positive' : diff > 0 ? 'negative' : '') : (diff > 0 ? 'positive' : diff < 0 ? 'negative' : '')) : '';
    return `
      <div class="report-metric">
        <span class="report-metric-label">${label}</span>
        <div class="report-metric-values">
          <span class="report-metric-val">${baseVal ?? '—'}</span>
          <span class="report-metric-arrow">→</span>
          <span class="report-metric-val">${finalVal ?? '—'}</span>
          ${diff ? `<span class="report-metric-diff ${diffClass}">${diff > 0 ? '+' : ''}${diff}${unit}</span>` : ''}
        </div>
      </div>`;
  }

  const needsFinal = !final;

  return `
    <div class="plan-report">
      <div class="plan-preview-header">
        <button class="btn-back" data-action="back">${icon.arrowLeft}</button>
        <h1>Reporte del plan</h1>
      </div>

      <div class="report-stats card">
        <div class="report-stat"><strong>${totalSessions}</strong><span>Sesiones</span></div>
        <div class="report-stat"><strong>${Math.round(totalVolume / 1000)}k</strong><span>kg volumen</span></div>
        <div class="report-stat"><strong>${Math.round(totalMinutes / 60)}h</strong><span>Tiempo</span></div>
        <div class="report-stat"><strong>${adherence}%</strong><span>Adherencia</span></div>
        <div class="report-stat"><strong>${maxStreak}</strong><span>Streak máx</span></div>
      </div>

      <div class="card" style="padding:var(--space-md)">
        <h3 style="margin-bottom:var(--space-md)">Progreso corporal</h3>
        ${renderMetric('Peso', baseline.peso, final?.peso, 'kg')}
        ${renderMetric('Grasa %', baseline.grasaCorporal, final?.grasaCorporal, '%')}
        ${renderMetric('Cintura', baseline.cintura, final?.cintura, 'cm')}
        ${renderMetric('Pecho', baseline.pecho, final?.pecho, 'cm', 'higher')}
        ${renderMetric('Brazo', baseline.brazo, final?.brazo, 'cm', 'higher')}
        ${renderMetric('Muslo', baseline.muslo, final?.muslo, 'cm', 'higher')}
      </div>

      ${needsFinal ? `
        <div class="card" style="padding:var(--space-md)">
          <h3 style="margin-bottom:var(--space-md)">Medidas finales</h3>
          <p class="wiz-subtitle">Registrá tus medidas actuales para comparar</p>
          <div class="wiz-form">
            <label class="wiz-field"><span>Peso (kg)</span><input type="number" data-final="peso" value="" placeholder="${baseline.peso || ''}" inputmode="decimal"></label>
            <label class="wiz-field"><span>Grasa (%)</span><input type="number" data-final="grasaCorporal" value="" placeholder="${baseline.grasaCorporal || ''}" inputmode="decimal"></label>
            <div class="wiz-field-row">
              <label class="wiz-field"><span>Cintura</span><input type="number" data-final="cintura" value="" placeholder="${baseline.cintura || ''}" inputmode="decimal"></label>
              <label class="wiz-field"><span>Pecho</span><input type="number" data-final="pecho" value="" placeholder="${baseline.pecho || ''}" inputmode="decimal"></label>
            </div>
            <div class="wiz-field-row">
              <label class="wiz-field"><span>Brazo</span><input type="number" data-final="brazo" value="" placeholder="${baseline.brazo || ''}" inputmode="decimal"></label>
              <label class="wiz-field"><span>Muslo</span><input type="number" data-final="muslo" value="" placeholder="${baseline.muslo || ''}" inputmode="decimal"></label>
            </div>
            <button class="btn btn-primary" data-action="save-final">Guardar medidas finales</button>
          </div>
        </div>
      ` : ''}

      <div class="plan-actions">
        <button class="btn btn-ghost btn-full" data-action="complete-plan">Completar plan</button>
      </div>
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
        navigate('/plan/preview');
        break;

      case 'save-final': {
        const plan = getPlanGenerado(usuario);
        if (!plan) break;
        const medidas = {};
        app.querySelectorAll('[data-final]').forEach((el) => {
          const key = el.dataset.final;
          medidas[key] = el.value ? parseFloat(el.value) : null;
        });
        medidas.fecha = new Date().toISOString().split('T')[0];
        plan.finalMedidas = medidas;
        savePlanGenerado(usuario, plan);
        showToast('Medidas guardadas');
        app.innerHTML = render();
        break;
      }

      case 'complete-plan': {
        const plan = getPlanGenerado(usuario);
        if (plan) {
          plan.status = 'completed';
          savePlanGenerado(usuario, plan);
          showToast('Plan completado');
          navigate('/');
        }
        break;
      }
    }
  };

  app.addEventListener('click', handleClick);
  return () => app.removeEventListener('click', handleClick);
}
