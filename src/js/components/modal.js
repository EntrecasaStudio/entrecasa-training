let modalCleanup = null;

export function showModal({ title, body, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, onConfirm, html = false }) {
  // Remove existing modal
  hideModal(true);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">${title}</div>
      <div class="modal-body">${body}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" data-modal-cancel>${cancelText}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" data-modal-confirm>${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const handleClick = (e) => {
    if (e.target.matches('[data-modal-confirm]')) {
      onConfirm();
      hideModal();
    } else if (e.target.matches('[data-modal-cancel]') || e.target === overlay) {
      hideModal();
    }
  };

  overlay.addEventListener('click', handleClick);
  modalCleanup = (skipAnim) => {
    if (skipAnim) {
      overlay.removeEventListener('click', handleClick);
      overlay.remove();
      modalCleanup = null;
      return;
    }
    // Animate out
    overlay.classList.add('modal-closing');
    overlay.addEventListener(
      'animationend',
      () => {
        overlay.removeEventListener('click', handleClick);
        overlay.remove();
        modalCleanup = null;
      },
      { once: true },
    );
  };
}

export function hideModal(skipAnim = false) {
  if (modalCleanup) modalCleanup(skipAnim);
}
