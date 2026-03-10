/**
 * Splash screen 3D kettlebell — replaces the SVG icon with a rotating 3D model.
 * Loads asynchronously so the SVG shows instantly while Three.js + GLB load.
 */

let _cleanup = null;

function updateProgress(pct) {
  const bar = document.getElementById('splash-progress-bar');
  if (bar) bar.style.width = `${Math.min(pct, 100)}%`;
}

export async function mountSplash3D() {
  const container = document.querySelector('.splash-neumorph');
  if (!container) return;

  updateProgress(10); // Three.js loading started

  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');

  updateProgress(30); // Three.js loaded

  // Set up renderer
  const size = 120; // match neumorphic card size
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
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

  // Lighting — warm studio setup
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffe8cc, 1.8);
  keyLight.position.set(3, 12, 8);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xccddff, 0.6);
  fillLight.position.set(-4, 6, -3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffcc88, 0.4);
  rimLight.position.set(0, 8, -8);
  scene.add(rimLight);

  // Load kettlebell model with progress (Draco-compressed)
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  dracoLoader.setDecoderConfig({ type: 'js' });
  loader.setDRACOLoader(dracoLoader);
  const basePath = import.meta.env.BASE_URL || '/';

  try {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        `${basePath}models/kettlebell.glb`,
        resolve,
        (event) => {
          if (event.lengthComputable) {
            const pct = 30 + (event.loaded / event.total) * 60; // 30% → 90%
            updateProgress(pct);
          }
        },
        reject
      );
    });

    updateProgress(95);

    const model = gltf.scene;

    // Center the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Scale to fit nicely
    const maxDim = box.getSize(new THREE.Vector3()).length();
    const scale = 12 / maxDim;
    model.scale.setScalar(scale);

    // Recenter after scale
    const box2 = new THREE.Box3().setFromObject(model);
    const center2 = box2.getCenter(new THREE.Vector3());
    model.position.y -= center2.y - 7; // center vertically around y=7

    scene.add(model);

    // Replace SVG with canvas
    const canvas = renderer.domElement;
    canvas.style.cssText = 'display:block;width:120px;height:120px;';
    container.innerHTML = '';
    container.appendChild(canvas);

    updateProgress(100);

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

    _cleanup = () => {
      running = false;
      renderer.dispose();
      dracoLoader.dispose();
      scene.clear();
    };
  } catch (err) {
    console.warn('[splash-3d] Failed to load kettlebell:', err.message);
    updateProgress(100); // complete bar even on error
    // Keep SVG fallback
  }
}

export function cleanupSplash3D() {
  if (_cleanup) {
    _cleanup();
    _cleanup = null;
  }
}
