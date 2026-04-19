const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in server/.env');
}
const JWT_EXPIRES_IN = '1d'; // 로그인 후 1일 유지

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 모두 입력해 주세요.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    let isMatch = false;
    const storedPassword = user.password || '';
    const looksHashed = typeof storedPassword === 'string' && storedPassword.startsWith('$2');

    if (looksHashed) {
      isMatch = await bcrypt.compare(password, storedPassword);
    } else {
      // 과거 평문으로 저장된 계정 호환 처리
      isMatch = password === storedPassword;
      // 성공하면 즉시 해시로 마이그레이션
      if (isMatch) {
        user.password = password; // pre('save')에서 bcrypt 해시됨
        await user.save();
      }
    }

    if (!isMatch) {
      return res
        .status(401)
        .json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const payload = {
      userId: user._id,
      userType: user.userType,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        points: Number(user.points) || 0,
      },
    });
  } catch (err) {
    console.error('로그인 에러:', err);
    res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
  }
}

// JWT 기반이므로 서버 측 로그아웃은 토큰 삭제 대신 클라이언트에서 토큰 제거로 처리
// 필요 시, 이 엔드포인트에서 클라이언트가 토큰을 지우도록 안내하는 응답만 제공
function logout(_req, res) {
  res.status(200).json({ message: '로그아웃 되었습니다. 클라이언트에서 토큰을 삭제해 주세요.' });
}

function generateTempPassword() {
  // 사람이 입력하기 쉬운 임시 비밀번호 (최소 10자)
  // (프로덕션에서는 정책에 맞게 더 강화 가능)
  const a = Math.random().toString(36).slice(2, 8);
  const b = Math.random().toString(36).slice(2, 8);
  return `${a}${b}`; // 12자 내외
}

async function sendTempPasswordEmail({ to, tempPassword }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  // SMTP 설정이 없으면 개발 편의를 위해 메일 전송을 스킵하고 서버 콘솔에만 출력
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.log('[forgot-password] SMTP 미설정 - 임시 비밀번호:', { to, tempPassword });
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const from = SMTP_FROM || SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: '[Jambro] 임시 비밀번호 안내',
    text: `임시 비밀번호: ${tempPassword}\n로그인 후 반드시 비밀번호를 변경해 주세요.`,
  });

  return { skipped: false };
}

// POST /api/auth/forgot-password
// - bcrypt 해시로 인해 기존 비밀번호를 "발송"할 수 없으므로, 임시 비밀번호를 발급/저장 후 발송
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: '이메일을 입력해 주세요.' });
    }

    const user = await User.findOne({ email });
    // 계정 존재 여부를 노출하지 않기 위해 동일 메시지 반환
    if (!user) {
      return res.json({
        message: '메일이 등록되어 있다면 임시 비밀번호를 발송했습니다.',
      });
    }

    const tempPassword = generateTempPassword();
    user.password = tempPassword; // User 모델의 pre('save')에서 bcrypt 해시 처리됨
    await user.save();

    await sendTempPasswordEmail({ to: email, tempPassword });

    return res.json({
      message: '메일이 등록되어 있다면 임시 비밀번호를 발송했습니다.',
    });
  } catch (err) {
    console.error('비밀번호 재설정 에러:', err);
    return res.status(500).json({ error: '비밀번호 재설정 중 오류가 발생했습니다.' });
  }
}

module.exports = {
  login,
  logout,
  forgotPassword,
};

