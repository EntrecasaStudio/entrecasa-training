import { getRutinaById, getWorkoutActivo, saveWorkoutActivo, clearWorkoutActivo, saveSesion, getUltimaSesionDeRutina, getUsuarioActivo, saveRutina, duplicateRutina, getEjercicioMeta } from '@/store.js';
import { generateId } from '@/id.js';
import { navigate } from '@/router.js';
import { showModal } from '@js/components/modal.js';
import { playCountdownTick, playFinishBeep } from '@js/helpers/audio.js';
import { getExerciseProgressData } from '@js/helpers/stats-helpers.js';
import { haptic } from '@js/helpers/haptics.js';
import { showExerciseDetail } from '@js/helpers/ejercicio-detail.js';
import { icon } from '@js/icons.js';
import { formatNumero, autoGruposFromEjercicios } from '@js/helpers/rutina-helpers.js';
import { getTodosLosEjercicios } from '@js/ejercicios-catalogo.js';

const CARDIO_CATS = ['Cardio'];
const HIIT_CATS = ['HIIT'];

/** Create the right exercise template based on catalog category */
function crearEjercicioWorkout(nombre) {
  const catEntry = getTodosLosEjercicios().find((e) => e.nombre === nombre);
  const cat = catEntry?.categoria;

  if (cat && CARDIO_CATS.includes(cat)) {
    return {
      nombre, tipo: 'velocidad',
      velocidad: 12, tiempo: 30, descanso: 60, cantidadPasadas: 6,
      pasadas: Array.from({ length: 6 }, () => ({ completada: false, tiempoReal: 30 })),
    };
  }
  if (cat && HIIT_CATS.includes(cat)) {
    return {
      nombre, tipo: 'hiit',
      workTime: 40, restTime: 20, rounds: 3,
      roundResults: Array.from({ length: 3 }, () => ({ completada: false })),
    };
  }
  return {
    nombre,
    repsObjetivo: 10, pesoObjetivoKg: 0,
    chaleco: false, pesoChalecoKg: 0,
    vueltas: [{ repsReal: 10, pesoRealKg: 0, done: false }],
  };
}
import { showExercisePickerModal } from '@js/components/exercise-picker-modal.js';

let state = null;
let timerInterval = null;
let restInterval = null;
let restRemaining = 0;
const PESO_STEPS = [1, 2.5, 5];
const REST_STEPS = [60, 90, 120];
let pesoStepIdx = 1; // default 2.5
let restStepIdx = 1; // default 90s
let longPressTimer = null;
let longPressInterval = null;
let _removePopGuard = null;
const expandedEjs = new Set(); // Track which exercises are expanded

// ── Velocidad/HIIT timer state ────────────
let activeTimer = null;     // { type, ejIdx, phase, remaining, pasadaIdx?, roundIdx? }
let activeTimerInterval = null;

function initState(rutinaId, opts = {}) {
  const activo = getWorkoutActivo();
  if (activo && activo.rutinaId === rutinaId) {
    // Backward-compat: ensure all vueltas have `done` field
    for (const circ of activo.resultados) {
      for (const ej of circ.ejercicios) {
        if (ej.vueltas) {
          ej.vueltas.forEach((v) => { if (v.done === undefined) v.done = false; });
        }
      }
    }
    state = activo;
    return;
  }

  const rutina = getRutinaById(rutinaId);
  if (!rutina) {
    navigate('/');
    return;
  }

  const lastSesion = getUltimaSesionDeRutina(rutina.id);
  const lastMap = {};
  if (lastSesion) {
    lastSesion.circuitos.forEach((c) => {
      c.ejercicios.forEach((e) => {
        if (e.vueltas?.length > 0) {
          lastMap[e.nombre] = {
            vueltas: e.vueltas,
            chaleco: e.chaleco || false,
            pesoChalecoKg: e.pesoChalecoKg || 0,
          };
        } else {
          // Old format: single value as one round
          lastMap[e.nombre] = {
            vueltas: [{ repsReal: e.repsReal, pesoRealKg: e.pesoRealKg }],
            chaleco: false,
            pesoChalecoKg: 0,
          };
        }
      });
    });
  }

  state = {
    rutinaId: rutina.id,
    rutinaNombre: rutina.nombre,
    rutinaNumero: rutina.numero || null,
    rutinaTipo: rutina.tipo || 'gimnasio',
    usuario: rutina.usuario || getUsuarioActivo(),
    inicioISO: opts.date || new Date().toISOString(),
    circuitoActual: 0,
    resultados: rutina.circuitos.map((circ) => {
      // Backward compat: migrate old circuit-level cardio to exercise-level
      const oldCircTipo = circ.tipo || 'normal';
      if (oldCircTipo !== 'normal') {
        for (const ej of circ.ejercicios) {
          ej.tipo = ej.tipo || oldCircTipo;
          if (oldCircTipo === 'velocidad' || oldCircTipo === 'caminata') {
            ej.velocidad = ej.velocidad ?? circ.velocidad ?? 12;
            ej.tiempo = ej.tiempo ?? circ.tiempo ?? 30;
            ej.descanso = ej.descanso ?? circ.descanso ?? 60;
            ej.cantidadPasadas = ej.cantidadPasadas ?? circ.cantidadPasadas ?? 6;
          } else if (oldCircTipo === 'hiit') {
            ej.workTime = ej.workTime ?? circ.workTime ?? 40;
            ej.restTime = ej.restTime ?? circ.restTime ?? 20;
            ej.rounds = ej.rounds ?? circ.rounds ?? 3;
          }
        }
      }

      return {
        grupoMuscular: circ.grupoMuscular,
        ejercicios: circ.ejercicios.map((ej) => {
          const ejTipo = ej.tipo || 'normal';

          if (ejTipo === 'velocidad' || ejTipo === 'caminata') {
            const vel = ej.velocidad ?? 12;
            const tiempo = ej.tiempo ?? 30;
            const descanso = ej.descanso ?? 60;
            const cantPasadas = ej.cantidadPasadas ?? 6;
            return {
              nombre: ej.nombre, tipo: ejTipo,
              velocidad: vel, tiempo, descanso, cantidadPasadas: cantPasadas,
              pasadas: Array.from({ length: cantPasadas }, () => ({ completada: false, tiempoReal: tiempo })),
            };
          }

          if (ejTipo === 'hiit') {
            const workTime = ej.workTime ?? 40;
            const restTime = ej.restTime ?? 20;
            const rounds = ej.rounds ?? 3;
            return {
              nombre: ej.nombre, tipo: 'hiit',
              workTime, restTime, rounds,
              roundResults: Array.from({ length: rounds }, () => ({ completada: false })),
            };
          }

          // Normal exercise
          const prev = lastMap[ej.nombre];
          let vueltas;
          if (prev) {
            const src = prev.vueltas[0];
            const count = (ej.series && ej.series.length) || 3;
            vueltas = Array.from({ length: count }, () => ({ repsReal: src.repsReal, pesoRealKg: src.pesoRealKg, done: false }));
          } else if (ej.series && ej.series.length > 0) {
            vueltas = ej.series.map((s) => ({ repsReal: s.reps, pesoRealKg: s.pesoKg, done: false }));
          } else {
            vueltas = Array.from({ length: 3 }, () => ({ repsReal: ej.repsObjetivo || 8, pesoRealKg: ej.pesoKg || 0, done: false }));
          }
          const firstSerie = ej.series?.[0];
          return {
            nombre: ej.nombre, tipo: 'normal',
            repsObjetivo: firstSerie ? firstSerie.reps : ej.repsObjetivo,
            pesoObjetivoKg: firstSerie ? firstSerie.pesoKg : ej.pesoKg,
            chaleco: prev ? prev.chaleco : false,
            pesoChalecoKg: prev ? prev.pesoChalecoKg : 0,
            vueltas,
          };
        }),
      };
    }),
  };

  saveWorkoutActivo(state);
}

