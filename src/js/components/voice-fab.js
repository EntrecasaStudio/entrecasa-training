import { icon } from '@js/icons.js';
import { isVoiceSupported, createRecognition } from '@js/services/voice-recognition.js';
import { processVoiceCommand } from '@js/services/claude-api.js';
import { getUsuarioActivo, setUsuarioActivo, getRutinas, getRutinaById, saveRutina, assignRutinaADia, clearRutinaDelDia, setPlanDia, saveNotaEjercicio } from '@/store.js';
import { showVoicePreview } from '@js/components/voice-preview.js';
import { showToast } from '@js/components/toast.js';
import { navigate } from '@/router.js';
import { updateAvatarMenu } from '@js/components/avatar-menu.js';
import {
  applyThemeChanges,
  applyLightMode,
  applyDarkMode,
  resetTheme,
} from '@js/services/theme-manager.js';

let state = 'idle'; // idle | listening | processing
let recognition = null;
let currentTranscript = '';

function renderFAB() {
  if (state === 'processing') {
    return `<button class="voice-fab voice-fab--processing" id="voice-fab-btn">
      <span class="voice-spinner"></span>
    </button>`;
  }
  if (state === 'listening') {
    return `<button class="voice-fab voice-fab--active" id="voice-fab-btn">
      ${icon.stop}
    </button>`;
  }
  return `<button class="voice-fab" id="voice-fab-btn">
    ${icon.mic}
  </button>`;
}

function renderOverlay() {
  return `
    <div class="voice-overlay" id="voice-overlay">
      <div class="voice-overlay-content">
        <div class="voice-soul">
          <div class="voice-soul-blob voice-soul-blob-1"></div>
          <div class="voice-soul-blob voice-soul-blob-2"></div>
          <div class="voice-soul-blob voice-soul-blob-3"></div>
          <div class="voice-soul-core"></div>
        </div>
        <div class="voice-transcript" id="voice-transcript">
          ${currentTranscript || '<span class="voice-hint">Decime que querés hacer...</span>'}
        </div>
        <div class="voice-overlay-actions">
          <button class="btn btn-ghost" id="voice-cancel">Cancelar</button>
          <button class="btn btn-primary" id="voice-send" ${currentTranscript ? '' : 'disabled'}>Enviar</button>
        </div>
      </div>
    </div>
  `;
}

function updateFAB() {
  const container = document.getElementById('fab-container');
  if (!container) return;

  const fabEl = container.querySelector('#voice-fab-btn');
  if (fabEl) {
    fabEl.className = `voice-fab ${state === 'listening' ? 'voice-fab--active' : state === 'processing' ? 'voice-fab--processing' : ''}`;
    fabEl.innerHTML = state === 'processing' ? '<span class="voice-spinner"></span>' : state === 'listening' ? icon.stop : icon.mic;
  }

  const existingOverlay = document.getElementById('voice-overlay');
  if (state === 'listening') {
    if (!existingOverlay) {
      const overlay = document.createElement('div');
      overlay.id = 'voice-overlay-wrap';
      overlay.innerHTML = renderOverlay();
      document.body.appendChild(overlay);
      bindOverlayEvents(overlay);
    } else {
      updateTranscriptDisplay();
    }
  } else {
    const wrap = document.getElementById('voice-overlay-wrap');
    if (wrap) wrap.remove();
  }
}

function updateTranscriptDisplay() {
  const el = document.getElementById('voice-transcript');
  if (el) {
    el.innerHTML = currentTranscript || '<span class="voice-hint">Decime que querés hacer...</span>';
  }
  const sendBtn = document.getElementById('voice-send');
  if (sendBtn) sendBtn.disabled = !currentTranscript;
}

function bindOverlayEvents(wrap) {
  wrap.addEventListener('click', (e) => {
    if (e.target.id === 'voice-cancel' || e.target.id === 'voice-overlay') {
      cancelListening();
    } else if (e.target.id === 'voice-send') {
      sendTranscript();
    }
  });
}

function startListening() {
  if (!isVoiceSupported()) {
    showToast('Tu navegador no soporta reconocimiento de voz', 'error');
    return;
  }

  currentTranscript = '';
  state = 'listening';
  updateFAB();

  recognition = createRecognition({
    onInterim(text) {
      currentTranscript = text;
      updateTranscriptDisplay();
    },
    onResult(text) {
      currentTranscript = text;
      updateTranscriptDisplay();
    },
    onError(err) {
      if (err === 'not-allowed') {
        showToast('Permiso de microfono denegado', 'error');
      } else if (err !== 'aborted') {
        showToast('Error de reconocimiento de voz', 'error');
      }
      cancelListening();
    },
    onEnd() {
      // Speech ended naturally — keep overlay open so user can send
    },
  });
}

function cancelListening() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  currentTranscript = '';
  state = 'idle';
  updateFAB();
}

// ── Multi-action dispatcher ─────────────────

