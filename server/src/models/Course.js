/**
 * Course — 판매 강의(상품) 마스터
 *
 * 【관리자 콘솔】
 *   ·「강의 관리」: 강의 목록·등록/수정 폼의 저장 대상(sku, 제목, 카테고리, 가격, 썸네일, 상태 draft/published 등)
 *
 * 【사용자(몰) 화면】
 *   · 메인 강의 카드·강의 상세·장바구니/결제: 노출 정보·단가·조회수(views)의 근거 데이터
 *
 * 【주요 필드】
 *   · sku / title / category / status / price / originalPrice / thumbnailUrl / description / duration
 *   · studentsCount·rating — 카드에 표시하는 정원·난이도(별)
 *   · author — 작성 관리자(User) 참조
 */
const mongoose = require('mongoose');

/** 강의 상세 카테고리 */
const COURSE_CATEGORIES = ['영상콘텐츠 제작', '에이전트 제작', '업무자동화 구현', 'AI Native'];

/** 상태 (초안 / 최종본 — DB 값은 draft | published, UI에서는 published를 최종본으로 표기) */
const COURSE_STATUSES = ['draft', 'published'];

const courseSchema = new mongoose.Schema(
  {
    /** SKU: 고유 식별자 */
    sku: {
      type: String,
      required: [true, 'SKU는 필수입니다.'],
      unique: true,
      trim: true,
      index: true,
    },

    /** 제목 */
    title: {
      type: String,
      required: [true, '제목은 필수입니다.'],
      trim: true,
    },

    /** 상세 카테고리 */
    category: {
      type: String,
      required: [true, '카테고리는 필수입니다.'],
      enum: {
        values: COURSE_CATEGORIES,
        message: '카테고리가 올바르지 않습니다.',
      },
    },

    /** 게시 상태 */
    status: {
      type: String,
      required: true,
      enum: {
        values: COURSE_STATUSES,
        message: '상태가 올바르지 않습니다.',
      },
      default: 'draft',
    },

    /** 조회수 */
    views: {
      type: Number,
      default: 0,
      min: [0, '조회수는 0 이상이어야 합니다.'],
    },

    /** 작성자 (Admin) */
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    /** 썸네일 */
    thumbnailUrl: {
      type: String,
      required: [true, '썸네일 URL은 필수입니다.'],
      trim: true,
    },

    /** 가격 */
    price: {
      type: Number,
      required: [true, '가격은 필수입니다.'],
      min: [0, '가격은 0 이상이어야 합니다.'],
    },

    /** 기존가(할인표시용) */
    originalPrice: {
      type: Number,
      min: [0, '기존가는 0 이상이어야 합니다.'],
      default: null,
    },

    /** 정원(수강 정원, 카드에 표시) */
    studentsCount: {
      type: Number,
      default: 0,
      min: [0, '정원은 0 이상이어야 합니다.'],
    },

    /** 난이도 0(미설정)~5(별 5개). 메인 카드에는 1~5만 별로 표시 */
    rating: {
      type: Number,
      default: 0,
      min: [0, '난이도는 0 이상이어야 합니다.'],
      max: [5, '난이도는 5 이하여야 합니다.'],
    },

    /** 기간(예: 4시간) */
    duration: {
      type: String,
      trim: true,
      default: '',
    },

    /** 설명 */
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
);

courseSchema.index({ category: 1, status: 1, createdAt: -1 });
courseSchema.index({ createdAt: -1 });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
module.exports.COURSE_CATEGORIES = COURSE_CATEGORIES;
module.exports.COURSE_STATUSES = COURSE_STATUSES;

