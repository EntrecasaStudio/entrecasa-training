import { getSesionById, getSesionesByRutina, getPersonalRecords, calcVolumenSesion, getUsuarioActivo, getEjVueltas, getEjBestRound, updateSesion } from '@/store.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';

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

function getProgressIcon(current, previous) {
  if (previous == null) return '';
  if (current > previous) return `<span class="progress-up">${icon.arrowUp} +${(current - previous)}</span>`;
  if (current < previous) return `<span class="progress-down">${icon.arrowDown} -${(previous - current)}</span>`;
  return `<span class="progress-same">${icon.equal}</span>`;
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

function renderCircuito(circ, circIdx, prevCirc, records) {
  const ejercicios = circ.ejercicios
    .map((ej, ejIdx) => {
      // Check per-exercise type (backward compat: fall back to circuit tipo for old data)
      const ejTipo = ej.tipo || circ.tipo || 'normal';

      // Velocidad/Caminata exercise detail
      if (ejTipo === 'velocidad' || ejTipo === 'caminata') {
        const completadas = (ej.pasadas || []).filter((p) => p.completada).length;
        const total = ej.cantidadPasadas ?? circ.cantidadPasadas ?? ej.pasadas?.length ?? 0;
        const vel = ej.velocidad ?? circ.velocidad ?? 0;
        const tiempo = ej.tiempo ?? circ.tiempo ?? 0;
        const badgeLabel = ejTipo === 'caminata' ? 'Caminata' : 'Velocidad';
        return `
          <div class="ejercicio-detalle-row">
            <div class="ejercicio-detalle-name">${ej.nombre} <span class="detalle-type-badge ${ejTipo}">${badgeLabel}</span></div>
            <div class="ejercicio-detalle-values">
              <div class="ejercicio-detalle-col">
                <div class="ejercicio-detalle-col-label">Pasadas</div>
                <div class="ejercicio-detalle-col-value">${completadas}/${total} &middot; ${vel}km/h &middot; ${tiempo}s</div>
              </div>
            </div>
          </div>
        `;
      }

      // HIIT exercise detail
      if (ejTipo === 'hiit') {
        const completadas = (ej.roundResults || []).filter((r) => r.completada).length;
        const total = ej.rounds ?? circ.rounds ?? ej.roundResults?.length ?? 0;
        const workT = ej.workTime ?? circ.workTime ?? 0;
        const restT = ej.restTime ?? circ.restTime ?? 0;
        return `
          <div class="ejercicio-detalle-row">
            <div class="ejercicio-detalle-name">${ej.nombre} <span class="detalle-type-badge hiit">HIIT</span></div>
            <div class="ejercicio-detalle-values">
              <div class="ejercicio-detalle-col">
                <div class="ejercicio-detalle-col-label">Rondas</div>
                <div class="ejercicio-detalle-col-value">${completadas}/${total} &middot; ${workT}s work / ${restT}s rest</div>
              </div>
            </div>
          </div>
        `;
      }

      // Normal exercise detail
      const vueltas = getEjVueltas(ej);
      const best = getEjBestRound(ej);

      const rec = records[ej.nombre];
      const isPR = rec && best.pesoRealKg > 0 && best.pesoRealKg >= rec.maxPeso;
      const prBadge = isPR ? '<span class="pr-badge">PR</span>' : '';
      const vestBadge = ej.chaleco ? `<span class="vest-badge">Chaleco ${ej.pesoChalecoKg}kg</span>` : '';

      const prevEj = prevCirc?.ejercicios?.[ejIdx];
      const prevBest = prevEj ? getEjBestRound(prevEj) : null;
      const pesoProgress = prevBest ? getProgressIcon(best.pesoRealKg, prevBest.pesoRealKg) : '';
      const repsProgress = prevBest ? getProgressIcon(best.repsReal, prevBest.repsReal) : '';

      const vueltasHtml = vueltas.length > 1
        ? `<div class="detalle-vueltas">
            ${vueltas.map((v, i) => `
              <div class="detalle-vuelta-row">
                <span class="detalle-vuelta-label">S${i + 1}</span>
                <span>${v.repsReal} reps</span>
                <span>${v.pesoRealKg > 0 ? v.pesoRealKg + ' kg' : ''}</span>
              </div>
            `).join('')}
          </div>`
        : '';

      return `
        <div class="ejercicio-detalle-row">
          <div class="ejercicio-detalle-name">${ej.nombre} ${prBadge} ${vestBadge}</div>
          <div class="ejercicio-detalle-values">
            <div class="ejercicio-detalle-col">
              <div class="ejercicio-detalle-col-label">Mejor</div>
              <div class="ejercicio-detalle-col-value">${best.repsReal}r × ${best.pesoRealKg > 0 ? best.pesoRealKg + 'kg' : 'corporal'} ${repsProgress} ${pesoProgress}</div>
            </div>
          </div>
          ${vueltasHtml}
        </div>
      `;
    })
    .join('');

  return `
    <div class="card circuito-detalle-card animate-in" style="animation-delay:${100 + circIdx * 80}ms">
      <div class="circuito-detalle-header">
        ${(Array.isArray(circ.grupoMuscular) ? circ.grupoMuscular : [circ.grupoMuscular]).filter(Boolean).map(g => `<span class="tag ${TAG_CLASS[g] || ''}">${g}</span>`).join('')}
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
  const usuario = sesion.usuario || getUsuarioActivo();
  const records = getPersonalRecords(usuario);

  const circuitos = sesion.circuitos
    .map((c, i) => renderCircuito(c, i, prev?.circuitos?.[i], records))
    .join('');

  return `
    <div class="view-header">
      <button class="btn-back" data-action="back">${icon.back}</button>
      <div class="view-header-title">${sesion.rutinaNombre}</div>
    </div>

    <div class="sesion-detalle-fecha animate-in detalle-fecha-editable" data-sesion-id="${sesion.id}" data-fecha="${sesion.fecha}" title="Tocar para editar fecha">${formatDate(sesion.fecha)}</div>

    ${renderStatsStrip(sesion)}

    ${prev ? '<p class="detalle-comparison-note animate-in" style="animation-delay:80ms">Comparado con sesion anterior</p>' : ''}

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

    // Inline editing for date
    const fechaEl = e.target.closest('.detalle-fecha-editable');
    if (fechaEl && !fechaEl.querySelector('input')) {
      const sesionId = fechaEl.dataset.sesionId;
      const currentISO = fechaEl.dataset.fecha;
      const currentDate = currentISO ? currentISO.split('T')[0] : new Date().toISOString().split('T')[0];

      const input = document.createElement('input');
      input.type = 'date';
      input.className = 'detalle-fecha-inline-input';
      input.value = currentDate;
      fechaEl.textContent = '';
      fechaEl.appendChild(input);
      input.focus();

      const save = () => {
        const newDate = input.value;
        if (newDate) {
          const sesion = getSesionById(sesionId);
          if (sesion) {
            // Preserve time, change only the date portion
            const oldDate = new Date(sesion.fecha);
            const [y, m, d] = newDate.split('-').map(Number);
            oldDate.setFullYear(y, m - 1, d);
            sesion.fecha = oldDate.toISOString();
            updateSesion(sesion);
            fechaEl.dataset.fecha = sesion.fecha;
            fechaEl.textContent = formatDate(sesion.fecha);
          }
        } else {
          fechaEl.textContent = formatDate(currentISO);
        }
      };

      input.addEventListener('blur', save, { once: true });
      input.addEventListener('change', () => input.blur());
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
