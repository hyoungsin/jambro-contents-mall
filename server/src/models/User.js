/**
 * User — 회원(고객·관리자) 계정
 *
 * 【관리자 콘솔】 `client/src/pages/AdminDashboardPage.jsx` 사이드바와의 대응
 *   ·「사용자 관리」: 조회·권한 구분에 쓰이는 기본 프로필(email, name, userType 등)
 *   ·「대시보드」: KPI의 총 사용자·수익 집계 등과 간접 연동(실데이터 연동 시 User 기준)
 *
 * 【사용자(몰) 화면】
 *   · 회원가입·로그인·마이페이지: 본인 식별, 배송지(address), 포인트 잔액(points)
 *
 * 【중첩 스키마】
 *   · addressSchema — 우편 주소(도로명·시·우편번호 등). 주문 배송지와 별개로 프로필에 보관
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' },
  },
  { _id: false }
);

/** 회원 본문: 이메일·이름·암호·고객/관리자 구분·주소·포인트(잎) 잔액 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, '이메일은 필수입니다.'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, '이름은 필수입니다.'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, '비밀번호는 필수입니다.'],
      minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다.'],
    },
    userType: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    address: {
      type: addressSchema,
      required: false,
      default: null,
    },
    /** 포인트(잎) 잔액 */
    points: {
      type: Number,
      default: 0,
      min: [0, '포인트는 0 이상이어야 합니다.'],
    },
  },
  {
    // timestamp기능 활성화
    timestamps: true, 
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

// 저장 전 비밀번호 해시 (회원가입·비밀번호 변경 시에만)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// createdAt, updatedAt 자동 관리 (timestamps: true)
// email 인덱스는 스키마의 unique: true 로 이미 생성됨
userSchema.index({ userType: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
