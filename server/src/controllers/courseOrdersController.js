const mongoose = require('mongoose');
/**
 * 구매 내역(결제완료 목록)은 GET /api/orders?status=paid — orderNumber·totalAmount 등 CourseOrder 스키마 필드 사용
 */
const CourseOrder = require('../models/CourseOrder');
const Course = require('../models/Course');
const Cart = require('../models/Cart');
const { getIamportAccessToken, fetchIamportPayment } = require('../lib/iamportApi');

function userIdFromAuth(req) {
  const id = req.auth?.userId;
  if (!id) return null;
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function assertOwner(doc, userId) {
  return doc && String(doc.user) === String(userId);
}

async function buildItemsFromPayload(itemsInput) {
  const lines = [];
  for (const row of itemsInput) {
    const cid = row?.courseId || row?.course;
    if (!cid || !mongoose.Types.ObjectId.isValid(String(cid))) {
      throw new Error('각 품목에 유효한 courseId가 필요합니다.');
    }
    const course = await Course.findById(cid);
    if (!course) throw new Error(`강의를 찾을 수 없습니다: ${cid}`);
    if (course.status !== 'published') throw new Error(`판매 중이 아닌 강의입니다: ${course.title}`);
    const qty = Math.max(1, Math.round(Number(row.quantity)) || 1);
    lines.push({
      course: course._id,
      title: course.title || '',
      sku: course.sku || '',
      unitPrice: Number(course.price) || 0,
      quantity: qty,
    });
  }
  return lines;
}

/** POST /api/orders — 주문 생성 (품목 배열 또는 source=cart) */
async function createOrder(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const { items: itemsInput, source, discountAmount, clearCart } = req.body || {};
    let items = [];
    let discount = discountAmount != null ? Number(discountAmount) : 0;

    if (source === 'cart') {
      const cart = await Cart.findOne({ user: userId });
      if (!cart || !cart.items?.length) {
        return res.status(400).json({ error: '장바구니에 담긴 강의가 없습니다.' });
      }
      for (const it of cart.items) {
        const course = await Course.findById(it.course);
        if (!course || course.status !== 'published') continue;
        items.push({
          course: course._id,
          title: it.title || course.title || '',
          sku: it.sku || course.sku || '',
          unitPrice: Number(it.unitPrice ?? course.price) || 0,
          quantity: Math.max(1, Number(it.quantity) || 1),
        });
      }
      if (!items.length) {
        return res.status(400).json({ error: '유효한 장바구니 품목이 없습니다.' });
      }
      if (!Number.isFinite(discount) || discount < 0) discount = Number(cart.couponDiscountAmount) || 0;
      if (clearCart) {
        cart.items = [];
        cart.couponCode = '';
        cart.couponDiscountAmount = 0;
        cart.subtotalAmount = 0;
        cart.totalAmount = 0;
        await cart.save();
      }
    } else {
      if (!Array.isArray(itemsInput) || itemsInput.length === 0) {
        return res.status(400).json({ error: 'items 배열이 필요하거나 source=cart 를 사용하세요.' });
      }
      items = await buildItemsFromPayload(itemsInput);
      if (!Number.isFinite(discount) || discount < 0) discount = 0;
    }

    // 동일 강좌 중복 주문 방지: 이미 구매(paid)했거나 결제 진행 중(draft/pending_payment)이면 생성 불가
    const courseIds = [...new Set(items.map((it) => String(it.course)))].filter(Boolean);
    if (courseIds.length > 0) {
      const existing = await CourseOrder.findOne({
        user: userId,
        status: { $in: ['draft', 'pending_payment', 'paid'] },
        'items.course': { $in: courseIds },
      })
        .sort({ createdAt: -1 })
        .select('status items createdAt');

      if (existing) {
        const hit = (existing.items || []).find((it) => it?.course && courseIds.includes(String(it.course)));
        const title = hit?.title ? `(${hit.title}) ` : '';
        if (existing.status === 'paid') {
          return res.status(409).json({ error: `${title}이미 구매한 강좌입니다. 내학습에서 확인해 주세요.` });
        }
        return res.status(409).json({
          error: `${title}이미 결제 진행 중인 주문이 있습니다. (status: ${existing.status})`,
        });
      }
    }

    const doc = await CourseOrder.create({
      user: userId,
      items,
      discountAmount: discount,
      buyerName: String(req.body?.buyerName || '').trim(),
      buyerEmail: String(req.body?.buyerEmail || '').trim(),
      phoneCountryCode: String(req.body?.phoneCountryCode || 'KR').trim(),
      phoneNumber: String(req.body?.phoneNumber || '').trim(),
      phoneVerified: Boolean(req.body?.phoneVerified),
      paymentMethod: req.body?.paymentMethod || 'none',
      status: 'draft',
      currency: String(req.body?.currency || 'KRW').trim() || 'KRW',
    });

    await doc.populate({
      path: 'items.course',
      select: 'title sku price thumbnailUrl status category',
    });
    return res.status(201).json({ data: doc });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: Object.values(err.errors).map((e) => e.message),
      });
    }
    return res.status(400).json({ error: err.message || '주문 생성에 실패했습니다.' });
  }
}

