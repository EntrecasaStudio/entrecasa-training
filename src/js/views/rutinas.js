import {
  getRutinas,
  getUsuarioActivo,
  deleteRutina,
  duplicateRutina,
} from '@/store.js';
import { navigate } from '@/router.js';
import { showModal } from '@js/components/modal.js';
import { showToast } from '@js/components/toast.js';
import { icon, iconLg } from '@js/icons.js';
import {
  TAG_CLASS,
  DIAS_LABEL,
  renderTags,
  renderLastDone,
  showPreview,
} from '@js/helpers/rutina-helpers.js';

// ── Rutina card ──────────────────────────────

let cardCounter = 0;

function renderRutinaCard(rutina) {
  const dia = DIAS_LABEL[rutina.diaSemana] || '';
  const numero = rutina.numero;

  // Badge: day-of-week for scheduled, "DÍA X" for biblioteca
  let badge = '';
  if (dia) {
    badge = `<div class="rutina-card-day">${dia}</div>`;
  } else if (numero) {
    badge = `<div class="rutina-card-day">Día ${numero}</div>`;
  }

  const delay = cardCounter++ * 60;

  return `
    <div class="rutina-card card animate-in" style="animation-delay:${delay}ms" data-rutina-id="${rutina.id}">
      ${badge}
      <div class="rutina-card-name">${rutina.nombre}</div>
      <div class="rutina-card-tags">${renderTags(rutina, true)}</div>
      <div class="rutina-card-footer">
        <span class="rutina-card-meta">${renderLastDone(rutina)}</span>
        <div class="rutina-card-actions">
          <button class="btn-icon-action" data-action="start" data-id="${rutina.id}">${icon.play}</button>
          <button class="btn-icon-action" data-action="duplicate" data-id="${rutina.id}">${icon.copy}</button>
          <button class="btn-icon-action" data-action="edit" data-id="${rutina.id}">${icon.edit}</button>
        </div>
      </div>
    </div>
  `;
}

function renderSection(title, count, rutinas, spaced = false) {
  if (rutinas.length === 0) return '';
  return `
    <div class="section-header ${spaced ? 'section-header-spaced' : ''}">
      <span class="section-title">${title} <span class="section-count">(${count})</span></span>
    </div>
    <div class="rutinas-list">${rutinas.map(renderRutinaCard).join('')}</div>
  `;
}

// ── Render ────────────────────────────────────

export function render() {
  cardCounter = 0;
  const usuario = getUsuarioActivo();
  const rutinasUsuario = getRutinas().filter((r) => r.usuario === usuario);

  const programadas = rutinasUsuario
    .filter((r) => r.diaSemana != null)
    .sort((a, b) => a.diaSemana - b.diaSemana);

  const gimnasio = rutinasUsuario
    .filter((r) => r.tipo === 'gimnasio')
    .sort((a, b) => (b.numero || 0) - (a.numero || 0));

  const cross = rutinasUsuario
    .filter((r) => r.tipo === 'cross')
    .sort((a, b) => (b.numero || 0) - (a.numero || 0));

  const header = `
    <div class="rutinas-header">
      <h1 class="rutinas-title">Rutinas</h1>
      <button class="btn-icon-header" data-action="new-rutina">
        ${icon.plus}
      </button>
    </div>
  `;

  let content = '';

  if (rutinasUsuario.length === 0) {
    content = `
      <div class="empty-state">
        <div class="empty-state-icon">${iconLg('dumbbell')}</div>
        <div class="empty-state-text">No tienes rutinas creadas.<br>Crea tu primera rutina para empezar.</div>
        <button class="btn btn-primary" data-action="new-rutina">${icon.plus} Nueva rutina</button>
      </div>`;
  } else {
    content += renderSection('Programadas', programadas.length, programadas);
    content += renderSection('Gimnasio', gimnasio.length, gimnasio, programadas.length > 0);
    content += renderSection('Cross Training', cross.length, cross, true);
  }

  return `
    ${header}
    ${content}
  `;
}

// ── Mount ─────────────────────────────────────

export function mount() {
  const app = document.getElementById('app');

  const handleClick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
      case 'new-rutina':
        navigate('/rutina/nueva');
        break;
      case 'start':
        showPreview(id);
        break;
      case 'edit':
        navigate(`/rutina/editar/${id}`);
        break;
      case 'duplicate': {
        const copia = duplicateRutina(id);
        if (copia) {
          showToast('Rutina duplicada');
          navigate('/rutinas');
        }
        break;
      }
      case 'delete':
        showModal({
          title: 'Eliminar rutina',
          body: 'Esta accion no se puede deshacer.',
          confirmText: 'Eliminar',
          danger: true,
          onConfirm: () => {
            deleteRutina(id);
            navigate('/rutinas');
          },
        });
        break;
    }
  };

  app.addEventListener('click', handleClick);

  return () => {
    app.removeEventListener('click', handleClick);
  };
}
