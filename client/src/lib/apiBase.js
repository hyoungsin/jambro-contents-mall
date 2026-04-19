/**
 * REST API base URL ending with `/api` (no trailing slash after `api`).
 * - Local dev: Vite proxies `/api` → backend (see vite.config.js).
 * - Production: `VITE_API_BASE_URL`가 있으면 그 origin 사용.
 *   없으면 아래 Heroku URL로 직접 요청(서버 CORS 허용). Vercel `/api` 프록시에 의존하지 않음.
 */
const PRODUCTION_API_ORIGIN = 'https://jambro-contents-mall-backend.herokuapp.com';

export function resolveApiBase() {
  let raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (!raw && import.meta.env.PROD) {
    raw = PRODUCTION_API_ORIGIN;
  }
  if (raw) return raw.endsWith('/api') ? raw : `${raw}/api`;
  if (import.meta.env.DEV) return '/api';
  return '/api';
}

export const API_BASE = resolveApiBase();
