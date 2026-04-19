const User = require('../models/User');

/**
 * 포인트·쿠폰·선물·구매혜택 조회/등록은 `meController`와 `/api/me` 라우트를 사용합니다.
 */

/**
 * 사용자 생성
 */
async function createUser(req, res) {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: Object.values(err.errors).map((e) => e.message),
      });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * 사용자 목록 조회 (쿼리: userType, limit, skip)
 */
async function getUsers(req, res) {
  try {
    const { userType, limit = 50, skip = 0 } = req.query;
    const filter = {};
    if (userType) filter.userType = userType;

    const users = await User.find(filter)
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 });
    const total = await User.countDocuments(filter);

    res.json({
      data: users,
      total,
      limit: Number(limit),
      skip: Number(skip),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * 단일 사용자 조회
 */
async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    res.json(user);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: '올바른 ID 형식이 아닙니다.' });
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * 사용자 수정 (전달된 필드만 부분 수정)
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const allowed = ['name', 'password', 'userType', 'address'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.email !== undefined) updates.email = req.body.email;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    res.json(user);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: Object.values(err.errors).map((e) => e.message),
      });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: '올바른 ID 형식이 아닙니다.' });
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * 사용자 삭제
 */
async function deleteUser(req, res) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    res.status(204).send();
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: '올바른 ID 형식이 아닙니다.' });
    }
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
