/**
 * AiTrend — AI 트렌드 콘텐츠(기사형) 마스터
 *
 * 【관리자 콘솔】
 *   ·「콘텐츠 분석」에서 다루는 AI 트렌드 글의 저장 구조와 대응(동일 주제 콘텐츠 업로드 플로우와도 연계 가능)
 *   ·「대시보드」더미/지표 문구의 「AI 트렌드 조회수」와 개념적으로 연결(실연동 시 views 등 활용)
 *
 * 【사용자(몰) 화면】
 *   · 메인·AI 트렌드 목록/상세: 제목·카테고리·썸네일·조회수·게시 상태(draft/published)
 *
 * 【주요 필드】
 *   · sku, title, category, status, views, thumbnailUrl, description, author(User)
 */
const mongoose = require('mongoose');

/** AI 트렌드 상세 카테고리 */
const AI_TREND_CATEGORIES = ['AI최신트렌드', 'AI모델성능', 'AI활용사례'];

/** 상태 (이미지 기준: 게시됨/초안) */
const AI_TREND_STATUSES = ['draft', 'published'];

const aiTrendSchema = new mongoose.Schema(
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
        values: AI_TREND_CATEGORIES,
        message: '카테고리가 올바르지 않습니다.',
      },
    },

    /** 게시 상태 */
    status: {
      type: String,
      required: true,
      enum: {
        values: AI_TREND_STATUSES,
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

    /** 설명 */
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
);

aiTrendSchema.index({ category: 1, status: 1, createdAt: -1 });
aiTrendSchema.index({ createdAt: -1 });

const AiTrend = mongoose.model('AiTrend', aiTrendSchema);

module.exports = AiTrend;
module.exports.AI_TREND_CATEGORIES = AI_TREND_CATEGORIES;
module.exports.AI_TREND_STATUSES = AI_TREND_STATUSES;

