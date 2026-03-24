/**
 * Plan Wizard — 6-step wizard to generate a training plan.
 * Steps: 1) Baseline  2) Duration  3) Gym days  4) Location  5) Goals  6) Activities
 */
import { getUsuarioActivo, getRutinas, savePlanGenerado, saveRutina } from '@/store.js';
import { navigate } from '@/router.js';
import { icon } from '@js/icons.js';
import { buildPlanObject } from '@js/helpers/plan-generator.js';
import { showToast } from '@js/components/toast.js';
import { haptic } from '@js/helpers/haptics.js';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const GRUPOS = ['Espalda', 'Piernas', 'Glúteos', 'Pecho', 'Hombros', 'Brazos', 'Core'];
const LUGARES = [
  { id: 'SPORT_FITNESS', label: 'Sport Fitness' },
  { id: 'VILO_GYM', label: 'Vilo Gym' },
  { id: 'RIO', label: 'Río' },
  { id: 'OTHER', label: 'Otro' },
];
const NIVELES = ['Principiante', 'Intermedio', 'Avanzado'];
const ACTIVIDADES = [
  { id: 'running', label: 'Running', icon: '🏃', fields: [{ key: 'distancia', label: 'Distancia', placeholder: '8-12km' }] },
  { id: 'sauna', label: 'Sauna', icon: '🧖' },
  { id: 'rucking', label: 'Rucking', icon: '🎒', fields: [{ key: 'peso', label: 'Peso', placeholder: '10kg' }] },
  { id: 'yoga', label: 'Yoga', icon: '🧘', fields: [{ key: 'duracion', label: 'Duración', placeholder: '20min' }] },
];

// ── State ────────────────────────────────────

let step = 0;
let config = {};

function defaultConfig() {
  return {
    baseline: { peso: '', grasaCorporal: '', cintura: '', pecho: '', brazo: '', muslo: '' },
    duracion: 12,
    diasGym: [1, 3, 5],
    lugar: 'SPORT_FITNESS',
    lugarCustom: '',
    objetivos: { focos: [], nivel: 'Intermedio' },
    complementarias: {
      running: { enabled: false, dias: [], distancia: '8-12km' },
      sauna: { enabled: false, dias: [] },
      rucking: { enabled: false, dias: [], peso: '10kg' },
      yoga: { enabled: false, dias: [], duracion: '20min' },
    },
    restricciones: { noRunningConPiernas: true, duracionMaxGym: 70, deloadCada: 5 },
  };
}

// ── Step renderers ──────────────────────────

function renderProgress() {
  const steps = ['Medidas', 'Duración', 'Días', 'Lugar', 'Objetivos', 'Actividades'];
  return `<div class="wiz-progress">
    ${steps.map((s, i) => `<div class="wiz-progress-dot ${i === step ? 'active' : i < step ? 'done' : ''}">${i < step ? '✓' : i + 1}</div>`).join('')}
  </div>`;
}

function renderStep0() {
  const b = config.baseline;
  return `
    <div class="wiz-step">
      <h2 class="wiz-title">Medidas iniciales</h2>
      <p class="wiz-subtitle">Registrá tus medidas para medir tu progreso al final del plan</p>
      <div class="wiz-form">
        <label class="wiz-field">
          <span>Peso (kg) *</span>
          <input type="number" data-field="peso" value="${b.peso}" placeholder="78" inputmode="decimal" required>
        </label>
        <label class="wiz-field">
          <span>Grasa corporal (%)</span>
          <input type="number" data-field="grasaCorporal" value="${b.grasaCorporal}" placeholder="18" inputmode="decimal">
        </label>
        <div class="wiz-field-row">
          <label class="wiz-field"><span>Cintura (cm)</span><input type="number" data-field="cintura" value="${b.cintura}" placeholder="85" inputmode="decimal"></label>
          <label class="wiz-field"><span>Pecho (cm)</span><input type="number" data-field="pecho" value="${b.pecho}" placeholder="100" inputmode="decimal"></label>
        </div>
        <div class="wiz-field-row">
          <label class="wiz-field"><span>Brazo (cm)</span><input type="number" data-field="brazo" value="${b.brazo}" placeholder="35" inputmode="decimal"></label>
          <label class="wiz-field"><span>Muslo (cm)</span><input type="number" data-field="muslo" value="${b.muslo}" placeholder="55" inputmode="decimal"></label>
        </div>
      </div>
    </div>`;
}

function renderStep1() {
  return `
    <div class="wiz-step">
      <h2 class="wiz-title">Duración del plan</h2>
      <p class="wiz-subtitle">¿Cuántas semanas dura tu plan?</p>
      <div class="wiz-chips wiz-chips-lg">
        ${[4, 8, 12].map((w) => `
          <button class="wiz-chip ${config.duracion === w ? 'active' : ''}" data-action="set-duracion" data-val="${w}">
            ${w} semanas
          </button>
        `).join('')}
      </div>
    </div>`;
}

