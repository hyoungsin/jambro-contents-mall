import { useEffect, useRef, useState } from 'react';
import { useCloudinaryUploadWidget } from '../../hooks/useCloudinaryUploadWidget.js';

const API_BASE = 'http://localhost:5000/api';

const DEFAULT_SKU_PREFIX = '강의-';

const DETAIL_CATEGORIES = [
  '영상콘텐츠 제작',
  '에이전트 제작',
  '업무자동화 구현',
  'AI Native',
];

const DURATION_OPTIONS = Array.from({ length: 10 }, (_, i) => `${i + 1}시간`);

function CourseAdminRegister({ editingItem, onCancel, onSaved }) {
  const emptyForm = {
    sku: '',
    title: '',
    price: '',
    category: DETAIL_CATEGORIES[0],
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
  const lastSuggestedSkuRef = useRef('');
  const priceTouchedRef = useRef(false);
  const {
    openCloudinaryWidget,
    cloudinaryConfigLoading,
    cloudinaryConfigError,
    cloudinaryInitError,
  } = useCloudinaryUploadWidget(API_BASE, {
    folder: 'courses',
    onUploadSuccess: (secureUrl) => {
      setForm((prev) => ({ ...prev, thumbnailUrl: secureUrl }));
      setSuccess('');
      setError('');
    },
    onUploadError: (message) => setError(message),
  });

  useEffect(() => {
    if (!editingItem) {
      setForm(emptyForm);
      priceTouchedRef.current = false;
      return;
    }

    setForm({
      sku: editingItem?.sku ?? '',
      title: editingItem?.title ?? '',
      price: editingItem?.price != null ? String(editingItem.price) : '',
      category: editingItem?.category ?? DETAIL_CATEGORIES[0],
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
    priceTouchedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem]);

  useEffect(() => {
    if (editingItem?._id) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/courses?limit=200&skip=0`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const list = Array.isArray(data?.data) ? data.data : [];
        let maxN = 0;
        for (const it of list) {
          const sku = String(it?.sku || '').trim();
          if (!sku.startsWith(DEFAULT_SKU_PREFIX)) continue;
          const tail = sku.slice(DEFAULT_SKU_PREFIX.length);
          const m = tail.match(/^(\d+)\s*$/);
          if (!m) continue;
          const n = Number(m[1]);
          if (Number.isFinite(n) && n > maxN) maxN = n;
        }

        const nextSku = `${DEFAULT_SKU_PREFIX}${String(maxN + 1).padStart(3, '0')}`;
        if (!alive) return;

        setForm((prev) => {
          const current = String(prev.sku || '').trim();
          const lastSuggested = String(lastSuggestedSkuRef.current || '').trim();
          // 사용자가 직접 바꾼 경우에는 덮어쓰지 않음
          if (current && current !== lastSuggested) return prev;
          lastSuggestedSkuRef.current = nextSku;
          return { ...prev, sku: nextSku };
        });
      } catch {
        // ignore suggestion failure
      }
    })();
    return () => {
      alive = false;
    };
  }, [editingItem?._id]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const sku = String(form.sku).trim();
      const title = String(form.title).trim();
      const priceRaw = String(form.price).trim();
      const priceNum = Number(priceRaw);
      const category = form.category;
      const thumbnailUrl = String(form.thumbnailUrl).trim();
      const status = form.status || 'draft';

      if (!sku) throw new Error('SKU는 필수입니다.');
      if (!title) throw new Error('제목은 필수입니다.');
      if (!priceRaw) throw new Error('가격은 필수입니다.');
      if (!Number.isFinite(priceNum) || priceNum < 0) throw new Error('가격은 0 이상 숫자여야 합니다.');
      if (!category) throw new Error('카테고리를 선택해 주세요.');
      if (!thumbnailUrl) throw new Error('썸네일 URL은 필수입니다.');

      const payload = {
        sku,
        title,
        price: priceNum,
        category,
        status,
        thumbnailUrl,
        description: String(form.description || '').trim(),
      };

      if (form.originalPrice !== '') {
        payload.originalPrice = Number(form.originalPrice);
      }
      if (form.studentsCount !== '') {
        payload.studentsCount = Number(form.studentsCount);
      }
      payload.rating =
        form.rating !== '' ? Math.min(5, Math.max(1, Math.round(Number(form.rating)))) : 0;
      if (form.duration !== '') {
        payload.duration = String(form.duration || '').trim();
      }

      const isEdit = Boolean(editingItem?._id);
      const url = isEdit
        ? `${API_BASE}/courses/${editingItem._id}`
        : `${API_BASE}/courses/register`;
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

  const statusOptions = [
    { id: 'draft', label: '초안' },
    { id: 'published', label: '최종본' },
  ];

  const difficultyStars = [1, 2, 3, 4, 5];
  const difficultySelected =
    form.rating === '' ? 0 : Math.min(5, Math.max(0, Math.round(Number(form.rating)) || 0));

  return (
    <section className="admin-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
      <article className="admin-panel">
        <div className="admin-panel-head">
          <h2 style={{ margin: 0, fontSize: 15 }}>코스 등록/수정</h2>
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
                placeholder="course_001"
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
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="강의 제목"
              />
            </div>

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
                onChange={(e) => {
                  priceTouchedRef.current = true;
                  setField('price', e.target.value);
                }}
                placeholder="예: 39000"
                inputMode="numeric"
              />
            </div>

            <div className="field">
              <div className="field-label">상세카테고리</div>
              <select
                className="field-input admin-select"
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
              >
                {DETAIL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <div className="field-label">상태</div>
              <select
                className="field-input admin-select"
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
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                className="field-input"
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#f9fafb',
                  flex: 1,
                }}
                value={form.thumbnailUrl}
                onChange={(e) => setField('thumbnailUrl', e.target.value)}
                placeholder="예: https://.../thumbnail.jpg"
              />
              <button
                type="button"
                className="admin-btn"
                onClick={openCloudinaryWidget}
                disabled={loading}
                style={{ height: 38, padding: '0 12px' }}
              >
                Cloudinary 업로드
              </button>
            </div>
            {form.thumbnailUrl && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)', marginBottom: 6 }}>
                  미리보기
                </div>
                <img
                  src={form.thumbnailUrl}
                  alt="thumbnail preview"
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    height: 'auto',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'block',
                  }}
                />
              </div>
            )}
            <div className="helper-text">
              Cloudinary 업로드로 썸네일을 저장할 수 있습니다. 설정은{' '}
              <code style={{ fontSize: 11 }}>server/.env</code>의{' '}
              <code style={{ fontSize: 11 }}>cloudinaryCloudName</code>,{' '}
              <code style={{ fontSize: 11 }}>cloudinaryUploadPreset</code>을 통해 서버 API로 전달됩니다.
            </div>
            {cloudinaryConfigLoading && (
              <div className="helper-text" style={{ marginTop: 6 }}>
                Cloudinary 설정 불러오는 중…
              </div>
            )}
            {cloudinaryConfigError && !cloudinaryConfigLoading && (
              <div className="error-text" style={{ marginTop: 6 }}>
                {cloudinaryConfigError}
              </div>
            )}
            {cloudinaryInitError && (
              <div className="error-text" style={{ marginTop: 6 }}>
                {cloudinaryInitError}
              </div>
            )}
          </div>

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
                onChange={(e) => {
                  const next = e.target.value;
                  setForm((prev) => {
                    const nextForm = { ...prev, originalPrice: next };
                    const curPriceNum = Number(String(prev.price).trim());
                    const shouldCopy =
                      !priceTouchedRef.current &&
                      (String(prev.price).trim() === '' || (Number.isFinite(curPriceNum) && curPriceNum === 0));
                    if (shouldCopy) nextForm.price = next;
                    return nextForm;
                  });
                }}
                placeholder="예: 99000"
                inputMode="numeric"
              />
            </div>

            <div className="field">
              <div className="field-label">강의시간(선택)</div>
              <select
                className="field-input admin-select"
                value={form.duration}
                onChange={(e) => setField('duration', e.target.value)}
              >
                <option value="">선택 안함</option>
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <div className="field-label">정원(선택)</div>
              <select
                className="field-input admin-select"
                value={form.studentsCount === '' ? '' : String(form.studentsCount)}
                onChange={(e) => setField('studentsCount', e.target.value)}
              >
                <option value="">선택 안함</option>
                <option value="0">무제한</option>
                {[10, 20, 30, 40, 50].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}명
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <div className="field-label">난이도(선택)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                {difficultyStars.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setField('rating', String(n))}
                    aria-label={`난이도 ${n}단계`}
                    aria-pressed={n <= difficultySelected}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 26,
                      lineHeight: 1,
                      padding: '2px 4px',
                      color: n <= difficultySelected ? '#facc15' : 'rgba(255,255,255,0.28)',
                    }}
                  >
                    ★
                  </button>
                ))}
                <button
                  type="button"
                  className="admin-btn muted"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => setField('rating', '')}
                >
                  초기화
                </button>
              </div>
              <div className="helper-text">노란 별 1~5개 중 선택합니다. 미선택 시 메인에 난이도 표시 없음.</div>
            </div>
          </div>

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
          {success && (
            <div className="helper-text" style={{ color: '#86efac' }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button type="submit" className="admin-btn" disabled={loading}>
              {loading ? '저장 중...' : '저장'}
            </button>
            <button type="button" className="admin-btn muted" disabled={loading} onClick={onCancel}>
              닫기
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}

export default CourseAdminRegister;

