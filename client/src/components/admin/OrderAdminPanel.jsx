/**
 * 관리자 콘솔 — 「주문 관리」 패널
 *
 * - 상단: 이번 주·이번 달·누적 주문 건수·매출(KPI 카드) — API `/orders/admin/stats`
 * - 중앙 좌: 월별 매출 추이(SVG) — 고정 더미(25.5~26.3월 만원 단위, 26.4월 68,000원), 세로축 0~1000만원
 * - 중앙 우: 강의별 누적 매출 상위 — `/orders/admin/popular-courses`
 * - 하단: 주문 테이블(필터·페이지·CSV보내기) — `/orders/admin/list`
 * - 모든 API는 Bearer 토큰 + 관리자 권한 필요
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../lib/apiBase.js';

const API_BASE = getApiBaseUrl();

/** 로컬/세션 스토리지의 JWT를 Authorization 헤더에 붙임 */
function authHeaders() {
  const t = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const h = {};
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/** 숫자 → 천 단위 콤마 + 접미사 `원` (예: 68,000원) */
function formatWon(n) {
  if (n == null || !Number.isFinite(Number(n))) return '0원';
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(Number(n)))}원`;
}

/** 전주/전월 대비 건수 차이 문구 (+3건 등) */
function formatCountDelta(n) {
  if (n === 0) return '0건';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}건`;
}

/** 매출 증감률 문구 (+12.5% 등) */
function formatPctDelta(pct) {
  if (pct === 0) return '0%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}%`;
}

/** 주문일을 YYYY.MM.DD 형태로 */
function formatOrderDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** 주문 목록 상단 셀렉트 — 서버 `status` 쿼리와 동일 값(취소 필터는 cancelled+failed 묶음) */
const STATUS_FILTER = [
  { value: 'all', label: '전체' },
  { value: 'paid', label: '결제완료' },
  { value: 'refund_requested', label: '환불요청' },
  { value: 'refund_completed', label: '환불완료' },
  { value: 'cancelled', label: '취소' },
];

/** 눈금 간격: 100만원 = 1,000,000원 */
const WON_PER_100MAN = 1_000_000;
/** 표기 숫자 100 = 100만원 → 100 × 10,000원 (1만원 단위 곱) */
const WON_PER_1MAN = 10_000;

/** 마지막 월(26.4) 제외 11개월에 쓰는 더미 매출(만 원 기준 숫자) */
const ORDER_CHART_DUMMY_AMOUNTS_MAN = [100, 300, 250, 500, 400, 800, 300, 500, 300, 200, 400];

