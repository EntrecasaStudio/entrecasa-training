/**
 * Toast notifications — simple and with optional action button.
 */
let toastTimeout = null;

export function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  toastTimeout = setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * Toast with an action button (e.g. "Deshacer").
 * Stays visible for `duration` ms (default 5000).
 */
export function showToastAction(message, actionLabel, onAction, options = {}) {
  const { type = 'success', duration = 5000 } = options;

  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const toast = document.createElement('div');
  toast.className = `toast toast-action toast-${type}`;

  const msgSpan = document.createElement('span');
  msgSpan.className = 'toast-message';
  msgSpan.textContent = message;

  const btn = document.createElement('button');
  btn.className = 'toast-action-btn';
  btn.textContent = actionLabel;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearTimeout(toastTimeout);
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
    onAction();
  });

  toast.appendChild(msgSpan);
  toast.appendChild(btn);
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  toastTimeout = setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
