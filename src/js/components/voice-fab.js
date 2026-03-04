import { icon } from '@js/icons.js';
import { isVoiceSupported, createRecognition } from '@js/services/voice-recognition.js';
import { processVoiceCommand } from '@js/services/claude-api.js';
import { getUsuarioActivo, setUsuarioActivo, getRutinas, assignRutinaADia } from '@/store.js';
import { showVoicePreview } from '@js/components/voice-preview.js';
import { showToast } from '@js/components/toast.js';
import { navigate } from '@/router.js';
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
        <div class="voice-pulse-ring"></div>
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
    const result = await processVoiceCommand(text, usuario);

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
        navigate('/');
        if (confirmMessage) showToast(confirmMessage);
      }
      break;

    case 'assign_routine':
      handleAssignRoutine(data, confirmMessage);
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

/** Mount the voice FAB in #fab-container */
export function mountVoiceFab() {
  const container = document.getElementById('fab-container');
  if (!container) return;

  container.innerHTML = renderFAB();
  container.addEventListener('click', (e) => {
    if (e.target.closest('#voice-fab-btn')) {
      handleFABClick();
    }
  });
}
