import { useEffect, useState } from 'react';
import { API_BASE } from '../../lib/apiBase.js';
import { useCloudinaryUploadWidget } from '../../hooks/useCloudinaryUploadWidget.js';

const DETAIL_CATEGORIES = ['AI최신트렌드', 'AI모델성능', 'AI활용사례'];

function NewsletterAdminRegister({ editingItem, onCancel, onSaved }) {
  const emptyForm = {
    sku: '',
    title: '',
    category: DETAIL_CATEGORIES[0],
    status: 'draft',
    thumbnailUrl: '',
    description: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    openCloudinaryWidget,
    cloudinaryConfigLoading,
    cloudinaryConfigError,
    cloudinaryInitError,
  } = useCloudinaryUploadWidget(API_BASE, {
    folder: 'newsletter',
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
      return;
    }

    setForm({
      sku: editingItem?.sku ?? '',
      title: editingItem?.title ?? '',
      category: editingItem?.category ?? DETAIL_CATEGORIES[0],
      status: editingItem?.status ?? 'draft',
      thumbnailUrl: editingItem?.thumbnailUrl ?? '',
      description: editingItem?.description ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const sku = String(form.sku).trim();
      const title = String(form.title).trim();
      const category = form.category;
      const thumbnailUrl = String(form.thumbnailUrl).trim();
      const status = form.status || 'draft';
      const description = String(form.description || '').trim();

      if (!sku) return setError('SKU는 필수입니다.');
      if (!title) return setError('제목은 필수입니다.');
      if (!category) return setError('카테고리를 선택해 주세요.');
      if (!thumbnailUrl) return setError('썸네일 URL은 필수입니다.');

      const isEdit = Boolean(editingItem?._id);
      const url = isEdit
        ? `${API_BASE}/ai-trends/${editingItem._id}`
        : `${API_BASE}/ai-trends/register`;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        sku,
        title,
        category,
        status,
        thumbnailUrl,
        description,
      };

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
    { id: 'published', label: '게시됨' },
  ];

  return (
    <section className="admin-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
      <article className="admin-panel">
        <div className="admin-panel-head">
          <h2 style={{ margin: 0, fontSize: 15 }}>뉴스레터 등록/수정</h2>
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
                placeholder="news_001"
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
                placeholder="AI 트렌드 제목"
              />
            </div>

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
    </section>
  );
}

export default NewsletterAdminRegister;