/** GET /api/orders — 내 주문 목록 */
async function listOrders(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const { status, limit = 30, skip = 0 } = req.query;
    const filter = { user: userId };
    if (status) filter.status = status;

    const data = await CourseOrder.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .populate('items.course', 'title sku price thumbnailUrl status');

    const total = await CourseOrder.countDocuments(filter);
    return res.json({
      data,
      total,
      limit: Number(limit),
      skip: Number(skip),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/** GET /api/orders/:id — 단건 */
async function getOrder(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const doc = await CourseOrder.findById(req.params.id).populate(
      'items.course',
      'title sku price thumbnailUrl status category',
    );
    if (!doc) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    if (!assertOwner(doc, userId)) return res.status(403).json({ error: '권한이 없습니다.' });

    return res.json({ data: doc });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: '올바른 ID 형식이 아닙니다.' });
    return res.status(500).json({ error: err.message });
  }
}

/** PUT /api/orders/:id — 구매자 정보·결제수단·할인·상태(제한적) 수정 */
async function updateOrder(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const doc = await CourseOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    if (!assertOwner(doc, userId)) return res.status(403).json({ error: '권한이 없습니다.' });

    if (!['draft', 'pending_payment'].includes(doc.status)) {
      return res.status(400).json({ error: '이 상태에서는 수정할 수 없습니다.' });
    }

    const allowed = [
      'buyerName',
      'buyerEmail',
      'phoneCountryCode',
      'phoneNumber',
      'phoneVerified',
      'paymentMethod',
      'discountAmount',
      'status',
      'pgTransactionId',
      'memo',
    ];
    const body = { ...req.body };
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === 'discountAmount') {
        const n = Number(body.discountAmount);
        if (!Number.isFinite(n) || n < 0) {
          return res.status(400).json({ error: 'discountAmount는 0 이상 숫자여야 합니다.' });
        }
        doc.discountAmount = n;
        continue;
      }
      if (key === 'status') {
        const next = body.status;
        if (!['draft', 'pending_payment', 'cancelled', 'failed'].includes(next)) {
          return res.status(400).json({ error: '허용되지 않는 상태 전환입니다.' });
        }
        if (next === 'failed' && !['draft', 'pending_payment'].includes(doc.status)) {
          return res.status(400).json({ error: '이 상태에서는 failed 로 바꿀 수 없습니다.' });
        }
        doc.status = next;
        continue;
      }
      if (key === 'paymentMethod') {
        if (!CourseOrder.ORDER_PAYMENT_METHODS.includes(body.paymentMethod)) {
          return res.status(400).json({ error: '결제 수단이 올바르지 않습니다.' });
        }
        doc.paymentMethod = body.paymentMethod;
        continue;
      }
      doc[key] = body[key];
    }

    await doc.save();
    await doc.populate({
      path: 'items.course',
      select: 'title sku price thumbnailUrl status category',
    });
    return res.json({ data: doc });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: Object.values(err.errors).map((e) => e.message),
      });
    }
    if (err.name === 'CastError') return res.status(400).json({ error: '올바른 ID 형식이 아닙니다.' });
    return res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/orders/:id/portone/complete
 * body: { imp_uid }
 * IAMPORT_API_KEY / IAMPORT_API_SECRET 이 있으면 서버에서 금액·merchant_uid·상태를 검증합니다.
 * 운영(production)에서는 키가 없으면 거부합니다. 개발에서는 키 없이 검증 생략 가능합니다.
 */
