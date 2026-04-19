const { getIamportAccessToken, fetchIamportCertification } = require('../lib/iamportApi');

/**
 * POST /api/certifications/verify
 * body: { imp_uid } — 포트원 본인인증(IMP.certification) 완료 후 클라이언트가 전달
 * IAMPORT_API_KEY / SECRET 으로 포트원에서 조회해 실제 인증 완료 여부만 확인합니다.
 */
async function verifyCertification(req, res) {
  try {
    const impUid = String(req.body?.imp_uid || '').trim();
    if (!impUid) return res.status(400).json({ error: 'imp_uid가 필요합니다.' });

    const token = await getIamportAccessToken();
    if (!token) {
      return res.status(503).json({
        error: '서버에 IAMPORT_API_KEY / IAMPORT_API_SECRET 이 없어 본인인증을 검증할 수 없습니다.',
      });
    }

    const cert = await fetchIamportCertification(impUid, token);
    if (!cert || typeof cert !== 'object') {
      return res.status(400).json({ error: '본인인증 응답이 비어 있습니다.' });
    }
    const ok =
      Boolean(cert.unique_key) ||
      Boolean(cert.unique_in_site) ||
      (cert.certified_at != null && cert.certified_at !== '');
    if (!ok) {
      return res.status(400).json({ error: '유효한 본인인증 정보가 아닙니다.' });
    }

    const name = String(cert?.name || '').trim();
    const phoneRaw = cert?.phone != null ? String(cert.phone).replace(/\D/g, '') : '';

    return res.json({
      verified: true,
      imp_uid: impUid,
      name: name || undefined,
      phone: phoneRaw || undefined,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || '본인인증 검증에 실패했습니다.' });
  }
}

module.exports = { verifyCertification };
