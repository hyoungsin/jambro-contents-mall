import { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:5000/api';

export const NEWSLETTER_CATEGORIES = [
  {
    id: 'trend',
    icon: '📈',
    title: 'AI 최신Trend',
    desc: 'AI 업계 최신 동향과 트렌드를 빠르게 전달합니다',
    backendCategory: 'AI최신트렌드',
    accent: 'green',
  },
  {
    id: 'model',
    icon: '🧠',
    title: 'AI모델성능',
    desc: '주요 AI 모델의 성능 비교와 벤치마크 분석',
    backendCategory: 'AI모델성능',
    accent: 'cyan',
  },
  {
    id: 'usecase',
    icon: '💡',
    title: 'AI활용사례',
    desc: '실제 비즈니스에서 AI를 활용한 성공 사례',
    backendCategory: 'AI활용사례',
    accent: 'purple',
  },
];

export function getCategoryByBackendCategory(category) {
  return NEWSLETTER_CATEGORIES.find((c) => c.backendCategory === category) || null;
}

/** 네비 드롭다운 등에서 `newsletter:navigate` 커스텀 이벤트로 카테고리 전환 */
export const NEWSLETTER_NAV_EVENT = 'newsletter:navigate';

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function NewsletterSection() {
  const [activeCategoryId, setActiveCategoryId] = useState('model');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/ai-trends?status=published&limit=100&skip=0`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || '뉴스레터를 불러오지 못했습니다.');
        if (!cancelled) setItems(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || '뉴스레터를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const articleMap = useMemo(() => {
    const base = {
      trend: [],
      model: [],
      usecase: [],
    };
    for (const item of items) {
      const matched = getCategoryByBackendCategory(item?.category);
      if (!matched) continue;
      base[matched.id].push(item);
    }
    return base;
  }, [items]);

  const activeArticles = useMemo(
    () => articleMap[activeCategoryId] ?? articleMap.model ?? [],
    [activeCategoryId, articleMap],
  );
  const activeCategory =
    NEWSLETTER_CATEGORIES.find((c) => c.id === activeCategoryId) ??
    NEWSLETTER_CATEGORIES[1];

  useEffect(() => {
    const onNavigate = (e) => {
      const cid = e.detail?.categoryId;
      if (cid && NEWSLETTER_CATEGORIES.some((c) => c.id === cid)) {
        setActiveCategoryId(cid);
      }
    };
    window.addEventListener(NEWSLETTER_NAV_EVENT, onNavigate);
    return () => window.removeEventListener(NEWSLETTER_NAV_EVENT, onNavigate);
  }, []);

  return (
    <section id="section-newsletter" className="newsletter-section">
      <div className="newsletter-headline">
        <div>
          <h2 className="newsletter-title">Newsletter</h2>
          <p className="newsletter-subtitle">카테고리별 AI 뉴스레터 아티클을 확인하세요</p>
        </div>
        <button type="button" className="newsletter-more-link">
          모든 아티클 보기 <span aria-hidden>→</span>
        </button>
      </div>

      <div className="newsletter-category-grid">
        {NEWSLETTER_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`newsletter-category-card ${
              c.id === activeCategoryId ? 'active' : ''
            }`}
            onClick={() => setActiveCategoryId(c.id)}
          >
            <div className="newsletter-category-head">
              <span className="newsletter-category-icon-plain" aria-hidden>{c.icon}</span>
              <div className="newsletter-category-title">{c.title}</div>
            </div>
            <div className="newsletter-category-desc">{c.desc}</div>
            <div className="newsletter-category-count">
              {articleMap[c.id]?.length ?? 0}개 아티클
            </div>
          </button>
        ))}
      </div>

      <div className="newsletter-article-header">
        <span className="newsletter-article-topic">{activeCategory.title}</span>
        <span className="newsletter-article-badge">{activeArticles.length}</span>
      </div>

      {error && <div className="error-text">{error}</div>}
      {loading && (
        <div className="helper-text" style={{ marginBottom: 10 }}>
          뉴스레터를 불러오는 중...
        </div>
      )}
      {!loading && activeArticles.length === 0 && !error && (
        <div className="helper-text" style={{ marginBottom: 10 }}>
          아직 등록된 뉴스레터가 없습니다.
        </div>
      )}

      <div className="newsletter-article-grid">
        {activeArticles.map((article) => (
          <article
            key={String(article?._id || article?.sku || article?.title)}
            className="newsletter-article-card"
          >
            <div className="newsletter-article-tags">
              <span className="newsletter-tag active">{activeCategory.title}</span>
            </div>
            {article?.thumbnailUrl ? (
              <img
                src={article.thumbnailUrl}
                alt={article?.title || '뉴스레터 썸네일'}
                style={{
                  width: '100%',
                  height: 180,
                  objectFit: 'cover',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginBottom: 10,
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 180,
                  borderRadius: 10,
                  border: '1px dashed rgba(255,255,255,0.2)',
                  marginBottom: 10,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'rgba(229,231,235,0.5)',
                  fontSize: 12,
                }}
              >
                썸네일 없음
              </div>
            )}
            <h3 className="newsletter-article-title" style={{ marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedArticle(article)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'inherit',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {article?.title || ''}
              </button>
            </h3>
            <div className="newsletter-article-meta">
              {formatDate(article?.createdAt)} {article?.author?.name || '관리자'}
            </div>
          </article>
        ))}
      </div>

      {selectedArticle && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 1200,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedArticle(null)}
        >
          <div
            style={{
              width: 'min(900px, 100%)',
              maxHeight: '86vh',
              overflowY: 'auto',
              background: '#0b1220',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              padding: 16,
              color: '#f3f4f6',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>{selectedArticle?.title || ''}</h3>
              <button type="button" className="admin-btn muted" onClick={() => setSelectedArticle(null)}>
                닫기
              </button>
            </div>
            {selectedArticle?.thumbnailUrl && (
              <img
                src={selectedArticle.thumbnailUrl}
                alt={selectedArticle?.title || '뉴스레터 썸네일'}
                style={{
                  width: '100%',
                  maxHeight: 360,
                  objectFit: 'cover',
                  borderRadius: 10,
                  marginTop: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            )}
            <div style={{ marginTop: 12, color: 'rgba(229,231,235,0.75)', fontSize: 13 }}>
              {formatDate(selectedArticle?.createdAt)} {selectedArticle?.author?.name || '관리자'}
            </div>
            <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {selectedArticle?.description || '등록된 상세 내용이 없습니다.'}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default NewsletterSection;

