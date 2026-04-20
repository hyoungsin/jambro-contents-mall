/**
 * API 베이스 URL (…/api).
 * - 우선순위: VITE_API_URL → VITE_API_BASE_URL
 * - 개발 모드에서 env가 없으면 Vite 프록시(`/api`) 사용
 * - 그 외에는 로컬 기본값(`http://localhost:5000/api`)
 */
export function getApiBaseUrl() {
  const raw = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '');
  if (raw) return raw.endsWith('/api') ? raw : `${raw}/api`;
  if (import.meta.env.DEV) return '/api';
  return 'http://localhost:5000/api';
}
