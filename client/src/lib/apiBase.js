/**
 * REST API base URL ending with `/api` (no trailing slash after `api`).
 * - Local dev: Vite proxies `/api` → backend (see vite.config.js).
 * - Production (Vercel 등): set `VITE_API_BASE_URL` to the Heroku app origin, e.g.
 *   `https://your-app.herokuapp.com`
 */
export function resolveApiBase() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (raw) return raw.endsWith('/api') ? raw : `${raw}/api`;
  if (import.meta.env.DEV) return '/api';
  return '/api';
}

export const API_BASE = resolveApiBase();
