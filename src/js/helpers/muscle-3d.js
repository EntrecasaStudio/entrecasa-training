/**
 * 3D Muscle Group Viewer — renders a mannequin model with highlighted muscle groups.
 * Uses Three.js with dynamic import so the bundle is only loaded when needed.
 */

// ── Front view: meshes meaningful from angle=0 ──────
const MUSCLE_3D_FRONT = {
  Pecho: ['Torso_001'],
  Hombros: ['Shoulder_L_001', 'Shoulder_R_001', 'Shoulder_Joint_L_001', 'Shoulder_Joint_R_001'],
  Brazos: ['Biceps_L_001', 'Biceps_R_001', 'Forearm_L_001', 'Forearm_R_001'],
  Core: ['Abdominals_001'],
  Piernas: ['Thigh_L_001', 'Thigh_R_001', 'Knee_L_001', 'Knee_R_001', 'Shinn_L_001', 'Shinn_R_001'],
  Espalda: [],
  'Glúteos': [],
  Cardio: [],
};

// ── Back view: meshes meaningful from angle=π ──────
const MUSCLE_3D_BACK = {
  Pecho: [],
  Hombros: ['Shoulder_L_001', 'Shoulder_R_001', 'Shoulder_Joint_L_001', 'Shoulder_Joint_R_001'],
  Brazos: ['Forearm_L_001', 'Forearm_R_001', 'Elbow_L_001', 'Elbow_R_001'],
  Core: [],
  Piernas: ['Thigh_L_001', 'Thigh_R_001', 'Knee_L_001', 'Knee_R_001', 'Shinn_L_001', 'Shinn_R_001'],
  Espalda: ['Torso_001'],
  'Glúteos': ['Pelvis_001', 'Hip_Joint_L_001', 'Hip_Joint_R_001'],
  Cardio: [],
};

// ── Unified map (union of front+back) for rotating views ──
const MUSCLE_3D_MAP = {};
for (const grupo of Object.keys(MUSCLE_3D_FRONT)) {
  MUSCLE_3D_MAP[grupo] = [...new Set([...(MUSCLE_3D_FRONT[grupo] || []), ...(MUSCLE_3D_BACK[grupo] || [])])];
}

// Camera starting angle (radians around Y-axis) per group
const MUSCLE_CAMERA = {
  Pecho: { angle: 0, lookY: 9 },
  Hombros: { angle: Math.PI / 6, lookY: 10.5 },
  Brazos: { angle: Math.PI / 4, lookY: 8.5 },
  Core: { angle: 0, lookY: 7 },
  Piernas: { angle: 0, lookY: 4.5 },
  Espalda: { angle: Math.PI, lookY: 9 },
  'Glúteos': { angle: Math.PI, lookY: 6 },
  Cardio: { angle: Math.PI / 6, lookY: 7.5 },
};

// Cropped camera settings — zoomed in for category header thumbnails
const MUSCLE_CAMERA_CROPPED = {
  Pecho: { angle: 0, lookY: 9.5, dist: 13 },
  Hombros: { angle: Math.PI / 6, lookY: 11, dist: 12 },
  Brazos: { angle: Math.PI / 4, lookY: 9, dist: 13 },
  Core: { angle: 0, lookY: 7, dist: 13 },
  Piernas: { angle: 0, lookY: 3.5, dist: 14 },
  Espalda: { angle: Math.PI, lookY: 9.5, dist: 13 },
  'Glúteos': { angle: Math.PI, lookY: 5.5, dist: 13 },
  Cardio: { angle: Math.PI / 6, lookY: 7.5, dist: 16 },
};

// ── Per-grupo highlight colors (match CSS tag colors) ──────
const GRUPO_COLORS = {
  Core: 0xBDA8D0,
  Piernas: 0x96B8D6,
  Pecho: 0xD88A82,
  Espalda: 0x85C0A2,
  Brazos: 0xDDB868,
  'Glúteos': 0xD4A0C0,
  Hombros: 0xA8C8D0,
  Cardio: 0xE0826E,
};

// Model base URL (from public/)
const MODEL_URL = `${import.meta.env.BASE_URL}models/body-model.glb`;

// Cache the loaded model scene so we only fetch once
let _modelCache = null;
let _three = null;

async function ensureThree() {
  if (!_three) _three = await import('three');
  return _three;
}

async function ensureModel() {
  const THREE = await ensureThree();
  if (_modelCache) return _modelCache;
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => { _modelCache = gltf.scene; resolve(_modelCache); },
      undefined,
      reject,
    );
  });
}

// ── Shared render helpers ──────────────────────