function renderStep2() {
  return `
    <div class="wiz-step">
      <h2 class="wiz-title">Días de gym</h2>
      <p class="wiz-subtitle">¿Qué días vas al gimnasio? (mínimo 2)</p>
      <div class="wiz-chips wiz-day-chips">
        ${DIAS.map((d, i) => `
          <button class="wiz-chip wiz-day-chip ${config.diasGym.includes(i) ? 'active' : ''}" data-action="toggle-dia" data-val="${i}">
            ${d}
          </button>
        `).join('')}
      </div>
      <p class="wiz-hint">${config.diasGym.length} días seleccionados</p>
    </div>`;
}

function renderStep3() {
  return `
    <div class="wiz-step">
      <h2 class="wiz-title">Lugar de entrenamiento</h2>
      <p class="wiz-subtitle">¿Dónde entrenás?</p>
      <div class="wiz-chips">
        ${LUGARES.map((l) => `
          <button class="wiz-chip ${config.lugar === l.id ? 'active' : ''}" data-action="set-lugar" data-val="${l.id}">
            ${l.label}
          </button>
        `).join('')}
      </div>
      ${config.lugar === 'OTHER' ? `
        <input class="wiz-input" type="text" data-field="lugarCustom" value="${config.lugarCustom}" placeholder="Nombre del gym">
      ` : ''}
    </div>`;
}

function renderStep4() {
  return `
    <div class="wiz-step">
      <h2 class="wiz-title">Objetivos</h2>
      <p class="wiz-subtitle">¿Cuál es tu foco principal? (elegí 1-3 grupos)</p>
      <div class="wiz-chips wiz-grupo-chips">
        ${GRUPOS.map((g) => `
          <button class="wiz-chip ${config.objetivos.focos.includes(g) ? 'active' : ''}" data-action="toggle-foco" data-val="${g}">
            ${g}
          </button>
        `).join('')}
      </div>
      <p class="wiz-subtitle" style="margin-top:var(--space-lg)">Nivel</p>
      <div class="wiz-chips">
        ${NIVELES.map((n) => `
          <button class="wiz-chip ${config.objetivos.nivel === n ? 'active' : ''}" data-action="set-nivel" data-val="${n}">
            ${n}
          </button>
        `).join('')}
      </div>
    </div>`;
}

