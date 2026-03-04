import { icon } from '@js/icons.js';
import { isVoiceSupported, createRecognition } from '@js/services/voice-recognition.js';
import { generateRutina } from '@js/services/claude-api.js';
import { getUsuarioActivo } from '@/store.js';
import { showVoicePreview } from '@js/components/voice-preview.js';
import { showToast } from '@js/components/toast.js';

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
          ${currentTranscript || '<span class="voice-hint">Describe tu rutina...</span>'}
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

  // Always render the FAB
  const fabEl = container.querySelector('#voice-fab-btn');
  if (fabEl) {
    fabEl.className = `voice-fab ${state === 'listening' ? 'voice-fab--active' : state === 'processing' ? 'voice-fab--processing' : ''}`;
    fabEl.innerHTML = state === 'processing' ? '<span class="voice-spinner"></span>' : state === 'listening' ? icon.stop : icon.mic;
  }

  // Handle overlay
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
    el.innerHTML = currentTranscript || '<span class="voice-hint">Describe tu rutina...</span>';
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

async function sendTranscript() {
  const text = currentTranscript.trim();
  if (!text) return;

  // Stop recognition
  if (recognition) {
    recognition.stop();
    recognition = null;
  }

  state = 'processing';
  updateFAB();

  try {
    const usuario = getUsuarioActivo();
    const rutina = await generateRutina(text, usuario);
    state = 'idle';
    updateFAB();
    showVoicePreview(rutina);
  } catch (err) {
    state = 'idle';
    updateFAB();
    showToast(err.message || 'Error al generar rutina', 'error');
  }
}

function handleFABClick() {
  if (state === 'idle') {
    startListening();
  } else if (state === 'listening') {
    // Stop listening and send if we have text
    if (currentTranscript.trim()) {
      sendTranscript();
    } else {
      cancelListening();
    }
  }
  // If processing, ignore clicks
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
