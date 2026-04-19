/** 포트원(구 아임포트) v1 JS — CDN 로드 후 `window.IMP` 반환 */
const SCRIPT_SRC = 'https://cdn.iamport.kr/v1/iamport.js';

function findExistingScript() {
  return document.querySelector(`script[src="${SCRIPT_SRC}"]`);
}

export function loadIamport() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저 환경에서만 결제할 수 있습니다.'));
  }
  if (window.IMP) return Promise.resolve(window.IMP);

  const existing = findExistingScript();
  if (existing) {
    return new Promise((resolve, reject) => {
      const finish = () => {
        if (window.IMP) resolve(window.IMP);
        else reject(new Error('포트원 스크립트는 있으나 IMP 객체가 없습니다.'));
      };
      if (window.IMP) {
        finish();
        return;
      }
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('포트원 스크립트 로드에 실패했습니다.')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => {
      if (!window.IMP) {
        reject(new Error('포트원 스크립트 로드 후 IMP를 찾을 수 없습니다.'));
        return;
      }
      resolve(window.IMP);
    };
    s.onerror = () => reject(new Error('포트원 CDN에 연결할 수 없습니다. 네트워크·광고 차단을 확인해 주세요.'));
    document.head.appendChild(s);
  });
}
