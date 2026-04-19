const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

function getTokenFromHeader(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

// 인증: JWT가 유효하면 req.auth에 payload를 넣음
function requireAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: '인증이 필요합니다. (토큰 없음)' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload; // { userId, userType, iat, exp }
    return next();
  } catch (err) {
    return res.status(401).json({ error: '인증이 필요합니다. (토큰 오류)' });
  }
}

// 권한: admin만 통과
function requireAdmin(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  if (req.auth.userType !== 'admin') {
    return res.status(403).json({ error: '권한이 없습니다. (admin only)' });
  }
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};

