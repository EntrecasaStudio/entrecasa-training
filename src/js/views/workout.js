import { getRutinaById, getWorkoutActivo, saveWorkoutActivo, clearWorkoutActivo, saveSesion, getUltimaSesionDeRutina, getUsuarioActivo } from '@/store.js';
import { generateId } from '@/id.js';
import { navigate } from '@/router.js';
import { showModal } from '@js/components/modal.js';
import { playCountdownTick, playFinishBeep } from '@js/helpers/audio.js';
import { getExerciseProgressData } from '@js/helpers/stats-helpers.js';
import { haptic } from '@js/helpers/haptics.js';
import { showExerciseDetail } from '@js/helpers/ejercicio-detail.js';
import { icon } from '@js/icons.js';

let state = null;
let timerInterval = null;
let restInterval = null;
let restRemaining = 0;
const PESO_STEPS = [1, 2.5, 5];
const REST_STEPS = [60, 90, 120];
const NUM_VUELTAS = 3;
let pesoStepIdx = 1; // default 2.5
let restStepIdx = 1; // default 90s
let longPressTimer = null;
let longPressInterval = null;

function initState(rutinaId) {
  const activo = getWorkoutActivo();
  if (activo && activo.rutinaId === rutinaId) {
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
          // Old format: replicate single value into all rounds
          lastMap[e.nombre] = {
            vueltas: Array.from({ length: NUM_VUELTAS }, () => ({
              repsReal: e.repsReal,
              pesoRealKg: e.pesoRealKg,
            })),
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
    usuario: rutina.usuario || getUsuarioActivo(),
    inicioISO: new Date().toISOString(),
    circuitoActual: 0,
    resultados: rutina.circuitos.map((circ) => ({
      grupoMuscular: circ.grupoMuscular,
      ejercicios: circ.ejercicios.map((ej) => {
        const prev = lastMap[ej.nombre];
        const defaultVueltas = Array.from({ length: NUM_VUELTAS }, () => ({
          repsReal: ej.repsObjetivo,
          pesoRealKg: ej.pesoKg,
        }));

        // If prev has fewer rounds than NUM_VUELTAS, pad with last round values
        let vueltas = defaultVueltas;
        if (prev) {
          vueltas = Array.from({ length: NUM_VUELTAS }, (_, i) => {
            const src = prev.vueltas[i] || prev.vueltas[prev.vueltas.length - 1];
            return { repsReal: src.repsReal, pesoRealKg: src.pesoRealKg };
          });
        }

        return {
          nombre: ej.nombre,
          repsObjetivo: ej.repsObjetivo,
          pesoObjetivoKg: ej.pesoKg,
          chaleco: prev ? prev.chaleco : false,
          pesoChalecoKg: prev ? prev.pesoChalecoKg : 0,
          vueltas,
        };
      }),
    })),
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

function renderProgressBar() {
  const total = state.resultados.length;
  const pct = (state.circuitoActual / total) * 100;

  const dots = state.resultados
    .map((_, i) => {
      let cls = 'workout-progress-dot';
      if (i < state.circuitoActual) cls += ' done';
      else if (i === state.circuitoActual) cls += ' current';
      return `<span class="${cls}"></span>`;
    })
    .join('');

  return `
    <div class="workout-progress-bar-wrap">
      <div class="workout-progress-bar">
        <div class="workout-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="workout-progress-dots">${dots}</div>
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
  const isBodyweight = ej.pesoObjetivoKg === 0;

  // Vest toggle
  const vestHtml = `
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
  `;

  // Column headers
  const columnHeaders = `
    <div class="workout-vuelta-headers">
      <span class="workout-vuelta-header-spacer"></span>
      <span class="workout-vuelta-header">Reps</span>
      ${isBodyweight ? '' : '<span class="workout-vuelta-header">Peso (kg)</span>'}
    </div>
  `;

  // Round rows
  const vueltasHtml = ej.vueltas.map((v, vIdx) => {
    const weightStepper = isBodyweight ? '' : `
      <div class="workout-vuelta-group">
        <div class="stepper workout-stepper-sm" role="group">
          <button class="stepper-btn" data-action="dec" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="pesoRealKg" aria-label="Disminuir peso vuelta ${vIdx + 1}">-</button>
          <input type="number" class="stepper-value" inputmode="decimal" step="0.5"
                 value="${v.pesoRealKg}" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="pesoRealKg"
                 aria-label="Peso vuelta ${vIdx + 1}" aria-valuemin="0">
          <button class="stepper-btn" data-action="inc" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="pesoRealKg" aria-label="Aumentar peso vuelta ${vIdx + 1}">+</button>
        </div>
      </div>
    `;

    return `
      <div class="workout-vuelta-row">
        <span class="workout-vuelta-label">V${vIdx + 1}</span>
        <div class="workout-vuelta-group">
          <div class="stepper workout-stepper-sm" role="group">
            <button class="stepper-btn" data-action="dec" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="repsReal" aria-label="Disminuir reps vuelta ${vIdx + 1}">-</button>
            <input type="number" class="stepper-value" inputmode="numeric"
                   value="${v.repsReal}" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="repsReal"
                   aria-label="Reps vuelta ${vIdx + 1}" aria-valuemin="0">
            <button class="stepper-btn" data-action="inc" data-ej="${ejIdx}" data-vuelta="${vIdx}" data-field="repsReal" aria-label="Aumentar reps vuelta ${vIdx + 1}">+</button>
          </div>
        </div>
        ${weightStepper}
      </div>
    `;
  }).join('');

  return `
    <div class="workout-ejercicio animate-in" style="animation-delay:${ejIdx * 60}ms">
      <div class="workout-ejercicio-header">
        <div class="workout-ejercicio-name">${ej.nombre}</div>
        <button class="workout-info-btn" data-action="show-detail" data-nombre="${ej.nombre}" aria-label="Info de ${ej.nombre}">
          ${icon.info}
        </button>
      </div>
      <div class="workout-ejercicio-target">
        Objetivo: ${ej.repsObjetivo} reps${isBodyweight ? '' : ` &middot; ${ej.pesoObjetivoKg} kg`}
      </div>
      ${overload ? '<div class="workout-overload-hint">&#9650; Subir peso?</div>' : ''}
      ${renderExerciseHistory(ej.nombre)}
      ${vestHtml}
      ${columnHeaders}
      <div class="workout-vueltas">
        ${vueltasHtml}
      </div>
    </div>
  `;
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
  initState(params.id);
  if (!state) return '';

  const circ = state.resultados[state.circuitoActual];
  const isLast = state.circuitoActual === state.resultados.length - 1;
  const ejercicios = circ.ejercicios.map((ej, i) => renderEjercicio(ej, i)).join('');

  return `
    <div class="workout-header">
      <div>
        <div style="font-weight:var(--fw-semibold);font-size:var(--text-base)">${state.rutinaNombre}</div>
        <div class="workout-timer" id="workout-timer">${getElapsedStr()}</div>
      </div>
      <button class="workout-end-btn" data-action="end-workout">Salir</button>
    </div>

    <div class="workout-progress">
      ${renderProgressBar()}
      <span class="workout-progress-label">${state.circuitoActual + 1}/${state.resultados.length} &middot; ${circ.grupoMuscular}</span>
    </div>

    ${ejercicios}

    <div class="peso-step-toggle">
      <span class="peso-step-label">Incremento peso:</span>
      ${PESO_STEPS.map((s, i) => `<button class="peso-step-btn ${i === pesoStepIdx ? 'active' : ''}" data-action="set-peso-step" data-idx="${i}">${s} kg</button>`).join('')}
    </div>

    <div class="workout-nav-btns">
      ${state.circuitoActual > 0 ? `<button class="btn btn-ghost workout-prev-btn" data-action="prev-circuit">← Anterior</button>` : ''}
      <button class="btn btn-primary btn-full" data-action="${isLast ? 'finish' : 'next-circuit'}">
        ${isLast ? 'Finalizar Entrenamiento' : 'Siguiente Circuito →'}
      </button>
    </div>
  `;
}

function syncInputs() {
  if (!state) return;
  const circ = state.resultados[state.circuitoActual];

  // Sync per-round stepper values
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

function finishWorkout() {
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

  saveSesion(sesion);
  clearWorkoutActivo();
  stopTimer();
  state = null;
  navigate(`/summary/${sesion.id}`);
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

export function mount(params) {
  startTimer();
  const app = document.getElementById('app');

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
        if (nombre) showExerciseDetail(nombre);
        break;
      }

      case 'prev-circuit':
        if (state.circuitoActual > 0) {
          syncInputs();
          state.circuitoActual--;
          saveWorkoutActivo(state);
          transitionCircuit(getWorkoutContainer(), params, 'prev');
        }
        break;

      case 'next-circuit':
        syncInputs();
        state.circuitoActual++;
        saveWorkoutActivo(state);
        transitionCircuit(getWorkoutContainer(), params, 'next');
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
          body: 'Se guardara esta sesion en tu historial.',
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
        showModal({
          title: 'Salir del entrenamiento',
          body: 'Tu progreso queda guardado. Podés retomarlo cuando quieras.',
          confirmText: 'Salir',
          cancelText: 'Continuar',
          danger: true,
          onConfirm: () => {
            syncInputs();
            stopTimer();
            state = null;
            navigate('/');
          },
        });
        break;
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
    clearLongPress();
    stopTimer();
  };
}
