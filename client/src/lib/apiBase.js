/**
 * API 베이스 URL (…/api). VITE_API_URL → VITE_API_BASE_URL 순으로 사용, 없으면 로컬 개발 기본값.
 */
export function getApiBaseUrl() {
  const raw = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '');
  return raw || 'http://localhost:5000/api';
}
