/**
 * 3D kettlebell renderer — shared between splash screen and login page.
 * Loads asynchronously so the SVG fallback shows instantly while Three.js + GLB load.
 * Caches the loaded model for instant re-use on subsequent mounts.
 */

let _splashCleanup = null;
let _loginCleanup = null;
let _cachedGltfScene = null;
let _sharedDracoLoader = null;

function updateProgress(pct) {
  const bar = document.getElementById('splash-progress-bar');
  if (bar) bar.style.width = `${Math.min(pct, 100)}%`;
}

async function setupKettlebell3D(container, size, onProgress) {
  const THREE = await import('three');

  if (onProgress) onProgress(30);

  // Set up renderer — optimized settings
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  renderer.setSize(size, size);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 10, 30);
  camera.lookAt(0, 7, 0);

  // Lighting — simplified (2 lights instead of 4)
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const keyLight = new THREE.DirectionalLight(0xffe8cc, 2.0);
  keyLight.position.set(3, 12, 8);
  scene.add(keyLight);

  // Load or reuse cached model
  let model;
  if (_cachedGltfScene) {
    model = _cachedGltfScene.clone();
    if (onProgress) onProgress(95);
  } else {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');

    const loader = new GLTFLoader();
    if (!_sharedDracoLoader) {
      _sharedDracoLoader = new DRACOLoader();
      _sharedDracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
      _sharedDracoLoader.setDecoderConfig({ type: 'js' });
    }
    loader.setDRACOLoader(_sharedDracoLoader);
    const basePath = import.meta.env.BASE_URL || '/';

    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        `${basePath}models/kettlebell.glb`,
        resolve,
        (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(30 + (event.loaded / event.total) * 60);
          }
        },
        reject
      );
    });

    if (onProgress) onProgress(95);

    // Cache the original scene for future clones
    _cachedGltfScene = gltf.scene;
    model = _cachedGltfScene.clone();
  }

  // Center the model
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  // Scale to fit nicely
  const maxDim = box.getSize(new THREE.Vector3()).length();
  model.scale.setScalar(12 / maxDim);

  // Recenter after scale
  const box2 = new THREE.Box3().setFromObject(model);
  const center2 = box2.getCenter(new THREE.Vector3());
  model.position.y -= center2.y - 7;

  scene.add(model);

  // Replace fallback content with canvas
  const canvas = renderer.domElement;
  canvas.style.cssText = `display:block;width:${size}px;height:${size}px;`;
  container.innerHTML = '';
  container.appendChild(canvas);

  if (onProgress) onProgress(100);

  // Animation loop
  let running = true;
  let angle = 0;

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    angle += 0.012;
    model.rotation.y = angle;
    renderer.render(scene, camera);
  }
  animate();

  return () => {
    running = false;
    renderer.dispose();
    scene.clear();
  };
}

// ── Splash screen ────────────────────────────

export async function mountSplash3D() {
  const container = document.querySelector('.splash-neumorph');
  if (!container) return;

  updateProgress(10);

  try {
    _splashCleanup = await setupKettlebell3D(container, 120, updateProgress);
  } catch (err) {
    console.warn('[splash-3d] Failed to load kettlebell:', err.message);
    updateProgress(100);
  }
}

export function cleanupSplash3D() {
  if (_splashCleanup) {
    _splashCleanup();
    _splashCleanup = null;
  }
}

// ── Login screen ─────────────────────────────

export async function mountLoginKettlebell() {
  const container = document.getElementById('login-kb-container');
  if (!container) return;

  try {
    _loginCleanup = await setupKettlebell3D(container, 140, null);
  } catch (err) {
    console.warn('[login-3d] Failed to load kettlebell:', err.message);
  }
}

export function cleanupLoginKettlebell() {
  if (_loginCleanup) {
    _loginCleanup();
    _loginCleanup = null;
  }
}
