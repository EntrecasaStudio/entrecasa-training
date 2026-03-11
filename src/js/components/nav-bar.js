import { icon } from '@js/icons.js';
import { haptic } from '@js/helpers/haptics.js';
import { navigate } from '@/router.js';

const TAB_MAP = {
  entrenamiento: '#/',
  rutinas: '#/rutinas',
  progreso: '#/progreso',
  ejercicios: '#/ejercicios',
  historial: '#/historial',
};

let _mainBtnRutinaId = null; // when set, center button acts as "start workout"

function navHTML() {
  return `
    <nav class="nav-bottom" role="navigation" aria-label="Menu principal">
      <a href="#/rutinas" class="nav-bottom-item" data-tab="rutinas" aria-label="Rutinas">
        <span class="nav-bottom-icon" aria-hidden="true">${icon.clipboard}</span>
        <span>Rutinas</span>
      </a>
      <a href="#/ejercicios" class="nav-bottom-item" data-tab="ejercicios" aria-label="Ejercicios">
        <span class="nav-bottom-icon" aria-hidden="true">${icon.list}</span>
        <span>Ejercicios</span>
      </a>
      <a href="#/" class="nav-bottom-item nav-bottom-main" data-tab="entrenamiento" aria-label="Entreno">
        <span class="nav-bottom-main-btn" aria-hidden="true">${icon.kettlebell}</span>
        <span>Entreno</span>
      </a>
      <a href="#/progreso" class="nav-bottom-item" data-tab="progreso" aria-label="Progreso">
        <span class="nav-bottom-icon" aria-hidden="true">${icon.trophy}</span>
        <span>Progreso</span>
      </a>
      <a href="#/historial" class="nav-bottom-item" data-tab="historial" aria-label="Historial">
        <span class="nav-bottom-icon" aria-hidden="true">${icon.barChart}</span>
        <span>Historial</span>
      </a>
    </nav>
  `;
}

/** Render nav once into #nav-bar container */
export function mountNavBar() {
  const container = document.getElementById('nav-bar');
  if (!container) return;
  container.innerHTML = navHTML();

  // Haptic + icon bounce on tab tap
  container.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-bottom-item');
    if (!item) return;

    haptic.light();

    // If center button has a rutina to start, intercept and navigate to workout
    if (item.dataset.tab === 'entrenamiento' && _mainBtnRutinaId) {
      e.preventDefault();
      navigate(`/workout/${_mainBtnRutinaId}`);
      return;
    }

    // Bounce animation
    item.classList.add('nav-icon-bounce');
    item.addEventListener('animationend', () => {
      item.classList.remove('nav-icon-bounce');
    }, { once: true });
  });
}

/** Update active tab class without re-rendering */
export function setActiveTab(tab) {
  const container = document.getElementById('nav-bar');
  if (!container) return;
  container.querySelectorAll('.nav-bottom-item').forEach((el) => {
    const isActive = el.dataset.tab === tab;
    el.classList.toggle('active', isActive);
    if (isActive) {
      el.setAttribute('aria-current', 'page');
    } else {
      el.removeAttribute('aria-current');
    }
  });
  // Reset center button to kettlebell when leaving Entreno
  if (tab !== 'entrenamiento') {
    updateMainButton(null);
  }
}

/**
 * Switch center button between kettlebell (default) and play (when routine available).
 * @param {string|null} rutinaId — if truthy, show play icon and start this workout on tap
 */
export function updateMainButton(rutinaId) {
  _mainBtnRutinaId = rutinaId || null;
  const container = document.getElementById('nav-bar');
  if (!container) return;
  const btn = container.querySelector('.nav-bottom-main-btn');
  if (!btn) return;
  btn.innerHTML = _mainBtnRutinaId ? icon.play : icon.kettlebell;
}

/** Show/hide the nav bar (hide during workout, etc.) */
export function setNavBarVisible(visible) {
  const container = document.getElementById('nav-bar');
  if (container) container.style.display = visible ? '' : 'none';
}
