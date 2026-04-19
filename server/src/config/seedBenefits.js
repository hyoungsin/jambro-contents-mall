const CouponCampaign = require('../models/CouponCampaign');

/**
 * 데모용 쿠폰 마스터 1건 (DB 없을 때만 생성)
 */
async function seedCouponCampaigns() {
  try {
    const n = await CouponCampaign.countDocuments();
    if (n > 0) return;
    await CouponCampaign.create({
      code: 'DEMO2026',
      title: '데모 할인 10%',
      discountKind: 'percent',
      discountValue: 10,
      expiresAt: new Date('2030-12-31T23:59:59.000Z'),
      isActive: true,
    });
    console.log('[seed] CouponCampaign DEMO2026 생성됨');
  } catch (e) {
    console.warn('[seed] CouponCampaign 시드 스킵:', e.message);
  }
}

module.exports = seedCouponCampaigns;
