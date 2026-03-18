import { getSesiones, getUsuarioActivo, calcVolumenSesion, deleteSesion, restoreSesion } from '@/store.js';
import { navigate } from '@/router.js';
import { icon, iconLg } from '@js/icons.js';
import { showToastAction } from '@js/components/toast.js';

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function getMonthLabel(isoStr) {
  const d = new Date(isoStr);
  const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getUniqueMuscleGroups(sesion) {
  const groups = new Set();
  for (const c of sesion.circuitos) {
    const gm = c.grupoMuscular;
    if (gm) {
      for (const g of (Array.isArray(gm) ? gm : [gm])) groups.add(g);
    }
  }
  return [...groups];
}

const TAG_CLASS = {
  Core: 'tag-core',
  Piernas: 'tag-piernas',
  Pecho: 'tag-pecho',
  Espalda: 'tag-espalda',
  Brazos: 'tag-brazos',
  Gluteos: 'tag-gluteos',
  'Glúteos': 'tag-gluteos',
  Hombros: 'tag-hombros',
  Cardio: 'tag-cardio',
};

let cardIdx = 0;

function renderSesionCard(sesion) {
  const totalEjercicios = sesion.circuitos.reduce((sum, c) => sum + c.ejercicios.length, 0);
  const volumen = Math.round(calcVolumenSesion(sesion));
  const groups = getUniqueMuscleGroups(sesion);
  const delay = cardIdx++ * 60;

  const tags = groups
    .map((g) => `<span class="tag tag-sm ${TAG_CLASS[g] || ''}">${g}</span>`)
    .join('');

  return `
    <div class="sesion-swipe-container animate-in" style="animation-delay:${delay}ms" data-sesion-id="${sesion.id}">
      <div class="sesion-swipe-actions">
        <button class="sesion-swipe-btn sesion-swipe-edit" data-action="edit-sesion" data-id="${sesion.id}">${icon.edit}</button>
        <button class="sesion-swipe-btn sesion-swipe-delete" data-action="delete-sesion" data-id="${sesion.id}">${icon.trash}</button>
      </div>
      <div class="sesion-swipe-content">
        <div class="card sesion-card" data-action="detail" data-id="${sesion.id}">
          <div class="sesion-card-top">
            <div class="sesion-card-date">${formatDate(sesion.fecha)}</div>
            <div class="sesion-card-tags">${tags}</div>
          </div>
          <div class="sesion-card-name">${sesion.rutinaNombre}</div>
          <div class="sesion-card-stats">
            <span><span class="sesion-card-stat-value">${sesion.duracionMin}</span> min</span>
            <span><span class="sesion-card-stat-value">${volumen.toLocaleString()}</span> kg vol</span>
            <span><span class="sesion-card-stat-value">${totalEjercicios}</span> ej</span>
            <span><span class="sesion-card-stat-value">${sesion.circuitos.length}</span> circ</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function render() {
  cardIdx = 0;
  const usuario = getUsuarioActivo();
  const sesiones = getSesiones().filter((s) => !s.usuario || s.usuario === usuario);

  if (sesiones.length === 0) {
    return `
      <div class="view-header">
        <div class="view-header-title">Historial</div>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">${iconLg('barChart')}</div>
        <div class="empty-state-text">Aun no tienes entrenamientos registrados.<br>Inicia una rutina para ver tu historial.</div>
        <a href="#/" class="btn btn-primary" style="margin-top:var(--space-md)">Ir a rutinas</a>
      </div>
    `;
  }

  // Group by month
  let currentMonth = '';
  let html = '';

  for (const sesion of sesiones) {
    const month = getMonthLabel(sesion.fecha);
    if (month !== currentMonth) {
      currentMonth = month;
      html += `<div class="historial-month-header animate-in" style="animation-delay:${cardIdx * 60}ms">${month}</div>`;
    }
    html += renderSesionCard(sesion);
  }

  return `
    <div class="view-header">
      <div class="view-header-title">Historial</div>
    </div>
    ${html}
  `;
}

export function mount(params) {
  const app = document.getElementById('app');

  // ── Swipe state ──
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeTarget = null;
  let swipeDeltaX = 0;
  let swipeActive = false;
  let swipeBlocked = false;
  let wasSwiped = false;
  let directionLocked = false;

  const SWIPE_DEAD_ZONE = 30;

  function closeAllSwipes(except) {
    app.querySelectorAll('.sesion-swipe-content').forEach((el) => {
      if (el !== except) {
        el.style.transition = 'transform 0.2s ease';
        el.style.transform = '';
        el.closest('.sesion-swipe-container')?.classList.remove('swiped');
      }
    });
  }

  function rerender() {
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = render();
      mount(params);
    }
  }

  const handleTouchStart = (e) => {
    const content = e.target.closest('.sesion-swipe-content');
    if (!content) return;
    swipeTarget = content;
    swipeDeltaX = 0;
    swipeActive = false;
    directionLocked = false;
    wasSwiped = content.closest('.sesion-swipe-container')?.classList.contains('swiped') || false;
    const touch = e.touches[0];
    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
  };

  const handleTouchMove = (e) => {
    if (!swipeTarget) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeStartX;
    const dy = touch.clientY - swipeStartY;

    if (!directionLocked) {
      if (Math.abs(dx) < SWIPE_DEAD_ZONE && Math.abs(dy) < SWIPE_DEAD_ZONE) return;

      directionLocked = true;

      if (Math.abs(dy) >= Math.abs(dx)) {
        swipeTarget = null;
        return;
      }

      if (dx > 0 && !wasSwiped) {
        swipeTarget = null;
        return;
      }

      swipeActive = true;
      swipeTarget.style.transition = 'none';
      closeAllSwipes(swipeTarget);
    }

    if (!swipeActive) return;
    e.preventDefault();
    swipeDeltaX = Math.max(-140, Math.min(0, dx));
    swipeTarget.style.transform = `translateX(${swipeDeltaX}px)`;
  };

  const handleTouchEnd = () => {
    if (!swipeTarget) return;
    swipeTarget.style.transition = 'transform 0.2s ease';
    if (swipeDeltaX < -60) {
      swipeTarget.style.transform = 'translateX(-140px)';
      swipeTarget.closest('.sesion-swipe-container')?.classList.add('swiped');
    } else {
      swipeTarget.style.transform = '';
      swipeTarget.closest('.sesion-swipe-container')?.classList.remove('swiped');
    }

    // Block the subsequent click event if swipe was active or card was already swiped open
    if (swipeActive || wasSwiped) {
      swipeBlocked = true;
      setTimeout(() => { swipeBlocked = false; }, 300);
    }

    swipeTarget = null;
    swipeActive = false;
    directionLocked = false;
    wasSwiped = false;
  };

  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
      case 'detail':
        if (swipeBlocked) return;
        closeAllSwipes();
        navigate(`/sesion/${id}`);
        break;

      case 'edit-sesion':
        navigate(`/sesion/${id}`);
        break;

      case 'delete-sesion':
        deleteSesion(id);
        rerender();
        showToastAction('Sesion eliminada', 'Deshacer', () => {
          restoreSesion(id);
          rerender();
        }, { duration: 6000 });
        break;
    }
  };

  app.addEventListener('click', handleClick);
  app.addEventListener('touchstart', handleTouchStart, { passive: true });
  app.addEventListener('touchmove', handleTouchMove, { passive: false });
  app.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    app.removeEventListener('click', handleClick);
    app.removeEventListener('touchstart', handleTouchStart);
    app.removeEventListener('touchmove', handleTouchMove);
    app.removeEventListener('touchend', handleTouchEnd);
  };
}
