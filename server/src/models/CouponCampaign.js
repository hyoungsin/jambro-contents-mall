/**
 * CouponCampaign — 쿠폰 캠페인(할인 정책) 마스터, 코드당 1건
 *
 * 【관리자 콘솔】
 *   ·「설정」등에서 시드·운영 정책으로 등록하거나, 별도 관리 UI가 붙을 때의 할인 마스터 데이터
 *
 * 【사용자(몰) 화면】
 *   · 장바구니·결제의 쿠폰 코드 입력 검증, 「구매 혜택」/마이 쿠폰 발급의 기준(할인율·정액, 만료, 활성 여부)
 *
 * 【주요 필드】
 *   · code(대문자 정규화), discountKind(percent|fixed), discountValue, expiresAt, isActive, title
 */
const mongoose = require('mongoose');

const couponCampaignSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    title: { type: String, trim: true, default: '' },
    discountKind: {
      type: String,
      enum: ['percent', 'fixed'],
      default: 'percent',
    },
    /** percent면 0–100, fixed면 원 단위 */
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

couponCampaignSchema.pre('validate', function (next) {
  if (this.code) this.code = String(this.code).trim().toUpperCase();
  next();
});

const CouponCampaign = mongoose.model('CouponCampaign', couponCampaignSchema);

module.exports = CouponCampaign;
