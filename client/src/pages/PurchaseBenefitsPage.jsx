import { useCallback, useEffect, useMemo, useState } from 'react';
import '../App.css';

function resolveApiBase() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (raw) return raw.endsWith('/api') ? raw : `${raw}/api`;
  if (import.meta.env.DEV) return '/api';
  return 'http://localhost:5000/api';
}

const API_BASE = resolveApiBase();

function authHeaders() {
  const t = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const h = {};
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

function formatWon(n) {
  if (n == null || !Number.isFinite(Number(n))) return '₩0';
  return `₩${new Intl.NumberFormat('ko-KR').format(Number(n))}`;
}

function formatOrderDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}. ${m}. ${day}.`;
}

function formatLedgerTime(d) {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const MAIN_TABS = [
  { id: 'orders', label: '구매 내역' },
  { id: 'gifts', label: '선물함' },
  { id: 'coupons', label: '쿠폰함', external: true },
  { id: 'points', label: '포인트', external: true },
];

const COUPON_TABS = [
  { id: 'available', label: '사용가능' },
  { id: 'expiring', label: '만료임박' },
  { id: 'used', label: '사용완료 · 기간만료' },
  { id: 'all', label: '전체 쿠폰' },
];

function PurchaseBenefitsPage({
  user,
  onBackToMain,
  onLogout,
  onNavigateAdmin,
  initialMainTab = 'orders',
  initialGiftTab = 'received',
}) {
  const displayName = user?.name ? `${user.name}님` : '회원';
  const isAdmin = user?.userType === 'admin';

  const [mainTab, setMainTab] = useState(initialMainTab);
  const [giftTab, setGiftTab] = useState(initialGiftTab);
  const [couponTab, setCouponTab] = useState('available');
  const [couponCode, setCouponCode] = useState('');

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [giftsReceived, setGiftsReceived] = useState([]);
  const [giftsSent, setGiftsSent] = useState([]);
  const [giftsLoading, setGiftsLoading] = useState(false);

  const [pointBalance, setPointBalance] = useState(0);
  const [ledger, setLedger] = useState([]);
  const [pointsLoading, setPointsLoading] = useState(false);

  const [couponItems, setCouponItems] = useState([]);
  const [couponCounts, setCouponCounts] = useState({
    available: 0,
    expiringSoon: 0,
    usedOrExpired: 0,
    all: 0,
  });
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponRegisterMsg, setCouponRegisterMsg] = useState('');
  const [couponRegisterBusy, setCouponRegisterBusy] = useState(false);

  const loadOrders = useCallback(async () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) return;
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const res = await fetch(`${API_BASE}/orders?status=paid&limit=50`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setOrdersError('로그인이 필요합니다.');
        setOrders([]);
        return;
      }
      if (!res.ok) throw new Error(data?.error || '구매 내역을 불러오지 못했습니다.');
      setOrders(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setOrdersError(e?.message || '구매 내역을 불러오지 못했습니다.');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadGifts = useCallback(async () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) return;
    setGiftsLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API_BASE}/me/gifts/received`, { headers: authHeaders() }),
        fetch(`${API_BASE}/me/gifts/sent`, { headers: authHeaders() }),
      ]);
      const j1 = await r1.json().catch(() => ({}));
      const j2 = await r2.json().catch(() => ({}));
      if (r1.ok) setGiftsReceived(Array.isArray(j1?.data) ? j1.data : []);
      if (r2.ok) setGiftsSent(Array.isArray(j2?.data) ? j2.data : []);
    } finally {
      setGiftsLoading(false);
    }
  }, []);

  const loadPoints = useCallback(async () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) return;
    setPointsLoading(true);
    try {
      const [pr, lr] = await Promise.all([
        fetch(`${API_BASE}/me/points`, { headers: authHeaders() }),
        fetch(`${API_BASE}/me/point-ledger?limit=50`, { headers: authHeaders() }),
      ]);
      const pj = await pr.json().catch(() => ({}));
      const lj = await lr.json().catch(() => ({}));
      if (pr.ok) setPointBalance(Number(pj?.data?.balance) || 0);
      if (lr.ok) setLedger(Array.isArray(lj?.data) ? lj.data : []);
    } finally {
      setPointsLoading(false);
    }
  }, []);

  const loadCoupons = useCallback(async (tab) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) return;
    setCouponsLoading(true);
    setCouponRegisterMsg('');
    try {
      const res = await fetch(`${API_BASE}/me/coupons?tab=${encodeURIComponent(tab)}`, {
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '쿠폰을 불러오지 못했습니다.');
      setCouponItems(Array.isArray(data?.data?.items) ? data.data.items : []);
      const c = data?.data?.counts;
      if (c) {
        setCouponCounts({
          available: Number(c.available) || 0,
          expiringSoon: Number(c.expiringSoon) || 0,
          usedOrExpired: Number(c.usedOrExpired) || 0,
          all: Number(c.all) || 0,
        });
      }
    } catch (e) {
      setCouponRegisterMsg(e?.message || '쿠폰을 불러오지 못했습니다.');
      setCouponItems([]);
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 'orders') loadOrders();
  }, [mainTab, loadOrders]);

  useEffect(() => {
    if (mainTab === 'gifts') loadGifts();
  }, [mainTab, loadGifts]);

  useEffect(() => {
    if (mainTab === 'points') loadPoints();
  }, [mainTab, loadPoints]);

  useEffect(() => {
    if (mainTab === 'coupons') loadCoupons(couponTab);
  }, [mainTab, couponTab, loadCoupons]);

  const registerCoupon = async () => {
    const raw = couponCode.trim();
    if (!raw) {
      setCouponRegisterMsg('쿠폰 코드를 입력해 주세요.');
      return;
    }
    setCouponRegisterBusy(true);
    setCouponRegisterMsg('');
    try {
      const res = await fetch(`${API_BASE}/me/coupons/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ code: raw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '등록에 실패했습니다.');
      setCouponCode('');
      setCouponRegisterMsg('쿠폰이 등록되었습니다.');
      await loadCoupons(couponTab);
    } catch (e) {
      setCouponRegisterMsg(e?.message || '등록에 실패했습니다.');
    } finally {
      setCouponRegisterBusy(false);
    }
  };

  const ordersByDate = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const key = formatOrderDate(o.createdAt);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(o);
    }
    return [...map.entries()];
  }, [orders]);

  const hasToken = Boolean(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));

  const statusLabel = (s) => {
    if (s === 'paid') return '결제완료';
    if (s === 'pending_payment') return '결제 대기';
    if (s === 'failed') return '실패';
    if (s === 'cancelled') return '취소';
    return s || '';
  };

  const placeholderDoc = () => {
    window.alert('영수증·명세서는 준비 중입니다.');
  };

  return (
    <div className="main-bg">
      <div className="main-shell pb-shell">
        <header className="locker-topbar">
          <button type="button" className="btn-back-to-main" onClick={onBackToMain}>
            <span className="btn-back-to-main__icon" aria-hidden>
              🏠
            </span>
            <span className="btn-back-to-main__label">메인으로</span>
          </button>
          <h1 className="locker-title pb-page-title">구매 / 혜택</h1>
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

        <nav className="pb-main-tabs" aria-label="구매 혜택 구역">
          {MAIN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`pb-main-tab ${mainTab === t.id ? 'pb-main-tab--active' : ''}`}
              onClick={() => setMainTab(t.id)}
            >
              <span>{t.label}</span>
              {t.external && (
                <span className="pb-main-tab-ext" aria-hidden title="하위 화면">
                  ↗
                </span>
              )}
            </button>
          ))}
        </nav>

        <main className="pb-main">
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

          {hasToken && mainTab === 'orders' && (
            <section className="pb-section" aria-labelledby="pb-orders-title">
              <h2 id="pb-orders-title" className="pb-sr-only">
                구매 내역
              </h2>
              {ordersLoading && <p className="helper-text">불러오는 중…</p>}
              {ordersError && <p className="error-text">{ordersError}</p>}
              {!ordersLoading && !ordersError && orders.length === 0 && (
                <div className="pb-empty-card">
                  <p className="pb-empty-title">구매 내역이 없습니다.</p>
                  <p className="helper-text">결제가 완료된 주문만 표시됩니다.</p>
                </div>
              )}
              {!ordersLoading &&
                !ordersError &&
                ordersByDate.map(([dateLabel, list]) => (
                  <div key={dateLabel} className="pb-order-group">
                    <div className="pb-order-group-head">
                      <span className="pb-order-date">주문 날짜 {dateLabel}</span>
                      <button type="button" className="pb-link-btn" onClick={() => {}}>
                        자세히 보기 &gt;
                      </button>
                    </div>
                    {list.map((order) => (
                      <article key={order._id} className="pb-order-card">
                        <div className="pb-order-card-top">
                          <span className="pb-badge pb-badge--paid">{statusLabel(order.status)}</span>
                          <span className="pb-order-num">
                            주문 번호 {order.orderNumber || String(order._id).slice(-8)}
                          </span>
                        </div>
                        <div className="pb-order-body">
                          <div className="pb-order-lines">
                            {Array.isArray(order.items) &&
                              order.items.map((it) => (
                                <div key={it._id || `${it.course}-${it.title}`} className="pb-order-line">
                                  <div className="pb-course-title">
                                    {it.title || it.course?.title || '강의'}
                                  </div>
                                  <div className="pb-order-prices">
                                    <span>
                                      금액{' '}
                                      {formatWon(
                                        Number(it.unitPrice || 0) * Math.max(1, Number(it.quantity) || 1),
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                          <div className="pb-order-aside">
                            <div className="pb-order-actions">
                              <button type="button" className="pb-outline-btn" onClick={placeholderDoc}>
                                영수증
                              </button>
                              <button type="button" className="pb-outline-btn" onClick={placeholderDoc}>
                                거래명세서
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="pb-order-footer">
                          <span className="pb-order-total-label">합계</span>
                          <strong className="pb-order-total-value">{formatWon(order.totalAmount)}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                ))}
            </section>
          )}

          {hasToken && mainTab === 'gifts' && (
            <section className="pb-section">
              <div className="pb-gift-subtabs">
                <button
                  type="button"
                  className={`pb-gift-subtabs-btn ${giftTab === 'received' ? 'pb-gift-subtabs-btn--on' : ''}`}
                  onClick={() => setGiftTab('received')}
                >
                  받은 선물
                </button>
                <button
                  type="button"
                  className={`pb-gift-subtabs-btn ${giftTab === 'sent' ? 'pb-gift-subtabs-btn--on' : ''}`}
                  onClick={() => setGiftTab('sent')}
                >
                  보낸 선물
                </button>
              </div>
              {giftsLoading && <p className="helper-text">불러오는 중…</p>}
              {!giftsLoading && giftTab === 'received' && giftsReceived.length === 0 && (
                <div className="pb-empty-ill">
                  <div className="pb-empty-ill-icon" aria-hidden>
                    🪺
                  </div>
                  <p className="pb-empty-title">아직 받은 선물이 없어요</p>
                </div>
              )}
              {!giftsLoading && giftTab === 'sent' && giftsSent.length === 0 && (
                <div className="pb-empty-ill">
                  <div className="pb-empty-ill-icon" aria-hidden>
                    🎁
                  </div>
                  <p className="pb-empty-title">보낸 선물 내역이 없어요</p>
                </div>
              )}
              {!giftsLoading && giftTab === 'received' && giftsReceived.length > 0 && (
                <ul className="pb-simple-list">
                  {giftsReceived.map((g) => (
                    <li key={g._id} className="pb-simple-list-item">
                      <strong>{g.course?.title || '강의'}</strong>
                      <span className="helper-text">보낸 사람: {g.sender?.name || '-'}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!giftsLoading && giftTab === 'sent' && giftsSent.length > 0 && (
                <ul className="pb-simple-list">
                  {giftsSent.map((g) => (
                    <li key={g._id} className="pb-simple-list-item">
                      <strong>{g.course?.title || '강의'}</strong>
                      <span className="helper-text">받는 사람: {g.recipient?.name || '-'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {hasToken && mainTab === 'coupons' && (
            <section className="pb-section pb-coupon-section">
              <div className="pb-coupon-head">
                <h2 className="pb-coupon-page-title">내 쿠폰함</h2>
                <button type="button" className="pb-link-btn" onClick={() => window.alert('쿠폰 이용 안내는 준비 중입니다.')}>
                  쿠폰 및 할인 이용 안내
                </button>
              </div>
              <div className="pb-coupon-summary">
                <div className="pb-coupon-summary-box">
                  <div className="pb-coupon-summary-label">사용가능한 쿠폰</div>
                  <div className="pb-coupon-summary-value">
                    {couponCounts.available} <span className="pb-coupon-unit">개</span>
                  </div>
                </div>
                <div className="pb-coupon-summary-box">
                  <div className="pb-coupon-summary-label">만료임박 쿠폰</div>
                  <div className="pb-coupon-summary-value">
                    {couponCounts.expiringSoon} <span className="pb-coupon-unit">개</span>
                  </div>
                </div>
              </div>
              <div className="pb-coupon-register">
                <label className="pb-coupon-register-label" htmlFor="pb-coupon-input">
                  할인쿠폰 코드 입력란
                </label>
                <div className="pb-coupon-register-row">
                  <input
                    id="pb-coupon-input"
                    className="pb-coupon-input"
                    placeholder="보유하신 쿠폰 코드를 입력해주세요."
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button
                    type="button"
                    className="main-subscribe-btn pb-coupon-register-btn"
                    disabled={couponRegisterBusy}
                    onClick={registerCoupon}
                  >
                    {couponRegisterBusy ? '등록 중…' : '등록'}
                  </button>
                </div>
                {couponRegisterMsg && (
                  <p className={couponRegisterMsg.includes('등록되었') ? 'pb-coupon-msg-ok' : 'error-text'}>
                    {couponRegisterMsg}
                  </p>
                )}
              </div>
              <div className="pb-coupon-tabs">
                {COUPON_TABS.map((ct) => {
                  const count =
                    ct.id === 'available'
                      ? couponCounts.available
                      : ct.id === 'expiring'
                        ? couponCounts.expiringSoon
                        : ct.id === 'used'
                          ? couponCounts.usedOrExpired
                          : couponCounts.all;
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      className={`pb-coupon-tab ${couponTab === ct.id ? 'pb-coupon-tab--active' : ''}`}
                      onClick={() => setCouponTab(ct.id)}
                    >
                      {ct.label} ({count})
                    </button>
                  );
                })}
              </div>
              {couponsLoading && <p className="helper-text">불러오는 중…</p>}
              {!couponsLoading && couponItems.length === 0 && (
                <div className="pb-coupon-list-empty" />
              )}
              {!couponsLoading && couponItems.length > 0 && (
                <ul className="pb-coupon-list">
                  {couponItems.map((c) => (
                    <li key={c._id} className="pb-coupon-row">
                      <div>
                        <strong>{c.title}</strong>
                        <div className="helper-text">
                          {c.campaign?.discountKind === 'percent'
                            ? `${c.campaign.discountValue}% 할인`
                            : `${formatWon(c.campaign?.discountValue)} 할인`}
                          {' · '}
                          만료 {formatOrderDate(c.expiresAt)}
                        </div>
                      </div>
                      <span className="pb-coupon-status">{c.effectiveStatus || c.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {hasToken && mainTab === 'points' && (
            <section className="pb-section pb-points-section">
              <div className="pb-points-header">
                <h2 className="pb-points-title">포인트</h2>
              </div>
              {pointsLoading && <p className="helper-text">불러오는 중…</p>}
              {!pointsLoading && (
                <>
                  <p className="pb-points-balance">
                    현재 사용가능 포인트{' '}
                    <strong className="pb-points-balance-num">{pointBalance}</strong> 잎
                    <button
                      type="button"
                      className="pb-points-help"
                      onClick={() => window.alert('포인트 적립 안내는 준비 중입니다.')}
                    >
                      (? 포인트 받는 법)
                    </button>
                  </p>
                  <ul className="pb-ledger">
                    {ledger.length === 0 && (
                      <li className="pb-ledger-empty helper-text">포인트 내역이 없습니다.</li>
                    )}
                    {ledger.map((row) => (
                      <li key={row._id} className="pb-ledger-item">
                        <div className="pb-ledger-icon" aria-hidden>
                          🍃
                        </div>
                        <div>
                          <div className="pb-ledger-desc">
                            {row.reason
                              ? `😊 ${row.reason} ${row.amount > 0 ? '+' : ''}${row.amount} 잎`
                              : `${row.amount > 0 ? '적립' : '사용'} ${Math.abs(row.amount)} 잎`}
                          </div>
                          <div className="pb-ledger-time">{formatLedgerTime(row.createdAt)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default PurchaseBenefitsPage;