function getElapsedStr() {
  if (!state) return '00:00';
  const start = new Date(state.inicioISO);
  const diff = Math.floor((Date.now() - start.getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderCircuitSelector() {
  const total = state.resultados.length;
  const pct = ((state.circuitoActual + 1) / total) * 100;

  const segments = state.resultados
    .map((circ, i) => {
      let cls = 'circuit-seg';
      let numHtml;
      if (i < state.circuitoActual) {
        cls += ' done';
        numHtml = `<span class="circuit-seg-num">${icon.check}</span>`;
      } else if (i === state.circuitoActual) {
        cls += ' current';
        numHtml = `<span class="circuit-seg-num">${i + 1}</span>`;
      } else {
        numHtml = `<span class="circuit-seg-num">${i + 1}</span>`;
      }
      const chalecoIcon = circ.chaleco ? '<span class="circuit-seg-chaleco">🦺</span>' : '';
      return `<button class="${cls}" data-action="goto-circuit" data-idx="${i}">${numHtml}${chalecoIcon}</button>`;
    })
    .join('');

  // Edit mode: show + for add circuit and ✓ to confirm. Normal mode: show edit pencil.
  const editModeBtn = state.editMode
    ? `<button class="circuit-seg circuit-add-seg" data-action="add-circuit" aria-label="Agregar circuito">${icon.plus}</button>
       <button class="circuit-seg circuit-confirm-seg" data-action="confirm-edit" aria-label="Confirmar">${icon.check}</button>`
    : `<button class="circuit-seg circuit-edit-seg" data-action="toggle-edit-mode" aria-label="Editar rutina">${icon.edit}</button>`;

  return `
    <div class="circuit-selector-wrap">
      <div class="circuit-selector" id="circuit-selector">${segments}${editModeBtn}</div>
      <div class="workout-progress-bar">
        <div class="workout-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

function renderExerciseHistory(nombre) {
  if (!state) return '';
  const points = getExerciseProgressData(state.usuario, nombre);
  if (points.length === 0) return '';
  const last3 = points.slice(-3);
  const historyStr = last3.map((p) => `${p.reps}r@${p.peso}kg`).join(' → ');
  return `<div class="workout-ej-history">${historyStr}</div>`;
}

function shouldSuggestOverload(nombre, ej) {
  if (!state) return false;
  const points = getExerciseProgressData(state.usuario, nombre);
  if (points.length < 2) return false;
  const last2 = points.slice(-2);
  return last2.every((p) => p.reps >= ej.repsObjetivo && p.peso >= ej.pesoObjetivoKg);
}

function renderEjercicio(ej, ejIdx) {
  const overload = shouldSuggestOverload(ej.nombre, ej);
  const meta = getEjercicioMeta(ej.nombre);
  const isBodyweight = ej.pesoObjetivoKg === 0;
  // Show weight column if exercise has weight configured OR meta says usaPeso
  const showPeso = !isBodyweight || meta.usaPeso;

  // Vest: only show if meta.usaChaleco is enabled
  const vestHtml = meta.usaChaleco ? `
    <div class="workout-vest-row">
      <label class="workout-vest-toggle">
        <input type="checkbox" class="workout-vest-checkbox" data-ej="${ejIdx}"
               ${ej.chaleco ? 'checked' : ''}>
        <span class="workout-vest-icon">${icon.vest}</span>
        <span class="workout-vest-text">Chaleco</span>
      </label>
      <div class="workout-vest-peso ${ej.chaleco ? '' : 'hidden'}">
        <input type="number" class="workout-vest-input" inputmode="decimal" step="0.5"
               value="${ej.pesoChalecoKg}" data-ej="${ejIdx}" data-field="pesoChalecoKg"
               placeholder="kg">
        <span class="workout-vest-unit">kg</span>
      </div>
    </div>
  ` : '';

  // Column headers — new layout: [Reps] [Peso] ... [V] [✓] [action]
  const columnHeaders = `
    <div class="workout-vuelta-headers workout-vuelta-headers--v2">
      <span class="workout-vuelta-header workout-vuelta-header--stepper">Reps</span>
      ${showPeso ? '<span class="workout-vuelta-header workout-vuelta-header--stepper">Peso (kg)</span>' : ''}
      <span class="workout-vuelta-header workout-vuelta-header--right"></span>
    </div>
  `;

  // Round rows: [reps] [peso] | [V label] [done check] [remove/+]
  const totalVueltas = ej.vueltas.length;
  const vueltasHtml = ej.vueltas.map((v, vIdx) => {
    const isDone = v.done;
    const doneClass = isDone ? ' workout-vuelta-done' : '';
    const checkIcon = isDone ? icon.checkCircle : icon.circle;
    const isLast = vIdx === totalVueltas - 1;

    const weightStepper = showPeso ? `
      <div class="workout-vuelta-group">
        <div class="stepper workout-stepper-sm" role="group">
          <button class="stepper-btn" data-action="dec" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="pesoRealKg" aria-label="Disminuir peso serie ${vIdx + 1}">-</button>
          <input type="number" class="stepper-value" inputmode="decimal" step="0.5"
                 value="${v.pesoRealKg}" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="pesoRealKg"
                 aria-label="Peso serie ${vIdx + 1}" aria-valuemin="0">
          <button class="stepper-btn" data-action="inc" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="pesoRealKg" aria-label="Aumentar peso serie ${vIdx + 1}">+</button>
        </div>
      </div>
    ` : '';

    // Right-side action: remove for any row (if >1 vuelta)
    let actionBtn = '';
    if (totalVueltas > 1) {
      actionBtn = `<button class="workout-vuelta-remove" data-action="remove-vuelta" data-ej="${ejIdx}" data-vuelta="${vIdx}" aria-label="Quitar serie ${vIdx + 1}">${icon.close}</button>`;
    }

    return `
      <div class="workout-vuelta-row workout-vuelta-row--v2${doneClass}">
        <div class="workout-vuelta-left">
          <div class="workout-vuelta-group">
            <div class="stepper workout-stepper-sm" role="group">
              <button class="stepper-btn" data-action="dec" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="repsReal" aria-label="Disminuir reps serie ${vIdx + 1}">-</button>
              <input type="number" class="stepper-value" inputmode="numeric"
                     value="${v.repsReal}" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="repsReal"
                     aria-label="Reps serie ${vIdx + 1}" aria-valuemin="0">
              <button class="stepper-btn" data-action="inc" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="repsReal" aria-label="Aumentar reps serie ${vIdx + 1}">+</button>
            </div>
          </div>
          ${weightStepper}
        </div>
        <div class="workout-vuelta-right">
          <span class="workout-vuelta-label">S${vIdx + 1}</span>
          <button class="workout-vuelta-check" data-action="toggle-vuelta-done" data-ej="${ejIdx}" data-vuelta="${vIdx}">
            ${checkIcon}
          </button>
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');

  // Collapsed summary: "3 series · 15 rep · 20 kg"
  const doneCount = ej.vueltas.filter((v) => v.done).length;
  const summaryParts = [`${totalVueltas} series`];
  if (ej.vueltas[0]) summaryParts.push(`${ej.vueltas[0].repsReal} rep`);
  if (showPeso && ej.vueltas[0]) summaryParts.push(`${ej.vueltas[0].pesoRealKg} kg`);
  if (doneCount > 0) summaryParts.push(`${doneCount}/${totalVueltas} ✓`);
  const summaryText = summaryParts.join(' · ');

  const isEditMode = state?.editMode;
  const circ = state?.resultados?.[state.circuitoActual];
  const canRemoveEj = isEditMode && circ && circ.ejercicios.length > 1;

  return `
    <div class="workout-ejercicio animate-in" style="animation-delay:${ejIdx * 60}ms">
      <div class="workout-ejercicio-header" data-action="toggle-ej-expand" data-ej="${ejIdx}" style="cursor:pointer">
        <div class="workout-ejercicio-name">${ej.nombre}</div>
        ${isEditMode ? `
          <button class="workout-info-btn workout-edit-btn" data-action="replace-exercise" data-ej="${ejIdx}" aria-label="Cambiar ${ej.nombre}">
            ${icon.swap}
          </button>
          ${canRemoveEj ? `<button class="workout-info-btn workout-edit-btn workout-remove-ej-btn" data-action="remove-exercise" data-ej="${ejIdx}" aria-label="Quitar ${ej.nombre}">
            ${icon.trash}
          </button>` : ''}
        ` : ''}
        <button class="workout-info-btn" data-action="show-detail" data-nombre="${ej.nombre}" aria-label="Info de ${ej.nombre}">
          ${icon.info}
        </button>
        <button class="workout-ej-toggle ${expandedEjs.has(ejIdx) ? 'expanded' : ''}" data-action="toggle-ej-expand" data-ej="${ejIdx}" aria-label="Expandir">
          ${icon.chevronDown}
        </button>
      </div>
      <div class="workout-ej-summary" data-ej-summary="${ejIdx}" ${expandedEjs.has(ejIdx) ? 'style="display:none"' : ''}>
        <span>${summaryText}</span>
        <button class="workout-check-all-btn ${doneCount === totalVueltas ? 'all-done' : ''}" data-action="check-all-vueltas" data-ej="${ejIdx}" aria-label="Marcar todas">${doneCount === totalVueltas ? '✓' : '○'}</button>
      </div>
      <div class="workout-ej-collapsible" data-ej-body="${ejIdx}" ${expandedEjs.has(ejIdx) ? '' : 'style="display:none"'}>
        ${overload ? `<div class="workout-overload-hint">${icon.arrowUp} Subir peso</div>` : ''}
        ${renderExerciseHistory(ej.nombre)}
        ${vestHtml}
        <div class="workout-ej-divider"></div>
        ${columnHeaders}
        <div class="workout-vueltas">
          ${vueltasHtml}
        </div>
        <button class="workout-add-vuelta-btn" data-action="add-vuelta" data-ej="${ejIdx}">${icon.plus} Serie</button>
      </div>
    </div>
  `;
}

// ── Velocidad/Caminata exercise rendering ────
function renderEjercicioVelocidad(ej, ejIdx) {
  const tipo = ej.tipo || 'velocidad';
  const completadas = ej.pasadas.filter((p) => p.completada).length;
  const total = ej.cantidadPasadas;
  const allDone = completadas === total;

  const isTimerActive = activeTimer && (activeTimer.type === 'velocidad' || activeTimer.type === 'caminata') && activeTimer.ejIdx === ejIdx;
  const timerPhase = isTimerActive ? activeTimer.phase : null; // 'run' | 'rest'
  const timerRemaining = isTimerActive ? activeTimer.remaining : 0;

  const pasadasHtml = ej.pasadas.map((p, pIdx) => {
    const isCurrent = !p.completada && ej.pasadas.slice(0, pIdx).every((pp) => pp.completada);
    const cls = p.completada ? 'workout-pasada-row completed' : isCurrent ? 'workout-pasada-row current' : 'workout-pasada-row';
    const checkIcon = p.completada ? icon.checkCircle : icon.circle;

    return `
      <div class="${cls}">
        <button class="workout-vuelta-check" data-action="toggle-pasada" data-ej="${ejIdx}" data-pasada="${pIdx}">${checkIcon}</button>
        <span class="workout-vuelta-label">P${pIdx + 1}</span>
        <span class="workout-pasada-info">${ej.velocidad} km/h &middot; ${ej.tiempo}s</span>
        ${p.completada ? `<span class="workout-pasada-done-label">${icon.check}</span>` : ''}
      </div>
    `;
  }).join('');

  // Timer display (only when active)
  const timerHtml = isTimerActive ? `
    <div class="workout-timer-display">
      <div class="workout-timer-phase ${timerPhase}">${timerPhase === 'run' ? (tipo === 'caminata' ? 'CAMINANDO' : 'CORRIENDO') : 'DESCANSO'}</div>
      <div class="workout-timer-big" id="vel-timer-value">${timerRemaining}</div>
      <button class="btn btn-ghost btn-sm" data-action="skip-vel-timer" data-ej="${ejIdx}">Saltar</button>
    </div>
  ` : '';

  // Start button (show when no timer is active for this exercise)
  const nextPasadaIdx = ej.pasadas.findIndex((p) => !p.completada);
  const startBtn = !isTimerActive && nextPasadaIdx >= 0 ? `
    <button class="btn btn-primary btn-sm workout-start-timer-btn" data-action="start-vel-timer" data-ej="${ejIdx}" data-pasada="${nextPasadaIdx}">
      ${icon.play || '▶'} Iniciar pasada ${nextPasadaIdx + 1}
    </button>
  ` : '';

  return `
    <div class="workout-ejercicio animate-in" style="animation-delay:${ejIdx * 60}ms">
      <div class="workout-ejercicio-header">
        <div class="workout-ejercicio-name">${ej.nombre}</div>
        <span class="workout-circuit-type-badge ${tipo}">${tipo === 'caminata' ? 'Caminata' : 'Velocidad'}</span>
      </div>
      <div class="workout-ejercicio-target">
        ${total} pasadas &middot; ${ej.velocidad} km/h &middot; ${ej.tiempo}s / ${ej.descanso}s desc
      </div>
      <div class="workout-pasada-progress">${completadas}/${total} completadas ${allDone ? icon.check : ''}</div>
      ${timerHtml}
      <div class="workout-vueltas">
        ${pasadasHtml}
        <button class="workout-add-vuelta-btn" data-action="add-pasada" data-ej="${ejIdx}">
          ${icon.plus} Pasada
        </button>
      </div>
      ${startBtn}
    </div>
  `;
}

// ── HIIT exercise rendering ─────────────────
function renderEjercicioHIIT(ej, ejIdx) {
  const completadas = ej.roundResults.filter((r) => r.completada).length;
  const total = ej.rounds;
  const allDone = completadas === total;

  const isTimerActive = activeTimer && activeTimer.type === 'hiit' && activeTimer.ejIdx === ejIdx;
  const timerPhase = isTimerActive ? activeTimer.phase : null;
  const timerRemaining = isTimerActive ? activeTimer.remaining : 0;
  const currentRound = isTimerActive ? (activeTimer.roundIdx + 1) : 0;

  const roundsHtml = ej.roundResults.map((r, rIdx) => {
    const cls = r.completada ? 'workout-pasada-row completed' : 'workout-pasada-row';
    const checkIcon = r.completada ? icon.checkCircle : icon.circle;
    return `
      <div class="${cls}">
        <button class="workout-vuelta-check" data-action="toggle-hiit-round" data-ej="${ejIdx}" data-round="${rIdx}">${checkIcon}</button>
        <span class="workout-vuelta-label">R${rIdx + 1}</span>
        <span class="workout-pasada-info">${ej.workTime}s work / ${ej.restTime}s rest</span>
      </div>
    `;
  }).join('');

  // Timer display
  const timerHtml = isTimerActive ? `
    <div class="workout-timer-display">
      <div class="workout-timer-phase ${timerPhase}">${timerPhase === 'work' ? 'TRABAJO' : 'DESCANSO'}</div>
      <div class="workout-timer-big" id="hiit-timer-value">${timerRemaining}</div>
      <div class="workout-timer-round">Ronda ${currentRound} de ${total}</div>
      <button class="btn btn-ghost btn-sm" data-action="skip-hiit-timer" data-ej="${ejIdx}">Saltar</button>
    </div>
  ` : '';

  // Start button
  const startBtn = !isTimerActive && !allDone ? `
    <button class="btn btn-primary btn-sm workout-start-timer-btn" data-action="start-hiit-timer" data-ej="${ejIdx}">
      ${icon.play || '▶'} ${completadas > 0 ? 'Continuar HIIT' : 'Iniciar HIIT'}
    </button>
  ` : '';

  return `
    <div class="workout-ejercicio animate-in" style="animation-delay:${ejIdx * 60}ms">
      <div class="workout-ejercicio-header">
        <div class="workout-ejercicio-name">${ej.nombre}</div>
        <span class="workout-circuit-type-badge hiit">HIIT</span>
      </div>
      <div class="workout-ejercicio-target">
        ${total} rondas &middot; ${ej.workTime}s work / ${ej.restTime}s rest
      </div>
      <div class="workout-pasada-progress">${completadas}/${total} rondas ${allDone ? icon.check : ''}</div>
      ${timerHtml}
      <div class="workout-vueltas">
        ${roundsHtml}
        <button class="workout-add-vuelta-btn" data-action="add-round" data-ej="${ejIdx}">
          ${icon.plus} Ronda
        </button>
      </div>
      ${startBtn}
    </div>
  `;
}

// ── Timer logic for velocidad/caminata ───────
function startVelocidadTimer(ejIdx, pasadaIdx, params) {
  const circ = state.resultados[state.circuitoActual];
  const ej = circ.ejercicios[ejIdx];
  if (!ej) return;
  const timerType = ej.tipo || 'velocidad';

  clearActiveTimer();
  activeTimer = { type: timerType, ejIdx, phase: 'run', remaining: ej.tiempo, pasadaIdx };

  activeTimerInterval = setInterval(() => {
    activeTimer.remaining--;
    const el = document.getElementById('vel-timer-value');
    if (el) el.textContent = activeTimer.remaining;

    if (activeTimer.remaining <= 3 && activeTimer.remaining > 0) {
      playCountdownTick();
      haptic.heavy();
    }

    if (activeTimer.remaining <= 0) {
      if (activeTimer.phase === 'run') {
        // Mark pasada completed
        ej.pasadas[pasadaIdx].completada = true;
        playFinishBeep();
        haptic.warning();
        saveWorkoutActivo(state);

        // Check if there are more pasadas
        const nextPasada = pasadaIdx + 1;
        if (nextPasada < ej.cantidadPasadas && ej.descanso > 0) {
          // Start rest phase
          activeTimer.phase = 'rest';
          activeTimer.remaining = ej.descanso;
          activeTimer.pasadaIdx = nextPasada;
          reRenderWorkout(params);
        } else {
          // All done or no rest
          clearActiveTimer();
          reRenderWorkout(params);
        }
      } else {
        // Rest phase done, start next run
        playFinishBeep();
        haptic.warning();
        activeTimer.phase = 'run';
        activeTimer.remaining = ej.tiempo;
        reRenderWorkout(params);
      }
    }
  }, 1000);

  reRenderWorkout(params);
}

// ── Timer logic for HIIT ─────────────────────
function startHIITTimer(ejIdx, params) {
  const circ = state.resultados[state.circuitoActual];
  const ej = circ.ejercicios[ejIdx];
  if (!ej) return;

  // Find next incomplete round
  const roundIdx = ej.roundResults.findIndex((r) => !r.completada);
  if (roundIdx < 0) return;

  clearActiveTimer();
  activeTimer = { type: 'hiit', ejIdx, phase: 'work', remaining: ej.workTime, roundIdx };

  activeTimerInterval = setInterval(() => {
    activeTimer.remaining--;
    const el = document.getElementById('hiit-timer-value');
    if (el) el.textContent = activeTimer.remaining;

    if (activeTimer.remaining <= 3 && activeTimer.remaining > 0) {
      playCountdownTick();
      haptic.heavy();
    }

    if (activeTimer.remaining <= 0) {
      if (activeTimer.phase === 'work') {
        // Work done → mark round complete
        ej.roundResults[activeTimer.roundIdx].completada = true;
        playFinishBeep();
        haptic.warning();
        saveWorkoutActivo(state);

        const nextRound = activeTimer.roundIdx + 1;
        if (nextRound < ej.rounds && ej.restTime > 0) {
          // Start rest
          activeTimer.phase = 'rest';
          activeTimer.remaining = ej.restTime;
          activeTimer.roundIdx = nextRound;
          reRenderWorkout(params);
        } else if (nextRound < ej.rounds) {
          // No rest, start next work
          activeTimer.phase = 'work';
          activeTimer.remaining = ej.workTime;
          activeTimer.roundIdx = nextRound;
          reRenderWorkout(params);
        } else {
          // All rounds done
          clearActiveTimer();
          reRenderWorkout(params);
        }
      } else {
        // Rest done → start next work
        playFinishBeep();
        haptic.warning();
        activeTimer.phase = 'work';
        activeTimer.remaining = ej.workTime;
        reRenderWorkout(params);
      }
    }
  }, 1000);

  reRenderWorkout(params);
}

function clearActiveTimer() {
  if (activeTimerInterval) {
    clearInterval(activeTimerInterval);
    activeTimerInterval = null;
  }
  activeTimer = null;
}

function reRenderWorkout(params, { preserveScroll = false } = {}) {
  const container = getWorkoutContainer();
  if (container) {
    const savedScroll = preserveScroll ? window.scrollY : null;
    container.innerHTML = render(params);
    if (savedScroll !== null) {
      requestAnimationFrame(() => window.scrollTo(0, savedScroll));
    }
    scrollToActiveSegment();
  }
}

function renderRestOverlay() {
  const total = REST_STEPS[restStepIdx];
  const pct = restRemaining / total;
  // SVG circle: r=54, circumference = 2*pi*54 ≈ 339.3
  const circumference = 339.3;
  const offset = circumference * (1 - pct);

  return `
    <div class="rest-overlay">
      <div class="rest-overlay-content">
        <div class="rest-overlay-title">Descanso</div>
        <div class="rest-ring-wrap">
          <svg class="rest-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" class="rest-ring-bg"/>
            <circle cx="60" cy="60" r="54" class="rest-ring-progress"
                    style="stroke-dasharray:${circumference};stroke-dashoffset:${offset}"/>
          </svg>
          <span class="rest-timer-value" id="rest-timer-value">${restRemaining}</span>
        </div>
        <div class="rest-step-toggle">
          ${REST_STEPS.map((s, i) => `<button class="rest-step-btn ${i === restStepIdx ? 'active' : ''}" data-action="set-rest-step" data-idx="${i}">${s}s</button>`).join('')}
        </div>
        <button class="btn btn-ghost" data-action="skip-rest" style="margin-top:var(--space-md)">Saltar</button>
      </div>
    </div>
  `;
}

export function render(params) {
  initState(params.id, { date: params.date });
  if (!state) {
    // If state couldn't be initialized (deleted routine, etc.), redirect home
    setTimeout(() => navigate('/'), 0);
    return '<div class="view-loader"><div class="loader"></div></div>';
  }

  const circ = state.resultados[state.circuitoActual];
  const isLast = state.circuitoActual === state.resultados.length - 1;

  // Branch exercise rendering by per-exercise type
  const ejercicios = circ.ejercicios.map((ej, i) => {
    const ejTipo = ej.tipo || 'normal';
    if (ejTipo === 'velocidad' || ejTipo === 'caminata') return renderEjercicioVelocidad(ej, i);
    if (ejTipo === 'hiit') return renderEjercicioHIIT(ej, i);
    return renderEjercicio(ej, i);
  }).join('');

  const lastBanner = isLast
    ? `<div class="workout-last-banner">${icon.trophy} Último circuito</div>`
    : '';

  const finishBtn = isLast
    ? `<button class="btn btn-finish btn-full" data-action="finish">${icon.check} Finalizar</button>`
    : `<button class="btn btn-primary btn-full" data-action="next-circuit">Siguiente ${icon.arrowRight}</button>`;

  const initial = (state.usuario || 'L').charAt(0).toUpperCase();
  const numeroStr = state.rutinaNumero ? formatNumero(state.rutinaNumero, { tipo: state.rutinaTipo, usuario: state.usuario }) : '';

  // Show peso step toggle if any exercise in circuit is normal
  const hasNormalEj = circ.ejercicios.some((ej) => (ej.tipo || 'normal') === 'normal');
  const pesoStepHtml = hasNormalEj ? `
    <div class="peso-step-toggle">
      <span class="peso-step-label">Incremento:</span>
      ${PESO_STEPS.map((s, i) => `<button class="peso-step-btn ${i === pesoStepIdx ? 'active' : ''}" data-action="set-peso-step" data-idx="${i}">${s}kg</button>`).join('')}
    </div>
  ` : '';

  return `
    <div class="workout-header">
      <span class="workout-avatar-mini">${initial}</span>
      <div class="workout-header-left">
        <div class="workout-rutina-name">${state.rutinaNombre}${numeroStr ? `<span class="workout-rutina-numero">${numeroStr}</span>` : ''}</div>
        <div class="workout-timer" id="workout-timer">${icon.clock}${getElapsedStr()}</div>
      </div>
      <button class="workout-end-btn" data-action="end-workout">Salir</button>
    </div>

    ${renderCircuitSelector()}

    ${lastBanner}

    ${ejercicios}

    ${state.editMode ? `
      <button class="workout-add-ej-btn" data-action="add-exercise-to-circuit">
        ${icon.plus} Agregar ejercicio
      </button>
      ${state.resultados.length > 1
        ? `<button class="workout-remove-circuit-btn" data-action="remove-circuit">
             ${icon.trash} Quitar circuito
           </button>`
        : ''}
    ` : ''}

    ${pesoStepHtml}

    <div class="workout-bottom-spacer"></div>

    <div class="workout-nav-btns">
      ${state.circuitoActual > 0 ? `<button class="btn btn-ghost workout-prev-btn" data-action="prev-circuit">${icon.chevronLeft} Ant</button>` : ''}
      ${finishBtn}
    </div>
  `;
}

function syncInputs() {
  if (!state) return;
  const circ = state.resultados[state.circuitoActual];

  // Sync per-round stepper values (normal exercises only)
  document.querySelectorAll('.stepper-value').forEach((input) => {
    const ejIdx = parseInt(input.dataset.ej);
    const vueltaIdx = input.dataset.vuelta != null ? parseInt(input.dataset.vuelta) : null;
    const field = input.dataset.field;
    const ej = circ.ejercicios[ejIdx];
    if (!ej) return;

    const val = parseFloat(input.value) || 0;
    if (vueltaIdx != null && ej.vueltas[vueltaIdx]) {
      ej.vueltas[vueltaIdx][field] = val;
    }
  });

  // Sync vest checkbox and peso
  document.querySelectorAll('.workout-vest-checkbox').forEach((cb) => {
    const ejIdx = parseInt(cb.dataset.ej);
    if (circ.ejercicios[ejIdx]) {
      circ.ejercicios[ejIdx].chaleco = cb.checked;
    }
  });

  document.querySelectorAll('.workout-vest-input').forEach((input) => {
    const ejIdx = parseInt(input.dataset.ej);
    if (circ.ejercicios[ejIdx]) {
      circ.ejercicios[ejIdx].pesoChalecoKg = parseFloat(input.value) || 0;
    }
  });

  saveWorkoutActivo(state);
}

function doFinishWorkout() {
  syncInputs();

  const start = new Date(state.inicioISO);
  const duracionMin = Math.round((Date.now() - start.getTime()) / 60000);

  const sesion = {
    id: generateId(),
    rutinaId: state.rutinaId,
    rutinaNombre: state.rutinaNombre,
    usuario: state.usuario || getUsuarioActivo(),
    fecha: state.inicioISO,
    duracionMin,
    circuitos: state.resultados,
  };

  // Show calories prompt before saving
  showCaloriesPrompt((calorias) => {
    if (calorias > 0) sesion.calorias = calorias;
    saveSesion(sesion);
    clearWorkoutActivo();
    stopTimer();
    if (_removePopGuard) _removePopGuard();
    const sesionId = sesion.id;
    state = null;
    navigate(`/summary/${sesionId}`);
  });
}

function showCaloriesPrompt(onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-title">Calorías quemadas</div>
      <div class="modal-body">
        <div class="field" style="margin-bottom:0">
          <input type="number" class="input" id="cal-input" inputmode="numeric"
                 placeholder="Ej: 350" min="0" style="font-size:var(--text-xl);text-align:center">
          <span style="font-size:var(--text-xs);color:var(--color-text-muted);text-align:center;display:block;margin-top:var(--space-xs)">kcal (opcional)</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-cal-action="skip">Omitir</button>
        <button class="btn btn-primary" data-cal-action="save">Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Focus input
  requestAnimationFrame(() => {
    const input = overlay.querySelector('#cal-input');
    if (input) input.focus();
  });

  let calClosed = false;
  const close = (cb) => {
    if (calClosed) return;
    calClosed = true;
    overlay.classList.add('modal-closing');
    let doneCalled = false;
    const done = () => {
      if (doneCalled) return;
      doneCalled = true;
      if (overlay.parentNode) overlay.remove();
      if (cb) cb();
    };
    overlay.addEventListener('animationend', done, { once: true });
    setTimeout(done, 250);
  };

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cal-action]');
    if (e.target === overlay) {
      close(() => onDone(0));
      return;
    }
    if (!btn) return;
    const input = overlay.querySelector('#cal-input');
    const val = parseInt(input?.value) || 0;
    if (btn.dataset.calAction === 'save') {
      close(() => onDone(val));
    } else {
      close(() => onDone(0));
    }
  });

  // Enter key submits
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const input = overlay.querySelector('#cal-input');
      const val = parseInt(input?.value) || 0;
      close(() => onDone(val));
    }
  });
}

