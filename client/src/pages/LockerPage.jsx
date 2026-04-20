import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * 장바구니 — 서버 GET /api/cart 연동
 */
function LockerPage({ user, onBackToMain, onLogout, onNavigateAdmin, onProceedToCheckout }) {
  const displayName = user?.name ? `${user.name}님` : '회원';
  const isAdmin = user?.userType === 'admin';
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  /** 담긴 품목 _id 선택 (다건 결제) */
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const selectAllRef = useRef(null);

  const loadCart = useCallback(async () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      setCart(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/cart`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setCart(null);
        setError('로그인이 필요합니다.');
        return;
      }
      if (!res.ok) throw new Error(data?.error || '장바구니를 불러오지 못했습니다.');
      setCart(data?.data ?? null);
    } catch (e) {
      setError(e?.message || '장바구니를 불러오지 못했습니다.');
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadCart();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadCart]);

  const removeItem = async (itemId) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token || !itemId) return;
    setBusyId(String(itemId));
    setError('');
    try {
      const res = await fetch(`${API_BASE}/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '삭제에 실패했습니다.');
      setCart(data?.data ?? null);
    } catch (e) {
      setError(e?.message || '삭제에 실패했습니다.');
    } finally {
      setBusyId('');
    }
  };

  const items = Array.isArray(cart?.items) ? cart.items : [];
  const hasToken = Boolean(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));

  const itemIdList = useMemo(
    () => items.map((line) => (line?._id != null ? String(line._id) : '')).filter(Boolean),
    [items],
  );
  const itemIdsKey = itemIdList.slice().sort().join(',');

  useEffect(() => {
    const ids = itemIdList;
    setSelectedIds((prev) => {
      const kept = new Set([...prev].filter((id) => ids.includes(id)));
      if (kept.size === 0 && ids.length > 0) return new Set(ids);
      return kept;
    });
  }, [itemIdsKey, itemIdList]);

  const toggleLine = (id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = itemIdList.length > 0 && itemIdList.every((id) => selectedIds.has(id));
  const someSelected = itemIdList.some((id) => selectedIds.has(id));

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const toggleSelectAll = () => {
    if (itemIdList.length === 0) return;
    setSelectedIds(allSelected ? new Set() : new Set(itemIdList));
  };

  const selectedLines = items.filter((line) => {
    const id = line?._id != null ? String(line._id) : '';
    return id && selectedIds.has(id);
  });

  const selectedSubtotal = selectedLines.reduce((sum, line) => {
    const u = Number(line?.unitPrice) || 0;
    const q = Math.max(1, Number(line?.quantity) || 1);
    return sum + u * q;
  }, 0);

  const couponAll = Number(cart?.couponDiscountAmount) || 0;
  const applyCoupon = allSelected && couponAll > 0 && itemIdList.length > 0;
  const selectedDiscount = applyCoupon ? Math.min(couponAll, selectedSubtotal) : 0;
  const selectedTotal = Math.max(0, selectedSubtotal - selectedDiscount);

  const goCheckout = () => {
    const ids = itemIdList.filter((id) => selectedIds.has(id));
    if (ids.length === 0 || typeof onProceedToCheckout !== 'function') return;
    onProceedToCheckout(ids);
  };

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
          <h1 className="locker-title">장바구니</h1>
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
          {!hasToken && (
            <div className="locker-empty-card">
              <p className="locker-empty-title">로그인이 필요합니다</p>
              <p className="helper-text" style={{ margin: '0 0 16px' }}>
                장바구니는 로그인한 계정에만 연결됩니다.
              </p>
              <button type="button" className="btn-back-to-main" onClick={onBackToMain}>
                <span className="btn-back-to-main__icon" aria-hidden>
                  🏠
                </span>
                <span className="btn-back-to-main__label">메인으로</span>
              </button>
            </div>
          )}

          {hasToken && loading && <p className="helper-text">불러오는 중…</p>}
          {hasToken && error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

          {hasToken && !loading && !error && items.length === 0 && (
            <div className="locker-empty-card">
              <div className="locker-empty-icon" aria-hidden>
                🗂️
              </div>
              <p className="locker-empty-title">담긴 강의가 없습니다.</p>
              <p className="helper-text" style={{ margin: '0 0 16px' }}>
                강의 상세에서 &quot;바구니에 담기&quot;를 누르면 이곳에 표시됩니다.
              </p>
              <button type="button" className="main-subscribe-btn" onClick={onBackToMain}>
                강의 둘러보기
              </button>
            </div>
          )}

          {hasToken && !loading && items.length > 0 && (
            <div className="locker-cart-wrap">
              <div className="locker-select-toolbar">
                <label className="locker-select-all">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                  <span>전체 선택</span>
                </label>
                {!someSelected && (
                  <span className="locker-select-hint">결제할 강의를 선택해 주세요.</span>
                )}
              </div>
              <ul className="locker-cart-list" aria-label="담긴 강의 목록">
                {items.map((line, idx) => {
                  const id = line?._id != null ? String(line._id) : '';
                  const title = line?.title || line?.course?.title || '강의';
                  const thumb = line?.thumbnailUrl || line?.course?.thumbnailUrl;
                  const unit = Number(line?.unitPrice) || 0;
                  const checked = Boolean(id && selectedIds.has(id));
                  return (
                    <li key={id || `cart-line-${idx}`} className="locker-cart-item">
                      <label className="locker-line-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!id}
                          onChange={() => toggleLine(id)}
                          aria-label={`${title} 선택`}
                        />
                      </label>
                      <div className="locker-cart-thumb">
                        {thumb ? <img src={thumb} alt="" /> : <span className="locker-cart-thumb-ph">📷</span>}
                      </div>
                      <div className="locker-cart-meta">
                        <div className="locker-cart-title">{title}</div>
                        <div className="locker-cart-sub">
                          <strong>{formatWon(unit)}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="locker-cart-remove"
                        disabled={busyId === id}
                        onClick={() => removeItem(id)}
                      >
                        {busyId === id ? '…' : '삭제'}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="locker-cart-summary">
                <p className="locker-summary-note">선택한 강의 기준 금액입니다.</p>
                <div className="locker-cart-row">
                  <span>소계</span>
                  <strong>{formatWon(selectedSubtotal)}</strong>
                </div>
                {selectedDiscount > 0 && (
                  <div className="locker-cart-row locker-cart-discount">
                    <span>할인 (전체 선택)</span>
                    <strong>-{formatWon(selectedDiscount)}</strong>
                  </div>
                )}
                {couponAll > 0 && !applyCoupon && someSelected && (
                  <p className="locker-coupon-hint">쿠폰 할인은 전체 선택 시에만 적용됩니다.</p>
                )}
                <div className="locker-cart-row locker-cart-total">
                  <span>합계</span>
                  <strong>{formatWon(selectedTotal)}</strong>
                </div>
                <button
                  type="button"
                  className="main-subscribe-btn locker-cart-pay"
                  disabled={!someSelected}
                  onClick={goCheckout}
                >
                  결제하기
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default LockerPage;
