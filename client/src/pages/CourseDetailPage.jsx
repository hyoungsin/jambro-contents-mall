import { useCallback, useEffect, useState } from 'react';
import '../App.css';

import { getApiBaseUrl } from '../lib/apiBase.js';

const API_BASE = getApiBaseUrl();

function authHeadersJson() {
  const t = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const h = { 'Content-Type': 'application/json' };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

function formatWon(n) {
  if (n == null || !Number.isFinite(Number(n))) return '0원';
  return `${new Intl.NumberFormat('ko-KR').format(Number(n))}원`;
}

function CourseDetailPage({
  courseId,
  user,
  onBack,
  onLogout,
  onNavigateAdmin,
  onNavigateLocker,
  onCheckout,
  backLabel = '강좌 목록',
  backIcon = '📚',
}) {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartMsg, setCartMsg] = useState('');
  const [cartBusy, setCartBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('intro');

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '강의를 불러오지 못했습니다.');
      if (data?.status && data.status !== 'published') {
        throw new Error('판매 중인 강의가 아닙니다.');
      }
      setCourse(data);
    } catch (e) {
      setError(e?.message || '강의를 불러오지 못했습니다.');
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const orig = course?.originalPrice;
  const price = Number(course?.price) || 0;
  const showDiscount = orig != null && Number(orig) > 0 && Number(orig) > price;
  const discountPct =
    showDiscount && Number(orig) > 0
      ? Math.round((1 - price / Number(orig)) * 100)
      : 0;
  const cap = course?.studentsCount;
  const isAdmin = user?.userType === 'admin';

  const handleAddToCart = async () => {
    setCartMsg('');
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      setCartMsg('로그인 후 장바구니에 담을 수 있습니다.');
      return;
    }
    setCartBusy(true);
    try {
      const res = await fetch(`${API_BASE}/cart/items`, {
        method: 'POST',
        headers: authHeadersJson(),
        body: JSON.stringify({ courseId, quantity: 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setCartMsg('다시 로그인해 주세요.');
        return;
      }
      if (!res.ok) throw new Error(data?.error || '장바구니에 담지 못했습니다.');
      setCartMsg('장바구니에 담았습니다.');
    } catch (e) {
      setCartMsg(e?.message || '장바구니에 담지 못했습니다.');
    } finally {
      setCartBusy(false);
    }
  };

  const handleEnroll = () => {
    if (!courseId) return;
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      setCartMsg('결제(수강신청)는 로그인 후 진행할 수 있습니다.');
      return;
    }
    onCheckout?.(courseId);
  };

  return (
    <div className="course-detail-page">
      <header className="course-detail-topbar">
        <button type="button" className="btn-back-to-main" onClick={onBack}>
          <span className="btn-back-to-main__icon" aria-hidden>
            {backIcon}
          </span>
          <span className="btn-back-to-main__label">{backLabel}</span>
        </button>
        <div className="course-detail-top-actions">
          {user?.name && <span className="course-detail-user">{user.name}님</span>}
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

      {loading && <p className="helper-text course-detail-loading">불러오는 중…</p>}
      {error && <p className="error-text course-detail-error">{error}</p>}

      {!loading && course && (
        <>
          <section className="course-detail-hero">
            <div className="course-detail-hero-inner">
              <div className="course-detail-hero-text">
                <p className="course-detail-breadcrumb">
                  강좌 / <span className="course-detail-breadcrumb-strong">{course.category || '강의'}</span>
                </p>
                <h1 className="course-detail-title">{course.title}</h1>
                <p className="course-detail-sub">
                  {String(course.description || '').trim() || '상세 설명이 준비 중입니다.'}
                </p>
                <div className="course-detail-stats">
                  {course.rating > 0 && (
                    <span className="course-detail-stat">
                      ★ {Number(course.rating).toFixed(1)}
                    </span>
                  )}
                  {cap != null && Number(cap) > 0 && (
                    <span className="course-detail-stat">정원 {Number(cap).toLocaleString('ko-KR')}명</span>
                  )}
                  <span className="course-detail-stat">SKU {course.sku || '—'}</span>
                </div>
                <div className="course-detail-tags">
                  <span className="course-detail-tag">{course.category}</span>
                  <span className="course-detail-tag">온라인</span>
                </div>
              </div>
              <div className="course-detail-hero-media">
                {course.thumbnailUrl ? (
                  <img className="course-detail-thumb" src={course.thumbnailUrl} alt="" />
                ) : (
                  <div className="course-detail-thumb-placeholder">미리보기</div>
                )}
              </div>
            </div>
          </section>

          <div className="course-detail-body">
            <div className="course-detail-main">
              <nav className="course-detail-tabs" aria-label="강의 탭">
                {[
                  { id: 'intro', label: '강의 소개' },
                  { id: 'curriculum', label: '커리큘럼' },
                  { id: 'reviews', label: '수강평' },
                  { id: 'qna', label: '수강전 문의' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`course-detail-tab ${activeTab === t.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
              <div className="course-detail-panel">
                {activeTab === 'intro' && (
                  <div>
                    <h2 className="course-detail-panel-title">강의 소개</h2>
                    <p className="course-detail-panel-text">
                      {String(course.description || '').trim() || '강의 소개 내용이 곧 업데이트됩니다.'}
                    </p>
                  </div>
                )}
                {activeTab !== 'intro' && (
                  <p className="helper-text">해당 탭 콘텐츠는 준비 중입니다.</p>
                )}
              </div>
            </div>

            <aside className="course-detail-sidebar" aria-label="수강 신청">
              <div className="course-detail-purchase-card">
                <div className="course-detail-price-block">
                  <div className="course-detail-price-main">{formatWon(price)}</div>
                  {showDiscount && (
                    <div className="course-detail-price-sub">
                      <span className="course-detail-pct">{discountPct}%</span>
                      <span className="course-detail-was">{formatWon(orig)}</span>
                    </div>
                  )}
                </div>
                <button type="button" className="course-detail-btn-primary" onClick={handleEnroll}>
                  수강신청 하기
                </button>
                <button
                  type="button"
                  className="course-detail-btn-secondary"
                  onClick={handleAddToCart}
                  disabled={cartBusy}
                >
                  {cartBusy ? '처리 중…' : '바구니에 담기'}
                </button>
                {cartMsg && (
                  <p className="course-detail-cart-msg">
                    {cartMsg}
                    {cartMsg.includes('담았습니다') && (
                      <>
                        {' '}
                        <button type="button" className="course-detail-link" onClick={onNavigateLocker}>
                          장바구니로
                        </button>
                      </>
                    )}
                  </p>
                )}
                <p className="course-detail-secure">모든 거래는 안전하게 처리됩니다 (PG 연동 예정)</p>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

export default CourseDetailPage;