function applyModificationsToRutina() {
  const rutina = getRutinaById(state.rutinaId);
  if (!rutina) return;
  // Update circuits/exercises from workout state (exercise-level types)
  rutina.circuitos = state.resultados.map((circ) => ({
    grupoMuscular: circ.grupoMuscular,
    ejercicios: circ.ejercicios.map((ej) => {
      const ejTipo = ej.tipo || 'normal';
      const base = { nombre: ej.nombre, tipo: ejTipo };
      if (ejTipo === 'velocidad' || ejTipo === 'caminata') {
        return { ...base, velocidad: ej.velocidad, tiempo: ej.tiempo, descanso: ej.descanso, cantidadPasadas: ej.cantidadPasadas };
      }
      if (ejTipo === 'hiit') {
        return { ...base, workTime: ej.workTime, restTime: ej.restTime, rounds: ej.rounds };
      }
      return { ...base, series: ej.vueltas.map((v) => ({ reps: v.repsReal, pesoKg: v.pesoRealKg })) };
    }),
  }));
  saveRutina(rutina);
}

function finishWorkout() {
  syncInputs();
  if (!state.modified) {
    doFinishWorkout();
    return;
  }

  // Show save options modal
  const existing = document.getElementById('workout-save-modal');
  if (existing) existing.remove();

  const numero = state.rutinaNumero ? formatNumero(state.rutinaNumero, { tipo: state.rutinaTipo, usuario: state.usuario }) : '';
  const overlay = document.createElement('div');
  overlay.id = 'workout-save-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-title">Rutina modificada</div>
      <div class="modal-body">Hiciste cambios en los ejercicios. ¿Querés actualizar la rutina?</div>
      <div class="modal-actions-vertical">
        <button class="btn btn-primary btn-full" data-save-action="update">Guardar en rutina ${numero}</button>
        <button class="btn btn-ghost btn-full" data-save-action="duplicate">Guardar como nueva rutina</button>
        <button class="btn btn-ghost btn-full" data-save-action="skip">No guardar cambios</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let closed = false;
  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-save-action]');
    if (e.target === overlay) return; // don't dismiss by backdrop
    if (!btn) return;
    if (closed) return;
    closed = true;

    const action = btn.dataset.saveAction;
    overlay.classList.add('modal-closing');
    let doneCalled = false;
    const done = () => {
      if (doneCalled) return;
      doneCalled = true;
      if (overlay.parentNode) overlay.remove();
      switch (action) {
        case 'update':
          applyModificationsToRutina();
          doFinishWorkout();
          break;
        case 'duplicate': {
          const copia = duplicateRutina(state.rutinaId);
          if (copia) {
            copia.circuitos = state.resultados.map((circ) => ({
              grupoMuscular: circ.grupoMuscular,
              ejercicios: circ.ejercicios.map((ej) => {
                const ejTipo = ej.tipo || 'normal';
                const base = { nombre: ej.nombre, tipo: ejTipo };
                if (ejTipo === 'velocidad' || ejTipo === 'caminata') {
                  return { ...base, velocidad: ej.velocidad, tiempo: ej.tiempo, descanso: ej.descanso, cantidadPasadas: ej.cantidadPasadas };
                }
                if (ejTipo === 'hiit') {
                  return { ...base, workTime: ej.workTime, restTime: ej.restTime, rounds: ej.rounds };
                }
                return { ...base, series: ej.vueltas?.map((v) => ({ reps: v.repsReal, pesoKg: v.pesoRealKg })) || [] };
              }),
            }));
            saveRutina(copia);
          }
          doFinishWorkout();
          break;
        }
        case 'skip':
          doFinishWorkout();
          break;
      }
    };
    overlay.addEventListener('animationend', done, { once: true });
    setTimeout(done, 250);
  });
}