async function completePortonePayment(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const impUid = String(req.body?.imp_uid || '').trim();
    if (!impUid) return res.status(400).json({ error: 'imp_uid가 필요합니다.' });

    const doc = await CourseOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    if (!assertOwner(doc, userId)) return res.status(403).json({ error: '권한이 없습니다.' });

    if (!['draft', 'pending_payment'].includes(doc.status)) {
      return res.status(400).json({ error: '결제 완료를 처리할 수 있는 주문 상태가 아닙니다.' });
    }

    const merchantUidExpected = String(doc._id);
    const allowUnverified = String(process.env.IAMPORT_ALLOW_UNVERIFIED_COMPLETE || '').trim() === '1';
    const isProd = process.env.NODE_ENV === 'production';
    let verificationSkipped = false;
    let verificationNote = '';

    const impKey = process.env.IAMPORT_API_KEY;
    const impSecret = process.env.IAMPORT_API_SECRET;
    if (impKey && impSecret) {
      const token = await getIamportAccessToken();
      if (!token) {
        return res.status(500).json({ error: '포트원 토큰을 받지 못했습니다.' });
      }
      try {
        const payment = await fetchIamportPayment(impUid, token);
        if (payment.status !== 'paid') {
          return res.status(400).json({ error: `결제 상태가 paid가 아닙니다: ${payment.status}` });
        }
        const mu = String(payment.merchant_uid || '');
        if (mu !== merchantUidExpected) {
          return res.status(400).json({ error: 'merchant_uid가 주문과 일치하지 않습니다.' });
        }
        const paidAmount = Number(payment.amount);
        if (!Number.isFinite(paidAmount) || paidAmount !== Number(doc.totalAmount)) {
          return res.status(400).json({ error: '결제 금액이 주문 합계와 일치하지 않습니다.' });
        }
      } catch (e) {
        const msg = String(e?.message || '');
        const notFound =
          msg.includes('존재하지 않는 결제정보') ||
          msg.toLowerCase().includes('not found') ||
          msg.toLowerCase().includes('payment') && msg.toLowerCase().includes('exist');
        if (!isProd && (allowUnverified || notFound)) {
          verificationSkipped = true;
          verificationNote =
            '포트원 REST에서 결제 조회가 실패하여 개발 모드에서 검증을 생략했습니다. (테스트/실연동 REST 키 또는 상점(imp) 불일치 가능)';
          console.warn('[portone] verify skipped:', msg);
        } else {
          throw e;
        }
      }
    } else if (isProd && !allowUnverified) {
      return res.status(503).json({
        error:
          '운영 환경에서는 IAMPORT_API_KEY / IAMPORT_API_SECRET 로 결제 검증이 필요합니다. 개발 시에는 NODE_ENV=development 이거나 IAMPORT_ALLOW_UNVERIFIED_COMPLETE=1 을 사용하세요.',
      });
    } else if (isProd && allowUnverified) {
      console.warn('[portone] IAMPORT_ALLOW_UNVERIFIED_COMPLETE=1 — 검증 없이 paid 처리');
    } else if (!isProd) {
      console.warn('[portone] 개발 모드: IAMPORT_API_KEY/SECRET 없이 검증 생략');
    }

    doc.status = 'paid';
    doc.pgTransactionId = impUid;
    await doc.save();
    await doc.populate({
      path: 'items.course',
      select: 'title sku price thumbnailUrl status category',
    });
    return res.json({
      data: doc,
      message: '결제가 완료되었습니다.',
      verification: verificationSkipped ? 'skipped' : 'verified',
      verificationNote: verificationNote || undefined,
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: '올바른 ID 형식이 아닙니다.' });
    return res.status(400).json({ error: err.message || '결제 완료 처리에 실패했습니다.' });
  }
}

/** DELETE /api/orders/:id — 초안 주문만 삭제 */
async function deleteOrder(req, res) {
  try {
    const userId = userIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: '인증이 필요합니다.' });

    const doc = await CourseOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    if (!assertOwner(doc, userId)) return res.status(403).json({ error: '권한이 없습니다.' });
    if (doc.status !== 'draft') {
      return res.status(400).json({ error: '초안(draft) 주문만 삭제할 수 있습니다.' });
    }

    await CourseOrder.deleteOne({ _id: doc._id });
    return res.json({ message: '삭제되었습니다.', id: doc._id });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: '올바른 ID 형식이 아닙니다.' });
    return res.status(500).json({ error: err.message });
  }
}

