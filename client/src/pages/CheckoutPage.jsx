import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../App.css';
import { loadIamport } from '../lib/loadIamport.js';
import { getApiBaseUrl } from '../lib/apiBase.js';

const API_BASE = getApiBaseUrl();

/** 포트원 관리자 콘솔의 가맹점 식별코드 — 필요 시 `client/.env`에 VITE_IAMPORT_MERCHANT_CODE 로 덮어씀 */
const IAMPORT_MERCHANT_CODE = import.meta.env.VITE_IAMPORT_MERCHANT_CODE || 'imp52872386';

/**
 * KG이니시스(포트원 v1) — 다중 PG 시 지정, 단일 MID만 있으면 기본 html5_inicis
 * 정기/별도 상점아이디면 가이드대로 `html5_inicis.상점아이디` 형태로 .env에 설정
 */
const INICIS_PG = (import.meta.env.VITE_IAMPORT_PG || 'html5_inicis').trim();

/**
 * 휴대폰 본인인증(IMP.certification)용 채널 키
 * 콘솔: 결제 연동 → 연동 정보 → 채널 관리 → 채널 속성이 「본인인증」인 채널의 키(`channel-key-...`)
 * https://developers.portone.io/sdk/ko/v1-sdk/javascript-sdk/cft.md
 */
const PORTONE_CERT_CHANNEL_KEY = (import.meta.env.VITE_PORTONE_CERT_CHANNEL_KEY || '').trim();

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

const PAYMENT_OPTIONS = [
  { value: 'naverpay', label: '네이버페이' },
  { value: 'tosspay', label: '토스페이' },
  { value: 'card', label: '신용·체크카드' },
  { value: 'kakaopay', label: '카카오페이' },
];

function phoneCountryForApi(code) {
  const s = String(code || '');
  if (s.startsWith('KR')) return 'KR';
  if (s.startsWith('US')) return 'US';
  return 'KR';
}

/** KR 휴대폰 → 이니시스 가이드 형식(010-1234-5678) */
function formatBuyerTelKr(digitsOnly) {
  const d = String(digitsOnly || '').replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
  return d;
}

/**
 * 체크아웃 라디오 → 포트원 v1 + KG이니시스(html5_inicis)
 * (토스·네이버·카카오 전용 MID가 콘솔에 없으면 잘못된 pg 오류가 나므로 기본 채널은 이니시스로 통일)
 */
function portoneFieldsForPaymentMethod(method) {
  const pg = INICIS_PG;
  switch (method) {
    case 'kakaopay':
      return { pg, pay_method: 'kakaopay' };
    case 'naverpay':
      return { pg, pay_method: 'naverpay' };
    case 'tosspay':
      return { pg, pay_method: 'card' };
    case 'card':
    default:
      return { pg, pay_method: 'card' };
  }
}

/**
 * 결제 상세 입력 — 단건(강의 상세) 또는 장바구니에서 선택한 품목 다건
 */