// ── Rest timer ─────────────────────────────

function showRestTimer(app, params) {
  restRemaining = REST_STEPS[restStepIdx];

  // Insert overlay
  const overlay = document.createElement('div');
  overlay.id = 'rest-overlay-container';
  overlay.innerHTML = renderRestOverlay();
  app.appendChild(overlay);

  const circumference = 339.3;

  restInterval = setInterval(() => {
    restRemaining--;
    const valueEl = document.getElementById('rest-timer-value');
    const ring = document.querySelector('.rest-ring-progress');
    if (valueEl) valueEl.textContent = restRemaining;
    if (ring) {
      const total = REST_STEPS[restStepIdx];
      const pct = restRemaining / total;
      ring.style.strokeDashoffset = circumference * (1 - pct);
    }

    // Subtle haptic tick each second
    if (restRemaining > 3) haptic.light();

    // Countdown feedback: tick + vibrate at 3, 2, 1
    if (restRemaining > 0 && restRemaining <= 3) {
      playCountdownTick();
      haptic.heavy();
    }

    if (restRemaining <= 0) {
      playFinishBeep();
      haptic.warning();
      completeRest(app, params);
    }
  }, 1000);
}

function completeRest(app, params) {
  if (restInterval) {
    clearInterval(restInterval);
    restInterval = null;
  }
  const overlay = document.getElementById('rest-overlay-container');
  if (overlay) overlay.remove();

  // Now advance circuit and re-render
  state.circuitoActual++;
  saveWorkoutActivo(state);
  transitionCircuit(getWorkoutContainer(), params, 'next');
}

