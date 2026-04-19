/**
 * Cart — 로그인 사용자당 1개의 장바구니
 *
 * 【관리자 콘솔】
 *   · 전용 메뉴는 없음.「주문 관리」로 이어지기 전 단계(결제 전 장바구니)의 서버 상태를 담음.
 *
 * 【사용자(몰) 화면】
 *   · 장바구니·결제 페이지: 담은 강의(items), 쿠폰 코드·할인 반영(couponCode, couponDiscountAmount),
 *     소계/합계(subtotalAmount, totalAmount), 통화(currency)
 *
 * 【중첩 스키마】
 *   · cartItemSchema — 라인 1건: 강의 참조(course)와 결제 직전 스냅샷(sku, title, unitPrice, quantity 등)
 */
const mongoose = require('mongoose');

/** 결제 유형 — UI의 "일회성 결제" 등 */
const CART_PAYMENT_TYPES = ['one_time'];

/** 통화 — 강의는 원화 기준이나, 결제 UI(USD 등) 대비 */
const CART_CURRENCIES = ['KRW', 'USD'];

/** 장바구니 한 줄(강의 1건): course 참조 + 결제 직전 스냅샷(sku·제목·단가·수량) */
const cartItemSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, '강의(course) 참조는 필수입니다.'],
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: '',
    },
    /** 단가(원 또는 선택 통화 기준) */
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
    paymentType: {
      type: String,
      enum: {
        values: CART_PAYMENT_TYPES,
        message: '결제 유형이 올바르지 않습니다.',
      },
      default: 'one_time',
    },
  },
  { _id: true },
);

/** 사용자(user)별 단일 장바구니: 품목 배열·쿠폰·금액 합계·상태(active/checkout/converted) */
const cartSchema = new mongoose.Schema(
  {
    /** 로그인 사용자당 장바구니 1개(필요 시 게스트 세션용 필드 추가 가능) */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '사용자는 필수입니다.'],
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    /** 쿠폰 코드(입력값) */
    couponCode: {
      type: String,
      trim: true,
      default: '',
    },
    /** 서버에서 쿠폰 검증 후 반영된 할인 금액 */
    couponDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, '할인 금액은 0 이상이어야 합니다.'],
    },
    currency: {
      type: String,
      enum: {
        values: CART_CURRENCIES,
        message: '통화가 올바르지 않습니다.',
      },
      default: 'KRW',
    },
    /** 품목 합(할인 전) — API에서 재계산해 저장 가능 */
    subtotalAmount: {
      type: Number,
      default: 0,
      min: [0, '소계는 0 이상이어야 합니다.'],
    },
    /** 최종 결제 금액(할인 반영 후) */
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, '합계는 0 이상이어야 합니다.'],
    },
    /**
     * 장바구니 상태(선택)
     * - active: 일반
     * - checkout: 결제 단계 진입 등
     */
    status: {
      type: String,
      enum: ['active', 'checkout', 'converted'],
      default: 'active',
    },
  },
  { timestamps: true },
);

cartSchema.index({ updatedAt: -1 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
module.exports.CART_PAYMENT_TYPES = CART_PAYMENT_TYPES;
module.exports.CART_CURRENCIES = CART_CURRENCIES;
