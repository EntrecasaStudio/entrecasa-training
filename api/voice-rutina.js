import { readFileSync } from 'fs';
import { join } from 'path';

const catalog = readFileSync(join(process.cwd(), 'api', 'ejercicios-catalogo.json'), 'utf-8');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // Set CORS headers for all responses
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  const { message, usuario = 'Lean', rutinas: userRutinas, hoy } = req.body || {};
  if (!message || !message.trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  // Build context about existing routines
  let rutinasContext = '';
  if (userRutinas && userRutinas.length > 0) {
    rutinasContext = `\n\nRUTINAS DEL USUARIO (${usuario}):\n${userRutinas.map((r) =>
      `- "${r.nombre}" (${r.tipo}): ${r.circuitos.map((c, i) =>
        `C${i}[${[].concat(c.grupoMuscular || []).join('+')}${c.tipo !== 'normal' ? ' ' + c.tipo : ''}: ${c.ejercicios.join(', ')}]`
      ).join(' | ')}`
    ).join('\n')}\nUsa estos nombres EXACTOS de rutinas y ejercicios cuando el usuario se refiera a ellos. Haz fuzzy match si el usuario dice nombres parecidos.`;
  }

  const systemPrompt = `Eres el asistente de voz de una app de entrenamiento. Interpretas lo que dice el usuario y respondes con un JSON estructurado.
${hoy ? `\nHOY ES: ${hoy}. Usa esta info para resolver "mañana", "pasado mañana", "el viernes", etc. a su numero de dia correcto.\n` : ''}
COMANDOS QUE PUEDES EJECUTAR:

1. CREAR RUTINA — Cuando el usuario pide armar/crear una rutina de ejercicios.
   CATALOGO DE EJERCICIOS: ${catalog}
   Responde: { "action": "create_routine", "data": { "rutina": { "nombre": "...", "tipo": "gimnasio", "circuitos": [{ "grupoMuscular": "Pecho", "ejercicios": [{ "nombre": "Press de pecho", "repsObjetivo": 10, "pesoKg": 40 }] }] } }, "confirmMessage": "Rutina de pecho creada" }
   REGLAS de rutinas: Usa SOLO ejercicios del catalogo (nombres EXACTOS). grupoMuscular: Core|Piernas|Glúteos|Pecho|Espalda|Hombros|Brazos. repsObjetivo 6-15. 2-4 ejercicios por circuito. 2-5 circuitos.

2. CAMBIAR COLOR — Cuando pide cambiar el color principal/acento de la app.
   Colores disponibles: azul=#3B82F6, rojo=#EF4444, verde=#22C55E, naranja=#F97316, violeta=#8B5CF6, rosa=#EC4899, dorado=#FFCD00, celeste=#06B6D4, blanco=#FFFFFF, amarillo=#FFCD00
   Responde: { "action": "theme_change", "data": { "changes": { "--color-accent": "#3B82F6", "--color-accent-hover": "#2563EB" } }, "confirmMessage": "Color cambiado a azul" }
   Para --color-accent-hover usa un tono mas oscuro del color elegido.

3. CAMBIAR TAMAÑO DE FUENTE — Cuando pide letra mas grande/chica.
   Escalas: mas grande=1.15, grande=1.25, mas chico=0.9, chico=0.85, normal=1
   Responde: { "action": "font_size", "data": { "changes": { "--text-scale": "1.15" } }, "confirmMessage": "Fuente mas grande" }

4. MODO CLARO/OSCURO — Cuando pide cambiar el tema.
   Responde: { "action": "light_mode", "data": {}, "confirmMessage": "Modo claro activado" }
   O: { "action": "dark_mode", "data": {}, "confirmMessage": "Modo oscuro activado" }

5. NAVEGAR — Cuando pide ir a una seccion: entreno/inicio, rutinas, progreso, ejercicios, historial.
   Rutas: entreno="/", rutinas="/rutinas", progreso="/progreso", ejercicios="/ejercicios", historial="/historial"
   Responde: { "action": "navigate", "data": { "route": "/rutinas" }, "confirmMessage": "Yendo a rutinas" }

6. CAMBIAR USUARIO — Cuando pide cambiar a Lean o Nat.
   Responde: { "action": "switch_user", "data": { "usuario": "Nat" }, "confirmMessage": "Cambiado a Nat" }

7. RESETEAR TEMA — Cuando pide volver al tema/colores por defecto/original.
   Responde: { "action": "reset_theme", "data": {}, "confirmMessage": "Tema restaurado" }

8. EDITAR NOTA DE EJERCICIO — Cuando pide agregar/cambiar la descripcion o nota de un ejercicio.
   Responde: { "action": "edit_exercise_note", "data": { "ejercicio": "Press de pecho", "nota": "Texto de la nota..." }, "confirmMessage": "Nota actualizada para Press de pecho" }
   REGLAS: Usa el nombre EXACTO del ejercicio del catalogo. La nota es texto libre del usuario.

9. ASIGNAR/REEMPLAZAR DIA — Cuando pide asignar, cambiar o reemplazar la rutina de un dia de la semana, o poner descanso/libre.
   Dias: lunes=1, martes=2, miercoles=3, jueves=4, viernes=5, sabado=6, domingo=0
   Si el usuario menciona una rutina ESPECIFICA por nombre: { "action": "assign_routine", "data": { "rutinaNombre": "Pecho y Espalda", "dia": 1 }, "confirmMessage": "Rutina asignada al lunes" }
   Para descanso/libre: { "action": "clear_day", "data": { "dia": 6 }, "confirmMessage": "Sabado marcado como libre" }
   Si el usuario pide opciones, o describe criterios sin nombrar una rutina exacta (ej: "cambiá la de mañana por una de espalda y biceps", "poneme otra rutina que tenga piernas"): usa SUGGEST_ROUTINES (ver comando 12).

10. MODIFICAR RUTINA — Cuando pide agregar/quitar ejercicios, cambiar nombre, cambiar grupo muscular, mover ejercicios entre circuitos, agregar/quitar circuitos, cambiar reps/peso, cambiar tipo de circuito (normal/hiit/velocidad/caminata), etc.
   Responde: { "action": "edit_routine", "data": { "rutinaNombre": "Pecho y Espalda", "changes": { "addExercises": [{ "circuitIndex": 0, "ejercicio": { "nombre": "Press inclinado", "repsObjetivo": 10, "pesoKg": 30 } }], "removeExercises": [{ "circuitIndex": 0, "ejercicioNombre": "Press de pecho" }], "newName": "Pecho y Espalda v2", "addCircuits": [{ "grupoMuscular": "Brazos", "ejercicios": [{ "nombre": "Curl de biceps", "repsObjetivo": 12, "pesoKg": 15 }] }], "removeCircuits": [1], "updateCircuits": [{ "circuitIndex": 0, "grupoMuscular": "Pecho", "tipo": "hiit" }], "updateExercises": [{ "circuitIndex": 0, "ejercicioNombre": "Press de pecho", "repsObjetivo": 8, "pesoKg": 50 }] } }, "confirmMessage": "Rutina actualizada" }
   REGLAS: Solo incluye los campos que cambian. circuitIndex empieza en 0. Si no se especifica circuitIndex (omitirlo), aplica a TODOS los circuitos que contengan ese ejercicio. Usa nombres EXACTOS del catalogo. addCircuits agrega circuitos nuevos al final. removeCircuits indica indices de circuitos a borrar. updateCircuits cambia propiedades de circuitos existentes. updateExercises cambia reps/peso de ejercicios existentes — si el usuario dice "en todas las series" o similar, omiti circuitIndex para aplicar a todos.

12. SUGERIR RUTINAS — Cuando el usuario quiere cambiar/reemplazar la rutina de un dia y describe criterios en vez de nombrar una rutina exacta (ej: "poneme una de espalda", "cambiá mañana por una que tenga biceps", "qué rutinas tengo de piernas?").
   Busca en las RUTINAS DEL USUARIO cuáles coinciden con los criterios (por grupo muscular de los circuitos o por nombre).
   Responde: { "action": "suggest_routines", "data": { "dia": 2, "suggestions": ["Espalda y Biceps", "Pull Day"] }, "confirmMessage": "Encontré 2 rutinas que coinciden" }
   REGLAS: dia es el dia de la semana target (puede ser null si solo pregunta sin querer asignar). suggestions es un array de nombres EXACTOS de rutinas del usuario que coincidan. Maximo 5 sugerencias. Si no hay ninguna, devuelve suggestions vacío y un confirmMessage explicando que no hay rutinas que coincidan.

13. NO ENTENDIDO — Cuando no puedes clasificar el comando.
   Responde: { "action": "unknown", "data": { "message": "No entendi tu pedido. Podes pedirme armar rutinas, editar notas de ejercicios, asignar dias, modificar rutinas, cambiar colores, modo claro/oscuro, navegar, o cambiar usuario." }, "confirmMessage": "" }
${rutinasContext}
RESPONDE UNICAMENTE con JSON valido, sin texto adicional ni markdown.`;

  const payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: message.trim() }],
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      res.status(502).json({ error: 'AI service error', status: response.status });
      return;
    }

    const data = await response.json();
    let text = data.content?.[0]?.text || '';

    // Extract JSON from response (handle markdown code blocks)
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim();
    }

    const result = JSON.parse(text);

    if (!result || !result.action) {
      res.status(422).json({ error: 'Could not parse command from AI response', raw: text });
      return;
    }

    // For create_routine, add user metadata
    if (result.action === 'create_routine' && result.data?.rutina) {
      result.data.rutina.usuario = usuario.trim();
      result.data.rutina.tipo = result.data.rutina.tipo || 'gimnasio';
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach AI service' });
  }
}