// ── Timers ─────────────────────────────────

function startTimer() {
  timerInterval = setInterval(() => {
    const el = document.getElementById('workout-timer');
    if (el) el.textContent = getElapsedStr();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (restInterval) {
    clearInterval(restInterval);
    restInterval = null;
  }
  clearActiveTimer();
}

// ── Stepper action (extracted for long-press reuse) ──

function stepperAction(btn, action) {
  const ejIdx = parseInt(btn.dataset.ej);
  const vueltaIdx = btn.dataset.vuelta;
  const field = btn.dataset.field;

  let selector = `.stepper-value[data-ej="${ejIdx}"][data-field="${field}"]`;
  if (vueltaIdx != null) {
    selector += `[data-vuelta="${vueltaIdx}"]`;
  }

  const input = document.querySelector(selector);
  if (!input) return;
  const step = field === 'pesoRealKg' ? PESO_STEPS[pesoStepIdx] : 1;
  let val = parseFloat(input.value) || 0;
  val = action === 'inc' ? val + step : Math.max(0, val - step);
  input.value = val;
  haptic.medium();
  input.classList.remove('value-bump');
  void input.offsetWidth;
  input.classList.add('value-bump');
  syncInputs();
}

function clearLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  if (longPressInterval) { clearInterval(longPressInterval); longPressInterval = null; }
}

function getWorkoutContainer() {
  return document.querySelector('#view-container .other-view') || document.getElementById('app');
}

function transitionCircuit(container, params, direction) {
  const exitClass = direction === 'next' ? 'circuit-exit-left' : 'circuit-exit-right';
  const enterClass = direction === 'next' ? 'circuit-enter-right' : 'circuit-enter-left';

  expandedEjs.clear(); // Reset collapse state for new circuit
  container.classList.add(exitClass);
  container.addEventListener('animationend', () => {
    container.classList.remove(exitClass);
    container.innerHTML = render(params);
    container.classList.add(enterClass);
    container.addEventListener('animationend', () => {
      container.classList.remove(enterClass);
    }, { once: true });
  }, { once: true });
}

// showMuscleGroupChooser removed — grupos auto-derived from exercises

// ── Exit workout modal (3-option) ─────────

function showExitWorkoutModal() {
  const existing = document.getElementById('workout-exit-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'workout-exit-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-title">¿Qué querés hacer?</div>
      <div class="modal-actions-vertical">
        <button class="btn btn-primary btn-full" data-exit-action="resume">Volver al entrenamiento</button>
        <button class="btn btn-ghost btn-full" data-exit-action="pause">${icon.pause} Pausar y navegar</button>
        <button class="btn btn-ghost btn-full" data-exit-action="finish">${icon.check} Finalizar y guardar</button>
        <button class="btn btn-ghost btn-full workout-exit-discard" data-exit-action="discard">Descartar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let closed = false;
  const close = (cb) => {
    if (closed) return;
    closed = true;
    overlay.classList.add('modal-closing');
    let doneCalled = false;
    const done = () => {
      if (doneCalled) return;
      doneCalled = true;
      if (overlay.parentNode) overlay.remove();
      if (cb) cb();
    };
    overlay.addEventListener('animationend', done, { once: true });
    setTimeout(done, 250);
  };

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-exit-action]');
    if (e.target === overlay) {
      close(); // backdrop click → resume
      return;
    }
    if (!btn) return;
    switch (btn.dataset.exitAction) {
      case 'resume':
        close();
        break;
      case 'pause':
        close(() => {
          // Save current state and pause timer, but keep workout in localStorage
          saveWorkoutActivo(state);
          stopTimer();
          if (_removePopGuard) _removePopGuard();
          navigate('/');
        });
        break;
      case 'finish':
        close(() => finishWorkout());
        break;
      case 'discard':
        close(() => {
          clearWorkoutActivo();
          stopTimer();
          if (_removePopGuard) _removePopGuard();
          state = null;
          navigate('/');
        });
        break;
    }
  });
}

