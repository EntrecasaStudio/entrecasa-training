import './styles/reset.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/views.css';
import './styles/workout.css';
import './styles/animations.css';

import { initRouter } from './router.js';
import { seedIfEmpty } from './seed.js';

// Seed initial rutinas from Notion data (only if empty)
seedIfEmpty();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Init app
initRouter();