async function sendTranscript() {
  const text = currentTranscript.trim();
  if (!text) return;

  if (recognition) {
    recognition.stop();
    recognition = null;
  }

  state = 'processing';
  updateFAB();

  try {
    const usuario = getUsuarioActivo();
    const rutinas = getRutinas().filter((r) => r.usuario === usuario);
    const result = await processVoiceCommand(text, usuario, rutinas);

    state = 'idle';
    updateFAB();

    dispatchAction(result);
  } catch (err) {
    state = 'idle';
    updateFAB();
    showToast(err.message || 'Error al procesar comando', 'error');
  }
}

function dispatchAction(result) {
  const { action, data, confirmMessage } = result;

  switch (action) {
    case 'create_routine':
      if (data?.rutina) {
        showVoicePreview(data.rutina);
      }
      break;

    case 'theme_change':
    case 'font_size':
      if (data?.changes) {
        applyThemeChanges(data.changes);
        if (confirmMessage) showToast(confirmMessage);
      }
      break;

    case 'light_mode':
      applyLightMode();
      if (confirmMessage) showToast(confirmMessage);
      break;

    case 'dark_mode':
      applyDarkMode();
      if (confirmMessage) showToast(confirmMessage);
      break;

    case 'reset_theme':
      resetTheme();
      if (confirmMessage) showToast(confirmMessage);
      break;

    case 'navigate':
      if (data?.route) {
        navigate(data.route);
        if (confirmMessage) showToast(confirmMessage);
      }
      break;

    case 'switch_user':
      if (data?.usuario) {
        setUsuarioActivo(data.usuario);
        updateAvatarMenu();
        navigate('/');
        if (confirmMessage) showToast(confirmMessage);
      }
      break;

    case 'assign_routine':
      handleAssignRoutine(data, confirmMessage);
      break;

    case 'clear_day':
      handleClearDay(data, confirmMessage);
      break;

    case 'edit_exercise_note':
      handleEditExerciseNote(data, confirmMessage);
      break;

    case 'edit_routine':
      handleEditRoutine(data, confirmMessage);
      break;

    case 'unknown':
    default:
      showToast(data?.message || confirmMessage || 'No entendi tu pedido', 'error');
      break;
  }
}

function handleAssignRoutine(data, confirmMessage) {
  if (!data?.rutinaNombre || data?.dia === undefined) {
    showToast('No pude identificar la rutina o el dia', 'error');
    return;
  }

  const usuario = getUsuarioActivo();
  const rutinas = getRutinas().filter((r) => r.usuario === usuario);

  // Fuzzy match routine name
  const target = rutinas.find((r) =>
    r.nombre.toLowerCase().includes(data.rutinaNombre.toLowerCase()),
  );

  if (!target) {
    showToast(`No encontré la rutina "${data.rutinaNombre}"`, 'error');
    return;
  }

  assignRutinaADia(target.id, data.dia, usuario);
  navigate('/');
  if (confirmMessage) showToast(confirmMessage);
}

function handleClearDay(data, confirmMessage) {
  if (data?.dia === undefined) {
    showToast('No pude identificar el dia', 'error');
    return;
  }
  const usuario = getUsuarioActivo();
  clearRutinaDelDia(data.dia, usuario);
  setPlanDia(usuario, data.dia, null);
  navigate('/');
  if (confirmMessage) showToast(confirmMessage);
}

function handleEditExerciseNote(data, confirmMessage) {
  if (!data?.ejercicio || !data?.nota) {
    showToast('Faltan datos para la nota', 'error');
    return;
  }
  saveNotaEjercicio(data.ejercicio, data.nota);
  if (confirmMessage) showToast(confirmMessage);
}

