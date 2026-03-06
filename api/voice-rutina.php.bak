<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Read API key from config file
$configPath = '/home/entrecasa/.claude-config.ini';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration missing']);
    exit;
}

$config = parse_ini_file($configPath);
$apiKey = $config['ANTHROPIC_API_KEY'] ?? null;

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'API key not configured']);
    exit;
}

// Read request body
$input = json_decode(file_get_contents('php://input'), true);
$message = trim($input['message'] ?? '');
$usuario = trim($input['usuario'] ?? 'Lean');

if (!$message) {
    http_response_code(400);
    echo json_encode(['error' => 'Message is required']);
    exit;
}

// Load exercise catalog
$catalogPath = __DIR__ . '/ejercicios-catalogo.json';
$catalog = file_get_contents($catalogPath);

// Build system prompt — multi-command
$systemPrompt = <<<PROMPT
Eres el asistente de voz de una app de entrenamiento. Interpretas lo que dice el usuario y respondes con un JSON estructurado.

COMANDOS QUE PUEDES EJECUTAR:

1. CREAR RUTINA — Cuando el usuario pide armar/crear una rutina de ejercicios.
   CATALOGO DE EJERCICIOS: {$catalog}
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

8. NO ENTENDIDO — Cuando no puedes clasificar el comando.
   Responde: { "action": "unknown", "data": { "message": "No entendi tu pedido. Podes pedirme armar rutinas, cambiar colores, modo claro/oscuro, navegar, o cambiar usuario." }, "confirmMessage": "" }

RESPONDE UNICAMENTE con JSON valido, sin texto adicional ni markdown.
PROMPT;

// Call Claude API
$payload = [
    'model' => 'claude-sonnet-4-20250514',
    'max_tokens' => 1024,
    'system' => $systemPrompt,
    'messages' => [
        ['role' => 'user', 'content' => $message]
    ]
];

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ],
    CURLOPT_TIMEOUT => 30
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to reach AI service']);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'AI service error', 'status' => $httpCode]);
    exit;
}

$data = json_decode($response, true);
$text = $data['content'][0]['text'] ?? '';

// Extract JSON from response (handle markdown code blocks)
if (preg_match('/```(?:json)?\s*([\s\S]*?)```/', $text, $matches)) {
    $text = trim($matches[1]);
}

$result = json_decode($text, true);

if (!$result || !isset($result['action'])) {
    http_response_code(422);
    echo json_encode(['error' => 'Could not parse command from AI response', 'raw' => $text]);
    exit;
}

// For create_routine, add user metadata
if ($result['action'] === 'create_routine' && isset($result['data']['rutina'])) {
    $result['data']['rutina']['usuario'] = $usuario;
    $result['data']['rutina']['tipo'] = $result['data']['rutina']['tipo'] ?? 'gimnasio';
}

echo json_encode($result);