/** 월별 매출 차트 고정 더미: amount는 항상 원(KRW) */
const ORDER_CHART_DUMMY_MONTHS = [
  { key: '2025-05', label: '25.5월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[0] * WON_PER_1MAN },
  { key: '2025-06', label: '25.6월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[1] * WON_PER_1MAN },
  { key: '2025-07', label: '25.7월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[2] * WON_PER_1MAN },
  { key: '2025-08', label: '25.8월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[3] * WON_PER_1MAN },
  { key: '2025-09', label: '25.9월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[4] * WON_PER_1MAN },
  { key: '2025-10', label: '25.10월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[5] * WON_PER_1MAN },
  { key: '2025-11', label: '25.11월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[6] * WON_PER_1MAN },
  { key: '2025-12', label: '25.12월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[7] * WON_PER_1MAN },
  { key: '2026-01', label: '26.1월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[8] * WON_PER_1MAN },
  { key: '2026-02', label: '26.2월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[9] * WON_PER_1MAN },
  { key: '2026-03', label: '26.3월', amount: ORDER_CHART_DUMMY_AMOUNTS_MAN[10] * WON_PER_1MAN },
  { key: '2026-04', label: '26.4월', amount: 68_000 },
];

/** 세로축 상한: 1000만원 = 10,000,000원 (눈금은 100만원 간격 → 숫자 100~1000, 단위 만원) */
const CHART_Y_MAX_WON = 10_000_000;
const CHART_Y_MIN_WON = 0;

/**
 * 월별 매출 시계열을 SVG 라인/영역 차트로 표시
 * @param months — `{ key, label, amount }[]` (amount는 원)
 * 세로축: 0 ~ 1000만원 고정, 눈금 라벨은 `만원` 기준 숫자(100, 200, …, 1000)
 */
function MonthlyRevenueChart({ months }) {
  const values = (months || []).map((m) => Number(m.amount) || 0);
  const width = 720;
  const height = 280;
  const padding = { left: 50, right: 28, top: 20, bottom: 40 };
  const n = values.length;
  /** 월이 n개일 때 점 사이 가로 간격 */
  const xStep = n > 1 ? (width - padding.left - padding.right) / (n - 1) : 0;

  const ySpan = CHART_Y_MAX_WON - CHART_Y_MIN_WON;

  /** 값 v(원) → SVG 세로 좌표; 세로 범위는 항상 0~1000만원 */
  const yFor = (v) => {
    const t = (v - CHART_Y_MIN_WON) / ySpan;
    return height - padding.bottom - t * (height - padding.top - padding.bottom);
  };

  const clampY = (won) => Math.min(Math.max(Number(won) || 0, CHART_Y_MIN_WON), CHART_Y_MAX_WON);

  /** 라인을 그릴 polyline용 "x,y x,y ..." 문자열 */
  const points = values
    .map((v, i) => {
      const x = padding.left + i * xStep;
      const y = yFor(clampY(v));
      return `${x},${y}`;
    })
    .join(' ');

  /** 100만원 간격 눈금: 1000, 900, …, 100, 0 (만원 단위 숫자로 표기) */
  const gridStepWon = WON_PER_100MAN;
  const gridValues = [];
  for (let w = CHART_Y_MAX_WON; w >= CHART_Y_MIN_WON; w -= gridStepWon) {
    gridValues.push(w);
  }

  /** Y축 라벨: 금액(원) → 만원 환산 숫자 (100만원=100, 1000만원=1000) */
  const fmtYManWon = (won) => String(Math.round(Number(won) / 10_000));

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="월별 매출 추이"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="orderTrendLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4ade80" stopOpacity="0.95" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="orderTrendArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0.28" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* 가로 보조선 + 왼쪽 Y축 라벨 */}
      {gridValues.map((gv, idx) => {
        const y = yFor(gv);
        return (
          <g key={idx}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text x={padding.left - 6} y={y + 4} fill="rgba(229,231,235,0.5)" fontSize="10" textAnchor="end">
              {fmtYManWon(gv)}
            </text>
          </g>
        );
      })}

      {/* X축: 월 라벨(연도 생략해 짧게) */}
      {(months || []).map((m, idx) => {
        const x = padding.left + idx * xStep;
        const short = m.label || m.key;
        return (
          <text
            key={m.key}
            x={x}
            y={height - 12}
            fill="rgba(229,231,235,0.5)"
            fontSize="10"
            textAnchor="middle"
          >
            {short}
          </text>
        );
      })}

      {/* 면적 채우기 + 꺾은선 + 각 월 데이터 점 */}
      {values.length > 1 && (
        <>
          <polygon
            points={`${points} ${width - padding.right},${height - padding.bottom} ${padding.left},${height - padding.bottom}`}
            fill="url(#orderTrendArea)"
          />
          <polyline points={points} fill="none" stroke="url(#orderTrendLine)" strokeWidth="2.5" />
          {values.map((v, idx) => {
            const x = padding.left + idx * xStep;
            const y = yFor(clampY(v));
            return <circle key={idx} cx={x} cy={y} r="3.5" fill="#4ade80" />;
          })}
        </>
      )}
    </svg>
  );
}

/** 주문 상태 → 뱃지용 CSS 클래스명 */
function statusBadgeClass(status) {
  if (status === 'paid') return 'admin-order-badge admin-order-badge--paid';
  if (status === 'refund_requested') return 'admin-order-badge admin-order-badge--refund-req';
  if (status === 'refund_completed') return 'admin-order-badge admin-order-badge--refund-done';
  if (status === 'cancelled' || status === 'failed') return 'admin-order-badge admin-order-badge--cancel';
  return 'admin-order-badge admin-order-badge--muted';
}

function OrderAdminPanel() {
  /** `/orders/admin/stats` 응답: 주간·월간·누적 */
  const [stats, setStats] = useState(null);
  /** 인기 강의(누적 매출) */
  const [popular, setPopular] = useState([]);
  /** 현재 페이지 주문 행 */
  const [rows, setRows] = useState([]);
  /** 전체 주문 수(페이지네이션용) */
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [statusFilter, setStatusFilter] = useState('all');
  /** KPI·그래프 첫 로딩 */
  const [loading, setLoading] = useState(true);
  /** 테이블만 다시 불러올 때 */
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');

  /** 전체 페이지 수 = ceil(total / limit), 최소 1 */
  const totalPages = Math.max(1, Math.ceil(total / limit));

  /** 통계 + 인기 강의 요청 (월별 차트는 화면 고정 더미 사용) */
  const loadSummary = useCallback(async () => {
    setError('');
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`${API_BASE}/orders/admin/stats`, { headers: authHeaders() }),
        fetch(`${API_BASE}/orders/admin/popular-courses?limit=8`, { headers: authHeaders() }),
      ]);
      const sj = await sRes.json().catch(() => ({}));
      const pj = await pRes.json().catch(() => ({}));
      if (!sRes.ok) throw new Error(sj?.error || '주문 통계를 불러오지 못했습니다.');
      if (!pRes.ok) throw new Error(pj?.error || '인기 강의를 불러오지 못했습니다.');
      setStats(sj?.data ?? null);
      setPopular(Array.isArray(pj?.data) ? pj.data : []);
    } catch (e) {
      setError(e?.message || '데이터를 불러오지 못했습니다.');
    }
  }, []);

  /** 상태·페이지·limit 쿼리로 주문 목록만 갱신 */
  const loadList = useCallback(async () => {
    setListLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`${API_BASE}/orders/admin/list?${q}`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '주문 목록을 불러오지 못했습니다.');
      setRows(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.total) || 0);
    } catch (e) {
      setError(e?.message || '주문 목록을 불러오지 못했습니다.');
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, page, limit]);

  /** 마운트 시 요약(KPI·차트·인기) 1회 로드; 언마운트 시 로딩 플래그만 안전 처리 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadSummary();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSummary]);

  /** 필터·페이지 변경 시 목록 재요청 */
  useEffect(() => {
    loadList();
  }, [loadList]);

  /** KPI 카드에 바인딩할 통계 조각 */
  const week = stats?.week;
  const month = stats?.month;
  const tot = stats?.total;

  /** 현재 테이블 페이지 행만 UTF-8 BOM CSV로 다운로드 */
  const exportCsv = () => {
    const header = ['주문번호', '강의명', '고객명', '이메일', '결제금액', '결제방법', '상태', '일자'];
    const lines = [header.join(',')].concat(
      rows.map((r) =>
        [
          r.orderNumber,
          `"${String(r.courseTitle).replace(/"/g, '""')}"`,
          r.customerName,
          r.customerEmail,
          r.totalAmount,
          r.paymentMethodLabel,
          r.statusLabel,
          formatOrderDate(r.createdAt),
        ].join(','),
      ),
    );
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 페이지 번호 버튼: 현재 페이지 기준 최대 5칸 슬라이딩 윈도우 */
  const pageButtons = useMemo(() => {
    const out = [];
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    for (let p = start; p <= end; p += 1) out.push(p);
    return out;
  }, [page, totalPages]);

  return (
    <section className="admin-order-wrap">
      {/* 전역 에러(요약·목록 공통) */}
      {error && (
        <p className="error-text" style={{ marginBottom: 12 }}>
          {error}
        </p>
      )}

      {loading && <p className="helper-text">불러오는 중…</p>}

      {/* 요약 로드 완료 후: 이번 주 / 이번 달 / 누적 */}
      {!loading && stats && (
        <div className="admin-order-kpi-grid">
          <article className="admin-order-kpi-card">
            <p className="admin-kpi-label">이번 주 주문</p>
            <p className="admin-kpi-value">{week?.count ?? 0}건</p>
            <p className="admin-kpi-delta">{formatCountDelta(week?.countDelta ?? 0)} 전주 대비</p>
            <p className="admin-order-kpi-amount">{formatWon(week?.amount ?? 0)}</p>
            <p className="admin-kpi-delta">{formatPctDelta(week?.amountDeltaPct ?? 0)} 전주 매출 대비</p>
          </article>
          <article className="admin-order-kpi-card">
            <p className="admin-kpi-label">이번 달 주문</p>
            <p className="admin-kpi-value">{month?.count ?? 0}건</p>
            <p className="admin-kpi-delta">{formatCountDelta(month?.countDelta ?? 0)} 전월 대비</p>
            <p className="admin-order-kpi-amount">{formatWon(month?.amount ?? 0)}</p>
            <p className="admin-kpi-delta">{formatPctDelta(month?.amountDeltaPct ?? 0)} 전월 매출 대비</p>
          </article>
          <article className="admin-order-kpi-card">
            <p className="admin-kpi-label">전체 누적</p>
            <p className="admin-kpi-value">{tot?.count ?? 0}건</p>
            <p className="admin-kpi-delta" style={{ color: 'rgba(148,163,184,0.9)' }}>
              결제완료 기준
            </p>
            <p className="admin-order-kpi-amount">{formatWon(tot?.amount ?? 0)}</p>
            <p className="admin-kpi-delta" style={{ color: 'rgba(148,163,184,0.9)' }}>
              누적 매출
            </p>
          </article>
        </div>
      )}

      {/* 좌: 월별 매출 차트 · 우: 강의별 누적 매출 랭킹 */}
      <div className="admin-row admin-order-chart-row">
        <article className="admin-panel admin-panel-large">
          <div className="admin-panel-head">
            <h2>월별 매출 추이</h2>
          </div>
          <div className="admin-chart-placeholder">
            <div className="admin-wave green" />
            <div style={{ position: 'relative', zIndex: 1, padding: '6px 4px' }}>
              <MonthlyRevenueChart months={ORDER_CHART_DUMMY_MONTHS} />
            </div>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <h2>인기 강의</h2>
            <span className="admin-order-subhint">누적 주문 금액</span>
          </div>
          <ul className="admin-order-popular-list">
            {popular.length === 0 && <li className="helper-text">표시할 데이터가 없습니다.</li>}
            {popular.map((p) => (
              <li key={String(p.courseId)} className="admin-order-popular-item">
                <div className="admin-order-popular-title">{p.title}</div>
                <div className="admin-order-popular-amt">{formatWon(p.revenue)}</div>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {/* 필터·CSV·테이블·페이지네이션 */}
      <article className="admin-panel admin-order-table-panel">
        <div className="admin-order-table-toolbar">
          <h2 className="admin-order-table-title">주문 목록</h2>
          <div className="admin-order-table-actions">
            <label className="admin-order-filter-label" htmlFor="order-status-filter">
              <span className="admin-order-sr-only">상태</span>
              <select
                id="order-status-filter"
                className="admin-order-select"
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
              >
                {STATUS_FILTER.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="admin-btn muted" onClick={exportCsv}>
              보내기
            </button>
          </div>
        </div>

        <div className="admin-order-table-scroll">
          <table className="admin-order-table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>강의명</th>
                <th>고객정보</th>
                <th>결제금액</th>
                <th>결제방법</th>
                <th>상태</th>
                <th>일자</th>
                <th aria-label="액션">⋯</th>
              </tr>
            </thead>
            <tbody>
              {listLoading && (
                <tr>
                  <td colSpan={8} className="admin-order-td-muted">
                    불러오는 중…
                  </td>
                </tr>
              )}
              {!listLoading &&
                rows.map((r) => (
                  <tr key={r._id}>
                    <td className="admin-order-mono">{r.orderNumber}</td>
                    <td>{r.courseTitle}</td>
                    <td>
                      <div className="admin-order-customer-name">{r.customerName}</div>
                      <div className="admin-order-customer-email">{r.customerEmail}</div>
                    </td>
                    <td className="admin-order-amt">{formatWon(r.totalAmount)}</td>
                    <td>{r.paymentMethodLabel}</td>
                    <td>
                      <span className={statusBadgeClass(r.status)}>{r.statusLabel}</span>
                    </td>
                    <td className="admin-order-td-muted">{formatOrderDate(r.createdAt)}</td>
                    <td>
                      <button type="button" className="admin-order-icon-btn" title="추가 작업 (준비 중)">
                        ⋯
                      </button>
                    </td>
                  </tr>
                ))}
              {!listLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-order-td-muted">
                    주문이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-order-table-footer">
          <span className="admin-order-total-label">총 {total.toLocaleString()}건의 주문</span>
          <nav className="admin-order-pagination" aria-label="페이지">
            <button
              type="button"
              className="admin-order-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            {pageButtons.map((p) => (
              <button
                key={p}
                type="button"
                className={`admin-order-page-num ${p === page ? 'is-active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="admin-order-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              다음
            </button>
          </nav>
        </div>
      </article>
    </section>
  );
}

export default OrderAdminPanel;
