/**
 * UserCoupon — 사용자에게 발급된 쿠폰 1장(캠페인 1종당 사용자당 1건 유니크)
 *
 * 【관리자 콘솔】
 *   · 전용 사이드 메뉴는 없으나, 「주문 관리」·매출과 간접 연동(사용 시 usedOrder → CourseOrder)
 *
 * 【사용자(몰) 화면】
 *   · 마이페이지·구매 혜택: 보유 쿠폰, 사용 가능/사용됨/만료, 결제 시 적용 내역
 *
 * 【주요 필드】
 *   · user, campaign(CouponCampaign), status, expiresAt, usedAt, usedOrder(사용 주문)
 */
const mongoose = require('mongoose');

const USER_COUPON_STATUSES = ['available', 'used', 'expired'];

const userCouponSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CouponCampaign',
      required: true,
    },
    status: {
      type: String,
      enum: USER_COUPON_STATUSES,
      default: 'available',
      index: true,
    },
    /** 등록 시점의 만료일(캠페인 만료 복사) */
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    usedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOrder',
      default: null,
    },
  },
  { timestamps: true },
);

userCouponSchema.index({ user: 1, campaign: 1 }, { unique: true });

const UserCoupon = mongoose.model('UserCoupon', userCouponSchema);

module.exports = UserCoupon;
module.exports.USER_COUPON_STATUSES = USER_COUPON_STATUSES;
