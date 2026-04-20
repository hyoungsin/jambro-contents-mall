import { useEffect, useState } from 'react';
import {
  NEWSLETTER_CATEGORIES,
  getCategoryByBackendCategory,
} from './newsletter.jsx';
import { getApiBaseUrl } from '../../lib/apiBase.js';

const API_BASE = getApiBaseUrl();

function IconSparkle() {
  return (
    <svg
      className="hero-subscribe-success-icon"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle cx="6.5" cy="17.5" r="1.75" fill="currentColor" opacity="0.95" />
      <path
        fill="currentColor"
        d="M12 2.2l1.15 4.35L17.5 8l-4.35 1.15L12 13.5l-1.15-4.35L6.5 8l4.35-1.15L12 2.2zm5.2 10.3l.55 2.05 2.05.55-2.05.55-.55 2.05-.55-2.05-2.05-.55 2.05-.55.55-2.05z"
      />
    </svg>
  );
}

function HeroSection({ user }) {
  const [latest, setLatest] = useState(null);
  const latestCategory =
    getCategoryByBackendCategory(latest?.category)?.title ||
    NEWSLETTER_CATEGORIES[1]?.title ||
    'AI Newsletter';

  const [email, setEmail] = useState('');
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/ai-trends?limit=1&skip=0`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const first = Array.isArray(data?.data) ? data.data[0] : null;
        if (!cancelled) setLatest(first || null);
      } catch {
        if (!cancelled) setLatest(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!subscribeSuccess) return undefined;
    const t = window.setTimeout(() => setSubscribeSuccess(false), 6000);
    return () => window.clearTimeout(t);
  }, [subscribeSuccess]);

  const handleSubscribe = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      return;
    }
    setSubscribeSuccess(true);
  };

  return (
    <section className="hero-card">
      <div className="hero-left">
        <div className="hero-pill">AI Newsletter</div>

        <h1 className="hero-big-title">
          <span className="hero-highlight">AI트렌드</span>
          <span className="hero-title-remainder">를 가장 먼저 만나보세요</span>
        </h1>

        <p className="hero-desc">
          매주 최신 AI Trend와 인사이트 그리고 적용을 통해 함께 성장해보세요.
        </p>

        <div className="hero-email-row">
          <input
            className="hero-email-input"
            type="email"
            placeholder="이메일 주소를 입력하세요"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-label="구독 이메일"
          />
          <button
            type="button"
            className="hero-subscribe-btn"
            onClick={handleSubscribe}
          >
            Subscribe <span className="hero-arrow">→</span>
          </button>
        </div>

        {subscribeSuccess && (
          <div
            className="hero-subscribe-success"
            role="status"
            aria-live="polite"
          >
            <IconSparkle />
            <p className="hero-subscribe-success-text">
              구독 신청이 완료되었습니다! 이메일을 확인해주세요.
            </p>
          </div>
        )}

        <div className="hero-footnote">3,200+ 구독자의 참여로, 더 좋은 인사이트를 전달합니다.</div>
      </div>

      <div className="hero-right">
        <div className="hero-visual-card">
          <div className="hero-visual-thumb-wrap">
            <img
              className="hero-visual-img"
              src={latest?.thumbnailUrl || '/hero-llm-battle.png'}
              alt={latest?.title || '최신 AI 뉴스레터 썸네일'}
              loading="eager"
              decoding="async"
              width={560}
              height={315}
            />
          </div>

          <div className="hero-visual-meta">
            <div className="hero-visual-meta-category">{latestCategory}</div>
            <div className="hero-visual-meta-title">
              {latest?.title || '최신 AI 뉴스레터 아티클 업데이트'}
            </div>
            <div className="hero-visual-meta-date">
              {latest?.createdAt ? new Date(latest.createdAt).toISOString().slice(0, 10) : ''}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
