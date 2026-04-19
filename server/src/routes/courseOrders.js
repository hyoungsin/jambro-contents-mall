const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const courseOrdersController = require('../controllers/courseOrdersController');

/** 관리자 주문 — 반드시 /:id 보다 먼저 등록 */
router.get('/admin/stats', requireAuth, requireAdmin, courseOrdersController.adminOrderStats);
router.get(
  '/admin/monthly-revenue',
  requireAuth,
  requireAdmin,
  courseOrdersController.adminMonthlyRevenue,
);
router.get(
  '/admin/popular-courses',
  requireAuth,
  requireAdmin,
  courseOrdersController.adminPopularCourses,
);
router.get('/admin/list', requireAuth, requireAdmin, courseOrdersController.adminListOrders);

/** POST /api/orders — 수강 결제 주문 생성 */
router.post('/', requireAuth, courseOrdersController.createOrder);

/** GET /api/orders — 내 주문 목록 */
router.get('/', requireAuth, courseOrdersController.listOrders);

/** POST /api/orders/:id/portone/complete — 포트원 결제 완료(imp_uid 검증 후 paid) */
router.post('/:id/portone/complete', requireAuth, courseOrdersController.completePortonePayment);

/** GET /api/orders/:id — 단건 */
router.get('/:id', requireAuth, courseOrdersController.getOrder);

/** PUT /api/orders/:id — 구매자·결제수단·할인 등 수정 */
router.put('/:id', requireAuth, courseOrdersController.updateOrder);

/** DELETE /api/orders/:id — 초안 주문 삭제 */
router.delete('/:id', requireAuth, courseOrdersController.deleteOrder);

module.exports = router;