function renderStep5() {
  return `
    <div class="wiz-step">
      <h2 class="wiz-title">Actividades complementarias</h2>
      <p class="wiz-subtitle">¿Qué otras actividades hacés?</p>
      <div class="wiz-activities">
        ${ACTIVIDADES.map((a) => {
          const comp = config.complementarias[a.id];
          return `
            <div class="wiz-activity ${comp.enabled ? 'wiz-activity-on' : ''}">
              <div class="wiz-activity-header" data-action="toggle-activity" data-id="${a.id}">
                <span>${a.icon} ${a.label}</span>
                <span class="wiz-toggle ${comp.enabled ? 'on' : ''}">${comp.enabled ? '✓' : ''}</span>
              </div>
              ${comp.enabled ? `
                <div class="wiz-activity-body">
                  <p class="wiz-hint" style="margin-bottom:4px">Días:</p>
                  <div class="wiz-chips wiz-day-chips-sm">
                    ${DIAS.map((d, i) => `
                      <button class="wiz-chip wiz-chip-sm ${comp.dias.includes(i) ? 'active' : ''}" data-action="toggle-activity-dia" data-id="${a.id}" data-val="${i}">
                        ${d}
                      </button>
                    `).join('')}
                  </div>
                  ${(a.fields || []).map((f) => `
                    <label class="wiz-field wiz-field-sm">
                      <span>${f.label}</span>
                      <input type="text" data-activity="${a.id}" data-afield="${f.key}" value="${comp[f.key] || ''}" placeholder="${f.placeholder}">
                    </label>
                  `).join('')}
                </div>
              ` : ''}
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

const STEP_RENDERERS = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

// ── Main render ─────────────────────────────

export function render() {
  const usuario = getUsuarioActivo();
  step = 0;
  config = defaultConfig();

  return renderWizard(usuario);
}

function renderWizard(usuario) {
  const isFirst = step === 0;
  const isLast = step === STEP_RENDERERS.length - 1;
  const canNext = validateStep();

  return `
    <div class="plan-wizard">
      <div class="wiz-header">
        <button class="wiz-close" data-action="close">${icon.close}</button>
        <span class="wiz-header-title">Nuevo Plan — ${usuario}</span>
      </div>
      ${renderProgress()}
      <div class="wiz-content" id="wiz-content">
        ${STEP_RENDERERS[step]()}
      </div>
      <div class="wiz-footer">
        ${!isFirst ? `<button class="btn btn-ghost wiz-btn" data-action="prev">Anterior</button>` : '<div></div>'}
        ${isLast
          ? `<button class="btn btn-primary wiz-btn" data-action="generate" ${canNext ? '' : 'disabled'}>Generar Plan</button>`
          : `<button class="btn btn-primary wiz-btn" data-action="next" ${canNext ? '' : 'disabled'}>Siguiente</button>`}
      </div>
    </div>`;
}

function validateStep() {
  switch (step) {
    case 0: return config.baseline.peso !== '';
    case 2: return config.diasGym.length >= 2;
    default: return true;
  }
}

// ── Mount (event handlers) ──────────────────

export function mount() {
  const app = document.getElementById('view-container');
  const usuario = getUsuarioActivo();

  function reRender() {
    app.innerHTML = renderWizard(usuario);
  }

  function syncInputs() {
    // Baseline fields
    app.querySelectorAll('[data-field]').forEach((el) => {
      const f = el.dataset.field;
      if (f in config.baseline) config.baseline[f] = el.value;
      if (f === 'lugarCustom') config.lugarCustom = el.value;
    });
    // Activity fields
    app.querySelectorAll('[data-activity]').forEach((el) => {
      const id = el.dataset.activity;
      const key = el.dataset.afield;
      if (config.complementarias[id]) config.complementarias[id][key] = el.value;
    });
  }

  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    switch (action) {
      case 'close':
        navigate('/');
        break;

      case 'prev':
        syncInputs();
        if (step > 0) { step--; reRender(); }
        break;

      case 'next':
        syncInputs();
        if (step < STEP_RENDERERS.length - 1) { step++; reRender(); }
        break;

      case 'set-duracion':
        config.duracion = parseInt(btn.dataset.val);
        reRender();
        break;

      case 'toggle-dia': {
        const d = parseInt(btn.dataset.val);
        const idx = config.diasGym.indexOf(d);
        if (idx >= 0) config.diasGym.splice(idx, 1);
        else config.diasGym.push(d);
        reRender();
        break;
      }

      case 'set-lugar':
        syncInputs();
        config.lugar = btn.dataset.val;
        reRender();
        break;

      case 'toggle-foco': {
        const g = btn.dataset.val;
        const idx = config.objetivos.focos.indexOf(g);
        if (idx >= 0) config.objetivos.focos.splice(idx, 1);
        else if (config.objetivos.focos.length < 3) config.objetivos.focos.push(g);
        reRender();
        break;
      }

      case 'set-nivel':
        config.objetivos.nivel = btn.dataset.val;
        reRender();
        break;

      case 'toggle-activity': {
        const id = btn.closest('[data-id]')?.dataset.id || btn.dataset.id;
        if (config.complementarias[id]) {
          config.complementarias[id].enabled = !config.complementarias[id].enabled;
        }
        reRender();
        break;
      }

      case 'toggle-activity-dia': {
        const id = btn.dataset.id;
        const d = parseInt(btn.dataset.val);
        const comp = config.complementarias[id];
        if (comp) {
          const idx = comp.dias.indexOf(d);
          if (idx >= 0) comp.dias.splice(idx, 1);
          else comp.dias.push(d);
        }
        reRender();
        break;
      }

      case 'generate': {
        syncInputs();
        // Build config for generator
        const genConfig = {
          duracion: config.duracion,
          diasGym: config.diasGym,
          lugar: config.lugar === 'OTHER' ? config.lugarCustom : config.lugar,
          objetivos: config.objetivos,
          complementarias: {},
          restricciones: config.restricciones,
          baseline: {
            fecha: new Date().toISOString().split('T')[0],
            ...Object.fromEntries(
              Object.entries(config.baseline).map(([k, v]) => [k, v ? parseFloat(v) : null])
            ),
          },
        };
        // Only include enabled activities
        for (const [id, comp] of Object.entries(config.complementarias)) {
          if (comp.enabled && comp.dias.length > 0) {
            const { enabled, ...rest } = comp;
            genConfig.complementarias[id] = rest;
          }
        }

        // Get next numero
        const maxNum = getRutinas().reduce((m, r) => Math.max(m, r.numero || 0), 0);

        // Generate
        const { plan, rutinas } = buildPlanObject(genConfig, usuario, maxNum + 1);

        // Save rutinas
        for (const r of rutinas) saveRutina(r);

        // Save plan
        savePlanGenerado(usuario, plan);

        haptic.heavy();
        showToast(`Plan de ${config.duracion} semanas generado`);
        navigate('/plan/preview');
        break;
      }
    }
  };

  app.addEventListener('click', handleClick);
  return () => app.removeEventListener('click', handleClick);
}
