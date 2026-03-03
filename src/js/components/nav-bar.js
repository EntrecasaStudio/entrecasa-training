import { icon } from '@js/icons.js';

export function renderNavBar(activeTab = 'entrenamiento') {
  return `
    <nav class="nav-bottom" role="navigation" aria-label="Menu principal">
      <a href="#/" class="nav-bottom-item ${activeTab === 'entrenamiento' ? 'active' : ''}" aria-label="Entreno" ${activeTab === 'entrenamiento' ? 'aria-current="page"' : ''}>
        <span class="nav-bottom-icon" aria-hidden="true">${icon.dumbbell}</span>
        <span>Entreno</span>
      </a>
      <a href="#/rutinas" class="nav-bottom-item ${activeTab === 'rutinas' ? 'active' : ''}" aria-label="Rutinas" ${activeTab === 'rutinas' ? 'aria-current="page"' : ''}>
        <span class="nav-bottom-icon" aria-hidden="true">${icon.clipboard}</span>
        <span>Rutinas</span>
      </a>
      <a href="#/progreso" class="nav-bottom-item ${activeTab === 'progreso' ? 'active' : ''}" aria-label="Progreso" ${activeTab === 'progreso' ? 'aria-current="page"' : ''}>
        <span class="nav-bottom-icon" aria-hidden="true">${icon.trophy}</span>
        <span>Progreso</span>
      </a>
      <a href="#/ejercicios" class="nav-bottom-item ${activeTab === 'ejercicios' ? 'active' : ''}" aria-label="Ejercicios" ${activeTab === 'ejercicios' ? 'aria-current="page"' : ''}>
        <span class="nav-bottom-icon" aria-hidden="true">${icon.list}</span>
        <span>Ejercicios</span>
      </a>
      <a href="#/historial" class="nav-bottom-item ${activeTab === 'historial' ? 'active' : ''}" aria-label="Historial" ${activeTab === 'historial' ? 'aria-current="page"' : ''}>
        <span class="nav-bottom-icon" aria-hidden="true">${icon.barChart}</span>
        <span>Historial</span>
      </a>
    </nav>
  `;
}
