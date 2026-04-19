/**
 * 관리자 콘솔 — 「대시보드」 기본 화면(요약 탭)
 *
 * - `dashboardData`가 없으면 아래 더미 숫자로 KPI·조회수 추이·인기 콘텐츠 바를 채움
 * - 실서비스에서는 상위에서 API 결과를 `dashboardData`로 넘기면 동일 레이아웃으로 표시
 */
const DEFAULT_DASHBOARD_DATA = {
  kpis: [
    { title: '총 사용자', value: '12,847', delta: '+12.8% 지난 달 대비' },
    { title: 'AI 트렌드 조회수', value: '284,532', delta: '+28.4% 지난 달 대비' },
    { title: '강의 구독자', value: '3,256', delta: '+8.2% 지난 달 대비' },
    { title: '총 수익', value: '#45,230,000', delta: '+15.3% 지난 달 대비' },
  ],
  viewsTrend: {
    title: '콘텐츠 조회수 추이',
    /** 일별(또는 구간별) 조회수 배열 — `ViewsTrendChart`에 그대로 전달 */
    series: [5000, 3000, 6200, 7200, 6000, 6800, 7800, 8400],
  },
  popular: {
    title: '인기 콘텐츠',
    items: [
      { title: 'ChatGPT 미션 코스', views: 9800 },
      { title: 'AI 기본 핵심 가이드', views: 7600 },
      { title: 'Midjourney 시작하기', views: 6100 },
      { title: '프롬프트 템플릿 라이브러리', views: 5400 },
      { title: 'AI 워크플로우 운영 가이드', views: 4800 },
    ],
  },
};

/**
 * 숫자 배열 `series`를 SVG 영역·라인 차트로 그림(관리자 대시보드 데모용)
 */
function ViewsTrendChart({ series }) {
  const values = Array.isArray(series) ? series.map((n) => Number(n) || 0) : [];
  const width = 760;
  const height = 280;
  const padding = { left: 50, right: 20, top: 18, bottom: 34 };

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);

  const xStep = values.length > 1 ? (width - padding.left - padding.right) / (values.length - 1) : 0;
  /** 값 v를 세로 픽셀 좌표로 변환(최소~최대 범위에 맞춤) */
  const yFor = (v) => {
    const t = (v - min) / span;
    return height - padding.bottom - t * (height - padding.top - padding.bottom);
  };

  const points = values
    .map((v, i) => {
      const x = padding.left + i * xStep;
      const y = yFor(v);
      return `${x},${y}`;
    })
    .join(' ');

  /** 가로 그리드 눈금(4줄) + 왼쪽 Y 라벨 */
  const gridCount = 4;
  const gridValues = new Array(gridCount).fill(0).map((_, idx) => {
    const t = gridCount === 1 ? 0 : idx / (gridCount - 1);
    return max - t * span;
  });

  /** X축: "1일", "2일" … (데모용 날짜 라벨) */
  const weekLabels = values.map((_, i) => i + 1);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="컨텐츠 조회수 추이"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0.9" />
          <stop offset="1" stopColor="#16a34a" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0.22" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y축 보조선 + 눈금 숫자 */}
      {gridValues.map((gv, idx) => {
        const y = yFor(gv);
        return (
          <g key={idx}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={y + 4}
              fill="rgba(229,231,235,0.45)"
              fontSize="12"
              textAnchor="end"
            >
              {Math.round(gv).toLocaleString()}
            </text>
          </g>
        );
      })}

      {/* X축 라벨(일 단위) */}
      {weekLabels.map((w, idx) => {
        const x = padding.left + idx * xStep;
        const y = height - 14;
        return (
          <text
            key={w}
            x={x}
            y={y}
            fill="rgba(229,231,235,0.45)"
            fontSize="12"
            textAnchor="middle"
          >
            {w}일
          </text>
        );
      })}

      {/* 추세 면적 + 라인 + 각 점 */}
      {values.length > 1 && (
        <>
          <polygon
            points={`${points} ${width - padding.right},${height - padding.bottom} ${padding.left},${height - padding.bottom}`}
            fill="url(#trendArea)"
          />
          <polyline points={points} fill="none" stroke="url(#trendLine)" strokeWidth="3" />
          {values.map((v, idx) => {
            const x = padding.left + idx * xStep;
            const y = yFor(v);
            return (
              <circle key={idx} cx={x} cy={y} r="4" fill="#22c55e" opacity="0.95" />
            );
          })}
        </>
      )}
    </svg>
  );
}

/**
 * @param dashboardData — 선택. `{ kpis, viewsTrend: { title, series }, popular: { title, items } }` 형태
 */
function AdminDashboardView({ dashboardData }) {
  const data = dashboardData ?? DEFAULT_DASHBOARD_DATA;

  /** 인기 바 막대 길이: 최대 조회수 대비 비율(%) */
  const maxPopularViews = Math.max(
    ...(data?.popular?.items?.map((i) => Number(i?.views) || 0) ?? [0]),
  );

  return (
    <>
      {/* 상단 4칸 KPI 카드 */}
      <section className="admin-kpi-grid">
        {data.kpis.map((card) => (
          <article key={card.title} className="admin-kpi-card">
            <p className="admin-kpi-label">{card.title}</p>
            <p className="admin-kpi-value">{card.value}</p>
            <p className="admin-kpi-delta">{card.delta}</p>
          </article>
        ))}
      </section>

      {/* 좌: 조회수 추이 차트 · 우: 인기 콘텐츠 가로 막대 */}
      <section className="admin-row">
        <article className="admin-panel admin-panel-large">
          <div className="admin-panel-head">
            <h2>{data.viewsTrend.title}</h2>
          </div>
          <div className="admin-chart-placeholder">
            {/* 배경 웨이브 + 위에 SVG 차트(`series` 변경 시 자동 반영) */}
            <div className="admin-wave green" />
            <div className="admin-wave blue" />
            <div style={{ position: 'relative', zIndex: 1, padding: '8px 6px' }}>
              <ViewsTrendChart series={data.viewsTrend.series} />
            </div>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <h2>{data.popular.title}</h2>
          </div>
          <div className="admin-bars">
            {(data.popular.items ?? []).map((item) => {
              const views = Number(item?.views) || 0;
              /** 최대 대비 %로 트랙 안 채움 너비 결정 */
              const pct = maxPopularViews > 0 ? (views / maxPopularViews) * 100 : 0;

              return (
                <div key={String(item?.title || views)} className="admin-bar-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: 'rgba(229,231,235,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item?.title ?? ''}
                  </div>
                  <span className="admin-bar-track" style={{ width: '100%' }}>
                    <span className="admin-bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                  <div style={{ fontWeight: 900, fontSize: 12, color: '#dcfce7' }}>
                    {views.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </>
  );
}

export default AdminDashboardView;

