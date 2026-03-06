let modalCleanup = null;
let previousFocus = null;

export function showModal({ title, body, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, onConfirm, html = false }) {
  // Remove existing modal
  hideModal(true);

  // Save focus to restore on close
  previousFocus = document.activeElement;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-title" id="modal-title">${title}</div>
      <div class="modal-body">${body}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" data-modal-cancel>${cancelText}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" data-modal-confirm>${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Focus the confirm button
  const confirmBtn = overlay.querySelector('[data-modal-confirm]');
  if (confirmBtn) requestAnimationFrame(() => confirmBtn.focus());

  const handleClick = (e) => {
    if (e.target.matches('[data-modal-confirm]')) {
      onConfirm();
      hideModal();
    } else if (e.target.matches('[data-modal-cancel]') || e.target === overlay) {
      hideModal();
    }
  };

  // Focus trap + Escape to close
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      hideModal();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  overlay.addEventListener('click', handleClick);
  overlay.addEventListener('keydown', handleKeydown);

  modalCleanup = (skipAnim) => {
    overlay.removeEventListener('keydown', handleKeydown);
    if (skipAnim) {
      overlay.removeEventListener('click', handleClick);
      overlay.remove();
      modalCleanup = null;
      if (previousFocus) previousFocus.focus();
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
        if (previousFocus) previousFocus.focus();
      },
      { once: true },
    );
  };
}

export function hideModal(skipAnim = false) {
  if (modalCleanup) modalCleanup(skipAnim);
}
