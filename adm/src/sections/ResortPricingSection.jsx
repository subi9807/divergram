import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import {
  DIVING_PRICE_PRESETS,
  RESORT_PRICE_TYPES,
  RESORT_PRICE_TYPE_GROUPS,
} from '../constants/resortPricing';

const emptyDraft = (resortId = '') => ({
  id: '',
  resort_id: resortId,
  price_type: 'dive_package',
  title: '',
  image_url: '',
  amount: '',
  currency: 'USD',
  duration_text: '',
  description: '',
  included_items_text: '',
  unit_label: '1인 기준',
  sort_order: 0,
  is_active: true,
});

function formatMoney(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return '0';
  try {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

function uniqueList(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((item) => String(item || '').trim()).filter(Boolean)));
}

function toLines(value) {
  return String(value || '')
    .split('\n')
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

export default function ResortPricingSection({ resorts = [], resortPrices = [], refreshResortPrices }) {
  const [selectedResortId, setSelectedResortId] = useState('');
  const [draft, setDraft] = useState(emptyDraft(''));
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const selectedResort = useMemo(() => {
    const list = Array.isArray(resorts) ? resorts : [];
    return list.find((item) => String(item?.id || '') === String(selectedResortId || '')) || list[0] || null;
  }, [resorts, selectedResortId]);

  useEffect(() => {
    if (!selectedResort && resorts.length) {
      setSelectedResortId(String(resorts[0].id || ''));
    }
  }, [resorts, selectedResort]);

  useEffect(() => {
    if (!selectedResort) return;
    setSelectedResortId(String(selectedResort.id || ''));
    setDraft(emptyDraft(String(selectedResort.id || '')));
    setModalOpen(false);
    setError('');
    setMessage('');
  }, [selectedResort?.id]);

  const filteredPrices = useMemo(() => {
    const resortId = String(selectedResortId || '');
    const search = String(query || '').trim().toLowerCase();
    return (Array.isArray(resortPrices) ? resortPrices : []).filter((item) => {
      if (String(item?.resort_id || '') !== resortId) return false;
      if (typeFilter !== 'all') {
        const group = RESORT_PRICE_TYPE_GROUPS.find((g) => g.key === typeFilter);
        if (group && !group.types.includes(String(item?.price_type || ''))) return false;
      }
      if (!search) return true;
      const text = [
        item?.title,
        item?.amount,
        item?.currency,
        item?.description,
        item?.duration_text,
        item?.unit_label,
        ...(Array.isArray(item?.included_items) ? item.included_items : []),
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return text.includes(search);
    });
  }, [query, resortPrices, selectedResortId, typeFilter]);

  const priceTypeLabel = (value) => RESORT_PRICE_TYPES.find((item) => item.key === value)?.label || value || '-';
  const activeCount = filteredPrices.filter((item) => item.is_active).length;

  const openCreate = () => {
    setDraft(emptyDraft(String(selectedResortId || selectedResort?.id || '')));
    setError('');
    setMessage('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setDraft({
      id: String(item?.id || ''),
      resort_id: String(item?.resort_id || selectedResortId || ''),
      price_type: String(item?.price_type || 'dive_package'),
      title: String(item?.title || ''),
      image_url: String(item?.image_url || ''),
      amount: item?.amount ?? '',
      currency: String(item?.currency || 'USD'),
      duration_text: String(item?.duration_text || ''),
      description: String(item?.description || ''),
      included_items_text: uniqueList(item?.included_items || []).join('\n'),
      unit_label: String(item?.unit_label || '1인 기준'),
      sort_order: item?.sort_order ?? 0,
      is_active: item?.is_active ?? true,
    });
    setError('');
    setMessage('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setError('');
    setBusy(false);
  };

  const applyPreset = (preset) => {
    setDraft((prev) => ({
      ...prev,
      ...preset,
      resort_id: String(selectedResortId || selectedResort?.id || prev.resort_id || ''),
      id: '',
      image_url: preset.image_url || '',
      is_active: true,
    }));
    setModalOpen(true);
    setMessage(`${preset.label} 템플릿을 불러왔어.`);
    setError('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (!selectedResortId) return;
    if (!draft.title.trim()) {
      setError('이름을 입력해줘.');
      return;
    }
    if (draft.amount === '' || Number.isNaN(Number(draft.amount))) {
      setError('가격을 입력해줘.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        resort_id: selectedResortId,
        price_type: draft.price_type,
        title: draft.title.trim(),
        image_url: draft.image_url.trim(),
        amount: Number(draft.amount),
        currency: String(draft.currency || 'USD').trim().toUpperCase(),
        duration_text: draft.duration_text.trim(),
        description: draft.description.trim(),
        included_items: toLines(draft.included_items_text),
        unit_label: draft.unit_label.trim(),
        sort_order: Number(draft.sort_order || 0),
        is_active: !!draft.is_active,
      };
      if (draft.id) {
        await api(`/api/admin/resort-prices/${encodeURIComponent(draft.id)}`, { method: 'PATCH', body: payload });
        setMessage('가격을 수정했어.');
      } else {
        await api('/api/admin/resort-prices', { method: 'POST', body: payload });
        setMessage('가격을 등록했어.');
      }
      await refreshResortPrices?.();
      closeModal();
      setDraft(emptyDraft(selectedResortId));
    } catch (e) {
      setError(e.message || '저장 실패');
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (item) => {
    if (!window.confirm(`"${item?.title || '이 가격 항목'}" 을(를) 삭제할까?`)) return;
    try {
      await api(`/api/admin/resort-prices/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      await refreshResortPrices?.();
    } catch (e) {
      setError(e.message || '삭제 실패');
    }
  };

  return (
    <div className="card resort-pricing-card">
      <div className="resort-pricing-heading">
        <div>
          <h2>다이빙 가격</h2>
          <p>메뉴판처럼 이름과 가격을 빠르게 등록할 수 있어.</p>
        </div>
        <div className="resort-pricing-actions">
          <label className="resort-pricing-select">
            <span className="sr-only">리조트 선택</span>
            <select value={selectedResortId || selectedResort?.id || ''} onChange={(e) => setSelectedResortId(e.target.value)}>
              {(resorts || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name || item.username} · {String(item.resort_region || '미지정')}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="ghost" onClick={() => refreshResortPrices?.()}>새로고침</button>
          <button type="button" className="pricing-primary-btn" onClick={openCreate}>다이빙 가격등록</button>
        </div>
      </div>

      {!selectedResort ? (
        <p className="resorts-empty">선택할 리조트가 없어.</p>
      ) : (
        <>
          <div className="pricing-hero">
            <div className="pricing-hero-copy">
              <strong>빠른 입력 템플릿</strong>
              <p>자주 쓰는 다이빙 가격 형태를 바로 불러와서 이름과 가격만 바꾸면 돼.</p>
            </div>
            <div className="pricing-template-row">
              {DIVING_PRICE_PRESETS.map((preset) => (
                <button key={preset.key} type="button" className="ghost pricing-template-btn" onClick={() => applyPreset(preset)}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pricing-toolbar">
            <div className="pricing-search-row">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름, 가격, 설명 검색" />
              <button type="button" className="ghost" onClick={() => setQuery('')}>검색어 초기화</button>
            </div>
            <div className="pricing-type-filters">
              <button type="button" className={typeFilter === 'all' ? 'chip active' : 'chip'} onClick={() => setTypeFilter('all')}>전체</button>
              {RESORT_PRICE_TYPE_GROUPS.map((group) => (
                <button key={group.key} type="button" className={typeFilter === group.key ? 'chip active' : 'chip'} onClick={() => setTypeFilter(group.key)}>
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pricing-list-head">
            <h3>등록된 가격</h3>
            <span className="muted">{filteredPrices.length}개 · 노출 {activeCount}개</span>
          </div>

          {filteredPrices.length === 0 ? (
            <p className="resorts-empty">등록된 가격이 없어.</p>
          ) : (
            <div className="pricing-grid">
              {filteredPrices.map((item) => {
                const included = uniqueList(item.included_items || []);
                const group = RESORT_PRICE_TYPE_GROUPS.find((g) => g.types.includes(String(item.price_type || ''))) || RESORT_PRICE_TYPE_GROUPS[RESORT_PRICE_TYPE_GROUPS.length - 1];
                return (
                  <article key={item.id} className="pricing-card">
                    <div className="pricing-card-image">
                      {item.image_url ? <img src={item.image_url} alt={item.title} /> : <div className="pricing-card-image-empty">NO IMAGE</div>}
                    </div>
                    <div className="pricing-card-head">
                      <div>
                        <div className="pricing-card-title-row">
                          <h4>{item.title}</h4>
                          <span className={`badge ${item.is_active ? 'active' : 'blocked'}`}>{item.is_active ? '노출' : '숨김'}</span>
                        </div>
                        <p>{group.label} · {item.duration_text || priceTypeLabel(item.price_type)}</p>
                      </div>
                      <div className="pricing-card-price">
                        <strong>{item.currency || 'USD'} {formatMoney(item.amount)}</strong>
                        <span>{item.unit_label || '1인 기준'}</span>
                      </div>
                    </div>
                    {item.description && <p className="pricing-card-desc">{item.description}</p>}
                    <div className="pricing-tags">
                      {included.map((line) => <span key={line} className="pricing-tag">{line}</span>)}
                    </div>
                    <div className="pricing-card-meta">
                      <span>{item.price_type}</span>
                      <span>정렬 {item.sort_order || 0}</span>
                    </div>
                    <div className="pricing-card-actions">
                      <button type="button" className="sm" onClick={() => openEdit(item)}>수정</button>
                      <button type="button" className="sm danger" onClick={() => removeItem(item)}>삭제</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="modal-panel pricing-modal-panel" role="dialog" aria-modal="true" aria-label="다이빙 가격등록" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>{draft.id ? '다이빙 가격 수정' : '다이빙 가격등록'}</h3>
                <p>메뉴판처럼 이름과 가격을 먼저 넣고, 이미지와 설명은 선택적으로 추가해.</p>
              </div>
              <button type="button" className="ghost" onClick={closeModal}>닫기</button>
            </div>

            <form className="pricing-editor" onSubmit={save}>
              <div className="pricing-editor-grid">
                <label>
                  <span>이름</span>
                  <input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="1day 다이빙 패키지" />
                </label>
                <label>
                  <span>가격</span>
                  <input type="number" value={draft.amount} onChange={(e) => setDraft((prev) => ({ ...prev, amount: e.target.value }))} placeholder="150" />
                </label>
                <label>
                  <span>통화</span>
                  <select value={draft.currency} onChange={(e) => setDraft((prev) => ({ ...prev, currency: e.target.value }))}>
                    <option value="USD">USD ($)</option>
                    <option value="KRW">KRW (₩)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </label>
                <label>
                  <span>다이빙 종류</span>
                  <select value={draft.price_type} onChange={(e) => setDraft((prev) => ({ ...prev, price_type: e.target.value }))}>
                    {RESORT_PRICE_TYPES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>대표 이미지 URL</span>
                  <input value={draft.image_url} onChange={(e) => setDraft((prev) => ({ ...prev, image_url: e.target.value }))} placeholder="https://..." />
                </label>
                <label>
                  <span>단위</span>
                  <input value={draft.unit_label} onChange={(e) => setDraft((prev) => ({ ...prev, unit_label: e.target.value }))} placeholder="1인 기준" />
                </label>
                <label>
                  <span>메모</span>
                  <input value={draft.duration_text} onChange={(e) => setDraft((prev) => ({ ...prev, duration_text: e.target.value }))} placeholder="2회 보트 다이빙" />
                </label>
                <label>
                  <span>정렬</span>
                  <input type="number" value={draft.sort_order} onChange={(e) => setDraft((prev) => ({ ...prev, sort_order: e.target.value }))} placeholder="0" />
                </label>
                <label className="pricing-editor-wide">
                  <span>포함 내용</span>
                  <textarea value={draft.included_items_text} onChange={(e) => setDraft((prev) => ({ ...prev, included_items_text: e.target.value }))} placeholder={"보트 이동\n가이드 포함\n조식 포함"} />
                </label>
                <label className="pricing-editor-wide">
                  <span>상세 설명</span>
                  <textarea value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="교육 레벨, 준비물, 추가 비용 등을 적어줘." />
                </label>
              </div>

              <div className="pricing-editor-actions">
                <button type="submit" disabled={busy}>{busy ? '저장 중...' : '저장'}</button>
                <button type="button" className="ghost" onClick={closeModal}>취소</button>
              </div>
            </form>

            {message && <p className="muted">{message}</p>}
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
