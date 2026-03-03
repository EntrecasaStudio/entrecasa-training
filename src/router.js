const routes = [
  { pattern: /^#?\/?$/, load: () => import('@js/views/home.js') },
  { pattern: /^#\/rutinas$/, load: () => import('@js/views/rutinas.js') },
  { pattern: /^#\/rutina\/nueva$/, load: () => import('@js/views/rutina-form.js'), params: { mode: 'crear' } },
  { pattern: /^#\/rutina\/editar\/(.+)$/, load: () => import('@js/views/rutina-form.js'), params: { mode: 'editar' } },
  { pattern: /^#\/workout\/(.+)$/, load: () => import('@js/views/workout.js') },
  { pattern: /^#\/progreso$/, load: () => import('@js/views/progreso.js') },
  { pattern: /^#\/ejercicios$/, load: () => import('@js/views/ejercicios.js') },
  { pattern: /^#\/historial$/, load: () => import('@js/views/historial.js') },
  { pattern: /^#\/summary\/(.+)$/, load: () => import('@js/views/workout-summary.js') },
  { pattern: /^#\/sesion\/(.+)$/, load: () => import('@js/views/sesion-detalle.js') },
];

let currentCleanup = null;
let isTransitioning = false;

async function handleRoute() {
  const hash = window.location.hash || '#/';
  const app = document.getElementById('app');

  for (const route of routes) {
    const match = hash.match(route.pattern);
    if (match) {
      // Cleanup previous view
      if (currentCleanup) {
        currentCleanup();
        currentCleanup = null;
      }

      // Exit animation (skip on first load)
      if (app.innerHTML.trim() && !isTransitioning) {
        isTransitioning = true;
        app.classList.add('view-exiting');
        await new Promise((r) => setTimeout(r, 120));
        app.classList.remove('view-exiting');
      }

      const mod = await route.load();
      const params = { ...(route.params || {}), id: match[1] || null };

      app.innerHTML = mod.render(params);

      // Enter animation
      app.classList.add('view-entering');
      app.addEventListener(
        'animationend',
        () => {
          app.classList.remove('view-entering');
          isTransitioning = false;
        },
        { once: true },
      );

      if (mod.mount) {
        currentCleanup = mod.mount(params) || null;
      }
      return;
    }
  }

  // Fallback: go home
  navigate('/');
}

export function navigate(path) {
  const target = path.startsWith('#') ? path : '#' + path;
  if (window.location.hash === target) {
    handleRoute(); // Force re-render on same route
  } else {
    window.location.hash = path;
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
