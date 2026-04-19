const express = require('express');
const { requireAuth } = require('../middleware/auth');
const meController = require('../controllers/meController');

const router = express.Router();

router.use(requireAuth);

router.get('/points', meController.getPointsSummary);
router.get('/point-ledger', meController.getPointLedger);
router.get('/coupons', meController.listCoupons);
router.post('/coupons/register', meController.registerCoupon);
router.get('/gifts/received', meController.listGiftsReceived);
router.get('/gifts/sent', meController.listGiftsSent);

module.exports = router;
