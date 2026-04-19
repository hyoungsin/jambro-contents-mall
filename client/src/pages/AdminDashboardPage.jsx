import { useEffect, useMemo, useState } from 'react';
import '../App.css';
import logo from '../assets/logo.png';
import AdminDashboardView from '../components/admin/AdminDashboardView.jsx';
import NewsletterAdminList from '../components/admin/NewsletterAdminList.jsx';
import NewsletterAdminRegister from '../components/admin/NewsletterAdminRegister.jsx';
import CourseAdminList from '../components/admin/CourseAdminList.jsx';
import CourseAdminRegister from '../components/admin/CourseAdminRegister.jsx';
import OrderAdminPanel from '../components/admin/OrderAdminPanel.jsx';

const SIDEBAR_MENU = [
  { key: 'dashboard', label: '대시보드', icon: '▦' },
  { key: 'news', label: '뉴스레터 관리', icon: '📰' },
  { key: 'courses', label: '강의 관리', icon: '🎓' },
  { key: 'orders', label: '주문 관리', icon: '🧾' },
  { key: 'users', label: '사용자 관리', icon: '👤' },
  { key: 'comments', label: '댓글 관리', icon: '💬' },
  { key: 'analysis', label: '콘텐츠 분석', icon: '📈' },
  { key: 'upload', label: '콘텐츠 업로드', icon: '⬆️' },
  { key: 'integrations', label: '외부 연동', icon: '🔗' },
  { key: 'notifications', label: '알림 설정', icon: '🔔' },
  { key: 'settings', label: '설정', icon: '⚙️' },
];

