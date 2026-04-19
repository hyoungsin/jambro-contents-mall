/**
 * 포트원(구 아임포트) REST v1 — 토큰·결제·본인인증 조회
 * https://developers.portone.io/docs/ko/api/rest-v1/auth
 */

const IAMPORT_TOKEN_URL = 'https://api.iamport.kr/users/getToken';

async function getIamportAccessToken() {
  const impKey = process.env.IAMPORT_API_KEY;
  const impSecret = process.env.IAMPORT_API_SECRET;
  if (!impKey || !impSecret) return null;
  const res = await fetch(IAMPORT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imp_key: impKey, imp_secret: impSecret }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.code !== 0) {
    throw new Error(json.message || '포트원 액세스 토큰 발급에 실패했습니다.');
  }
  return json.response?.access_token || null;
}

async function fetchIamportPayment(impUid, accessToken) {
  const res = await fetch(`https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`, {
    headers: { Authorization: accessToken },
  });
  const json = await res.json().catch(() => ({}));
  if (json.code !== 0) {
    throw new Error(json.message || '포트원 결제 조회에 실패했습니다.');
  }
  return json.response;
}

/** 본인인증 imp_uid 조회 */
async function fetchIamportCertification(impUid, accessToken) {
  const res = await fetch(`https://api.iamport.kr/certifications/${encodeURIComponent(impUid)}`, {
    headers: { Authorization: accessToken },
  });
  const json = await res.json().catch(() => ({}));
  if (json.code !== 0) {
    throw new Error(json.message || '포트원 본인인증 조회에 실패했습니다.');
  }
  return json.response;
}

module.exports = {
  getIamportAccessToken,
  fetchIamportPayment,
  fetchIamportCertification,
};