function createLights(THREE) {
  const lights = [];
  lights.push(new THREE.AmbientLight(0x606060, 1.0));
  const kl = new THREE.DirectionalLight(0xfff5e0, 2.0);
  kl.position.set(3, 12, 6);
  lights.push(kl);
  const fl = new THREE.DirectionalLight(0x8888cc, 0.4);
  fl.position.set(-4, 5, -3);
  lights.push(fl);
  const rl = new THREE.DirectionalLight(0xffd600, 0.3);
  rl.position.set(0, 8, -6);
  lights.push(rl);
  return lights;
}

function createMaterials(THREE) {
  const inactive = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a, roughness: 0.85, metalness: 0.05,
  });
  // Per-grupo colored materials
  const grupoMats = {};
  for (const [grupo, color] of Object.entries(GRUPO_COLORS)) {
    grupoMats[grupo] = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.18, roughness: 0.4, metalness: 0.15,
    });
  }
  // Legacy single active material (fallback)
  const active = grupoMats.Brazos; // kept for compat, rarely used
  return { inactive, active, grupoMats };
}

/**
 * Apply per-grupo colored materials to the model.
 * @param {Object} model - Three.js model
 * @param {Map<string,string>|Set<string>} meshToGrupo - Map<meshName, grupo> OR Set<meshName> for legacy
 * @param {Object} mats - { inactive, grupoMats }
 */
function applyMaterials(model, meshToGrupo, mats) {
  const isMap = meshToGrupo instanceof Map;
  model.traverse((child) => {
    if (child.isMesh) {
      if (isMap) {
        const grupo = meshToGrupo.get(child.name);
        child.material = grupo && mats.grupoMats[grupo] ? mats.grupoMats[grupo] : mats.inactive;
      } else {
        // Legacy Set-based: use first available grupo mat or inactive
        child.material = meshToGrupo.has(child.name) ? (mats.active || mats.inactive) : mats.inactive;
      }
    }
  });
}

function centerModel(model, THREE) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, 0, center.z));
}

/**
 * Build a Map<meshName, grupo> from grupo list using a given muscle map.
 * For meshes claimed by multiple grupos, last one wins.
 */
function buildMeshGrupoMap(grupos, muscleMap) {
  const map = new Map();
  for (const g of grupos) {
    for (const m of (muscleMap[g] || [])) map.set(m, g);
  }
  return map;
}

// ── Prerender cache ──────────────────────────
const _prerenderCache = new Map();

/**
 * Render a single view of the model to a data URL.
 * @param {number} angle - Camera Y-axis angle
 * @param {number} lookY - Camera vertical look-at
 * @param {Map<string,string>|Set<string>} meshToGrupo - Map or Set of active mesh names
 * @param {number} renderSize - Pixel size of the render
 * @param {number} dist - Camera distance
 */
async function renderToDataUrl(angle, lookY, meshToGrupo, renderSize, dist = 26) {
  const THREE = await ensureThree();
  const baseModel = await ensureModel();

  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(renderSize, renderSize);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  createLights(THREE).forEach((l) => scene.add(l));

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(Math.sin(angle) * dist, lookY, Math.cos(angle) * dist);
  camera.lookAt(0, lookY, 0);

  const mats = createMaterials(THREE);
  const model = baseModel.clone();
  centerModel(model, THREE);
  applyMaterials(model, meshToGrupo, mats);
  scene.add(model);

  renderer.render(scene, camera);
  const dataUrl = canvas.toDataURL('image/png');

  renderer.dispose();
  mats.inactive.dispose();
  Object.values(mats.grupoMats).forEach((m) => m.dispose());
  return dataUrl;
}

/**
 * Prerender front+back 3D composite for a set of muscle groups.
 * Returns HTML string: <span class="muscle-composite"><img front><img back></span>
 */
export async function prerenderComposite3D(grupos, size = 32) {
  const key = [...grupos].sort().join(',') + ':' + size;
  if (_prerenderCache.has(key)) return _prerenderCache.get(key);

  const frontMap = buildMeshGrupoMap(grupos, MUSCLE_3D_FRONT);
  const backMap = buildMeshGrupoMap(grupos, MUSCLE_3D_BACK);

  const px = size * 2;
  const [frontUrl, backUrl] = await Promise.all([
    renderToDataUrl(0, 7, frontMap, px),
    renderToDataUrl(Math.PI, 7, backMap, px),
  ]);

  const html = `<span class="muscle-composite">`
    + `<img src="${frontUrl}" width="${size}" height="${size}" class="muscle-3d-prerendered" alt="front">`
    + `<img src="${backUrl}" width="${size}" height="${size}" class="muscle-3d-prerendered" alt="back">`
    + `</span>`;

  _prerenderCache.set(key, html);
  return html;
}

