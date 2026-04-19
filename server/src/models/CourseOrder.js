/**
 * CourseOrder — 강의 결제 주문(1건 = 주문서 + 품목 배열)
 *
 * 【관리자 콘솔】
 *   ·「주문 관리」: 주문 목록·상태 필터·KPI/통계의 원천(결제완료·환불요청·환불완료·취소 등)
 *
 * 【사용자(몰) 화면】
 *   · 결제 완료·주문 내역: 주문번호(orderNumber), 금액, 결제수단, 영수증/내역 URL(receiptUrl, statementUrl)
 *
 * 【중첩 스키마】
 *   · courseOrderItemSchema — 주문 라인 1건(강의 참조·당시 제목/sku/단가/수량)
 *
 * 【열거형】
 *   · ORDER_PAYMENT_METHODS / ORDER_STATUSES — 결제 UI·관리자 필터와 동일한 값 도메인
 */
const mongoose = require('mongoose');

/**
 * 결제 수단 — UI(네이버페이·토스·카드 등) 대응
 * none: 아직 미선택
 */
const ORDER_PAYMENT_METHODS = [
  'none',
  'naverpay',
  'tosspay',
  'kakaopay',
  'payco',
  'card',
  'bank',
  'virtual',
];

/**
 * 주문 상태 — PG 콜백 후 paid / failed 전환
 * refund_requested / refund_completed: 관리자 환불 플로우(목록·필터용)
 */
const ORDER_STATUSES = [
  'draft',
  'pending_payment',
  'paid',
  'failed',
  'cancelled',
  'refund_requested',
  'refund_completed',
];

/** 주문 품목 1줄: 결제 시점 강의·단가·수량 스냅샷 */
const courseOrderItemSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, '강의 참조는 필수입니다.'],
    },
    title: { type: String, trim: true, default: '' },
    sku: { type: String, trim: true, default: '' },
    unitPrice: {
      type: Number,
      required: [true, '단가는 필수입니다.'],
      min: [0, '단가는 0 이상이어야 합니다.'],
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, '수량은 1 이상이어야 합니다.'],
    },
  },
  { _id: true },
);

/** 주문 헤더: 주문자·구매자 연락처·결제수단·상태·PG연동·주문번호·금액(저장 전 pre에서 재계산) */
const courseOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '주문자(사용자)는 필수입니다.'],
      index: true,
    },
    items: {
      type: [courseOrderItemSchema],
      validate: [(arr) => Array.isArray(arr) && arr.length > 0, '주문 품목이 최소 1개 필요합니다.'],
    },
    /** 구매자 정보 — 결제 화면(이름·이메일·휴대폰) */
    buyerName: { type: String, trim: true, default: '' },
    buyerEmail: { type: String, trim: true, default: '' },
    phoneCountryCode: { type: String, trim: true, default: 'KR' },
    phoneNumber: { type: String, trim: true, default: '' },
    phoneVerified: { type: Boolean, default: false },
    paymentMethod: {
      type: String,
      enum: {
        values: ORDER_PAYMENT_METHODS,
        message: '결제 수단이 올바르지 않습니다.',
      },
      default: 'none',
    },
    status: {
      type: String,
      enum: {
        values: ORDER_STATUSES,
        message: '주문 상태가 올바르지 않습니다.',
      },
      default: 'draft',
      index: true,
    },
    currency: {
      type: String,
      default: 'KRW',
      trim: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, '할인 금액은 0 이상이어야 합니다.'],
    },
    /** 품목 합(할인 전) — 저장 전 pre에서 재계산 */
    subtotalAmount: {
      type: Number,
      default: 0,
      min: [0, '소계는 0 이상이어야 합니다.'],
    },
    /** 최종 결제 금액 */
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, '합계는 0 이상이어야 합니다.'],
    },
    /** PG·포트원 결제 식별자(예: imp_uid) */
    pgTransactionId: { type: String, trim: true, default: '' },
    memo: { type: String, trim: true, default: '' },
    /** 화면용 주문 번호(고객 안내) */
    orderNumber: { type: String, trim: true, default: '', index: true, sparse: true },
    receiptUrl: { type: String, trim: true, default: '' },
    statementUrl: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

courseOrderSchema.index({ user: 1, createdAt: -1 });
courseOrderSchema.index({ status: 1, createdAt: -1 });

function generateDisplayOrderNumber() {
  const part = Date.now().toString().slice(-7);
  const rnd = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${part}${rnd}`.slice(0, 12);
}

courseOrderSchema.pre('save', function (next) {
  if (!this.isNew || (this.orderNumber && String(this.orderNumber).trim())) return next();
  this.orderNumber = generateDisplayOrderNumber();
  next();
});

function recalcAmounts(doc) {
  const subtotal = doc.items.reduce(
    (s, it) => s + Number(it.unitPrice || 0) * Number(it.quantity || 0),
    0,
  );
  doc.subtotalAmount = subtotal;
  const d = Math.min(Math.max(0, Number(doc.discountAmount) || 0), subtotal);
  doc.discountAmount = d;
  doc.totalAmount = Math.max(0, subtotal - d);
}

courseOrderSchema.pre('validate', function (next) {
  if (this.items && this.items.length) recalcAmounts(this);
  next();
});

const CourseOrder = mongoose.model('CourseOrder', courseOrderSchema);

module.exports = CourseOrder;
module.exports.ORDER_PAYMENT_METHODS = ORDER_PAYMENT_METHODS;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
