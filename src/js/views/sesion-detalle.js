import { getSesionById, getSesionesByRutina, calcVolumenSesion, getEjVueltas, updateSesion } from '@/store.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';
import { showDatePickerModal } from '@js/components/date-picker-modal.js';

const TAG_CLASS = {
  Core: 'tag-core',
  Piernas: 'tag-piernas',
  Pecho: 'tag-pecho',
  Espalda: 'tag-espalda',
  Brazos: 'tag-brazos',
  Gluteos: 'tag-gluteos',
  'Glúteos': 'tag-gluteos',
  Hombros: 'tag-hombros',
  Cardio: 'tag-cardio',
};

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function findPreviousSession(sesion) {
  const all = getSesionesByRutina(sesion.rutinaId);
  const idx = all.findIndex((s) => s.id === sesion.id);
  return idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
}

function renderStatsStrip(sesion) {
  const volumen = Math.round(calcVolumenSesion(sesion));
  const totalEj = sesion.circuitos.reduce((sum, c) => sum + c.ejercicios.length, 0);
  const calValue = sesion.calorias || 0;

  return `
    <div class="detalle-stats-strip animate-in">
      <div class="detalle-stat">
        <div class="detalle-stat-value detalle-stat-editable" data-edit-field="duracionMin" data-sesion-id="${sesion.id}">${sesion.duracionMin}</div>
        <div class="detalle-stat-label">min</div>
      </div>
      <div class="detalle-stat-divider"></div>
      <div class="detalle-stat">
        <div class="detalle-stat-value">${volumen.toLocaleString()}</div>
        <div class="detalle-stat-label">kg vol</div>
      </div>
      <div class="detalle-stat-divider"></div>
      <div class="detalle-stat">
        <div class="detalle-stat-value">${totalEj}</div>
        <div class="detalle-stat-label">ejercicios</div>
      </div>
      <div class="detalle-stat-divider"></div>
      <div class="detalle-stat">
        <div class="detalle-stat-value">${sesion.circuitos.length}</div>
        <div class="detalle-stat-label">circuitos</div>
      </div>
      <div class="detalle-stat-divider"></div>
      <div class="detalle-stat">
        <div class="detalle-stat-value detalle-stat-editable" data-edit-field="calorias" data-sesion-id="${sesion.id}">${calValue}</div>
        <div class="detalle-stat-label">kcal</div>
      </div>
    </div>
  `;
}

function renderCircuito(circ, circIdx, prevCirc) {
  const grupos = (Array.isArray(circ.grupoMuscular) ? circ.grupoMuscular : [circ.grupoMuscular]).filter(Boolean);

  const ejercicios = circ.ejercicios
    .map((ej, ejIdx) => {
      const ejTipo = ej.tipo || circ.tipo || 'normal';

      // Velocidad/Caminata
      if (ejTipo === 'velocidad' || ejTipo === 'caminata') {
        const completadas = (ej.pasadas || []).filter((p) => p.completada).length;
        const total = ej.cantidadPasadas ?? circ.cantidadPasadas ?? ej.pasadas?.length ?? 0;
        const vel = ej.velocidad ?? circ.velocidad ?? 0;
        const tiempo = ej.tiempo ?? circ.tiempo ?? 0;
        const badgeLabel = ejTipo === 'caminata' ? 'Caminata' : 'Velocidad';
        return `
          <div class="ejercicio-detalle-row">
            <div class="ejercicio-detalle-name">${ej.nombre} <span class="detalle-type-badge ${ejTipo}">${badgeLabel}</span></div>
            <div class="ejercicio-detalle-summary">${completadas}/${total} pasadas · ${vel}km/h · ${tiempo}s</div>
          </div>`;
      }

      // HIIT
      if (ejTipo === 'hiit') {
        const completadas = (ej.roundResults || []).filter((r) => r.completada).length;
        const total = ej.rounds ?? circ.rounds ?? ej.roundResults?.length ?? 0;
        const workT = ej.workTime ?? circ.workTime ?? 0;
        const restT = ej.restTime ?? circ.restTime ?? 0;
        return `
          <div class="ejercicio-detalle-row">
            <div class="ejercicio-detalle-name">${ej.nombre} <span class="detalle-type-badge hiit">HIIT</span></div>
            <div class="ejercicio-detalle-summary">${completadas}/${total} rondas · ${workT}s/${restT}s</div>
          </div>`;
      }

      // Normal — clean series table
      const vueltas = getEjVueltas(ej);
      const vestBadge = ej.chaleco ? ` <span class="vest-badge">Chaleco ${ej.pesoChalecoKg}kg</span>` : '';

      const seriesHtml = vueltas.map((v, i) => {
        const pesoStr = v.pesoRealKg > 0 ? `${v.pesoRealKg} kg` : '';
        return `<div class="detalle-serie-row">
          <span class="detalle-serie-num">S${i + 1}</span>
          <span class="detalle-serie-reps">${v.repsReal} reps</span>
          <span class="detalle-serie-peso">${pesoStr}</span>
        </div>`;
      }).join('');

      return `
        <div class="ejercicio-detalle-row">
          <div class="ejercicio-detalle-name">${ej.nombre}${vestBadge}</div>
          <div class="detalle-series-table">${seriesHtml}</div>
        </div>`;
    })
    .join('');

  return `
    <div class="card circuito-detalle-card animate-in" style="animation-delay:${100 + circIdx * 80}ms">
      <div class="circuito-detalle-header">
        <span class="circuito-detalle-number">${circIdx + 1}</span>
        <div class="circuito-detalle-tags">
          ${grupos.map(g => `<span class="tag ${TAG_CLASS[g] || ''}">${g}</span>`).join('')}
        </div>
      </div>
      ${ejercicios}
    </div>
  `;
}

