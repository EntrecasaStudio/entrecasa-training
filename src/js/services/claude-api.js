/**
 * Client for the PHP proxy that calls Claude API.
 * Supports multi-command voice interface.
 */

const PROD_URL = '/treiner/api/voice-rutina.php';
const DEV_URL = 'http://localhost:8080/api/voice-rutina.php';

function getApiUrl() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? DEV_URL
    : PROD_URL;
}

/**
 * Process a voice command through Claude API.
 * Returns a structured command response.
 * @param {string} message - The user's voice transcript
 * @param {string} usuario - Active user name (Lean/Nat)
 * @returns {Promise<{ action: string, data: Object, confirmMessage: string }>}
 */
export async function processVoiceCommand(message, usuario) {
  const url = getApiUrl();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, usuario }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }

  const data = await res.json();

  if (!data.action) {
    throw new Error('Respuesta invalida del servidor');
  }

  return data;
}

/**
 * Legacy wrapper — send a voice transcript to generate a routine.
 * @deprecated Use processVoiceCommand instead
 */
export async function generateRutina(message, usuario) {
  const result = await processVoiceCommand(message, usuario);
  if (result.action === 'create_routine' && result.data?.rutina) {
    return result.data.rutina;
  }
  throw new Error('No se pudo generar la rutina');
}