function AdminDashboardPage({ user, onLogout, onBackToMain }) {
  const [activeKey, setActiveKey] = useState('dashboard');
  const [newsMode, setNewsMode] = useState('list'); // 'list' | 'editor'
  const [newsEditingItem, setNewsEditingItem] = useState(null);
  const [newsRefreshNonce, setNewsRefreshNonce] = useState(0);

  const [coursesMode, setCoursesMode] = useState('list'); // 'list' | 'editor'
  const [coursesEditingItem, setCoursesEditingItem] = useState(null);
  const [coursesRefreshNonce, setCoursesRefreshNonce] = useState(0);

  const [dashboardData, setDashboardData] = useState(() => ({
    kpis: [
      { title: '총 사용자', value: '12,847', delta: '+12.8% 지난 달 대비' },
      { title: 'AI 트렌드 조회수', value: '284,532', delta: '+28.4% 지난 달 대비' },
      { title: '강의 구독자', value: '3,256', delta: '+8.2% 지난 달 대비' },
      { title: '총 수익', value: '45,230,000원', delta: '+15.3% 지난 달 대비' },
    ],
    viewsTrend: {
      title: '콘텐츠 조회수 추이',
      // dummy data: 예시 화면처럼 1~7 구간 라인/피크 형태
      series: [4200, 2800, 5200, 6400, 6000, 7000, 8200],
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
  }));

  const header = useMemo(() => {
    const found = SIDEBAR_MENU.find((m) => m.key === activeKey);
    return {
      title: found?.label ?? '대시보드',
      subtitle:
        activeKey === 'dashboard'
          ? 'Jambro 플랫폼 현황을 한눈에 확인하세요'
          : activeKey === 'orders'
            ? '결제·환불 주문을 조회하고 매출을 확인합니다.'
            : '등록/관리 작업을 진행합니다.',
    };
  }, [activeKey]);

  useEffect(() => {
    if (activeKey === 'news') {
      setNewsMode('list');
      setNewsEditingItem(null);
    }
    if (activeKey === 'courses') {
      setCoursesMode('list');
      setCoursesEditingItem(null);
    }
  }, [activeKey]);

  /** 이미 선택된 메뉴를 다시 눌러도 하위 화면(등록/수정)이 목록으로 돌아가도록 */
  const handleSidebarNav = (key) => {
    if (key === activeKey) {
      if (key === 'news') {
        setNewsMode('list');
        setNewsEditingItem(null);
        setNewsRefreshNonce((n) => n + 1);
      }
      if (key === 'courses') {
        setCoursesMode('list');
        setCoursesEditingItem(null);
        setCoursesRefreshNonce((n) => n + 1);
      }
      return;
    }
    setActiveKey(key);
  };

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <button
          type="button"
          className="admin-brand"
          onClick={onBackToMain}
          title="메인 페이지로 이동"
          aria-label="메인 페이지로 이동"
        >
          <img className="admin-brand-logo-img" src={logo} alt="" width={48} height={48} decoding="async" />
          <div>
            <div className="admin-brand-title">Jambro</div>
            <div className="admin-brand-sub">Admin Console</div>
          </div>
        </button>

        <nav className="admin-menu" aria-label="관리자 메뉴">
          {SIDEBAR_MENU.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`admin-menu-item ${item.key === activeKey ? 'active' : ''}`}
              onClick={() => handleSidebarNav(item.key)}
            >
              <span aria-hidden style={{ marginRight: 10, opacity: 0.95 }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-title">{header.title}</h1>
            <p className="admin-subtitle">{header.subtitle}</p>
          </div>
          <div className="admin-top-actions">
            <span className="admin-user">{user?.name || '관리자'}님</span>
            <button
              type="button"
              className="btn-back-to-main btn-back-to-main--compact"
              onClick={onBackToMain}
            >
              <span className="btn-back-to-main__icon" aria-hidden>
                🏠
              </span>
              <span className="btn-back-to-main__label">메인으로</span>
            </button>
            <button type="button" className="admin-btn" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </header>

        {activeKey === 'dashboard' && <AdminDashboardView dashboardData={dashboardData} />}

        {activeKey === 'news' &&
          (newsMode === 'list' ? (
            <NewsletterAdminList
              refreshNonce={newsRefreshNonce}
              onOpenCreate={() => {
                setNewsEditingItem(null);
                setNewsMode('editor');
              }}
              onOpenEdit={(it) => {
                setNewsEditingItem(it);
                setNewsMode('editor');
              }}
              onAfterChange={() => setNewsRefreshNonce((n) => n + 1)}
            />
          ) : (
            <NewsletterAdminRegister
              editingItem={newsEditingItem}
              onCancel={() => {
                setNewsMode('list');
                setNewsEditingItem(null);
              }}
              onSaved={() => {
                setNewsMode('list');
                setNewsEditingItem(null);
                setNewsRefreshNonce((n) => n + 1);
              }}
            />
          ))}

        {activeKey === 'courses' &&
          (coursesMode === 'list' ? (
            <CourseAdminList
              refreshNonce={coursesRefreshNonce}
              onOpenCreate={() => {
                setCoursesEditingItem(null);
                setCoursesMode('editor');
              }}
              onOpenEdit={(it) => {
                setCoursesEditingItem(it);
                setCoursesMode('editor');
              }}
              onAfterChange={() => setCoursesRefreshNonce((n) => n + 1)}
            />
          ) : (
            <CourseAdminRegister
              editingItem={coursesEditingItem}
              onCancel={() => {
                setCoursesMode('list');
                setCoursesEditingItem(null);
              }}
              onSaved={() => {
                setCoursesMode('list');
                setCoursesEditingItem(null);
                setCoursesRefreshNonce((n) => n + 1);
              }}
            />
          ))}

        {activeKey === 'orders' && <OrderAdminPanel />}

        {activeKey !== 'dashboard' && activeKey !== 'news' && activeKey !== 'courses' && activeKey !== 'orders' && (
          <section className="admin-panel">
            <h2 style={{ margin: 0, fontSize: 15 }}>준비중</h2>
            <p style={{ margin: '10px 0 0', color: 'rgba(229,231,235,0.7)', fontSize: 13 }}>
              {header.title} 기능은 현재 데모 화면으로 연결되어 있습니다.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function ContentManager({ kind }) {
  const isNews = kind === 'news';
  const basePath = isNews ? 'ai-trends' : 'courses';
  const detailCategories = isNews
    ? ['AI최신트렌드', 'AI모델성능', 'AI활용사례']
    : ['영상콘텐츠 제작', '에이전트 제작', '업무자동화 구현', 'AI Native'];

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const url = `http://localhost:5000/api/${basePath}?limit=50&skip=0`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '목록 조회에 실패했습니다.');
      setItems(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setError(err?.message || '목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setShowEditor(false);
    setEditingItem(null);
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, refreshNonce]);

  const filtered = items.filter((it) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const t = String(it?.title || '').toLowerCase();
    return t.includes(q);
  });

  const statusLabel = (status) => {
    if (status === 'published') return isNews ? '게시됨' : '최종본';
    return '초안';
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('정말 삭제할까요?');
    if (!ok) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/${basePath}/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '삭제에 실패했습니다.');
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      setError(err?.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setShowEditor(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setShowEditor(true);
  };

  const title = isNews ? '뉴스레터 관리' : '강의 관리';
  const editorTitle = isNews ? '뉴스레터 등록/수정' : '코스 등록/수정';

  return (
    <section className="admin-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
      {showEditor && (
        <ContentEditor
          kind={kind}
          title={editorTitle}
          editingItem={editingItem}
          detailCategories={detailCategories}
          onCancel={() => {
            setShowEditor(false);
            setEditingItem(null);
          }}
          onSaved={() => {
            setShowEditor(false);
            setEditingItem(null);
            setRefreshNonce((n) => n + 1);
          }}
        />
      )}

      <article className="admin-panel">
        <div
          className="admin-panel-head"
          style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}
        >
          <h2 style={{ margin: 0, fontSize: 15 }}>{title}</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="field-input"
              style={{
                width: 320,
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#f9fafb',
                height: 38,
                padding: '0 12px',
                borderRadius: 10,
              }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목 검색..."
            />
            <button type="button" className="admin-btn" onClick={openCreate} disabled={loading}>
              + 등록
            </button>
          </div>
        </div>

        {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        {loading && <div className="helper-text" style={{ marginTop: 10 }}>로딩 중...</div>}

        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'rgba(229,231,235,0.7)', fontSize: 12 }}>
                <th style={{ textAlign: 'left', padding: '10px 10px' }}>제목</th>
                <th style={{ textAlign: 'left', padding: '10px 10px' }}>카테고리</th>
                <th style={{ textAlign: 'left', padding: '10px 10px' }}>상태</th>
                <th style={{ textAlign: 'left', padding: '10px 10px' }}>{isNews ? '조회수' : '조회수'}</th>
                <th style={{ textAlign: 'left', padding: '10px 10px' }}>{isNews ? '작성일' : '작성일'}</th>
                {!isNews && (
                  <th style={{ textAlign: 'right', padding: '10px 10px' }}>가격</th>
                )}
                <th style={{ textAlign: 'right', padding: '10px 10px' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={isNews ? 6 : 7} style={{ padding: '18px 10px', color: 'rgba(229,231,235,0.6)' }}>
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
              {filtered.map((it) => {
                const statusBg =
                  it?.status === 'published'
                    ? 'rgba(34, 197, 94, 0.18)'
                    : 'rgba(255, 255, 255, 0.06)';
                const statusBorder =
                  it?.status === 'published'
                    ? 'rgba(34, 197, 94, 0.35)'
                    : 'rgba(255, 255, 255, 0.12)';

                const createdAt = it?.createdAt
                  ? new Date(it.createdAt).toISOString().slice(0, 10)
                  : '';

                return (
                  <tr
                    key={String(it?._id || it?.id || it?.sku)}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <td style={{ padding: '12px 10px', minWidth: 220 }}>
                      <div style={{ fontWeight: 800 }}>{it?.title || ''}</div>
                      <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.58)', marginTop: 4 }}>
                        {it?.author?.name || '관리자'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px' }}>{it?.category || ''}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: `1px solid ${statusBorder}`,
                          background: statusBg,
                          color: it?.status === 'published' ? '#dcfce7' : 'rgba(229,231,235,0.8)',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {statusLabel(it?.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px' }}>{it?.views ?? 0}</td>
                    <td style={{ padding: '12px 10px' }}>{createdAt}</td>
                    {!isNews && (
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        {(it?.price ?? 0).toLocaleString()}원
                      </td>
                    )}
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-btn muted"
                        style={{ padding: '6px 10px', marginRight: 8 }}
                        onClick={() => openEdit(it)}
                        disabled={loading}
                      >
                        ✏️ 수정
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(239, 68, 68, 0.16)',
                          borderColor: 'rgba(239, 68, 68, 0.45)',
                        }}
                        onClick={() => handleDelete(String(it?._id))}
                        disabled={loading}
                      >
                        🗑️ 삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function ContentEditor({
  kind,
  title,
  editingItem,
  detailCategories,
  onCancel,
  onSaved,
}) {
  const isNews = kind === 'news';
  const basePath = isNews ? 'ai-trends' : 'courses';

  const emptyForm = {
    sku: '',
    name: '',
    price: '',
    detailCategory: detailCategories[0],
    status: 'draft',
    thumbnailUrl: '',
    description: '',
    originalPrice: '',
    studentsCount: '',
    rating: '',
    duration: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!editingItem) {
      setForm(emptyForm);
      return;
    }

    setForm({
      sku: editingItem?.sku ?? '',
      name: editingItem?.title ?? '',
      price: editingItem?.price != null ? String(editingItem.price) : '',
      detailCategory: editingItem?.category ?? detailCategories[0],
      status: editingItem?.status ?? 'draft',
      thumbnailUrl: editingItem?.thumbnailUrl ?? '',
      description: editingItem?.description ?? '',
      originalPrice:
        editingItem?.originalPrice != null ? String(editingItem.originalPrice) : '',
      studentsCount:
        editingItem?.studentsCount != null ? String(editingItem.studentsCount) : '',
      rating:
        editingItem?.rating != null && Number(editingItem.rating) > 0
          ? String(Math.min(5, Math.max(1, Math.round(Number(editingItem.rating)))))
          : '',
      duration: editingItem?.duration ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem, kind]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const sku = String(form.sku).trim();
      const name = String(form.name).trim();
      const detailCategory = form.detailCategory;
      const thumbnailUrl = String(form.thumbnailUrl).trim();
      const status = form.status || 'draft';

      const priceNum = Number(form.price);

      if (!sku) return setError('SKU는 필수입니다.');
      if (!name) return setError('제목은 필수입니다.');
      if (!detailCategory) return setError('카테고리를 선택해 주세요.');
      if (!thumbnailUrl) return setError('썸네일 URL은 필수입니다.');

      if (!isNews) {
        if (!Number.isFinite(priceNum) || priceNum < 0) {
          return setError('가격은 0 이상 숫자여야 합니다.');
        }
      }

      const payload = {
        sku,
        title: name,
        category: detailCategory,
        status,
        thumbnailUrl,
        description: String(form.description || '').trim(),
        ...(isNews
          ? {}
          : {
              price: priceNum,
              originalPrice:
                form.originalPrice !== '' ? Number(form.originalPrice) : undefined,
              studentsCount:
                form.studentsCount !== '' ? Number(form.studentsCount) : undefined,
              rating:
                form.rating !== ''
                  ? Math.min(5, Math.max(1, Math.round(Number(form.rating))))
                  : 0,
              duration: String(form.duration || '').trim(),
            }),
      };

      const isEdit = Boolean(editingItem?._id);
      const url = isEdit
        ? `http://localhost:5000/api/${basePath}/${editingItem._id}`
        : `http://localhost:5000/api/${basePath}/register`;

      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '저장에 실패했습니다.');

      setSuccess('저장 완료');
      onSaved?.();
    } catch (err) {
      setError(err?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = isNews
    ? [
        { id: 'draft', label: '초안' },
        { id: 'published', label: '게시됨' },
      ]
    : [
        { id: 'draft', label: '초안' },
        { id: 'published', label: '최종본' },
      ];

  return (
    <article className="admin-panel">
      <div className="admin-panel-head">
        <h2 style={{ margin: 0, fontSize: 15 }}>{title}</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <div className="field-label">SKU</div>
            <input
              className="field-input"
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#f9fafb',
              }}
              value={form.sku}
              onChange={(e) => setField('sku', e.target.value)}
              placeholder={isNews ? 'news_001' : 'course_001'}
              disabled={Boolean(editingItem?._id)}
            />
          </div>

          <div className="field">
            <div className="field-label">제목</div>
            <input
              className="field-input"
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#f9fafb',
              }}
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={isNews ? 'AI 트렌드 제목' : '강의 제목'}
            />
          </div>

          {!isNews && (
            <div className="field">
              <div className="field-label">가격(원)</div>
              <input
                className="field-input"
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#f9fafb',
                }}
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="예: 39000"
                inputMode="numeric"
              />
            </div>
          )}

          <div className="field">
            <div className="field-label">상세카테고리</div>
            <select
              className="field-input"
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#f9fafb',
                padding: '10px 12px',
                borderRadius: 8,
              }}
              value={form.detailCategory}
              onChange={(e) => setField('detailCategory', e.target.value)}
            >
              {detailCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <div className="field-label">상태</div>
            <select
              className="field-input"
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#f9fafb',
                padding: '10px 12px',
                borderRadius: 8,
              }}
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
            >
              {statusOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <div className="field-label">썸네일 URL</div>
          <input
            className="field-input"
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#f9fafb',
            }}
            value={form.thumbnailUrl}
            onChange={(e) => setField('thumbnailUrl', e.target.value)}
            placeholder="예: https://.../thumbnail.jpg"
          />
          <div className="helper-text">Cloudinary 등 이미지 호스팅 URL을 넣어주세요.</div>
        </div>

        {!isNews && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div className="field">
                <div className="field-label">기존가격(선택)</div>
                <input
                  className="field-input"
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#f9fafb',
                  }}
                  value={form.originalPrice}
                  onChange={(e) => setField('originalPrice', e.target.value)}
                  placeholder="예: 99000"
                  inputMode="numeric"
                />
              </div>
              <div className="field">
                <div className="field-label">기간(선택)</div>
                <input
                  className="field-input"
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#f9fafb',
                  }}
                  value={form.duration}
                  onChange={(e) => setField('duration', e.target.value)}
                  placeholder="예: 4시간"
                />
              </div>
              <div className="field">
                <div className="field-label">정원(선택)</div>
                <input
                  className="field-input"
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#f9fafb',
                  }}
                  value={form.studentsCount}
                  onChange={(e) => setField('studentsCount', e.target.value)}
                  placeholder="예: 30"
                  inputMode="numeric"
                />
              </div>
              <div className="field">
                <div className="field-label">난이도(선택)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const selected =
                      form.rating === ''
                        ? 0
                        : Math.min(5, Math.max(0, Math.round(Number(form.rating)) || 0));
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setField('rating', String(n))}
                        aria-label={`난이도 ${n}단계`}
                        aria-pressed={n <= selected}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 26,
                          lineHeight: 1,
                          padding: '2px 4px',
                          color: n <= selected ? '#facc15' : 'rgba(255,255,255,0.28)',
                        }}
                      >
                        ★
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="admin-btn muted"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setField('rating', '')}
                  >
                    초기화
                  </button>
                </div>
                <div className="helper-text">노란 별 1~5개 중 선택합니다.</div>
              </div>
            </div>
          </>
        )}

        <div className="field" style={{ marginTop: 12 }}>
          <div className="field-label">설명(선택)</div>
          <textarea
            className="field-input"
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#f9fafb',
              minHeight: 84,
              resize: 'vertical',
            }}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="등록용 간단한 설명입니다."
          />
        </div>

        {error && <div className="error-text">{error}</div>}
        {success && <div className="helper-text" style={{ color: '#86efac' }}>{success}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button type="submit" className="admin-btn" disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            className="admin-btn muted"
            disabled={loading}
            onClick={onCancel}
          >
            닫기
          </button>
        </div>
      </form>
    </article>
  );
}

export default AdminDashboardPage;
