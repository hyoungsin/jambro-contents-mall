const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const certificationsController = require('../controllers/certificationsController');

/** POST /api/certifications/verify — 포트원 본인인증 imp_uid 검증 */
router.post('/verify', requireAuth, certificationsController.verifyCertification);

module.exports = router;
