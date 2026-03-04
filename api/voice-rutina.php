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

// Build system prompt
$systemPrompt = <<<PROMPT
Eres un asistente de entrenamiento que arma rutinas de gimnasio. El usuario te describe lo que quiere entrenar y tu creas una rutina estructurada.

CATALOGO DE EJERCICIOS DISPONIBLES:
{$catalog}

REGLAS:
1. Usa SOLO ejercicios del catalogo. Los nombres deben ser EXACTOS.
2. Cada circuito tiene un grupoMuscular de: Core, Piernas, Glúteos, Pecho, Espalda, Hombros, Brazos
3. Cada ejercicio tiene repsObjetivo (6-15) y pesoKg (0 para peso corporal)
4. Minimo 2 ejercicios por circuito, maximo 4
5. Crea entre 2-5 circuitos segun lo que pida el usuario
6. El nombre de la rutina debe ser descriptivo y corto (ej: "Push - Pecho / Triceps")
7. Si el usuario pide algo generico, arma una rutina balanceada

RESPONDE UNICAMENTE con JSON valido, sin texto adicional, en este formato exacto:
{
  "nombre": "Nombre de la rutina",
  "circuitos": [
    {
      "grupoMuscular": "Pecho",
      "ejercicios": [
        {"nombre": "Press de pecho", "repsObjetivo": 10, "pesoKg": 40},
        {"nombre": "Fondos de pecho en maquina", "repsObjetivo": 12, "pesoKg": 30}
      ]
    }
  ]
}
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

$rutina = json_decode($text, true);

if (!$rutina || !isset($rutina['nombre']) || !isset($rutina['circuitos'])) {
    http_response_code(422);
    echo json_encode(['error' => 'Could not parse routine from AI response', 'raw' => $text]);
    exit;
}

// Add metadata
$rutina['usuario'] = $usuario;
$rutina['tipo'] = 'gimnasio';

echo json_encode(['rutina' => $rutina]);
