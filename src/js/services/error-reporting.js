/**
 * Error reporting via Sentry.
 *
 * Setup:
 * 1. Create a free account at https://sentry.io
 * 2. Create a Browser JavaScript project
 * 3. Copy the DSN and add to .env: VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
 * 4. Deploy — errors will appear in Sentry dashboard
 */
import * as Sentry from '@sentry/browser';

const DSN = import.meta.env.VITE_SENTRY_DSN || '';

let initialized = false;

export function initErrorReporting() {
  if (!DSN || initialized) return;

  try {
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.MODE, // 'production' or 'development'
      // Only report in production to save quota
      enabled: import.meta.env.PROD,
      // Sample 100% of errors (we have very few users)
      sampleRate: 1.0,
      // Don't track performance (saves quota)
      tracesSampleRate: 0,
      // Ignore common non-actionable errors
      ignoreErrors: [
        'ResizeObserver loop',
        'Network request failed',
        'Load failed',
        'Failed to fetch',
        'AbortError',
        'ChunkLoadError',
      ],
      beforeSend(event) {
        // Strip PII from error messages
        if (event.message) {
          event.message = event.message.replace(/[\w.-]+@[\w.-]+/g, '[email]');
        }
        return event;
      },
    });
    initialized = true;
    console.log('[sentry] Error reporting initialized');
  } catch (err) {
    console.warn('[sentry] Init failed:', err.message);
  }
}

/**
 * Set user context for error reports (helps identify which user had the issue).
 * Only sends the profile name (Lean/Nat), not email or PII.
 */
export function setErrorUser(usuario) {
  if (!initialized) return;
  Sentry.setUser({ username: usuario });
}

/**
 * Manually capture an error with optional context.
 */
export function captureError(error, context = {}) {
  if (!initialized) {
    console.error('[error]', error, context);
    return;
  }
  Sentry.withScope((scope) => {
    for (const [key, val] of Object.entries(context)) {
      scope.setExtra(key, val);
    }
    Sentry.captureException(error);
  });
}

/**
 * Log a breadcrumb (trail of user actions leading to an error).
 */
export function addBreadcrumb(message, category = 'app') {
  if (!initialized) return;
  Sentry.addBreadcrumb({ message, category, level: 'info' });
}
