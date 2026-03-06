import { icon } from '@js/icons.js';
import { haptic } from '@js/helpers/haptics.js';

const TAB_MAP = {
  entrenamiento: '#/',
  rutinas: '#/rutinas',
  progreso: '#/progreso',
  ejercicios: '#/ejercicios',
  historial: '#/historial',
};

function navHTML() {
  return `
    <nav class="nav-bottom" role="navigation" aria-label="Menu principal">
      <a href="#/" class="nav-bottom-item" data-tab="entrenamiento" aria-label="Entreno">
        <span class="nav-bottom-icon" aria-hidden="true">${icon.kettlebell}</span>
        <span>Entreno</span>
      </a>
      <a href="#/rutinas" class="nav-bottom-item" data-tab="rutinas" aria-label="Rutinas">
        <span class="nav-bottom-icon" aria-hidden="true">${icon.clipboard}</span>
        <span>Rutinas</span>
      </a>
      <a href="#/progreso" class="nav-bottom-item" data-tab="progreso" aria-label="Progreso">
        <span class="nav-bottom-icon" aria-hidden="true">${icon.trophy}</span>
        <span>Progreso</span>
      </a>
      <a href="#/ejercicios" class="nav-bottom-item" data-tab="ejercicios" aria-label="Ejercicios">
        <span class="nav-bottom-icon" aria-hidden="true">${icon.list}</span>
        <span>Ejercicios</span>
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
}

/** Show/hide the nav bar (hide during workout, etc.) */
export function setNavBarVisible(visible) {
  const container = document.getElementById('nav-bar');
  if (container) container.style.display = visible ? '' : 'none';
}
