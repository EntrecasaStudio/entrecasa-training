// Iconos SVG vectoriales — 24x24 viewBox, stroke-based
const s = (d, size = 24) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const icon = {
  // Navigation
  back: s('<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>'),
  arrowRight: s('<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>'),
  arrowUp: s('<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>'),
  arrowDown: s('<path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/>'),

  // Actions
  plus: s('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  close: s('<path d="M18 6L6 18"/><path d="M6 6l12 12"/>'),
  trash: s('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>'),
  edit: s('<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>'),

  // Tabs
  clipboard: s('<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>'),
  barChart: s('<rect x="18" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="2" y="13" width="4" height="8" rx="1"/>'),

  // List
  list: s('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),

  // Chevrons
  chevronUp: s('<path d="M18 15l-6-6-6 6"/>'),
  chevronDown: s('<path d="M6 9l6 6 6-6"/>'),

  // Media
  play: s('<polygon points="5 3 19 12 5 21 5 3"/>'),

  // Fitness
  dumbbell: s('<path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M12 6.5v11"/><rect x="2" y="8" width="4" height="8" rx="1"/><rect x="18" y="8" width="4" height="8" rx="1"/><rect x="4" y="6" width="2" height="12" rx="0.5"/><rect x="18" y="6" width="2" height="12" rx="0.5"/>'),

  // Timer
  clock: s('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),

  // Misc
  copy: s('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>'),
  equal: s('<path d="M5 9h14"/><path d="M5 15h14"/>'),

  // Progress / Trophy
  trophy: s('<path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/>'),
  trendUp: s('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'),
  mic: s('<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>'),
  stop: s('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
  send: s('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),

  // Calendar
  calendar: s('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><rect x="7" y="13" width="3" height="3" rx="0.5"/><rect x="14" y="13" width="3" height="3" rx="0.5"/>'),
};

// Larger icons for empty states and banners
export function iconLg(name, size = 48) {
  const map = {
    dumbbell: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="4" height="8" rx="1"/><rect x="18" y="8" width="4" height="8" rx="1"/><rect x="4" y="6" width="2" height="12" rx="0.5"/><rect x="18" y="6" width="2" height="12" rx="0.5"/><path d="M6 12h12"/></svg>`,
    barChart: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="18" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="2" y="13" width="4" height="8" rx="1"/></svg>`,
  };
  return map[name] || '';
}
