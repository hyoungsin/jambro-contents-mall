/**
 * PointLedger — 포인트(잎) 적립·차감 이력 1건
 *
 * 【관리자 콘솔】
 *   ·「대시보드」지표와 간접 연동 가능. User.points 잔액과 함께 감사·내역 추적에 사용.
 *
 * 【사용자(몰) 화면】
 *   · 구매 혜택·마이페이지: 적립/사용 사유(reason), 거래 후 잔액(balanceAfter), meta 부가정보
 *
 * 【주요 필드】
 *   · user, amount(양수 적립·음수 사용), balanceAfter, reason, meta
 */
const mongoose = require('mongoose');

const pointLedgerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** 양수: 적립, 음수: 사용 */
    amount: {
      type: Number,
      required: true,
    },
    /** 거래 후 잔액 스냅샷 */
    balanceAfter: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** 사유 라벨 (예: 수강평 작성) */
    reason: { type: String, trim: true, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true },
);

pointLedgerSchema.index({ user: 1, createdAt: -1 });

const PointLedger = mongoose.model('PointLedger', pointLedgerSchema);

module.exports = PointLedger;
