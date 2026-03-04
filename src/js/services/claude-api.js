/**
 * Client for the PHP proxy that calls Claude API to generate routines.
 */

const PROD_URL = '/treiner/api/voice-rutina.php';
const DEV_URL = 'http://localhost:8080/api/voice-rutina.php';

function getApiUrl() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? DEV_URL
    : PROD_URL;
}

/**
 * Send a voice transcript to Claude and get back a structured routine.
 * @param {string} message - The user's voice transcript
 * @param {string} usuario - Active user name (Lean/Nat)
 * @returns {Promise<Object>} The routine object { nombre, circuitos }
 */
export async function generateRutina(message, usuario) {
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

  if (!data.rutina) {
    throw new Error('No se pudo generar la rutina');
  }

  return data.rutina;
}
