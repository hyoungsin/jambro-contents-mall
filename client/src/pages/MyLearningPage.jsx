import { useCallback, useEffect, useMemo, useState } from 'react';
import '../App.css';
import { getApiBaseUrl } from '../lib/apiBase.js';

const API_BASE = getApiBaseUrl();

function authHeaders() {
  const t = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const h = {};
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

function formatWon(n) {
  if (n == null || !Number.isFinite(Number(n))) return '0원';
  return `${new Intl.NumberFormat('ko-KR').format(Number(n))}원`;
}

/**
 * 강의 상세는 `onOpenCourseDetail`로 열리며, App에서 진입 경로를 `learning`으로 두어
 * 강의 상세 상단 뒤로가기가 메인이 아닌 내학습으로 돌아가게 합니다.
 */
function MyLearningPage({ user, onBackToMain, onLogout, onNavigateAdmin, onOpenCourseDetail }) {
  const displayName = user?.name ? `${user.name}님` : '회원';
  const isAdmin = user?.userType === 'admin';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [welcomePaySuccess, setWelcomePaySuccess] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      setOrders([]);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders?status=paid&limit=50`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setOrders([]);
        setError('로그인이 필요합니다.');
        return;
      }
      if (!res.ok) throw new Error(data?.error || '내학습 정보를 불러오지 못했습니다.');
      setOrders(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e?.message || '내학습 정보를 불러오지 못했습니다.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('contMall_paySuccessWelcome') === '1') {
        sessionStorage.removeItem('contMall_paySuccessWelcome');
        setWelcomePaySuccess(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!welcomePaySuccess) return undefined;
    const t = setTimeout(() => setWelcomePaySuccess(false), 8000);
    return () => clearTimeout(t);
  }, [welcomePaySuccess]);

  useEffect(() => {
    if (!welcomePaySuccess) return undefined;
    const t = setTimeout(() => {
      load();
    }, 350);
    return () => clearTimeout(t);
  }, [welcomePaySuccess, load]);

  const purchasedCourses = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const o of orders) {
      const items = Array.isArray(o?.items) ? o.items : [];
      for (const it of items) {
        const c = it?.course;
        const id = c?._id || it?.course;
        const key = id != null ? String(id) : '';
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push({
          id: key,
          title: it?.title || c?.title || '강의',
          price: Number(it?.unitPrice ?? c?.price) || 0,
          thumbnailUrl: c?.thumbnailUrl || '',
        });
      }
    }
    return out;
  }, [orders]);

  const hasToken = Boolean(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));

  return (
    <div className="main-bg">
      <div className="main-shell">
        <header className="locker-topbar">
          <button type="button" className="btn-back-to-main" onClick={onBackToMain}>
            <span className="btn-back-to-main__icon" aria-hidden>
              🏠
            </span>
            <span className="btn-back-to-main__label">메인으로</span>
          </button>
          <h1 className="locker-title">내학습</h1>
          <div className="locker-top-actions">
            <span className="locker-user">{displayName}</span>
            {isAdmin && (
              <button type="button" className="main-admin-btn" onClick={onNavigateAdmin}>
                Admin
              </button>
            )}
            <button type="button" className="main-ghost-btn" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </header>

        <main className="locker-main">
          {welcomePaySuccess && (
            <div className="my-learning-welcome-banner" role="status">
              <div className="my-learning-welcome-text-block">
                <p className="my-learning-welcome-title">결제가 완료되었습니다. 축하합니다!</p>
                <p className="my-learning-welcome-text">아래 목록에서 방금 구매한 강의를 확인해 보세요.</p>
              </div>
              <button
                type="button"
                className="my-learning-welcome-dismiss"
                onClick={() => setWelcomePaySuccess(false)}
              >
                닫기
              </button>
            </div>
          )}

          {!hasToken && (
            <div className="locker-empty-card">
              <p className="locker-empty-title">로그인이 필요합니다</p>
              <button type="button" className="btn-back-to-main" onClick={onBackToMain}>
                <span className="btn-back-to-main__icon" aria-hidden>
                  🏠
                </span>
                <span className="btn-back-to-main__label">메인으로</span>
              </button>
            </div>
          )}

          {hasToken && loading && <p className="helper-text">불러오는 중…</p>}
          {hasToken && error && <p className="error-text">{error}</p>}

          {hasToken && !loading && !error && purchasedCourses.length === 0 && (
            <div className="locker-empty-card">
              <div className="locker-empty-icon" aria-hidden>
                📚
              </div>
              <p className="locker-empty-title">구매한 강의가 없습니다.</p>
              <p className="helper-text" style={{ margin: 0 }}>
                결제 완료된 주문만 내학습에 표시됩니다.
              </p>
            </div>
          )}

          {hasToken && !loading && !error && purchasedCourses.length > 0 && (
            <>
              <p className="helper-text" style={{ margin: '0 0 12px' }}>
                결제 완료된 주문 기준으로 강의를 표시합니다.
              </p>
              <ul className="locker-cart-list" aria-label="내 학습 강의 목록">
                {purchasedCourses.map((c) => (
                  <li key={c.id} className="locker-cart-item">
                    <div className="locker-cart-thumb">
                      {c.thumbnailUrl ? (
                        <img src={c.thumbnailUrl} alt="" />
                      ) : (
                        <span className="locker-cart-thumb-ph" aria-hidden>
                          📷
                        </span>
                      )}
                    </div>
                    <div className="locker-cart-meta">
                      <div className="locker-cart-title">{c.title}</div>
                      <div className="locker-cart-sub">
                        <span>{formatWon(c.price)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="locker-cart-remove"
                      onClick={() => onOpenCourseDetail?.(c.id)}
                    >
                      강의 보기
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="main-subscribe-btn" onClick={load} style={{ marginTop: 14 }}>
                새로고침
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default MyLearningPage;

