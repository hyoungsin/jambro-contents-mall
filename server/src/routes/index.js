const express = require('express');
const router = express.Router();
const usersRouter = require('./users');
const authRouter = require('./auth');
const aiTrendsRouter = require('./aiTrends');
const coursesRouter = require('./courses');
const cartRouter = require('./cart');
const courseOrdersRouter = require('./courseOrders');
const certificationsRouter = require('./certifications');
const configRouter = require('./config');
const meRouter = require('./me');

router.get('/', (req, res) => {
  res.json({
    message: 'API v1',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      // AI 트렌드(뉴스)
      aiTrends: {
        base: '/api/ai-trends',
        register: 'POST /api/ai-trends (또는 POST /api/ai-trends/register)',
        list: 'GET /api/ai-trends',
        one: 'GET /api/ai-trends/:id',
        update: 'PUT /api/ai-trends/:id',
        remove: 'DELETE /api/ai-trends/:id',
      },
      // 강의
      courses: {
        base: '/api/courses',
        register: 'POST /api/courses (또는 POST /api/courses/register)',
        list: 'GET /api/courses',
        one: 'GET /api/courses/:id',
        update: 'PUT /api/courses/:id',
        remove: 'DELETE /api/courses/:id',
      },
      cloudinary: {
        publicConfig: 'GET /api/config/cloudinary',
      },
      cart: {
        base: '/api/cart',
        get: 'GET /api/cart',
        update: 'PUT /api/cart',
        clear: 'DELETE /api/cart',
        deleteDocument: 'DELETE /api/cart/document',
        addItem: 'POST /api/cart/items',
        updateItem: 'PUT /api/cart/items/:itemId',
        removeItem: 'DELETE /api/cart/items/:itemId',
      },
      me: {
        base: '/api/me (인증 필요)',
        points: 'GET /api/me/points',
        pointLedger: 'GET /api/me/point-ledger',
        coupons: 'GET /api/me/coupons?tab=available|expiring|used|all',
        registerCoupon: 'POST /api/me/coupons/register',
        giftsReceived: 'GET /api/me/gifts/received',
        giftsSent: 'GET /api/me/gifts/sent',
      },
      orders: {
        base: '/api/orders',
        create: 'POST /api/orders (body: items | source=cart)',
        list: 'GET /api/orders',
        one: 'GET /api/orders/:id',
        update: 'PUT /api/orders/:id',
        portoneComplete: 'POST /api/orders/:id/portone/complete (body: { imp_uid })',
        remove: 'DELETE /api/orders/:id',
        adminStats: 'GET /api/orders/admin/stats (admin)',
        adminMonthlyRevenue: 'GET /api/orders/admin/monthly-revenue (admin)',
        adminPopularCourses: 'GET /api/orders/admin/popular-courses (admin)',
        adminList: 'GET /api/orders/admin/list (admin)',
      },
      certifications: {
        verify: 'POST /api/certifications/verify (body: { imp_uid })',
      },
    },
  });
});

// 공개 설정(Cloudinary 위젯용 등): /api/config
router.use('/config', configRouter);

// Auth: /api/auth
router.use('/auth', authRouter);

// User CRUD: /api/users
router.use('/users', usersRouter);

// AI 트렌드: /api/ai-trends
router.use('/ai-trends', aiTrendsRouter);

// Courses: /api/courses
router.use('/courses', coursesRouter);

// Cart: /api/cart (로그인 필요)
router.use('/cart', cartRouter);

// 수강 결제 주문: /api/orders (로그인 필요)
router.use('/orders', courseOrdersRouter);

// 포트원 본인인증 검증: /api/certifications (로그인 필요)
router.use('/certifications', certificationsRouter);

// 구매/혜택(포인트·쿠폰·선물): /api/me
router.use('/me', meRouter);

module.exports = router;
