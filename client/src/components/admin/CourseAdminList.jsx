import { useEffect, useMemo, useState } from 'react';

function statusLabel(status) {
  if (status === 'published') return '최종본';
  return '초안';
}

function CourseAdminList({
  refreshNonce,
  onOpenCreate,
  onOpenEdit,
  onAfterChange,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const url = `http://localhost:5000/api/courses?limit=50&skip=0`;
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
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNonce]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const title = String(it?.title || '').toLowerCase();
      const sku = String(it?.sku || '').toLowerCase();
      return title.includes(q) || sku.includes(q);
    });
  }, [items, search]);

  const handleDelete = async (id) => {
    const ok = window.confirm('정말 삭제할까요?');
    if (!ok) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/courses/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || '삭제에 실패했습니다.');
      onAfterChange?.();
    } catch (err) {
      setError(err?.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
      <article className="admin-panel">
        <div
          className="admin-panel-head"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 15 }}>강의 관리</h2>
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
              placeholder="제목·SKU 검색..."
              aria-label="제목 또는 SKU로 검색"
            />
            <button type="button" className="admin-btn" onClick={onOpenCreate} disabled={loading}>
              + 새 강의 등록
            </button>
          </div>
        </div>

        {error && (
          <div className="error-text" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}
        {loading && (
          <div className="helper-text" style={{ marginTop: 10 }}>
            로딩 중...
          </div>
        )}

        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'rgba(229,231,235,0.7)', fontSize: 12 }}>
                <th style={{ textAlign: 'left', padding: '10px 10px', whiteSpace: 'nowrap' }}>SKU</th>
                <th style={{ textAlign: 'left', padding: '10px 10px' }}>제목</th>
                <th style={{ textAlign: 'left', padding: '10px 10px' }}>카테고리</th>
                <th style={{ textAlign: 'left', padding: '10px 10px' }}>상태</th>
                <th style={{ textAlign: 'left', padding: '10px 10px' }}>조회수</th>
                <th style={{ textAlign: 'left', padding: '10px 10px' }}>작성일</th>
                <th style={{ textAlign: 'right', padding: '10px 10px' }}>가격</th>
                <th style={{ textAlign: 'right', padding: '10px 10px' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: '18px 10px',
                      color: 'rgba(229,231,235,0.6)',
                    }}
                  >
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
                    <td
                      style={{
                        padding: '12px 10px',
                        verticalAlign: 'top',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: 13,
                        color: 'rgba(229,231,235,0.92)',
                        whiteSpace: 'nowrap',
                      }}
                      title={it?.sku || ''}
                    >
                      {it?.sku || '—'}
                    </td>
                    <td style={{ padding: '12px 10px', minWidth: 220 }}>
                      <div style={{ fontWeight: 800 }}>{it?.title || ''}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'rgba(229,231,235,0.58)',
                          marginTop: 4,
                        }}
                      >
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
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      {(it?.price ?? 0).toLocaleString()}원
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-btn muted"
                        style={{ padding: '6px 10px', marginRight: 8 }}
                        onClick={() => onOpenEdit?.(it)}
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

export default CourseAdminList;

