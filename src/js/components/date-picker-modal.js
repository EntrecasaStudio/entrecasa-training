/**
 * Date picker modal — uses same calendar grid design as the Entreno view.
 * Opens an overlay with month navigation and day selection.
 */
import { icon } from '@js/icons.js';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Show a date picker modal overlay.
 * @param {string} currentISO — current date as ISO string
 * @param {function} onSelect — callback(newISO) when user picks a date
 */
export function showDatePickerModal(currentISO, onSelect) {
  const current = new Date(currentISO);
  let viewYear = current.getFullYear();
  let viewMonth = current.getMonth();
  const selectedDay = { y: current.getFullYear(), m: current.getMonth(), d: current.getDate() };

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'date-picker-overlay';

  function render() {
    const today = new Date();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const weekHeaders = WEEKDAYS.map((d) => `<div class="cal-month-weekday">${d}</div>`).join('');

    let cells = '';

    // Previous month filler
    for (let i = startOffset - 1; i >= 0; i--) {
      cells += `<div class="cal-month-day cal-month-day--outside">${prevMonthDays - i}</div>`;
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && d === today.getDate();
      const isSelected = viewYear === selectedDay.y && viewMonth === selectedDay.m && d === selectedDay.d;

      let cls = 'cal-month-day';
      if (isToday) cls += ' cal-month-day--today';
      if (isSelected) cls += ' cal-month-day--selected';

      cells += `<div class="${cls}" data-pick-day="${d}">${d}</div>`;
    }

    // Next month filler
    const totalCells = startOffset + totalDays;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
      cells += `<div class="cal-month-day cal-month-day--outside">${d}</div>`;
    }

    overlay.innerHTML = `
      <div class="date-picker-box">
        <div class="date-picker-header">
          <button class="cal-nav-btn" data-dp-action="prev">${icon.chevronLeft || '‹'}</button>
          <span class="date-picker-title">${MONTH_NAMES[viewMonth]} ${viewYear}</span>
          <button class="cal-nav-btn" data-dp-action="next">${icon.chevronRight || '›'}</button>
        </div>
        <div class="cal-month-grid">
          ${weekHeaders}
          ${cells}
        </div>
        <div class="date-picker-actions">
          <button class="btn btn-ghost" data-dp-action="cancel">Cancelar</button>
        </div>
      </div>
    `;
  }

  render();
  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => overlay.classList.add('visible'));

  function close() {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.addEventListener('click', (e) => {
    // Close on backdrop click
    if (e.target === overlay) { close(); return; }

    const action = e.target.closest('[data-dp-action]')?.dataset.dpAction;
    if (action === 'prev') {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      render();
      return;
    }
    if (action === 'next') {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      render();
      return;
    }
    if (action === 'cancel') { close(); return; }

    const dayEl = e.target.closest('[data-pick-day]');
    if (dayEl) {
      const day = parseInt(dayEl.dataset.pickDay, 10);
      // Build new date preserving original time
      const newDate = new Date(current);
      newDate.setFullYear(viewYear, viewMonth, day);
      close();
      onSelect(newDate.toISOString());
    }
  });
}