function handleEditRoutine(data, confirmMessage) {
  if (!data?.rutinaNombre) {
    showToast('No pude identificar la rutina', 'error');
    return;
  }

  const usuario = getUsuarioActivo();
  const rutinas = getRutinas().filter((r) => r.usuario === usuario);
  const target = rutinas.find((r) =>
    r.nombre.toLowerCase().includes(data.rutinaNombre.toLowerCase()),
  );

  if (!target) {
    showToast(`No encontré la rutina "${data.rutinaNombre}"`, 'error');
    return;
  }

  const changes = data.changes || {};

  // Rename
  if (changes.newName) {
    target.nombre = changes.newName;
  }

  // Remove circuits (process in reverse to preserve indices)
  if (changes.removeCircuits) {
    const indices = [...changes.removeCircuits].sort((a, b) => b - a);
    for (const idx of indices) {
      if (target.circuitos[idx]) {
        target.circuitos.splice(idx, 1);
      }
    }
  }

  // Update circuit properties (grupo muscular, tipo)
  if (changes.updateCircuits) {
    for (const upd of changes.updateCircuits) {
      const circ = target.circuitos[upd.circuitIndex];
      if (!circ) continue;
      if (upd.grupoMuscular) circ.grupoMuscular = upd.grupoMuscular;
      if (upd.tipo) circ.tipo = upd.tipo;
    }
  }

  // Add exercises
  if (changes.addExercises) {
    for (const add of changes.addExercises) {
      const idx = add.circuitIndex ?? 0;
      if (target.circuitos[idx]) {
        const ej = add.ejercicio || { nombre: add.ejercicioNombre };
        if (!ej.repsObjetivo) ej.repsObjetivo = 10;
        if (!ej.pesoKg) ej.pesoKg = 0;
        if (!ej.id) ej.id = crypto.randomUUID();
        target.circuitos[idx].ejercicios.push(ej);
      }
    }
  }

  // Remove exercises — if circuitIndex omitted, remove from ALL circuits
  if (changes.removeExercises) {
    for (const rem of changes.removeExercises) {
      const circsToSearch = rem.circuitIndex !== undefined
        ? [target.circuitos[rem.circuitIndex]].filter(Boolean)
        : target.circuitos;
      for (const circ of circsToSearch) {
        circ.ejercicios = circ.ejercicios.filter(
          (e) => e.nombre.toLowerCase() !== rem.ejercicioNombre.toLowerCase(),
        );
      }
    }
  }

  // Update exercise properties (reps, weight)
  // If circuitIndex is omitted, apply to ALL circuits containing the exercise
  if (changes.updateExercises) {
    for (const upd of changes.updateExercises) {
      const circsToSearch = upd.circuitIndex !== undefined
        ? [target.circuitos[upd.circuitIndex]].filter(Boolean)
        : target.circuitos;
      for (const circ of circsToSearch) {
        const ej = circ.ejercicios.find(
          (e) => e.nombre.toLowerCase() === upd.ejercicioNombre.toLowerCase(),
        );
        if (!ej) continue;
        if (upd.repsObjetivo !== undefined) ej.repsObjetivo = upd.repsObjetivo;
        if (upd.pesoKg !== undefined) ej.pesoKg = upd.pesoKg;
      }
    }
  }

  // Add new circuits
  if (changes.addCircuits) {
    for (const newCirc of changes.addCircuits) {
      const circ = {
        id: crypto.randomUUID(),
        grupoMuscular: newCirc.grupoMuscular || 'Core',
        tipo: newCirc.tipo || 'normal',
        ejercicios: (newCirc.ejercicios || []).map((e) => ({
          id: crypto.randomUUID(),
          nombre: e.nombre,
          repsObjetivo: e.repsObjetivo || 10,
          pesoKg: e.pesoKg || 0,
        })),
      };
      target.circuitos.push(circ);
    }
  }

  saveRutina(target);
  if (confirmMessage) showToast(confirmMessage);
}

// ── FAB click ─────────────────────────────

function handleFABClick() {
  if (state === 'idle') {
    startListening();
  } else if (state === 'listening') {
    if (currentTranscript.trim()) {
      sendTranscript();
    } else {
      cancelListening();
    }
  }
}

// ── Draggable FAB ─────────────────────────

const FAB_POS_KEY = 'gym_fab_position';
let dragStartX = 0, dragStartY = 0;
let fabStartX = 0, fabStartY = 0;
let isDragging = false;
let dragMoved = false;

function loadFabPosition() {
  try {
    const raw = localStorage.getItem(FAB_POS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveFabPosition(x, y) {
  try { localStorage.setItem(FAB_POS_KEY, JSON.stringify({ x, y })); } catch { /* ignore */ }
}

function applyFabPosition(container) {
  const pos = loadFabPosition();
  if (!pos) return;
  // Clamp to viewport bounds
  const size = 56;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x = Math.max(0, Math.min(pos.x, vw - size));
  const y = Math.max(0, Math.min(pos.y, vh - size));
  container.style.right = 'auto';
  container.style.bottom = 'auto';
  container.style.left = `${x}px`;
  container.style.top = `${y}px`;
}

function setupFabDrag(container) {
  const onTouchStart = (e) => {
    const touch = e.touches[0];
    dragStartX = touch.clientX;
    dragStartY = touch.clientY;
    const rect = container.getBoundingClientRect();
    fabStartX = rect.left;
    fabStartY = rect.top;
    isDragging = true;
    dragMoved = false;
    container.style.transition = 'none';
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartX;
    const dy = touch.clientY - dragStartY;
    if (!dragMoved && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    dragMoved = true;
    e.preventDefault();

    const size = 56;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const newX = Math.max(0, Math.min(fabStartX + dx, vw - size));
    const newY = Math.max(0, Math.min(fabStartY + dy, vh - size));
    container.style.right = 'auto';
    container.style.bottom = 'auto';
    container.style.left = `${newX}px`;
    container.style.top = `${newY}px`;
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    container.style.transition = '';
    if (dragMoved) {
      const rect = container.getBoundingClientRect();
      saveFabPosition(rect.left, rect.top);
      // Prevent click from firing after drag
      setTimeout(() => { dragMoved = false; }, 100);
    }
  };

  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('touchend', onTouchEnd);
}

/** Mount the voice FAB in #fab-container */
export function mountVoiceFab() {
  const container = document.getElementById('fab-container');
  if (!container) return;

  container.innerHTML = renderFAB();
  applyFabPosition(container);
  setupFabDrag(container);

  container.addEventListener('click', (e) => {
    if (dragMoved) return; // ignore click after drag
    if (e.target.closest('#voice-fab-btn')) {
      handleFABClick();
    }
  });
}