function startOfLocalWeekMonday(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfLocalMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

async function aggregatePaid(matchExtra) {
  const r = await CourseOrder.aggregate([
    { $match: { status: 'paid', ...matchExtra } },
    { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
  ]);
  return r[0] || { count: 0, amount: 0 };
}

function pctDelta(prev, curr) {
  if (!prev || prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

/** GET /api/orders/admin/stats — 주간·월간·누적(결제완료 기준) */
async function adminOrderStats(req, res) {
  try {
    const now = new Date();
    const weekStart = startOfLocalWeekMonday(now);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thisWeek = await aggregatePaid({
      createdAt: { $gte: weekStart, $lte: now },
    });
    const lastWeek = await aggregatePaid({
      createdAt: { $gte: lastWeekStart, $lt: weekStart },
    });

    const monthStart = startOfLocalMonth(now);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStartMs = monthStart.getTime();
    const lastMonthEnd = new Date(monthStartMs - 1);

    const thisMonth = await aggregatePaid({
      createdAt: { $gte: monthStart, $lte: now },
    });
    const lastMonth = await aggregatePaid({
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    });

    const total = await CourseOrder.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
    ]);
    const t = total[0] || { count: 0, amount: 0 };

    return res.json({
      data: {
        week: {
          count: thisWeek.count,
          amount: thisWeek.amount,
          prevCount: lastWeek.count,
          prevAmount: lastWeek.amount,
          countDelta: thisWeek.count - lastWeek.count,
          amountDeltaPct: pctDelta(lastWeek.amount, thisWeek.amount),
        },
        month: {
          count: thisMonth.count,
          amount: thisMonth.amount,
          prevCount: lastMonth.count,
          prevAmount: lastMonth.amount,
          countDelta: thisMonth.count - lastMonth.count,
          amountDeltaPct: pctDelta(lastMonth.amount, thisMonth.amount),
        },
        total: { count: t.count, amount: t.amount },
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function dummyRevenueForMonthKey(key) {
  let h = 0;
  const s = String(key);
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 800000 + (h % 4200000);
}

/** GET /api/orders/admin/monthly-revenue — 최근 12개월(실매출 + 미집계 월은 더미) */
async function adminMonthlyRevenue(req, res) {
  try {
    const now = new Date();
    const keys = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      keys.push({
        key: `${y}-${String(m).padStart(2, '0')}`,
        label: `${y}년 ${m}월`,
      });
    }
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
    const agg = await CourseOrder.aggregate([
      {
        $match: {
          status: 'paid',
          createdAt: { $gte: rangeStart },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Seoul' },
          },
          amount: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
    ]);
    const map = new Map(agg.map((a) => [a._id, { amount: a.amount, orders: a.orders }]));

    const months = keys.map(({ key, label }) => {
      const real = map.get(key);
      const realAmount = real ? Number(real.amount) || 0 : 0;
      const isDummy = realAmount === 0;
      const amount = isDummy ? dummyRevenueForMonthKey(key) : realAmount;
      return {
        key,
        label,
        amount,
        orders: real ? real.orders : 0,
        isDummy,
      };
    });

    return res.json({ data: { months } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/** GET /api/orders/admin/popular-courses — 누적 결제금액 기준 */
async function adminPopularCourses(req, res) {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
    const rows = await CourseOrder.aggregate([
      { $match: { status: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.course',
          revenue: {
            $sum: {
              $multiply: [{ $ifNull: ['$items.unitPrice', 0] }, { $ifNull: ['$items.quantity', 1] }],
            },
          },
          orderLines: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          courseId: '$_id',
          title: { $ifNull: ['$course.title', '강의'] },
          revenue: 1,
          orderLines: 1,
        },
      },
    ]);

    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function paymentMethodLabel(method) {
  const m = String(method || 'none');
  const map = {
    none: '미선택',
    naverpay: '네이버페이',
    tosspay: '토스페이',
    kakaopay: '카카오페이',
    payco: '페이코',
    card: '신용카드',
    bank: '계좌이체',
    virtual: '가상계좌',
  };
  return map[m] || m;
}

function orderStatusAdminLabel(status) {
  const s = String(status || '');
  if (s === 'paid') return '결제완료';
  if (s === 'refund_requested') return '환불요청';
  if (s === 'refund_completed') return '환불완료';
  if (s === 'cancelled' || s === 'failed') return '취소';
  if (s === 'pending_payment') return '결제대기';
  if (s === 'draft') return '초안';
  return s;
}

/** GET /api/orders/admin/list */
async function adminListOrders(req, res) {
  try {
    const status = String(req.query.status || 'all').toLowerCase();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 8));
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && status !== 'all') {
      if (status === 'cancelled') {
        filter.status = { $in: ['cancelled', 'failed'] };
      } else {
        filter.status = status;
      }
    }

    const [data, total] = await Promise.all([
      CourseOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .lean(),
      CourseOrder.countDocuments(filter),
    ]);

    const rows = data.map((doc) => {
      const firstItem = Array.isArray(doc.items) && doc.items.length ? doc.items[0] : null;
      const courseTitle =
        firstItem?.title ||
        (firstItem?.course && typeof firstItem.course === 'object' ? firstItem.course.title : '') ||
        '—';
      const u = doc.user;
      const customerName = String(doc.buyerName || u?.name || '').trim() || '—';
      const customerEmail = String(doc.buyerEmail || u?.email || '').trim() || '—';
      const displayId = doc.orderNumber || String(doc._id).slice(-7);

      return {
        _id: doc._id,
        orderNumber: displayId,
        courseTitle,
        customerName,
        customerEmail,
        totalAmount: Number(doc.totalAmount) || 0,
        paymentMethod: doc.paymentMethod,
        paymentMethodLabel: paymentMethodLabel(doc.paymentMethod),
        status: doc.status,
        statusLabel: orderStatusAdminLabel(doc.status),
        createdAt: doc.createdAt,
      };
    });

    return res.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateOrder,
  completePortonePayment,
  deleteOrder,
  adminOrderStats,
  adminMonthlyRevenue,
  adminPopularCourses,
  adminListOrders,
};
