const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

/** GET /api/cart — 내 장바구니 (없으면 생성) */
router.get('/', requireAuth, cartController.getMyCart);

/** PUT /api/cart — 쿠폰/통화/할인/상태 등 메타 수정 + 합계 재계산 */
router.put('/', requireAuth, cartController.updateCart);

/** DELETE /api/cart — 품목 전부 비우기 */
router.delete('/', requireAuth, cartController.clearCart);

/** DELETE /api/cart/document — 장바구니 문서 삭제(다음 GET 시 재생성) */
router.delete('/document', requireAuth, cartController.deleteCartDocument);

/** POST /api/cart/items — 품목 추가 */
router.post('/items', requireAuth, cartController.addItem);

/** PUT /api/cart/items/:itemId — 품목 수량 수정 */
router.put('/items/:itemId', requireAuth, cartController.updateItem);

/** DELETE /api/cart/items/:itemId — 품목 삭제 */
router.delete('/items/:itemId', requireAuth, cartController.removeItem);

module.exports = router;
