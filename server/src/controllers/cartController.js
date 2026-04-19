const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Course = require('../models/Course');
const CourseOrder = require('../models/CourseOrder');

/** 결제 완료(paid) 주문에 포함된 강의 course ObjectId 문자열 집합 */
async function getPaidCourseIdsForUser(userId) {
  const orders = await CourseOrder.find({ user: userId, status: 'paid' })
    .select('items.course')
    .lean();
  const ids = new Set();
  for (const o of orders) {
    for (const it of o.items || []) {
      if (it?.course) ids.add(String(it.course));
    }
  }
  return ids;
}

function userIdFromAuth(req) {
  const id = req.auth?.userId;
  if (!id) return null;
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function recalcTotals(cart) {
  const subtotal = cart.items.reduce(
    (sum, it) => sum + Number(it.unitPrice || 0) * Number(it.quantity || 0),
    0,
  );
  cart.subtotalAmount = subtotal;
  const rawDiscount = Number(cart.couponDiscountAmount) || 0;
  const discount = Math.min(Math.max(0, rawDiscount), subtotal);
  cart.couponDiscountAmount = discount;
  cart.totalAmount = Math.max(0, subtotal - discount);
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

/** GET /api/cart — 내 장바구니 조회(없으면 생성) */
async function getMyCart(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const cart = await getOrCreateCart(userId);
    const paidIds = await getPaidCourseIdsForUser(userId);
    if (paidIds.size > 0) {
      const before = cart.items.length;
      cart.items = cart.items.filter((it) => !paidIds.has(String(it.course)));
      if (cart.items.length !== before) {
        recalcTotals(cart);
        await cart.save();
      }
    }
    await cart.populate({
      path: 'items.course',
      select: 'title sku price thumbnailUrl status category',
    });
    return res.json({ data: cart });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/** PUT /api/cart — 메타 수정(쿠폰 코드, 통화, 할인액, 상태). 합계는 품목 기준으로 재계산 */
async function updateCart(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const cart = await getOrCreateCart(userId);
    const { couponCode, currency, couponDiscountAmount, status } = req.body || {};

    if (couponCode !== undefined) cart.couponCode = String(couponCode || '').trim();
    if (currency !== undefined) {
      const c = String(currency || '').toUpperCase();
      if (!['KRW', 'USD'].includes(c)) {
        return res.status(400).json({ error: '통화는 KRW 또는 USD만 가능합니다.' });
      }
      cart.currency = c;
    }
    if (couponDiscountAmount !== undefined) {
      const n = Number(couponDiscountAmount);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: 'couponDiscountAmount는 0 이상 숫자여야 합니다.' });
      }
      cart.couponDiscountAmount = n;
    }
    if (status !== undefined) {
      if (!['active', 'checkout', 'converted'].includes(status)) {
        return res.status(400).json({ error: 'status 값이 올바르지 않습니다.' });
      }
      cart.status = status;
    }

    recalcTotals(cart);
    await cart.save();
    await cart.populate({
      path: 'items.course',
      select: 'title sku price thumbnailUrl status category',
    });
    return res.json({ data: cart });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: Object.values(err.errors).map((e) => e.message),
      });
    }
    return res.status(500).json({ error: err.message });
  }
}

/** DELETE /api/cart — 장바구니 비우기(문서 유지, 품목·쿠폰·금액 초기화) */
async function clearCart(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const cart = await getOrCreateCart(userId);
    cart.items = [];
    cart.couponCode = '';
    cart.couponDiscountAmount = 0;
    cart.subtotalAmount = 0;
    cart.totalAmount = 0;
    cart.status = 'active';
    await cart.save();
    await cart.populate({
      path: 'items.course',
      select: 'title sku price thumbnailUrl status category',
    });
    return res.json({ data: cart, message: '장바구니를 비웠습니다.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/** POST /api/cart/items — 품목 추가 */
async function addItem(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const { courseId, quantity = 1 } = req.body || {};
    if (!courseId || !mongoose.Types.ObjectId.isValid(String(courseId))) {
      return res.status(400).json({ error: 'courseId가 필요합니다.' });
    }
    const q = Math.max(1, Math.round(Number(quantity)) || 1);

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: '강의를 찾을 수 없습니다.' });
    if (course.status !== 'published') {
      return res.status(400).json({ error: '판매 중인 강의만 장바구니에 담을 수 있습니다.' });
    }

    const paidIds = await getPaidCourseIdsForUser(userId);
    if (paidIds.has(String(course._id))) {
      return res.status(409).json({ error: '이미 구매한 강좌입니다. 내학습에서 확인해 주세요.' });
    }

    const cart = await getOrCreateCart(userId);
    const cid = new mongoose.Types.ObjectId(String(courseId));
    const existing = cart.items.find((it) => String(it.course) === String(cid));

    if (existing) {
      existing.quantity = Math.max(1, Number(existing.quantity) + q);
    } else {
      cart.items.push({
        course: cid,
        sku: course.sku || '',
        title: course.title || '',
        thumbnailUrl: course.thumbnailUrl || '',
        unitPrice: Number(course.price) || 0,
        quantity: q,
        paymentType: 'one_time',
      });
    }

    recalcTotals(cart);
    await cart.save();
    await cart.populate({
      path: 'items.course',
      select: 'title sku price thumbnailUrl status category',
    });
    return res.status(201).json({ data: cart });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: Object.values(err.errors).map((e) => e.message),
      });
    }
    return res.status(500).json({ error: err.message });
  }
}

/** PUT /api/cart/items/:itemId — 품목 수량 수정 */
async function updateItem(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(itemId))) {
      return res.status(400).json({ error: 'itemId 형식이 올바르지 않습니다.' });
    }

    const { quantity } = req.body || {};
    if (quantity === undefined) {
      return res.status(400).json({ error: 'quantity는 필수입니다.' });
    }
    const q = Math.round(Number(quantity));
    if (!Number.isFinite(q) || q < 1) {
      return res.status(400).json({ error: 'quantity는 1 이상 정수여야 합니다.' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ error: '장바구니가 없습니다.' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ error: '해당 품목을 찾을 수 없습니다.' });

    item.quantity = q;
    recalcTotals(cart);
    await cart.save();
    await cart.populate({
      path: 'items.course',
      select: 'title sku price thumbnailUrl status category',
    });
    return res.json({ data: cart });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/** DELETE /api/cart/items/:itemId — 품목 삭제 */
async function removeItem(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(itemId))) {
      return res.status(400).json({ error: 'itemId 형식이 올바르지 않습니다.' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ error: '장바구니가 없습니다.' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ error: '해당 품목을 찾을 수 없습니다.' });

    item.deleteOne();
    recalcTotals(cart);
    await cart.save();
    await cart.populate({
      path: 'items.course',
      select: 'title sku price thumbnailUrl status category',
    });
    return res.json({ data: cart, message: '품목을 삭제했습니다.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/** DELETE /api/cart/document — 장바구니 문서 자체 삭제(선택) */
async function deleteCartDocument(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const result = await Cart.deleteOne({ user: userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '삭제할 장바구니가 없습니다.' });
    }
    return res.json({ message: '장바구니를 삭제했습니다.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getMyCart,
  updateCart,
  clearCart,
  addItem,
  updateItem,
  removeItem,
  deleteCartDocument,
};