function CheckoutPage({
  courseId,
  lockerCartItemIds,
  user,
  onBack,
  onLogout,
  onNavigateAdmin,
  onNavigateLocker,
  onNavigateMyLearning,
}) {
  const [course, setCourse] = useState(null);
  const [cartLines, setCartLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payMsg, setPayMsg] = useState('');
  /** 결제 배너: 실패·경고는 빨간 톤, 안내 성공 문구만 연두 톤 */
  const [payMsgTone, setPayMsgTone] = useState('error');
  const [showPayCelebration, setShowPayCelebration] = useState(false);
  const navigateLearningTimerRef = useRef(null);
  const [phoneVerifyMsg, setPhoneVerifyMsg] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [impReady, setImpReady] = useState(false);
  const [impLoadError, setImpLoadError] = useState('');
  const [paying, setPaying] = useState(false);
  const isAdmin = user?.userType === 'admin';

  const lockerMode = Array.isArray(lockerCartItemIds) && lockerCartItemIds.length > 0;

  const showPayError = useCallback((msg) => {
    setPayMsg(msg);
    setPayMsgTone('error');
  }, []);

  const clearPayBanner = useCallback(() => {
    setPayMsg('');
  }, []);

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('KR +82');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');

  useEffect(() => {
    setBuyerName(user?.name || '');
    setBuyerEmail(user?.email || '');
  }, [user?.name, user?.email]);

  useEffect(() => {
    return () => {
      if (navigateLearningTimerRef.current) {
        clearTimeout(navigateLearningTimerRef.current);
        navigateLearningTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setImpLoadError('');
    loadIamport()
      .then((IMP) => {
        if (cancelled) return;
        IMP.init(IAMPORT_MERCHANT_CODE);
        setImpReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setImpLoadError(err?.message || '포트원 모듈을 불러오지 못했습니다.');
        setImpReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 모바일 본인인증: m_redirect_url 복귀 시 쿼리의 imp_uid 처리 */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sp = new URLSearchParams(window.location.search);
    const impUid = sp.get('imp_uid');
    const merchantUid = sp.get('merchant_uid') || '';
    if (!impUid || !merchantUid.startsWith('cert_')) return undefined;

    let cancelled = false;
    (async () => {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        setPhoneVerifyMsg('본인인증 결과를 확인하려면 로그인 상태여야 합니다.');
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/certifications/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ imp_uid: impUid }),
        });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) {
          setPhoneVerifyMsg(j?.error || '본인인증 검증에 실패했습니다.');
          return;
        }
        setPhoneVerified(true);
        if (j.phone) setPhoneNumber(String(j.phone).replace(/\D/g, ''));
        if (j.name) setBuyerName(String(j.name).trim());
        setPhoneVerifyMsg('휴대폰 본인인증이 완료되었습니다. 이제 결제를 진행할 수 있습니다.');
        const { pathname, hash } = window.location;
        window.history.replaceState({}, '', `${pathname}${hash}`);
      } catch (e) {
        if (!cancelled) setPhoneVerifyMsg(e?.message || '본인인증 확인 중 오류가 발생했습니다.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '강의 정보를 불러오지 못했습니다.');
      setCourse(data);
      setCartLines([]);
    } catch (e) {
      setError(e?.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const loadCartSelection = useCallback(async () => {
    if (!lockerCartItemIds?.length) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/cart`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('로그인이 필요합니다.');
      if (!res.ok) throw new Error(data?.error || '장바구니를 불러오지 못했습니다.');
      const cart = data?.data;
      const want = new Set(lockerCartItemIds.map(String));
      const all = Array.isArray(cart?.items) ? cart.items : [];
      const picked = all.filter((line) => line?._id != null && want.has(String(line._id)));
      if (picked.length === 0) {
        throw new Error('선택한 강의를 장바구니에서 찾을 수 없습니다. 장바구니로 돌아가 다시 선택해 주세요.');
      }
      setCartLines(picked);
      setCourse(null);
    } catch (e) {
      setError(e?.message || '오류가 발생했습니다.');
      setCartLines([]);
    } finally {
      setLoading(false);
    }
  }, [lockerCartItemIds]);

  useEffect(() => {
    if (lockerMode) loadCartSelection();
    else if (courseId) loadCourse();
    else {
      setLoading(false);
      setError('주문 정보가 없습니다.');
    }
  }, [lockerMode, courseId, loadCartSelection, loadCourse]);

  const summaryRows = useMemo(() => {
    if (lockerMode) {
      return cartLines.map((line, idx) => {
        const title = line?.title || line?.course?.title || '강의';
        const u = Number(line?.unitPrice) || 0;
        const q = Math.max(1, Number(line?.quantity) || 1);
        return {
          key: String(line?._id || idx),
          title,
          amount: u * q,
        };
      });
    }
    if (course) {
      const price = Number(course.price) || 0;
      return [{ key: 'one', title: course.title, amount: price }];
    }
    return [];
  }, [lockerMode, cartLines, course]);

  const subtotal = summaryRows.reduce((s, r) => s + r.amount, 0);
  const total = subtotal;

  const backLabel = lockerMode ? '장바구니' : '강의 상세';
  const backIcon = lockerMode ? '🛒' : '📖';

  const isMobileUa = () =>
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

  /** 포트원 v1 휴대폰 본인인증 — 콘솔에서 본인인증 상품 사용 설정 필요 */
  const requestPhoneVerify = async () => {
    setPhoneVerifyMsg('');
    if (!buyerName.trim()) {
      setPhoneVerifyMsg('본인인증 전에 이름을 입력해 주세요.');
      return;
    }
    if (!phoneCountryCode.startsWith('KR')) {
      setPhoneVerifyMsg('포트원 휴대폰 본인인증은 대한민국(+82) 번호만 지원합니다.');
      return;
    }
    const digits = phoneNumber.replace(/\D/g, '');
    if (!digits || digits.length < 10) {
      setPhoneVerifyMsg('휴대폰 번호를 올바르게 입력한 뒤 다시 눌러 주세요.');
      return;
    }
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      setPhoneVerifyMsg('본인인증은 로그인 후 이용할 수 있습니다.');
      return;
    }

    let IMP;
    try {
      IMP = await loadIamport();
      IMP.init(IAMPORT_MERCHANT_CODE);
    } catch (e) {
      setPhoneVerifyMsg(e?.message || '포트원 모듈을 불러오지 못했습니다.');
      return;
    }
    if (typeof IMP.certification !== 'function') {
      setPhoneVerifyMsg('포트원 본인인증 API(IMP.certification)를 사용할 수 없습니다. 스크립트 버전을 확인해 주세요.');
      return;
    }
    if (!PORTONE_CERT_CHANNEL_KEY) {
      setPhoneVerifyMsg(
        '본인인증 채널 키가 없습니다. 프로젝트 `client/.env`에 VITE_PORTONE_CERT_CHANNEL_KEY=channel-key-... 를 추가한 뒤 개발 서버를 다시 실행하세요. (콘솔 채널 속성은 반드시 「본인인증」)',
      );
      return;
    }

    setCertifying(true);
    const merchantUid = `cert_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const certParams = {
      channelKey: PORTONE_CERT_CHANNEL_KEY,
      merchant_uid: merchantUid,
      name: buyerName.trim(),
      phone: digits,
      popup: !isMobileUa(),
    };
    if (typeof window !== 'undefined') {
      const { origin, pathname, search } = window.location;
      certParams.m_redirect_url = `${origin}${pathname}${search}`;
    }

    IMP.certification(certParams, async (rsp) => {
      setCertifying(false);
      if (!rsp?.success) {
        setPhoneVerified(false);
        const msg = rsp?.error_msg || '본인인증이 취소되었거나 실패했습니다.';
        const hint =
          /PG|pg|모듈|채널/i.test(msg) && PORTONE_CERT_CHANNEL_KEY
            ? ' 포트원 콘솔에서 해당 채널의 「채널 속성」이 「본인인증」인지, 결제용 채널 키를 넣지 않았는지 확인하세요.'
            : '';
        setPhoneVerifyMsg(msg + hint);
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/certifications/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ imp_uid: rsp.imp_uid }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setPhoneVerified(false);
          setPhoneVerifyMsg(j?.error || '서버에서 본인인증 검증에 실패했습니다.');
          return;
        }
        setPhoneVerified(true);
        if (j.phone) setPhoneNumber(String(j.phone).replace(/\D/g, ''));
        if (j.name) setBuyerName(String(j.name).trim());
        setPhoneVerifyMsg('휴대폰 본인인증이 완료되었습니다. 이제 결제를 진행할 수 있습니다.');
      } catch (e) {
        setPhoneVerified(false);
        setPhoneVerifyMsg(e?.message || '본인인증 확인 중 오류가 발생했습니다.');
      }
    });
  };

  const startPortonePayment = async () => {
    if (!buyerName.trim() || !buyerEmail.trim()) {
      showPayError('이름과 이메일을 입력해 주세요.');
      return;
    }
    const telDigits = phoneNumber.replace(/\D/g, '');
    if (!telDigits || telDigits.length < 10) {
      showPayError(
        'KG이니시스 결제를 위해 휴대폰 번호(buyer_tel)가 필수입니다. 010xxxxxxxx 형태로 입력해 주세요.',
      );
      return;
    }
    if (!phoneVerified) {
      showPayError('결제 전에 위의 「인증 요청」으로 포트원 휴대폰 본인인증을 완료해 주세요.');
      return;
    }
    if (total <= 0) {
      showPayError('결제 금액이 0원일 때는 결제할 수 없습니다.');
      return;
    }
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      showPayError('로그인 후 결제할 수 있습니다.');
      return;
    }

    setPaying(true);
    clearPayBanner();

    let IMP;
    try {
      IMP = await loadIamport();
      IMP.init(IAMPORT_MERCHANT_CODE);
    } catch (e) {
      showPayError(e?.message || '결제 모듈(포트원)을 불러오지 못했습니다. 새로고침 또는 광고 차단 해제를 확인해 주세요.');
      setPaying(false);
      return;
    }

    let itemsPayload;
    if (lockerMode) {
      itemsPayload = cartLines.map((line) => ({
        courseId: line.course?._id || line.course,
        quantity: Math.max(1, Number(line.quantity) || 1),
      }));
    } else {
      itemsPayload = [{ courseId, quantity: 1 }];
    }

    try {
      const createRes = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          items: itemsPayload,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          phoneCountryCode: phoneCountryForApi(phoneCountryCode),
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          phoneVerified,
          paymentMethod,
          currency: 'KRW',
        }),
      });
      const createJson = await createRes.json().catch(() => ({}));
      if (createRes.status === 401) {
        showPayError('로그인이 만료되었습니다. 다시 로그인해 주세요.');
        setPaying(false);
        return;
      }
      if (!createRes.ok) {
        throw new Error(createJson?.error || '주문을 만들지 못했습니다.');
      }

      const order = createJson?.data;
      const orderId = order?._id;
      if (!orderId) throw new Error('주문 ID를 받지 못했습니다.');

      const amount = Number(order.totalAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('주문 결제 금액이 올바르지 않습니다.');
      }

      const pendRes = await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: 'pending_payment' }),
      });
      const pendJson = await pendRes.json().catch(() => ({}));
      if (!pendRes.ok) {
        throw new Error(pendJson?.error || '주문을 결제 대기 상태로 바꾸지 못했습니다.');
      }

      const orderName = lockerMode
        ? `강의 ${cartLines.length}건`
        : String(course?.title || '강의 구매').slice(0, 60);
      const pf = portoneFieldsForPaymentMethod(paymentMethod);
      const payParams = {
        ...pf,
        merchant_uid: String(orderId),
        name: orderName,
        amount,
        buyer_email: buyerEmail.trim(),
        buyer_name: buyerName.trim(),
        buyer_tel: formatBuyerTelKr(telDigits),
        buyer_addr: ' ',
        buyer_postcode: '00000',
      };
      if (typeof window !== 'undefined') {
        const { origin, pathname, search } = window.location;
        payParams.m_redirect_url = `${origin}${pathname}${search}`;
      }

      IMP.request_pay(payParams, async (rsp) => {
        setPaying(false);
        if (!rsp?.success) {
          showPayError(rsp?.error_msg || '결제가 취소되었거나 실패했습니다.');
          try {
            await fetch(`${API_BASE}/orders/${orderId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({ status: 'failed' }),
            });
          } catch {
            /* ignore */
          }
          return;
        }

        try {
          const doneRes = await fetch(`${API_BASE}/orders/${orderId}/portone/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ imp_uid: rsp.imp_uid }),
          });
          const doneJson = await doneRes.json().catch(() => ({}));
          if (!doneRes.ok) {
            showPayError(doneJson?.error || '서버에서 결제 완료 처리에 실패했습니다. 고객센터로 문의해 주세요.');
            return;
          }
          clearPayBanner();
          try {
            sessionStorage.setItem('contMall_paySuccessWelcome', '1');
          } catch {
            /* ignore */
          }
          setShowPayCelebration(true);
          if (navigateLearningTimerRef.current) clearTimeout(navigateLearningTimerRef.current);
          navigateLearningTimerRef.current = setTimeout(() => {
            navigateLearningTimerRef.current = null;
            if (typeof onNavigateMyLearning === 'function') onNavigateMyLearning();
          }, 2800);
        } catch (e) {
          showPayError(e?.message || '결제 완료 확인 중 오류가 발생했습니다.');
        }
      });
    } catch (e) {
      showPayError(e?.message || '결제를 시작하지 못했습니다.');
      setPaying(false);
    }
  };

  return (
    <div className="checkout-page">
      <header className="checkout-topbar">
        <button type="button" className="btn-back-to-main" onClick={onBack}>
          <span className="btn-back-to-main__icon" aria-hidden>
            {backIcon}
          </span>
          <span className="btn-back-to-main__label">{backLabel}</span>
        </button>
        <div className="course-detail-top-actions">
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

      <main className="checkout-main checkout-main--wide">
        <h1 className="checkout-title">주문 / 결제</h1>
        {impLoadError && (
          <p className="error-text checkout-banner-msg" role="alert">
            {impLoadError}
          </p>
        )}
        {!impLoadError && !impReady && !loading && (
          <p className="helper-text checkout-banner-msg">결제 모듈을 불러오는 중…</p>
        )}
        {payMsg && (
          <p
            className={`checkout-banner-msg ${
              payMsgTone === 'success' ? 'checkout-banner-msg--pay' : 'checkout-banner-msg--pay-error'
            }`}
            role="status"
            aria-live="polite"
          >
            {payMsg}
          </p>
        )}
        {loading && <p className="helper-text">불러오는 중…</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && summaryRows.length > 0 && (
          <>
            <section className="checkout-summary">
              <h2 className="checkout-subtitle">주문 요약</h2>
              {summaryRows.map((row) => (
                <div key={row.key} className="checkout-row">
                  <span>{row.title}</span>
                  <strong>{formatWon(row.amount)}</strong>
                </div>
              ))}
              <div className="checkout-row checkout-total">
                <span>총 결제 금액</span>
                <strong>{formatWon(total)}</strong>
              </div>
            </section>

            <section className="checkout-summary checkout-section-spaced">
              <h2 className="checkout-subtitle">구매자 정보</h2>
              <div className="checkout-field">
                <label htmlFor="checkout-name">이름</label>
                <input
                  id="checkout-name"
                  className="checkout-input"
                  value={buyerName}
                  onChange={(e) => {
                    setBuyerName(e.target.value);
                    setPhoneVerified(false);
                  }}
                  autoComplete="name"
                  placeholder="이름"
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="checkout-email">이메일</label>
                <input
                  id="checkout-email"
                  className="checkout-input"
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="email@example.com"
                />
              </div>
              <div className="checkout-field">
                <span className="checkout-label-text">휴대폰 번호</span>
                <div className="checkout-phone-row">
                  <select
                    className="checkout-input checkout-input--narrow"
                    value={phoneCountryCode}
                    onChange={(e) => {
                      setPhoneCountryCode(e.target.value);
                      setPhoneVerified(false);
                    }}
                    aria-label="국가 번호"
                  >
                    <option value="KR +82">KR 대한민국 +82</option>
                    <option value="US +1">US +1</option>
                  </select>
                  <input
                    className="checkout-input checkout-input--grow"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setPhoneVerified(false);
                    }}
                    inputMode="numeric"
                    placeholder="01012345678"
                    autoComplete="tel"
                  />
                  <button
                    type="button"
                    className="checkout-verify-btn"
                    onClick={requestPhoneVerify}
                    disabled={certifying || Boolean(impLoadError)}
                  >
                    {certifying ? '인증 창 열기…' : phoneVerified ? '인증 완료' : '인증 요청'}
                  </button>
                </div>
                {phoneVerifyMsg && (
                  <p className="helper-text checkout-phone-hint" role="status" aria-live="polite">
                    {phoneVerifyMsg}
                  </p>
                )}
              </div>
            </section>

            <section className="checkout-summary checkout-section-spaced">
              <h2 className="checkout-subtitle">결제 수단</h2>
              <div className="checkout-pay-methods" role="radiogroup" aria-label="결제 수단">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="checkout-pay-option">
                    <input
                      type="radio"
                      name="payMethod"
                      value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={() => setPaymentMethod(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="course-detail-btn-primary checkout-pay-cta"
                onClick={startPortonePayment}
                disabled={paying || Boolean(impLoadError)}
              >
                {paying ? '결제 준비 중…' : `${formatWon(total)} 결제하기`}
              </button>
              <p className="checkout-terms-hint">
                결제하기 버튼을 누르면 주문 내용을 확인했으며, 구매 조항 및 개인정보 처리방침에 동의한 것으로 간주됩니다.
              </p>
            </section>

            <button type="button" className="course-detail-link-block" onClick={onNavigateLocker}>
              장바구니로 이동
            </button>
          </>
        )}
      </main>

      {showPayCelebration && (
        <div
          className="checkout-success-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-success-title"
        >
          <div className="checkout-success-card">
            <div className="checkout-success-icon" aria-hidden>
              ✓
            </div>
            <h2 id="checkout-success-title" className="checkout-success-title">
              결제가 완료되었습니다
            </h2>
            <p className="checkout-success-desc">
              수강 신청을 축하드립니다. 잠시 후 내학습 화면으로 이동합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckoutPage;
