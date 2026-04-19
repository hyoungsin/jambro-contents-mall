import { useState } from 'react';
import '../App.css';
import { getApiBaseUrl } from '../lib/apiBase.js';

function SignupPage({ onNavigateLogin, onSignupSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) {
      setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          data?.error ||
          (Array.isArray(data?.details) ? data.details.join(', ') : '회원가입에 실패했습니다.');
        throw new Error(message);
      }

      setName('');
      setEmail('');
      setPassword('');
      setPasswordConfirm('');
      onSignupSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-root">
      <div className="auth-card">
        <h1 className="auth-title">회원가입</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <div className="field-label">이름</div>
            <input
              className="field-input"
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
              placeholder="새 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="helper-text">비밀번호는 최소 6자 이상 입력해 주세요.</div>
          </div>

          <div className="field">
            <div className="field-label">비밀번호 확인</div>
            <input
              className="field-input"
              type="password"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>

          {error && <div className="error-text">{error}</div>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? '가입 중...' : '가입'}
          </button>

          <div className="text-center" style={{ marginTop: 16 }}>
            <button type="button" className="text-link" onClick={onNavigateLogin}>
              이미 계정이 있으신가요? 로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignupPage;

