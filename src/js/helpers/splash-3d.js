/**
 * 3D kettlebell renderer — shared between splash screen and login page.
 * Loads asynchronously so the SVG fallback shows instantly while Three.js + GLB load.
 * Caches the loaded model for instant re-use on subsequent mounts.
 */

let _splashCleanup = null;
let _loginCleanup = null;
let _cachedGltfScene = null;
let _sharedDracoLoader = null;

// Track when splash 3D is ready so hideSplash can wait for it
let _splashReadyResolve = null;
export const splashReady = new Promise((resolve) => { _splashReadyResolve = resolve; });

function updateProgress(pct) {
  const bar = document.getElementById('splash-progress-bar');
  if (bar) bar.style.width = `${Math.min(pct, 100)}%`;
}

/**
 * Add flat black discs on front and back faces of the kettlebell body.
 */
function addBlackDiscs(THREE, model) {
  try {
    // Find the kettlebell mesh (single mesh: body + handle)
    let bodyMesh = null;
    let maxVerts = 0;
    model.traverse((child) => {
      if (child.isMesh) {
        const count = child.geometry.attributes.position?.count || 0;
        if (count > maxVerts) {
          maxVerts = count;
          bodyMesh = child;
        }
      }
    });
    if (!bodyMesh) return;

    // Use bounding box to estimate body sphere
    bodyMesh.geometry.computeBoundingBox();
    const bbox = bodyMesh.geometry.boundingBox;
    const bboxSize = bbox.getSize(new THREE.Vector3());

    // Body depth (Z) gives the front-surface distance from center
    const bodyDepthZ = bboxSize.z / 2;

    // Body center: body sphere sits at the bottom, radius ~ X half-extent
    const bodyRadiusX = bboxSize.x / 2;
    const bodyCenterGeom = new THREE.Vector3(
      (bbox.min.x + bbox.max.x) / 2,
      bbox.min.y + bodyRadiusX,
      (bbox.min.z + bbox.max.z) / 2,
    );

    // Convert body center: geometry -> world -> model-local
    const bodyCenterWorld = bodyCenterGeom.clone();
    bodyMesh.localToWorld(bodyCenterWorld);
    const bodyCenterLocal = model.worldToLocal(bodyCenterWorld);

    // Disc matches the body's front circular profile (slight inset)
    const discRadius = bodyDepthZ * 0.85;

    // Shared geometry and material — plain black
    const disc = new THREE.CircleGeometry(discRadius, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.FrontSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });

    // Front face (+Z)
    const front = new THREE.Mesh(disc, mat);
    front.position.copy(bodyCenterLocal);
    front.position.z += bodyDepthZ * 1.005;
    model.add(front);

    // Back face (-Z) — rotate 180deg around Y so disc faces outward
    const back = new THREE.Mesh(disc, mat);
    back.position.copy(bodyCenterLocal);
    back.position.z -= bodyDepthZ * 1.005;
    back.rotation.y = Math.PI;
    model.add(back);
  } catch {
    // Decorative — fail silently
  }
}

async function setupKettlebell3D(container, size, onProgress) {
  const THREE = await import('three');

  if (onProgress) onProgress(30);

  // Set up renderer — full quality
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(size, size);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 10, 30);
  camera.lookAt(0, 7, 0);

  // Lighting — bright white + warm fill for vivid yellow kettlebell
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(3, 12, 8);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xfff0cc, 1.0);
  fillLight.position.set(-4, 6, -6);
  scene.add(fillLight);

  // Load or reuse cached model
  const basePath = import.meta.env.BASE_URL || '/';
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

  // Recolor model to vivid yellow (#FFCD00)
  const kbColor = new THREE.Color(0xffcd00);
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      const mat = child.material.clone();
      mat.color.set(kbColor);
      mat.emissive = new THREE.Color(0x000000);
      if (mat.metalness !== undefined) { mat.metalness = 0.15; mat.roughness = 0.35; }
      // Remove any maps that could override the yellow
      mat.map = null;
      mat.emissiveMap = null;
      child.material = mat;
    }
  });

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

  // ── Black discs on front + back of kettlebell body ──
  addBlackDiscs(THREE, model);

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
  if (!container) { _splashReadyResolve(); return; }

  updateProgress(10);

  try {
    _splashCleanup = await setupKettlebell3D(container, 120, updateProgress);
    // Wait for several frames to ensure canvas is painted and visible
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
  } catch (err) {
    console.warn('[splash-3d] Failed to load kettlebell:', err.message);
    updateProgress(100);
  }
  _splashReadyResolve();
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
