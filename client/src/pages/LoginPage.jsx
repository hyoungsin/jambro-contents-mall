import { useEffect, useState } from 'react';
import '../App.css';
import MainHeader from '../components/main/navbar.jsx';
import Footer from '../components/main/Footer.jsx';
import { getApiBaseUrl } from '../lib/apiBase.js';

function LoginPage({
  onNavigateSignup,
  onLoginSuccess,
  postSignupMessage,
  onClearPostSignupMessage,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postSignupMessage) return undefined;
    const t = window.setTimeout(() => {
      onClearPostSignupMessage?.();
    }, 8000);
    return () => window.clearTimeout(t);
  }, [postSignupMessage, onClearPostSignupMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setLoginMessage('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '로그인에 실패했습니다.');

      onLoginSuccess?.({ token: data.token, user: data.user });
    } catch (err) {
      setLoginMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const targetEmail =
      email?.trim() || window.prompt('등록된 이메일을 입력해 주세요.');
    if (!targetEmail) return;

    setForgotMessage('');
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '요청에 실패했습니다.');
      setForgotMessage(data?.message || '요청이 완료되었습니다.');
    } catch (err) {
      setForgotMessage(err.message);
    }
  };

  return (
    <div className="main-bg">
      <div className="main-shell login-shell">
        <MainHeader showUserActions={false} />

        <div className="login-content">
          <div className="auth-card login-card">
            <h1 className="auth-title">로그인</h1>
            {postSignupMessage && (
              <div className="auth-success-banner" role="status">
                {postSignupMessage}
              </div>
            )}
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="field">
                <div className="field-label">이메일</div>
                <input
                  className="field-input"
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field">
                <div className="field-label">비밀번호</div>
                <input
                  className="field-input"
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? '로그인 중...' : '로그인'}
              </button>

              {loginMessage && <div className="error-text">{loginMessage}</div>}

              <div className="text-center">
                <button
                  type="button"
                  className="text-link"
                  onClick={handleForgotPassword}
                >
                  비밀번호를 잊으셨나요?
                </button>
                {forgotMessage && <div className="helper-text">{forgotMessage}</div>}
              </div>

              <div className="text-center">
                <button
                  type="button"
                  className="text-link"
                  onClick={onNavigateSignup}
                >
                  아직 계정이 없으신가요? 회원가입
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer onSignUpClick={onNavigateSignup} showFab={false} />
    </div>
  );
}

export default LoginPage;