/**
 * Prerender a single 3D view for one muscle group.
 * Returns HTML string: <img> tag.
 */
export async function prerenderSingle3D(grupo, size = 36) {
  const key = 'single:' + grupo + ':' + size;
  if (_prerenderCache.has(key)) return _prerenderCache.get(key);

  const cam = MUSCLE_CAMERA[grupo] || MUSCLE_CAMERA.Pecho;
  // Pick front or back map based on camera angle
  const muscleMap = Math.cos(cam.angle) > 0 ? MUSCLE_3D_FRONT : MUSCLE_3D_BACK;
  const meshMap = buildMeshGrupoMap([grupo], muscleMap);
  const px = size * 2;

  const url = await renderToDataUrl(cam.angle, cam.lookY, meshMap, px);
  const html = `<img src="${url}" width="${size}" height="${size}" class="muscle-3d-prerendered" alt="${grupo}">`;

  _prerenderCache.set(key, html);
  return html;
}

/**
 * Prerender a cropped/zoomed 3D view for one muscle group (category headers).
 * Uses closer camera framing to focus on the specific body area.
 */
export async function prerenderCroppedSingle3D(grupo, size = 36) {
  const key = 'cropped:' + grupo + ':' + size;
  if (_prerenderCache.has(key)) return _prerenderCache.get(key);

  const cam = MUSCLE_CAMERA_CROPPED[grupo] || MUSCLE_CAMERA_CROPPED.Pecho;
  // Pick front or back map based on camera angle
  const muscleMap = Math.cos(cam.angle) > 0 ? MUSCLE_3D_FRONT : MUSCLE_3D_BACK;
  const meshMap = buildMeshGrupoMap([grupo], muscleMap);
  const px = size * 2;

  const url = await renderToDataUrl(cam.angle, cam.lookY, meshMap, px, cam.dist);
  const html = `<img src="${url}" width="${size}" height="${size}" class="muscle-3d-prerendered" alt="${grupo}">`;

  _prerenderCache.set(key, html);
  return html;
}

// ── Shared rotating 3D system ──────────────────
// Uses a SINGLE offscreen WebGL renderer + scene for all card viewers.
// Each viewer is a 2D canvas that receives frames copied from the shared renderer.

const _viewers = [];
let _sharedState = null;
let _tickId = null;

