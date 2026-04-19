/**
 * Gift — 강의 선물(보낸 사람·받는 사람·강의 1건)
 *
 * 【관리자 콘솔】
 *   · 전용 메뉴는 없음. 분쟁·CS 시「사용자 관리」「강의 관리」와 함께 참조 가능한 트랜잭션 데이터.
 *
 * 【사용자(몰) 화면】
 *   · 선물 보내기/받은·보낸 선물함: sender, recipient, course, message, 상태(pending/accepted/cancelled)
 */
const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    message: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

giftSchema.index({ recipient: 1, createdAt: -1 });
giftSchema.index({ sender: 1, createdAt: -1 });

const Gift = mongoose.model('Gift', giftSchema);

module.exports = Gift;