export function render(params) {
  const sesion = getSesionById(params.id);
  if (!sesion) {
    navigate('/historial');
    return '';
  }

  const prev = findPreviousSession(sesion);

  const circuitos = sesion.circuitos
    .map((c, i) => renderCircuito(c, i, prev?.circuitos?.[i]))
    .join('');

  return `
    <div class="view-header">
      <button class="btn-back" data-action="back">${icon.back}</button>
      <div class="view-header-title">${sesion.rutinaNombre}</div>
    </div>

    <div class="sesion-detalle-fecha animate-in detalle-fecha-editable" data-sesion-id="${sesion.id}" data-fecha="${sesion.fecha}" title="Tocar para editar fecha">${formatDate(sesion.fecha)}</div>

    ${renderStatsStrip(sesion)}

    ${circuitos}
  `;
}

export function mount() {
  const app = document.getElementById('app');

  const handleClick = (e) => {
    if (e.target.closest('[data-action="back"]')) {
      navigate('/historial');
      return;
    }

    // Date editing via calendar modal
    const fechaEl = e.target.closest('.detalle-fecha-editable');
    if (fechaEl) {
      const sesionId = fechaEl.dataset.sesionId;
      const currentISO = fechaEl.dataset.fecha;
      showDatePickerModal(currentISO, (newISO) => {
        const sesion = getSesionById(sesionId);
        if (sesion) {
          sesion.fecha = newISO;
          updateSesion(sesion);
          fechaEl.dataset.fecha = newISO;
          fechaEl.textContent = formatDate(newISO);
        }
      });
      return;
    }

    // Inline editing for duration / calories
    const editable = e.target.closest('.detalle-stat-editable');
    if (editable && !editable.querySelector('input')) {
      const field = editable.dataset.editField;
      const sesionId = editable.dataset.sesionId;
      const currentValue = editable.textContent.trim();

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'detalle-stat-inline-input';
      input.value = currentValue;
      input.inputMode = 'numeric';
      editable.textContent = '';
      editable.appendChild(input);
      input.focus();
      input.select();

      const save = () => {
        const newVal = parseInt(input.value, 10) || 0;
        const sesion = getSesionById(sesionId);
        if (sesion) {
          sesion[field] = newVal;
          updateSesion(sesion);
        }
        editable.textContent = String(newVal);
      };

      input.addEventListener('blur', save, { once: true });
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') input.blur();
      });
    }
  };

  app.addEventListener('click', handleClick);

  return () => {
    app.removeEventListener('click', handleClick);
  };
}