async function ensureSharedState() {
  if (_sharedState) return _sharedState;
  const THREE = await ensureThree();
  const baseModel = await ensureModel();

  const renderer = new THREE.WebGLRenderer({
    canvas: document.createElement('canvas'),
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  createLights(THREE).forEach((l) => scene.add(l));

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  const mats = createMaterials(THREE);
  const model = baseModel.clone();
  centerModel(model, THREE);
  scene.add(model);

  _sharedState = { renderer, scene, camera, model, mats };
  return _sharedState;
}

function startTick() {
  if (_tickId) return;
  let last = 0;

  function tick(t) {
    _tickId = requestAnimationFrame(tick);
    if (t - last < 33) return; // ~30fps
    last = t;

    // Clean disconnected viewers
    for (let i = _viewers.length - 1; i >= 0; i--) {
      if (!_viewers[i].canvas.isConnected) _viewers.splice(i, 1);
    }

    if (!_viewers.length || !_sharedState) {
      cancelAnimationFrame(_tickId);
      _tickId = null;
      return;
    }

    const { renderer, scene, camera, model, mats } = _sharedState;
    let lastSize = 0;

    for (const v of _viewers) {
      if (!v.visible) continue;

      v.angle += 0.008;
      const dist = v.camDist || 28;

      if (v.renderSize !== lastSize) {
        renderer.setSize(v.renderSize, v.renderSize);
        lastSize = v.renderSize;
      }

      camera.position.set(Math.sin(v.angle) * dist, v.lookY, Math.cos(v.angle) * dist);
      camera.lookAt(0, v.lookY, 0);

      // Angle-dependent map: front when cos>0, back when cos<0
      const isFront = Math.cos(v.angle) > 0;
      const map = isFront ? (v.frontMap || v.activeNames) : (v.backMap || v.activeNames);
      applyMaterials(model, map, mats);
      renderer.render(scene, camera);

      v.ctx.clearRect(0, 0, v.renderSize, v.renderSize);
      v.ctx.drawImage(renderer.domElement, 0, 0);
    }
  }

  _tickId = requestAnimationFrame(tick);
}

/**
 * Mount a rotating 3D viewer inside a container, using the shared renderer.
 * Multiple viewers share ONE WebGL context to avoid browser context limits.
 * @param {HTMLElement} container - DOM element to render into
 * @param {string[]} grupos - Array of muscle group names
 * @param {number} displaySize - CSS pixel size of the canvas
 * @returns {Promise<() => void>} Cleanup function
 */
export async function mountRotating3D(container, grupos, displaySize = 80) {
  await ensureSharedState();

  const renderSize = displaySize * 2;
  const canvas = document.createElement('canvas');
  canvas.width = renderSize;
  canvas.height = renderSize;
  canvas.style.width = displaySize + 'px';
  canvas.style.height = displaySize + 'px';
  canvas.style.display = 'block';
  canvas.style.borderRadius = '6px';

  const ctx = canvas.getContext('2d');
  container.innerHTML = '';
  container.appendChild(canvas);

  // Angle-dependent maps: front (cos>0) and back (cos<0)
  const frontMap = buildMeshGrupoMap(grupos, MUSCLE_3D_FRONT);
  const backMap = buildMeshGrupoMap(grupos, MUSCLE_3D_BACK);

  const viewer = {
    canvas, ctx, renderSize,
    frontMap, backMap,
    activeNames: frontMap, // initial frame is front
    angle: 0,
    lookY: 7,
    camDist: 28,
    visible: true,
  };

  // Pause animation when off-screen
  const observer = new IntersectionObserver(([entry]) => {
    viewer.visible = entry.isIntersecting;
  }, { threshold: 0 });
  observer.observe(canvas);

  _viewers.push(viewer);
  startTick();

  // Render first frame immediately (front view)
  const { renderer, scene, camera, model, mats } = _sharedState;
  renderer.setSize(renderSize, renderSize);
  camera.position.set(0, 7, 28);
  camera.lookAt(0, 7, 0);
  applyMaterials(model, frontMap, mats);
  renderer.render(scene, camera);
  ctx.drawImage(renderer.domElement, 0, 0);

  return () => {
    observer.disconnect();
    const idx = _viewers.indexOf(viewer);
    if (idx !== -1) _viewers.splice(idx, 1);
    canvas.remove();
  };
}

// ── Live 3D viewer (rotating, for exercise detail modal) ──

/**
 * Mount a live 3D muscle viewer inside a container element.
 * @param {HTMLElement} container - DOM element to render into
 * @param {string} grupo - Muscle group name (e.g. 'Pecho', 'Core')
 * @returns {Promise<() => void>} Cleanup function to call on unmount
 */
export async function mountMuscle3D(container, grupo) {
  const THREE = await ensureThree();

  const canvas = document.createElement('canvas');
  canvas.className = 'muscle-3d-canvas';
  container.appendChild(canvas);

  const size = 320;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  createLights(THREE).forEach((l) => scene.add(l));

  // Full-body framing: show head to feet, start from the grupo's preferred angle
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const cam = MUSCLE_CAMERA[grupo] || MUSCLE_CAMERA.Pecho;
  const camDist = 30;
  const lookY = 7;
  let angle = cam.angle;
  camera.position.set(Math.sin(angle) * camDist, lookY, Math.cos(angle) * camDist);
  camera.lookAt(0, lookY, 0);

  const mats = createMaterials(THREE);
  const frontMap = buildMeshGrupoMap([grupo], MUSCLE_3D_FRONT);
  const backMap = buildMeshGrupoMap([grupo], MUSCLE_3D_BACK);
  let currentMap = Math.cos(angle) > 0 ? frontMap : backMap;

  try {
    const baseModel = await ensureModel();
    const model = baseModel.clone();
    centerModel(model, THREE);
    applyMaterials(model, currentMap, mats);
    scene.add(model);
  } catch (err) {
    console.warn('[muscle-3d] Failed to load model:', err);
    return () => {};
  }

  let animId = null;
  let disposed = false;

  function animate() {
    if (disposed) return;
    angle += 0.004;
    camera.position.x = Math.sin(angle) * camDist;
    camera.position.z = Math.cos(angle) * camDist;
    camera.lookAt(0, lookY, 0);
    // Switch front/back map based on camera angle
    const newMap = Math.cos(angle) > 0 ? frontMap : backMap;
    if (newMap !== currentMap) {
      currentMap = newMap;
      const baseModel2 = scene.children.find((c) => c.isGroup || c.isObject3D);
      if (baseModel2) applyMaterials(baseModel2, currentMap, mats);
    }
    renderer.render(scene, camera);
    animId = requestAnimationFrame(animate);
  }
  animate();

  return () => {
    disposed = true;
    if (animId) cancelAnimationFrame(animId);
    renderer.dispose();
    mats.inactive.dispose();
    Object.values(mats.grupoMats).forEach((m) => m.dispose());
    scene.traverse((child) => {
      if (child.isMesh) child.geometry.dispose();
    });
    canvas.remove();
  };
}
