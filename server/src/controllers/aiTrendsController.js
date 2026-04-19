const AiTrend = require('../models/AiTrend');
const {
  AI_TREND_CATEGORIES,
  AI_TREND_STATUSES,
} = require('../models/AiTrend');

async function createAiTrend(req, res) {
  try {
    const body = { ...req.body };
    if (!body.title && body.name) body.title = body.name;

    if (req.auth?.userId) {
      body.author = req.auth.userId;
    }

    const doc = new AiTrend(body);
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

async function getAiTrends(req, res) {
  try {
    const {
      category,
      status,
      q,
      limit = 50,
      skip = 0,
    } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (q) filter.title = new RegExp(String(q), 'i');

    const data = await AiTrend.find(filter)
      .populate('author', 'name email')
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 });

    const total = await AiTrend.countDocuments(filter);

    return res.json({
      data,
      total,
      limit: Number(limit),
      skip: Number(skip),
      meta: {
        categories: AI_TREND_CATEGORIES,
        statuses: AI_TREND_STATUSES,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getAiTrendById(req, res) {
  try {
    const doc = await AiTrend.findById(req.params.id).populate(
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

async function updateAiTrend(req, res) {
  try {
    const allowed = [
      'sku',
      'title',
      'category',
      'status',
      'thumbnailUrl',
      'description',
      'views',
    ];

    const body = { ...req.body };
    if (!body.title && body.name) body.title = body.name;
    delete body.name;

    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const doc = await AiTrend.findByIdAndUpdate(req.params.id, updates, {
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

async function deleteAiTrend(req, res) {
  try {
    const doc = await AiTrend.findByIdAndDelete(req.params.id);
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
  createAiTrend,
  getAiTrends,
  getAiTrendById,
  updateAiTrend,
  deleteAiTrend,
};

