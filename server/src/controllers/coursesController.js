const Course = require('../models/Course');
const { COURSE_CATEGORIES, COURSE_STATUSES } = require('../models/Course');

function normalizeDifficultyRating(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return undefined;
  return Math.min(5, Math.max(0, n));
}

async function createCourse(req, res) {
  try {
    const body = { ...req.body };

    // 이전 스펙 호환: title 대신 name을 보낼 수 있음
    if (!body.title && body.name) body.title = body.name;

    const diff = normalizeDifficultyRating(body.rating);
    if (diff !== undefined) body.rating = diff;

    if (req.auth?.userId) {
      body.author = req.auth.userId;
    }

    const doc = new Course(body);
    await doc.save();
    return res.status(201).json(doc);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: Object.values(err.errors).map((e) => e.message),
      });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: '이미 사용 중인 SKU입니다.' });
    }
    return res.status(500).json({ error: err.message });
  }
}

async function getCourses(req, res) {
  try {
    const { category, status, q, limit = 50, skip = 0 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (q) filter.title = new RegExp(String(q), 'i');

    const data = await Course.find(filter)
      .populate('author', 'name email')
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(filter);

    return res.json({
      data,
      total,
      limit: Number(limit),
      skip: Number(skip),
      meta: {
        categories: COURSE_CATEGORIES,
        statuses: COURSE_STATUSES,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getCourseById(req, res) {
  try {
    const doc = await Course.findById(req.params.id).populate(
      'author',
      'name email',
    );
    if (!doc) return res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
    return res.json(doc);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: '올바른 ID 형식이 아닙니다.' });
    }
    return res.status(500).json({ error: err.message });
  }
}

async function updateCourse(req, res) {
  try {
    const allowed = [
      'sku',
      'title',
      'category',
      'status',
      'thumbnailUrl',
      'description',
      'views',
      'price',
      'originalPrice',
      'studentsCount',
      'rating',
      'duration',
    ];

    const body = { ...req.body };
    if (!body.title && body.name) body.title = body.name;
    delete body.name;

    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (updates.rating !== undefined) {
      const diff = normalizeDifficultyRating(updates.rating);
      if (diff !== undefined) updates.rating = diff;
    }

    const doc = await Course.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!doc) return res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
    return res.json(doc);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: Object.values(err.errors).map((e) => e.message),
      });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: '이미 사용 중인 SKU입니다.' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: '올바른 ID 형식이 아닙니다.' });
    }
    return res.status(500).json({ error: err.message });
  }
}

async function deleteCourse(req, res) {
  try {
    const doc = await Course.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
    return res.json({ message: '삭제되었습니다.', id: doc._id });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: '올바른 ID 형식이 아닙니다.' });
    }
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
};

