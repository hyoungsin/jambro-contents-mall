import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../lib/apiBase.js';

const API_BASE = getApiBaseUrl();

const COURSE_GROUPS = [
  { id: 'all', label: '전체' },
  { id: 'video', label: '영상콘텐츠 제작' },
  { id: 'agent', label: '에이전트 제작' },
  { id: 'automation', label: '업무자동화 구현' },
  { id: 'native', label: 'AI Native' },
];

/** 백엔드 상세카테고리 → 메인 탭 그룹 */
const CATEGORY_TO_GROUP = {
  '영상콘텐츠 제작': 'video',
  '에이전트 제작': 'agent',
  '업무자동화 구현': 'automation',
  'AI Native': 'native',
};

const GROUP_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_TO_GROUP).map(([category, groupId]) => [groupId, category]),
);

const TONE_PALETTE = ['green', 'cyan', 'blue', 'purple'];

function toneForId(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h + s.charCodeAt(i)) % TONE_PALETTE.length;
  return TONE_PALETTE[h];
}

function formatWon(n) {
  if (n == null || !Number.isFinite(Number(n))) return '';
  return `${new Intl.NumberFormat('ko-KR').format(Number(n))}원`;
}

function DifficultyStars({ value }) {
  const n = Math.min(5, Math.max(0, Math.round(Number(value)) || 0));
  if (n <= 0) return null;
  return (
    <span className="allcourses-difficulty" aria-label={`난이도 ${n}단계`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{ color: i <= n ? '#facc15' : 'rgba(255,255,255,0.22)' }}
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}

/** 네비 드롭다운 등에서 `courses:navigate` 커스텀 이벤트로 그룹 전환 */
export const COURSES_NAV_EVENT = 'courses:navigate';

function AllCoursesSection({ onSelectCourse }) {
  const [activeGroupId, setActiveGroupId] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const pageSize = 3;
  const canPrev = page > 0;
  const canNext = (page + 1) * pageSize < total;

  useEffect(() => {
    setPage(0);
  }, [activeGroupId, search]);

  useEffect(() => {
    let alive = true;
    let fetchGen = 0;

    const loadCourses = async () => {
      const gen = ++fetchGen;
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('status', 'published');
        params.set('limit', String(pageSize));
        params.set('skip', String(page * pageSize));
        const q = search.trim();
        if (q) params.set('q', q);
        if (activeGroupId !== 'all') {
          const category = GROUP_TO_CATEGORY[activeGroupId];
          if (category) params.set('category', category);
        }

        const res = await fetch(`${API_BASE}/courses?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || '강의 목록을 불러오지 못했습니다.');
        if (!alive || gen !== fetchGen) return;
        setItems(Array.isArray(data?.data) ? data.data : []);
        setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : 0);
      } catch (err) {
        if (!alive || gen !== fetchGen) return;
        setError(err?.message || '강의 목록을 불러오지 못했습니다.');
      } finally {
        if (alive && gen === fetchGen) setLoading(false);
      }
    };

    loadCourses();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadCourses();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeGroupId, page, search]);

  const activeGroup = useMemo(
    () => COURSE_GROUPS.find((group) => group.id === activeGroupId) ?? COURSE_GROUPS[0],
    [activeGroupId],
  );

  const filteredCourses = useMemo(() => items, [items]);

  useEffect(() => {
    const onNavigate = (e) => {
      const gid = e.detail?.groupId;
      if (gid && COURSE_GROUPS.some((g) => g.id === gid)) setActiveGroupId(gid);
    };
    window.addEventListener(COURSES_NAV_EVENT, onNavigate);
    return () => window.removeEventListener(COURSES_NAV_EVENT, onNavigate);
  }, []);

  return (
    <section id="section-all-courses" className="allcourses-section">
      <div className="allcourses-head">
        <div>
          <h2 className="allcourses-title">All Courses</h2>
          <p className="allcourses-subtitle">AI 전문가가 되기 위한 프리미엄 영상 강좌</p>
        </div>
        <input
          className="allcourses-search"
          placeholder="강좌 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="강좌 검색"
        />
      </div>

      <div className="allcourses-chip-row">
        {COURSE_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            className={`allcourses-chip ${group.id === activeGroupId ? 'active' : ''}`}
            onClick={() => setActiveGroupId(group.id)}
          >
            {group.label}
          </button>
        ))}
      </div>

      {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
      {loading && (
        <div className="helper-text" style={{ marginBottom: 10 }}>
          강의를 불러오는 중...
        </div>
      )}

      <div
        className="allcourses-carousel"
        role="region"
        aria-label="강좌 카드. 좌우로 스와이프하여 더 보기"
      >
        <div className="allcourses-grid">
          {!loading && filteredCourses.length === 0 && (
            <div
              className="helper-text"
              style={{ gridColumn: '1 / -1', padding: '20px 8px' }}
            >
              {activeGroupId === 'all'
                ? '등록된 최종본 강의가 없습니다.'
                : `${activeGroup.label} 카테고리에 등록된 최종본 강의가 없습니다.`}
            </div>
          )}
          {filteredCourses.map((course) => {
            const tone = toneForId(course?._id);
            const cap = course?.studentsCount;
            const capLabel =
              cap != null && Number(cap) > 0 ? `정원 ${Number(cap).toLocaleString('ko-KR')}명` : null;
            const dur = String(course?.duration || '').trim();
            const metaParts = [
              dur || null,
              capLabel,
            ].filter(Boolean);
            const metaLine = metaParts.join('  |  ');
            const orig = course?.originalPrice;
            const showDiscount =
              orig != null && Number(orig) > 0 && Number(orig) > Number(course?.price);
            const openDetail = () => {
              const id = course?._id;
              if (id) onSelectCourse?.(String(id));
            };

            return (
              <article
                key={String(course?._id || course?.sku)}
                className={`allcourses-card tone-${tone}`}
                role="button"
                tabIndex={0}
                onClick={openDetail}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetail();
                  }
                }}
              >
                <div className="allcourses-thumb">
                  {course?.thumbnailUrl ? (
                    <img
                      className="allcourses-thumb-img"
                      src={course.thumbnailUrl}
                      alt=""
                    />
                  ) : null}
                </div>
                <div className="allcourses-meta">
                  {metaLine || '—'}
                  {course?.rating > 0 && (
                    <>
                      {' '}
                      <DifficultyStars value={course.rating} />
                    </>
                  )}
                </div>
                <h3 className="allcourses-card-title">{course?.title || ''}</h3>
                <p className="allcourses-card-desc">
                  {String(course?.description || '').trim() || ' '}
                </p>
                <div className="allcourses-price-row">
                  <span className="allcourses-price">{formatWon(course?.price)}</span>
                  {showDiscount && (
                    <span className="allcourses-discount">{formatWon(orig)}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="allcourses-cta"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetail();
                  }}
                >
                  수강하기
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 14,
        }}
      >
        <div className="helper-text" style={{ margin: 0 }}>
          {total > 0 ? `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)} / ${total}` : '0 / 0'}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="admin-btn muted"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={loading || !canPrev}
            aria-label="이전 페이지"
          >
            이전
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={loading || !canNext}
            aria-label="다음 페이지"
          >
            다음
          </button>
        </div>
      </div>
    </section>
  );
}

export default AllCoursesSection;
