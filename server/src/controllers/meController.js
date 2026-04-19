const mongoose = require('mongoose');
const User = require('../models/User');
const PointLedger = require('../models/PointLedger');
const CouponCampaign = require('../models/CouponCampaign');
const UserCoupon = require('../models/UserCoupon');
const Gift = require('../models/Gift');

function userIdFromAuth(req) {
  const id = req.auth?.userId;
  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) return null;
  return new mongoose.Types.ObjectId(String(id));
}

const EXPIRING_DAYS = 7;

async function expireStaleUserCoupons(userId) {
  await UserCoupon.updateMany(
    { user: userId, status: 'available', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } },
  );
}

function classifyCoupon(row) {
  const now = new Date();
  const exp = row.expiresAt ? new Date(row.expiresAt) : null;
  let effectiveStatus = row.status;
  if (row.status === 'available' && exp && exp < now) effectiveStatus = 'expired';
  const available = effectiveStatus === 'available';
  const expiringSoon =
    available &&
    exp &&
    exp >= now &&
    exp.getTime() - now.getTime() <= EXPIRING_DAYS * 24 * 60 * 60 * 1000;
  return { effectiveStatus, available, expiringSoon };
}

/** GET /api/me/points */
async function getPointsSummary(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });
    const user = await User.findById(userId).select('points');
    const balance = Number(user?.points) || 0;
    return res.json({ data: { balance, unit: '잎' } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/** GET /api/me/point-ledger */
async function getPointLedger(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });
    const { limit = 50, skip = 0 } = req.query;
    const data = await PointLedger.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip));
    const total = await PointLedger.countDocuments({ user: userId });
    return res.json({ data, total, limit: Number(limit), skip: Number(skip) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/** GET /api/me/coupons?tab=available|expiring|used|all */
async function listCoupons(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    await expireStaleUserCoupons(userId);

    const tab = String(req.query.tab || 'available').toLowerCase();
    const rows = await UserCoupon.find({ user: userId })
      .populate('campaign', 'code title discountKind discountValue expiresAt')
      .sort({ createdAt: -1 });

    const enriched = rows.map((doc) => {
      const o = doc.toObject();
      const c = o.campaign;
      const { effectiveStatus, available, expiringSoon } = classifyCoupon({
        status: o.status,
        expiresAt: o.expiresAt,
      });
      return {
        ...o,
        effectiveStatus,
        available,
        expiringSoon,
        title: c?.title || '할인 쿠폰',
        code: c?.code || '',
      };
    });

    let filtered = enriched;
    if (tab === 'available') {
      filtered = enriched.filter((x) => x.available);
    } else if (tab === 'expiring') {
      filtered = enriched.filter((x) => x.available && x.expiringSoon);
    } else if (tab === 'used') {
      filtered = enriched.filter((x) => x.effectiveStatus === 'used' || x.effectiveStatus === 'expired');
    }

    const counts = {
      available: enriched.filter((x) => x.available).length,
      expiringSoon: enriched.filter((x) => x.available && x.expiringSoon).length,
      usedOrExpired: enriched.filter(
        (x) => x.effectiveStatus === 'used' || x.effectiveStatus === 'expired',
      ).length,
      all: enriched.length,
    };

    return res.json({ data: { items: filtered, counts, tab } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/** POST /api/me/coupons/register { code } */
async function registerCoupon(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const raw = String(req.body?.code || '').trim().toUpperCase();
    if (!raw) return res.status(400).json({ error: '쿠폰 코드를 입력해 주세요.' });

    const campaign = await CouponCampaign.findOne({ code: raw, isActive: true });
    if (!campaign) {
      return res.status(404).json({ error: '유효한 쿠폰 코드가 아닙니다.' });
    }
    if (new Date(campaign.expiresAt) < new Date()) {
      return res.status(400).json({ error: '만료된 쿠폰입니다.' });
    }

    const existing = await UserCoupon.findOne({ user: userId, campaign: campaign._id });
    if (existing) {
      return res.status(409).json({ error: '이미 등록한 쿠폰입니다.' });
    }

    const doc = await UserCoupon.create({
      user: userId,
      campaign: campaign._id,
      status: 'available',
      expiresAt: campaign.expiresAt,
    });
    await doc.populate('campaign', 'code title discountKind discountValue expiresAt');

    return res.status(201).json({ data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: '이미 등록한 쿠폰입니다.' });
    }
    return res.status(500).json({ error: err.message });
  }
}

/** GET /api/me/gifts/received */
async function listGiftsReceived(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const data = await Gift.find({ recipient: userId })
      .populate('course', 'title thumbnailUrl price')
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/** GET /api/me/gifts/sent */
async function listGiftsSent(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const data = await Gift.find({ sender: userId })
      .populate('course', 'title thumbnailUrl price')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getPointsSummary,
  getPointLedger,
  listCoupons,
  registerCoupon,
  listGiftsReceived,
  listGiftsSent,
};
