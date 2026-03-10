/**
 * Client for the PHP proxy that calls Claude API.
 * Supports multi-command voice interface.
 */

const VERCEL_URL = 'https://entrecasa-training.vercel.app/api/voice-rutina';
const DEV_URL = 'http://localhost:3000/api/voice-rutina';

function getApiUrl() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? DEV_URL
    : VERCEL_URL;
}

/**
 * Process a voice command through Claude API.
 * Returns a structured command response.
 * @param {string} message - The user's voice transcript
 * @param {string} usuario - Active user name (Lean/Nat)
 * @param {Array} [rutinas] - User's existing routines for context
 * @returns {Promise<{ action: string, data: Object, confirmMessage: string }>}
 */
export async function processVoiceCommand(message, usuario, rutinas) {
  const url = getApiUrl();

  const body = { message, usuario };

  // Send routine summaries so Claude can reference existing routines
  if (rutinas && rutinas.length > 0) {
    body.rutinas = rutinas.map((r) => ({
      nombre: r.nombre,
      tipo: r.tipo || 'gimnasio',
      circuitos: (r.circuitos || []).map((c, i) => ({
        indice: i,
        grupoMuscular: c.grupoMuscular,
        tipo: c.tipo || 'normal',
        ejercicios: (c.ejercicios || []).map((e) => e.nombre),
      })),
    }));
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
