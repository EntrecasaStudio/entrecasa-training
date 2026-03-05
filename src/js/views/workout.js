import { getRutinaById, getWorkoutActivo, saveWorkoutActivo, clearWorkoutActivo, saveSesion, getUltimaSesionDeRutina, getUsuarioActivo } from '@/store.js';
import { generateId } from '@/id.js';
import { navigate } from '@/router.js';
import { showModal } from '@js/components/modal.js';
import { playCountdownTick, playFinishBeep } from '@js/helpers/audio.js';
import { getExerciseProgressData } from '@js/helpers/stats-helpers.js';

let state = null;
let timerInterval = null;
let restInterval = null;
let restRemaining = 0;
const PESO_STEPS = [1, 2.5, 5];
const REST_STEPS = [60, 90, 120];
let pesoStepIdx = 1; // default 2.5
let restStepIdx = 1; // default 90s

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
        lastMap[e.nombre] = { reps: e.repsReal, peso: e.pesoRealKg };
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
        return {
          nombre: ej.nombre,
          repsObjetivo: ej.repsObjetivo,
          repsReal: prev ? prev.reps : ej.repsObjetivo,
          pesoObjetivoKg: ej.pesoKg,
          pesoRealKg: prev ? prev.peso : ej.pesoKg,
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
  // Check if the last 2 sessions met or exceeded the target reps and peso
  return last2.every((p) => p.reps >= ej.repsObjetivo && p.peso >= ej.pesoObjetivoKg);
}

function renderEjercicio(ej, ejIdx) {
  const overload = shouldSuggestOverload(ej.nombre, ej);
  return `
    <div class="workout-ejercicio animate-in" style="animation-delay:${ejIdx * 60}ms">
      <div class="workout-ejercicio-name">${ej.nombre}</div>
      <div class="workout-ejercicio-target">
        Objetivo: ${ej.repsObjetivo} reps &middot; ${ej.pesoObjetivoKg} kg
      </div>
      ${overload ? '<div class="workout-overload-hint">&#9650; Subir peso?</div>' : ''}
      ${renderExerciseHistory(ej.nombre)}
      <div class="workout-ejercicio-inputs">
        <div class="workout-input-group">
          <span class="workout-input-label">Reps</span>
          <div class="stepper workout-stepper">
            <button class="stepper-btn" data-action="dec" data-ej="${ejIdx}" data-field="repsReal">-</button>
            <input type="number" class="stepper-value" inputmode="numeric"
                   value="${ej.repsReal}" data-ej="${ejIdx}" data-field="repsReal">
            <button class="stepper-btn" data-action="inc" data-ej="${ejIdx}" data-field="repsReal">+</button>
          </div>
        </div>
        <div class="workout-input-group">
          <span class="workout-input-label">Peso (kg)</span>
          <div class="stepper workout-stepper">
            <button class="stepper-btn" data-action="dec" data-ej="${ejIdx}" data-field="pesoRealKg">-</button>
            <input type="number" class="stepper-value" inputmode="decimal" step="0.5"
                   value="${ej.pesoRealKg}" data-ej="${ejIdx}" data-field="pesoRealKg">
            <button class="stepper-btn" data-action="inc" data-ej="${ejIdx}" data-field="pesoRealKg">+</button>
          </div>
        </div>
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
  document.querySelectorAll('.stepper-value').forEach((input) => {
    const ejIdx = parseInt(input.dataset.ej);
    const field = input.dataset.field;
    if (circ.ejercicios[ejIdx]) {
      const val = parseFloat(input.value) || 0;
      circ.ejercicios[ejIdx][field] = val;
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

    // Countdown feedback: tick + vibrate at 3, 2, 1
    if (restRemaining > 0 && restRemaining <= 3) {
      playCountdownTick();
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    }

    if (restRemaining <= 0) {
      playFinishBeep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
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
  app.innerHTML = render(params);
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
        const ejIdx = parseInt(btn.dataset.ej);
        const field = btn.dataset.field;
        const input = document.querySelector(`.stepper-value[data-ej="${ejIdx}"][data-field="${field}"]`);
        if (!input) return;
        const step = field === 'pesoRealKg' ? PESO_STEPS[pesoStepIdx] : 1;
        let val = parseFloat(input.value) || 0;
        val = action === 'inc' ? val + step : Math.max(0, val - step);
        input.value = val;
        if (navigator.vibrate) navigator.vibrate(30);
        input.classList.remove('value-bump');
        void input.offsetWidth;
        input.classList.add('value-bump');
        syncInputs();
        break;
      }

      case 'prev-circuit':
        if (state.circuitoActual > 0) {
          syncInputs();
          state.circuitoActual--;
          saveWorkoutActivo(state);
          app.innerHTML = render(params);
        }
        break;

      case 'next-circuit':
        syncInputs();
        state.circuitoActual++;
        saveWorkoutActivo(state);
        app.innerHTML = render(params);
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
            if (restRemaining > 0 && restRemaining <= 3) {
              playCountdownTick();
              if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
            }
            if (restRemaining <= 0) {
              playFinishBeep();
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
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
  };

  app.addEventListener('click', handleClick);
  app.addEventListener('change', handleChange);

  return () => {
    app.removeEventListener('click', handleClick);
    app.removeEventListener('change', handleChange);
    stopTimer();
  };
}
