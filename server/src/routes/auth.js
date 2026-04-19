const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/login - 로그인
router.post('/login', authController.login);

// POST /api/auth/logout - 로그아웃 (클라이언트 토큰 삭제용 안내)
router.post('/logout', authController.logout);

// POST /api/auth/forgot-password - 비밀번호 재설정(임시 비밀번호 발급)
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;

