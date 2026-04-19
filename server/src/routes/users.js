const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/** 로그인 사용자 전용 프로필·포인트·쿠폰·선물 API: `/api/me` (meController) */

/** POST /api/users - 사용자 생성 */
router.post('/', usersController.createUser);

/** GET /api/users - 사용자 목록 조회 (쿼리: userType, limit, skip) */
router.get('/', requireAuth, requireAdmin, usersController.getUsers);

/** GET /api/users/:id - 단일 사용자 조회 */
router.get('/:id', usersController.getUserById);

/** PUT /api/users/:id - 사용자 수정 (전달된 필드만 부분 수정) */
router.put('/:id', usersController.updateUser);

/** DELETE /api/users/:id - 사용자 삭제 */
router.delete('/:id', usersController.deleteUser);

module.exports = router;
