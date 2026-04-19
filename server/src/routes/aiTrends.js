const express = require('express');
const router = express.Router();

const aiTrendsController = require('../controllers/aiTrendsController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// AI 트렌드(뉴스) 관리
router.post('/', aiTrendsController.createAiTrend);
router.post('/register', aiTrendsController.createAiTrend);

// 목록/단건은 공개 (원하면 requireAuth로 바꿀 수 있음)
router.get('/', aiTrendsController.getAiTrends);
router.get('/:id', aiTrendsController.getAiTrendById);

router.put('/:id', aiTrendsController.updateAiTrend);
router.delete('/:id', aiTrendsController.deleteAiTrend);

module.exports = router;