// ── Auto-scroll circuit selector ──────────
function scrollToActiveSegment() {
  const selector = document.getElementById('circuit-selector');
  if (!selector) return;
  const active = selector.querySelector('.circuit-seg.current');
  if (active) {
    active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

export function mount(params) {
  if (!state) return () => {}; // Guard: render failed, cleanup is a no-op
  startTimer();
  const app = document.getElementById('app');

  // ── Workout exit guard (popstate for Android back btn) ──
  const guardHash = location.hash;
  history.pushState({ workoutGuard: true }, '', guardHash);
  window.__workoutActive = true;

  const handlePopState = () => {
    // Re-push guard to prevent actual back navigation
    history.pushState({ workoutGuard: true }, '', guardHash);
    showExitWorkoutModal();
  };
  window.addEventListener('popstate', handlePopState);

  // Expose a way to remove the guard before navigating away
  _removePopGuard = () => {
    window.removeEventListener('popstate', handlePopState);
    window.__workoutActive = false;
    _removePopGuard = null;
  };

  // Auto-scroll selector on mount
  requestAnimationFrame(() => scrollToActiveSegment());

  // ── Swipe between circuits ──────────────
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeTracking = false;

  const handleTouchStart = (e) => {
    // Don't track if rest overlay is showing
    if (document.querySelector('.rest-overlay')) return;

    const touch = e.touches[0];
    // Exclude left edge zone (<35px) to avoid conflict with swipe-back
    if (touch.clientX < 35) return;
    // Exclude interactive elements: steppers, inputs, buttons
    const target = e.target;
    if (target.closest('.stepper-btn, .stepper-value, input, button, .workout-vest-toggle, .workout-add-peso-btn')) return;

    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
    swipeTracking = true;
  };

  const handleTouchMove = () => {
    // Passive — just tracking
  };

  const handleTouchEnd = (e) => {
    if (!swipeTracking) return;
    swipeTracking = false;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - swipeStartX;
    const dy = Math.abs(touch.clientY - swipeStartY);

    // Must be horizontal: |dx| > 60 and |dy| < 50
    if (Math.abs(dx) < 60 || dy > 50) return;

    if (dx < 0 && state.circuitoActual < state.resultados.length - 1) {
      // Swipe left → next circuit
      syncInputs();
      state.circuitoActual++;
      saveWorkoutActivo(state);
      haptic.light();
      transitionCircuit(getWorkoutContainer(), params, 'next');
      setTimeout(scrollToActiveSegment, 300);
    } else if (dx > 0 && state.circuitoActual > 0) {
      // Swipe right → prev circuit
      syncInputs();
      state.circuitoActual--;
      saveWorkoutActivo(state);
      haptic.light();
      transitionCircuit(getWorkoutContainer(), params, 'prev');
      setTimeout(scrollToActiveSegment, 300);
    }
  };

  app.addEventListener('touchstart', handleTouchStart, { passive: true });
  app.addEventListener('touchmove', handleTouchMove, { passive: true });
  app.addEventListener('touchend', handleTouchEnd, { passive: true });

  // ── Click handler ──────────────────────
  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;

    switch (action) {
      case 'inc':
      case 'dec': {
        stepperAction(btn, action);
        break;
      }

      case 'show-detail': {
        const nombre = btn.dataset.nombre;
        if (nombre) showExerciseDetail(nombre, {
          onSave: () => reRenderWorkout(params, { preserveScroll: true }),
        });
        break;
      }

      case 'replace-exercise': {
        syncInputs();
        const ejIdx = parseInt(btn.dataset.ej);
        const circ = state.resultados[state.circuitoActual];
        showExercisePickerModal({
          grupoMuscular: null, // show ALL exercises
          onSelect: (nombre) => {
            // Replace with correct template (normal/cardio/hiit)
            circ.ejercicios[ejIdx] = crearEjercicioWorkout(nombre);
            circ.grupoMuscular = autoGruposFromEjercicios(circ);
            state.modified = true;
            saveWorkoutActivo(state);
            haptic.medium();
            reRenderWorkout(params, { preserveScroll: true });
          },
        });
        break;
      }

      case 'goto-circuit': {
        const idx = parseInt(btn.dataset.idx);
        if (idx >= 0 && idx < state.resultados.length && idx !== state.circuitoActual) {
          syncInputs();
          const direction = idx > state.circuitoActual ? 'next' : 'prev';
          state.circuitoActual = idx;
          saveWorkoutActivo(state);
          haptic.light();
          transitionCircuit(getWorkoutContainer(), params, direction);
          setTimeout(scrollToActiveSegment, 300);
        }
        break;
      }

      case 'toggle-ej-expand': {
        const ejIdx = parseInt(btn.dataset.ej);
        const body = document.querySelector(`[data-ej-body="${ejIdx}"]`);
        const summary = document.querySelector(`[data-ej-summary="${ejIdx}"]`);
        const toggle = document.querySelector(`.workout-ej-toggle[data-ej="${ejIdx}"]`);

        if (expandedEjs.has(ejIdx)) {
          expandedEjs.delete(ejIdx);
          if (body) body.style.display = 'none';
          if (summary) summary.style.display = '';
          if (toggle) toggle.classList.remove('expanded');
        } else {
          expandedEjs.add(ejIdx);
          if (body) body.style.display = '';
          if (summary) summary.style.display = 'none';
          if (toggle) toggle.classList.add('expanded');
        }
        haptic.light();
        break;
      }

      case 'toggle-vuelta-done': {
        const ejIdx = parseInt(btn.dataset.ej);
        const vIdx = parseInt(btn.dataset.vuelta);
        const circ = state.resultados[state.circuitoActual];
        const ej = circ?.ejercicios[ejIdx];
        if (ej?.vueltas[vIdx]) {
          ej.vueltas[vIdx].done = !ej.vueltas[vIdx].done;
          haptic.medium();
          saveWorkoutActivo(state);
          // Update visual in place
          const row = btn.closest('.workout-vuelta-row');
          if (row) {
            row.classList.toggle('workout-vuelta-done');
            btn.innerHTML = ej.vueltas[vIdx].done ? icon.checkCircle : icon.circle;
          }
          // Update collapsed summary
          const summaryEl = document.querySelector(`[data-ej-summary="${ejIdx}"]`);
          if (summaryEl) {
            const meta = getEjercicioMeta(ej.nombre);
            const totalV = ej.vueltas.length;
            const doneCount = ej.vueltas.filter((v) => v.done).length;
            const parts = [`${totalV} series`];
            if (ej.vueltas[0]) parts.push(`${ej.vueltas[0].repsReal} rep`);
            const showPeso = ej.pesoObjetivoKg !== 0 || meta.usaPeso;
            if (showPeso && ej.vueltas[0]) parts.push(`${ej.vueltas[0].pesoRealKg} kg`);
            if (doneCount > 0) parts.push(`${doneCount}/${totalV} ✓`);
            summaryEl.textContent = parts.join(' · ');
          }
        }
        break;
      }

      case 'check-all-vueltas': {
        syncInputs();
        const ejIdx = parseInt(btn.dataset.ej);
        const circ = state.resultados[state.circuitoActual];
        const ej = circ?.ejercicios[ejIdx];
        if (ej) {
          const allDone = ej.vueltas.every((v) => v.done);
          // Toggle: if all done → uncheck all, otherwise check all
          for (const v of ej.vueltas) v.done = !allDone;
          saveWorkoutActivo(state);
          haptic.medium();
          reRenderWorkout(params, { preserveScroll: true });
        }
        break;
      }

      case 'add-vuelta': {
        syncInputs();
        const ejIdx = parseInt(btn.dataset.ej);
        const circ = state.resultados[state.circuitoActual];
        const ej = circ?.ejercicios[ejIdx];
        if (ej) {
          const last = ej.vueltas[ej.vueltas.length - 1];
          ej.vueltas.push({ repsReal: last.repsReal, pesoRealKg: last.pesoRealKg, done: false });
          saveWorkoutActivo(state);
          haptic.light();
          reRenderWorkout(params, { preserveScroll: true });
        }
        break;
      }

      case 'remove-vuelta': {
        syncInputs();
        const ejIdx = parseInt(btn.dataset.ej);
        const vIdx = parseInt(btn.dataset.vuelta);
        const circ = state.resultados[state.circuitoActual];
        const ej = circ?.ejercicios[ejIdx];
        if (ej && ej.vueltas.length > 1) {
          ej.vueltas.splice(vIdx, 1);
          saveWorkoutActivo(state);
          haptic.medium();
          reRenderWorkout(params, { preserveScroll: true });
        }
        break;
      }

      case 'toggle-peso': {
        const ejIdx = parseInt(btn.dataset.ej);
        const circ = state.resultados[state.circuitoActual];
        const ej = circ?.ejercicios[ejIdx];
        if (ej) {
          ej.addedPeso = !ej.addedPeso;
          saveWorkoutActivo(state);
          haptic.medium();
          reRenderWorkout(params, { preserveScroll: true });
        }
        break;
      }

      case 'prev-circuit':
        if (state.circuitoActual > 0) {
          syncInputs();
          state.circuitoActual--;
          saveWorkoutActivo(state);
          transitionCircuit(getWorkoutContainer(), params, 'prev');
          setTimeout(scrollToActiveSegment, 300);
        }
        break;

      case 'next-circuit':
        syncInputs();
        state.circuitoActual++;
        saveWorkoutActivo(state);
        transitionCircuit(getWorkoutContainer(), params, 'next');
        setTimeout(scrollToActiveSegment, 300);
        break;

      case 'skip-rest':
        completeRest(app, params);
        break;

      case 'set-rest-step': {
        const idx = parseInt(btn.dataset.idx);
        if (idx >= 0 && idx < REST_STEPS.length) {
          restStepIdx = idx;
          restRemaining = REST_STEPS[idx];
          // Update UI
          const valueEl = document.getElementById('rest-timer-value');
          if (valueEl) valueEl.textContent = restRemaining;
          document.querySelectorAll('.rest-step-btn').forEach((b, i) => {
            b.classList.toggle('active', i === idx);
          });
          // Reset ring
          const ring = document.querySelector('.rest-ring-progress');
          if (ring) {
            ring.style.strokeDashoffset = '0';
          }
          // Restart timer
          if (restInterval) clearInterval(restInterval);
          const circumference = 339.3;
          restInterval = setInterval(() => {
            restRemaining--;
            const ve = document.getElementById('rest-timer-value');
            const rr = document.querySelector('.rest-ring-progress');
            if (ve) ve.textContent = restRemaining;
            if (rr) {
              const pct = restRemaining / REST_STEPS[restStepIdx];
              rr.style.strokeDashoffset = circumference * (1 - pct);
            }
            if (restRemaining > 3) haptic.light();
            if (restRemaining > 0 && restRemaining <= 3) {
              playCountdownTick();
              haptic.heavy();
            }
            if (restRemaining <= 0) {
              playFinishBeep();
              haptic.warning();
              completeRest(app, params);
            }
          }, 1000);
        }
        break;
      }

      case 'finish':
        showModal({
          title: 'Finalizar entrenamiento',
          body: 'Se guardará esta sesión en tu historial.',
          confirmText: 'Finalizar',
          onConfirm: () => finishWorkout(),
        });
        break;

      case 'set-peso-step': {
        const idx = parseInt(btn.dataset.idx);
        if (idx >= 0 && idx < PESO_STEPS.length) {
          pesoStepIdx = idx;
          document.querySelectorAll('.peso-step-btn').forEach((b, i) => {
            b.classList.toggle('active', i === idx);
          });
        }
        break;
      }

      case 'end-workout':
        showExitWorkoutModal();
        break;

      // ── Velocidad/Caminata timer actions ──
      case 'start-vel-timer': {
        const ejIdx = parseInt(btn.dataset.ej);
        const pasadaIdx = parseInt(btn.dataset.pasada);
        startVelocidadTimer(ejIdx, pasadaIdx, params);
        break;
      }

      case 'skip-vel-timer': {
        const circ2 = state.resultados[state.circuitoActual];
        if (activeTimer && (activeTimer.type === 'velocidad' || activeTimer.type === 'caminata')) {
          const ej = circ2.ejercicios[activeTimer.ejIdx];
          if (activeTimer.phase === 'run' && ej) {
            ej.pasadas[activeTimer.pasadaIdx].completada = true;
            saveWorkoutActivo(state);
          }
          clearActiveTimer();
          reRenderWorkout(params);
        }
        break;
      }

      case 'toggle-pasada': {
        const ejIdx3 = parseInt(btn.dataset.ej);
        const pIdx = parseInt(btn.dataset.pasada);
        const circ3 = state.resultados[state.circuitoActual];
        const ej3 = circ3?.ejercicios[ejIdx3];
        if (ej3?.pasadas[pIdx]) {
          ej3.pasadas[pIdx].completada = !ej3.pasadas[pIdx].completada;
          haptic.medium();
          saveWorkoutActivo(state);
          reRenderWorkout(params);
        }
        break;
      }

      // ── HIIT timer actions ──
      case 'start-hiit-timer': {
        const ejIdx4 = parseInt(btn.dataset.ej);
        startHIITTimer(ejIdx4, params);
        break;
      }

      case 'skip-hiit-timer': {
        const circ4 = state.resultados[state.circuitoActual];
        if (activeTimer && activeTimer.type === 'hiit') {
          const ej4 = circ4.ejercicios[activeTimer.ejIdx];
          if (activeTimer.phase === 'work' && ej4) {
            ej4.roundResults[activeTimer.roundIdx].completada = true;
            saveWorkoutActivo(state);
          }
          clearActiveTimer();
          reRenderWorkout(params);
        }
        break;
      }

      case 'toggle-hiit-round': {
        const ejIdx5 = parseInt(btn.dataset.ej);
        const rIdx = parseInt(btn.dataset.round);
        const circ5 = state.resultados[state.circuitoActual];
        const ej5 = circ5?.ejercicios[ejIdx5];
        if (ej5?.roundResults[rIdx]) {
          ej5.roundResults[rIdx].completada = !ej5.roundResults[rIdx].completada;
          haptic.medium();
          saveWorkoutActivo(state);
          reRenderWorkout(params);
        }
        break;
      }

      case 'add-pasada': {
        const ejIdx6 = parseInt(btn.dataset.ej);
        const circ6 = state.resultados[state.circuitoActual];
        const ej6 = circ6?.ejercicios[ejIdx6];
        if (ej6?.pasadas) {
          ej6.pasadas.push({ completada: false, tiempoReal: ej6.tiempo });
          ej6.cantidadPasadas = Math.max(ej6.cantidadPasadas || 0, ej6.pasadas.length);
          state.modified = true;
          saveWorkoutActivo(state);
          haptic.light();
          reRenderWorkout(params);
        }
        break;
      }

      case 'add-round': {
        const ejIdx7 = parseInt(btn.dataset.ej);
        const circ7 = state.resultados[state.circuitoActual];
        const ej7 = circ7?.ejercicios[ejIdx7];
        if (ej7?.roundResults) {
          ej7.roundResults.push({ completada: false });
          ej7.rounds = Math.max(ej7.rounds || 0, ej7.roundResults.length);
          state.modified = true;
          saveWorkoutActivo(state);
          haptic.light();
          reRenderWorkout(params);
        }
        break;
      }

      case 'toggle-edit-mode': {
        syncInputs();
        state.editMode = true;
        saveWorkoutActivo(state);
        haptic.light();
        reRenderWorkout(params, { preserveScroll: true });
        break;
      }

      case 'confirm-edit': {
        syncInputs();
        state.editMode = false;
        state.modified = true;
        saveWorkoutActivo(state);
        haptic.medium();
        reRenderWorkout(params, { preserveScroll: true });
        break;
      }

      case 'add-exercise-to-circuit': {
        syncInputs();
        const circ = state.resultados[state.circuitoActual];
        showExercisePickerModal({
          grupoMuscular: null,
          onSelect: (nombre) => {
            circ.ejercicios.push(crearEjercicioWorkout(nombre));
            circ.grupoMuscular = autoGruposFromEjercicios(circ);
            state.modified = true;
            saveWorkoutActivo(state);
            haptic.medium();
            reRenderWorkout(params, { preserveScroll: true });
          },
        });
        break;
      }

      case 'remove-exercise': {
        syncInputs();
        const ejIdx = parseInt(btn.dataset.ej);
        const circ2 = state.resultados[state.circuitoActual];
        if (circ2 && circ2.ejercicios.length > 1) {
          const removed = circ2.ejercicios.splice(ejIdx, 1)[0];
          circ2.grupoMuscular = autoGruposFromEjercicios(circ2);
          state.modified = true;
          saveWorkoutActivo(state);
          haptic.medium();
          reRenderWorkout(params, { preserveScroll: true });
          // Show undo toast
          import('@js/components/toast.js').then(({ showToastAction }) => {
            showToastAction('Ejercicio eliminado', 'Deshacer', () => {
              circ2.ejercicios.splice(ejIdx, 0, removed);
              circ2.grupoMuscular = autoGruposFromEjercicios(circ2);
              saveWorkoutActivo(state);
              reRenderWorkout(params, { preserveScroll: true });
            }, { duration: 5000 });
          });
        }
        break;
      }

      case 'add-circuit': {
        syncInputs();
        showExercisePickerModal({
          grupoMuscular: null, // show ALL exercises
          onSelect: (nombre) => {
            const newCirc = {
              grupoMuscular: [],
              ejercicios: [crearEjercicioWorkout(nombre)],
            };
            // Auto-derive grupo from selected exercise
            const derived = autoGruposFromEjercicios(newCirc);
            if (derived.length > 0) newCirc.grupoMuscular = derived;
            state.resultados.push(newCirc);
            state.modified = true;
            state.circuitoActual = state.resultados.length - 1;
            saveWorkoutActivo(state);
            haptic.medium();
            const container = getWorkoutContainer();
            container.innerHTML = render(params);
            scrollToActiveSegment();
          },
        });
        break;
      }

      case 'remove-circuit': {
        if (state.resultados.length <= 1) break;
        showModal({
          title: 'Quitar circuito',
          body: `¿Eliminar el circuito ${state.circuitoActual + 1} (${Array.isArray(state.resultados[state.circuitoActual].grupoMuscular) ? state.resultados[state.circuitoActual].grupoMuscular.join(', ') : state.resultados[state.circuitoActual].grupoMuscular})?`,
          confirmText: 'Eliminar',
          danger: true,
          onConfirm: () => {
            syncInputs();
            state.resultados.splice(state.circuitoActual, 1);
            if (state.circuitoActual >= state.resultados.length) {
              state.circuitoActual = state.resultados.length - 1;
            }
            state.modified = true;
            saveWorkoutActivo(state);
            haptic.medium();
            const container = getWorkoutContainer();
            container.innerHTML = render(params);
            scrollToActiveSegment();
          },
        });
        break;
      }
    }
  };

  const handleChange = (e) => {
    if (e.target.matches('.stepper-value')) {
      syncInputs();
    }
    if (e.target.matches('.workout-vest-checkbox')) {
      const vestPeso = e.target.closest('.workout-vest-row')?.querySelector('.workout-vest-peso');
      if (vestPeso) vestPeso.classList.toggle('hidden', !e.target.checked);
      syncInputs();
    }
    if (e.target.matches('.workout-vest-input')) {
      syncInputs();
    }
  };

  // Long-press repeat for stepper buttons
  const handlePointerDown = (e) => {
    const btn = e.target.closest('.stepper-btn[data-action]');
    if (!btn) return;
    clearLongPress();
    const action = btn.dataset.action;
    longPressTimer = setTimeout(() => {
      longPressInterval = setInterval(() => stepperAction(btn, action), 120);
    }, 350);
  };

  const handlePointerUp = () => clearLongPress();

  app.addEventListener('click', handleClick);
  app.addEventListener('change', handleChange);
  app.addEventListener('pointerdown', handlePointerDown);
  app.addEventListener('pointerup', handlePointerUp);
  app.addEventListener('pointercancel', handlePointerUp);

  return () => {
    app.removeEventListener('click', handleClick);
    app.removeEventListener('change', handleChange);
    app.removeEventListener('pointerdown', handlePointerDown);
    app.removeEventListener('pointerup', handlePointerUp);
    app.removeEventListener('pointercancel', handlePointerUp);
    app.removeEventListener('touchstart', handleTouchStart);
    app.removeEventListener('touchmove', handleTouchMove);
    app.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('popstate', handlePopState);
    window.__workoutActive = false;
    clearLongPress();
    stopTimer();
    // Remove any workout-specific modals
    ['workout-exit-modal', 'workout-save-modal', 'muscle-group-modal'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  };
}
