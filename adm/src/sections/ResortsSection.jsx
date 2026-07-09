import { useMemo, useState } from 'react';
import {
  RESORT_AMENITIES,
  getAmenityCategoryMeta,
  getAmenityMeta,
  groupAmenitiesByCategory,
} from '../constants/resortAmenities';
import {
  DIVING_PRICE_PRESETS,
  RESORT_PRICE_TYPES,
} from '../constants/resortPricing';
import AmenityIcon from '../components/AmenityIcon';
import { getAmenityIconKind } from '../lib/amenityIconKind';

function formatNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(1) : '0.0';
}

const emptyPriceDraft = (resortId = '') => ({
  id: '',
  resort_id: resortId,
  price_type: 'dive_package',
  title: '',
  amount: '',
  currency: 'USD',
  duration_text: '',
  description: '',
  included_items_text: '',
  unit_label: '1인 기준',
  sort_order: 0,
  is_active: true,
});

function uniqueTextList(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((item) => String(item || '').trim()).filter(Boolean)));
}

function toLines(value) {
  return String(value || '')
    .split('\n')
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

export default function ResortsSection({
  resorts,
  resortQuery,
  setResortQuery,
  refreshResorts,
  updateResort,
  createResort,
  removeResort,
  saveResortPrice,
  onOpenDetail,
}) {
  const [countryFilter, setCountryFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [amenityModalOpen, setAmenityModalOpen] = useState(false);
  const [amenityQuery, setAmenityQuery] = useState('');
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceBusy, setPriceBusy] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [priceMessage, setPriceMessage] = useState('');
  const [priceDraft, setPriceDraft] = useState(emptyPriceDraft(''));
  const [draft, setDraft] = useState({
    id: '',
    username: '',
    full_name: '',
    avatar_url: '',
    resort_cover_url: '',
    resort_photo_urls: [],
    resort_amenities: [],
    website: '',
    resort_region: '',
    resort_address: '',
    resort_lat: '',
    resort_lng: '',
    resort_rating_avg: '',
    resort_review_count: '',
    bio: '',
  });

  const countryOptions = useMemo(() => {
    const values = new Set();
    for (const item of resorts || []) {
      const region = String(item?.resort_region || '').trim();
      const country = region.split(',').map((part) => part.trim()).filter(Boolean).pop() || '미지정';
      values.add(country);
    }
    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [resorts]);

  const getCountry = (value) => {
    const region = String(value || '').trim();
    return region.split(',').map((part) => part.trim()).filter(Boolean).pop() || '미지정';
  };

  const filteredResorts = useMemo(() => {
    const search = String(resortQuery || '').trim().toLowerCase();
    const country = String(countryFilter || 'all').trim();
    return (resorts || []).filter((item) => {
      const itemCountry = getCountry(item?.resort_region);
      if (country !== 'all' && itemCountry !== country) return false;
      const text = [
        item?.full_name,
        item?.username,
        item?.resort_region,
        item?.resort_address,
        item?.website,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return text.includes(search);
    });
  }, [countryFilter, resortQuery, resorts]);

  const openCreate = () => {
    setEditorMode('create');
    setEditorError('');
    setDraft({
      id: '',
      username: '',
      full_name: '',
      avatar_url: '',
      resort_cover_url: '',
      resort_photo_urls: [],
      resort_amenities: [],
      website: '',
      resort_region: '',
      resort_address: '',
      resort_lat: '',
      resort_lng: '',
      resort_rating_avg: '',
      resort_review_count: '',
      bio: '',
    });
    setEditorOpen(true);
  };

  const openEdit = (item) => {
    setEditorMode('edit');
    setEditorError('');
    setDraft({
      id: String(item?.id || ''),
      username: String(item?.username || ''),
      full_name: String(item?.full_name || ''),
      avatar_url: String(item?.avatar_url || ''),
      resort_cover_url: String(item?.resort_cover_url || ''),
      resort_photo_urls: Array.isArray(item?.resort_photo_urls) ? item.resort_photo_urls : [],
      resort_amenities: Array.isArray(item?.resort_amenities) ? item.resort_amenities : [],
      website: String(item?.website || ''),
      resort_region: String(item?.resort_region || ''),
      resort_address: String(item?.resort_address || ''),
      resort_lat: item?.resort_lat ?? '',
      resort_lng: item?.resort_lng ?? '',
      resort_rating_avg: item?.resort_rating_avg ?? '',
      resort_review_count: item?.resort_review_count ?? '',
      bio: String(item?.bio || ''),
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setAmenityModalOpen(false);
    setPriceModalOpen(false);
    setEditorError('');
    setEditorBusy(false);
    setPriceBusy(false);
  };

  const toggleAmenity = (key) => {
    setDraft((prev) => {
      const current = uniqueTextList(prev.resort_amenities);
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      return { ...prev, resort_amenities: next };
    });
  };

  const selectAllAmenities = () => {
    setDraft((prev) => ({ ...prev, resort_amenities: RESORT_AMENITIES.map((item) => item.key) }));
  };

  const clearAmenities = () => {
    setDraft((prev) => ({ ...prev, resort_amenities: [] }));
  };

  const amenityGroups = useMemo(() => {
    const query = String(amenityQuery || '').trim().toLowerCase();
    return groupAmenitiesByCategory(RESORT_AMENITIES)
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!query) return true;
          return `${item.label} ${item.key}`.toLowerCase().includes(query);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [amenityQuery]);

  const openPriceModal = () => {
    if (!draft.id) return;
    setPriceError('');
    setPriceMessage('');
    setPriceDraft(emptyPriceDraft(String(draft.id || '')));
    setPriceModalOpen(true);
  };

  const applyPricePreset = (preset) => {
    setPriceDraft((prev) => ({
      ...prev,
      ...preset,
      resort_id: String(draft.id || prev.resort_id || ''),
      id: '',
    }));
    setPriceMessage(`${preset.label} 템플릿을 불러왔어.`);
    setPriceError('');
    setPriceModalOpen(true);
  };

  const savePrice = async (event) => {
    event.preventDefault();
    const resortId = String(priceDraft.resort_id || draft.id || '').trim();
    if (!resortId) {
      setPriceError('먼저 리조트를 저장해줘.');
      return;
    }
    if (!priceDraft.title.trim()) {
      setPriceError('이름을 입력해줘.');
      return;
    }
    if (priceDraft.amount === '' || Number.isNaN(Number(priceDraft.amount))) {
      setPriceError('가격을 입력해줘.');
      return;
    }
    setPriceBusy(true);
    setPriceError('');
    setPriceMessage('');
    try {
      const payload = {
        resort_id: resortId,
        price_type: priceDraft.price_type,
        title: priceDraft.title.trim(),
        amount: Number(priceDraft.amount),
        currency: String(priceDraft.currency || 'USD').trim().toUpperCase(),
        duration_text: priceDraft.duration_text.trim(),
        description: priceDraft.description.trim(),
        included_items: toLines(priceDraft.included_items_text),
        unit_label: priceDraft.unit_label.trim(),
        sort_order: Number(priceDraft.sort_order || 0),
        is_active: !!priceDraft.is_active,
      };
      await saveResortPrice?.({
        ...payload,
        id: priceDraft.id || '',
      });
      setPriceMessage(priceDraft.id ? '가격을 수정했어.' : '가격을 등록했어.');
      setPriceDraft(emptyPriceDraft(resortId));
      setPriceModalOpen(false);
    } catch (error) {
      setPriceError(error?.message || '저장 실패');
    } finally {
      setPriceBusy(false);
    }
  };

  const saveResort = async (event) => {
    event.preventDefault();
    setEditorBusy(true);
    setEditorError('');
    try {
      const payload = {
        id: draft.id.trim(),
        username: draft.username.trim(),
        full_name: draft.full_name.trim(),
        avatar_url: draft.avatar_url.trim(),
        resort_cover_url: draft.resort_cover_url.trim(),
        website: draft.website.trim(),
        resort_region: draft.resort_region.trim(),
        resort_address: draft.resort_address.trim(),
        resort_lat: draft.resort_lat === '' ? '' : Number(draft.resort_lat),
        resort_lng: draft.resort_lng === '' ? '' : Number(draft.resort_lng),
        resort_rating_avg: draft.resort_rating_avg === '' ? '' : Number(draft.resort_rating_avg),
        resort_review_count: draft.resort_review_count === '' ? '' : Number(draft.resort_review_count),
        resort_photo_urls: uniqueTextList(draft.resort_photo_urls),
        resort_amenities: uniqueTextList(draft.resort_amenities),
        bio: draft.bio.trim(),
      };
      if (editorMode === 'edit') {
        await updateResort?.(payload.id || draft.id, payload);
      } else {
        await createResort?.(payload);
      }
      closeEditor();
    } catch (error) {
      setEditorError(error?.message || '저장 실패');
    } finally {
      setEditorBusy(false);
    }
  };

  const deleteResort = async (item) => {
    if (!window.confirm(`리조트 "${item?.full_name || item?.username || item?.id}" 을(를) 삭제할까?`)) return;
    try {
      await removeResort?.(item.id);
    } catch (error) {
      setEditorError(error?.message || '삭제 실패');
    }
  };

  return (
    <div className="card resorts-card-wrap">
      <div className="resorts-heading">
        <div>
          <h2>리조트 관리</h2>
          <p>리조트 목록을 한 줄씩 보고 바로 수정할 수 있게 정리했어.</p>
        </div>
        <div className="resorts-heading-actions">
          <div className="resorts-count">
            <span>표시</span>
            <strong>{filteredResorts.length}</strong>
          </div>
          <button type="button" className="resorts-create-btn" onClick={openCreate}>리조트 등록</button>
        </div>
      </div>

      <div className="resorts-toolbar">
        <div className="resorts-search-row">
          <input
            value={resortQuery}
            onChange={(e) => setResortQuery?.(e.target.value)}
            placeholder="리조트명, 지역, 주소로 검색"
          />
          <label className="resorts-country-field">
            <span className="sr-only">국가</span>
            <select
              aria-label="국가"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="all">국가 전체</option>
              {countryOptions.filter((item) => item !== 'all').map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => refreshResorts?.()}>검색</button>
        </div>
      </div>

      {editorOpen && (
        <form className="resort-editor" onSubmit={saveResort}>
          <div className="resort-editor-head">
            <div>
              <h3>{editorMode === 'edit' ? '리조트 수정' : '리조트 등록'}</h3>
              <p>리조트 정보를 한 번에 입력할 수 있어.</p>
            </div>
            <button type="button" className="ghost" onClick={closeEditor}>닫기</button>
          </div>

          <div className="resort-editor-grid">
            <label>
              <span>리조트명</span>
              <input value={draft.full_name} onChange={(e) => setDraft((prev) => ({ ...prev, full_name: e.target.value }))} placeholder="BlueFinBali" />
            </label>
            <label>
              <span>사용자명</span>
              <input value={draft.username} onChange={(e) => setDraft((prev) => ({ ...prev, username: e.target.value }))} placeholder="bluefinbali" />
            </label>
            <label>
              <span>지역</span>
              <input value={draft.resort_region} onChange={(e) => setDraft((prev) => ({ ...prev, resort_region: e.target.value }))} placeholder="Bali, Indonesia" />
            </label>
            <label>
              <span>주소</span>
              <input value={draft.resort_address} onChange={(e) => setDraft((prev) => ({ ...prev, resort_address: e.target.value }))} placeholder="Jl. Labuan Sait..." />
            </label>
            <label>
              <span>웹사이트</span>
              <input value={draft.website} onChange={(e) => setDraft((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://..." />
            </label>
            <label>
              <span>이미지 URL</span>
              <input value={draft.avatar_url} onChange={(e) => setDraft((prev) => ({ ...prev, avatar_url: e.target.value }))} placeholder="https://..." />
            </label>
            <label>
              <span>대표 사진 URL</span>
              <input value={draft.resort_cover_url} onChange={(e) => setDraft((prev) => ({ ...prev, resort_cover_url: e.target.value }))} placeholder="https://..." />
            </label>
            <label>
              <span>위도</span>
              <input value={draft.resort_lat} onChange={(e) => setDraft((prev) => ({ ...prev, resort_lat: e.target.value }))} placeholder="33.4996" />
            </label>
            <label>
              <span>경도</span>
              <input value={draft.resort_lng} onChange={(e) => setDraft((prev) => ({ ...prev, resort_lng: e.target.value }))} placeholder="126.5312" />
            </label>
            <label>
              <span>평점</span>
              <input value={draft.resort_rating_avg} onChange={(e) => setDraft((prev) => ({ ...prev, resort_rating_avg: e.target.value }))} placeholder="4.8" />
            </label>
            <label>
              <span>리뷰 수</span>
              <input value={draft.resort_review_count} onChange={(e) => setDraft((prev) => ({ ...prev, resort_review_count: e.target.value }))} placeholder="120" />
            </label>
            <label className="resort-editor-bio">
              <span>메모</span>
              <textarea value={draft.bio} onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))} placeholder="설명 메모" />
            </label>
          </div>

          <div className="resort-editor-actions">
            <button type="submit" disabled={editorBusy}>{editorBusy ? '저장 중...' : '저장'}</button>
            <button type="button" className="ghost" onClick={closeEditor}>취소</button>
            <button type="button" className="ghost" onClick={() => setAmenityModalOpen(true)}>편의시설 등록</button>
            <button type="button" className="ghost" onClick={openPriceModal} disabled={!draft.id}>다이빙 가격 등록</button>
          </div>

          {editorError && <p className="error">{editorError}</p>}
        </form>
      )}

      {editorOpen && amenityModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setAmenityModalOpen(false)}>
          <div className="modal-panel modal-amenity-panel" role="dialog" aria-modal="true" aria-label="편의시설 등록" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>편의시설 등록</h3>
                <p>다양한 서비스 목록을 체크해서 저장할 수 있어.</p>
              </div>
              <button type="button" className="ghost" onClick={() => setAmenityModalOpen(false)}>닫기</button>
            </div>

            <div className="modal-actions-row">
              <span className="muted">{draft.resort_amenities.length}개 선택됨</span>
              <div className="modal-actions-inline">
                <button type="button" className="ghost" onClick={selectAllAmenities}>전체 선택</button>
                <button type="button" className="ghost" onClick={clearAmenities}>전체 해제</button>
              </div>
            </div>

            <div className="resort-facilities-search">
              <input
                value={amenityQuery}
                onChange={(e) => setAmenityQuery(e.target.value)}
                placeholder="편의시설 검색"
              />
            </div>

            <div className="amenity-categories amenity-categories--modal">
              {amenityGroups.map((group) => {
                const categoryMeta = getAmenityCategoryMeta(group.key);
                return (
                  <section key={group.key} className="amenity-category">
                    <div className="amenity-category-head">
                      <h4>{group.label}</h4>
                      <span>{group.items.length}개</span>
                    </div>
                    <div className="amenity-grid amenity-grid--modal">
                      {group.items.map((item) => {
                        const amenityMeta = getAmenityMeta(item.key);
                        return (
                          <label
                            key={item.key}
                            className={`amenity-chip ${draft.resort_amenities.includes(item.key) ? 'active' : ''}`}
                            style={{ '--amenity-accent': categoryMeta.color }}
                          >
                            <input
                              type="checkbox"
                              checked={draft.resort_amenities.includes(item.key)}
                              onChange={() => toggleAmenity(item.key)}
                            />
                            <span className="amenity-chip-content">
                              <span className="amenity-chip-icon"><AmenityIcon kind={getAmenityIconKind(item.key)} /></span>
                              <span>{amenityMeta?.label || item.label}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setAmenityModalOpen(false)}>완료</button>
            </div>
          </div>
        </div>
      )}

      {editorOpen && priceModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPriceModalOpen(false)}>
          <div className="modal-panel modal-price-panel" role="dialog" aria-modal="true" aria-label="다이빙 가격 등록" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>다이빙 가격 등록</h3>
                <p>메뉴판처럼 이름과 가격을 바로 넣을 수 있어.</p>
              </div>
              <button type="button" className="ghost" onClick={() => setPriceModalOpen(false)}>닫기</button>
            </div>

            <div className="pricing-hero pricing-hero--embedded">
              <div className="pricing-hero-copy">
                <strong>빠른 템플릿</strong>
                <p>자주 쓰는 가격 형태를 눌러서 빠르게 시작해.</p>
              </div>
              <div className="pricing-template-row">
                {DIVING_PRICE_PRESETS.map((preset) => (
                  <button key={preset.key} type="button" className="ghost pricing-template-btn" onClick={() => applyPricePreset(preset)}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form className="pricing-editor pricing-editor--embedded" onSubmit={savePrice}>
              <div className="pricing-grid">
                <label>
                  <span>가격 종류</span>
                  <select value={priceDraft.price_type} onChange={(e) => setPriceDraft((prev) => ({ ...prev, price_type: e.target.value }))}>
                    {RESORT_PRICE_TYPES.map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>이름</span>
                  <input value={priceDraft.title} onChange={(e) => setPriceDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="1day 다이빙 패키지" />
                </label>
                <label>
                  <span>가격</span>
                  <input type="number" value={priceDraft.amount} onChange={(e) => setPriceDraft((prev) => ({ ...prev, amount: e.target.value }))} placeholder="150" />
                </label>
                <label>
                  <span>통화</span>
                  <input value={priceDraft.currency} onChange={(e) => setPriceDraft((prev) => ({ ...prev, currency: e.target.value }))} placeholder="USD" />
                </label>
                <label>
                  <span>기준</span>
                  <input value={priceDraft.unit_label} onChange={(e) => setPriceDraft((prev) => ({ ...prev, unit_label: e.target.value }))} placeholder="1인 기준" />
                </label>
                <label>
                  <span>소요/기간</span>
                  <input value={priceDraft.duration_text} onChange={(e) => setPriceDraft((prev) => ({ ...prev, duration_text: e.target.value }))} placeholder="2회 보트 다이빙" />
                </label>
                <label className="pricing-grid-wide">
                  <span>포함 항목</span>
                  <textarea value={priceDraft.included_items_text} onChange={(e) => setPriceDraft((prev) => ({ ...prev, included_items_text: e.target.value }))} placeholder="보트 이동\n가이드 포함\n조식 포함" />
                </label>
                <label className="pricing-grid-wide">
                  <span>설명</span>
                  <textarea value={priceDraft.description} onChange={(e) => setPriceDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="추가 안내를 적어줘." />
                </label>
                <label>
                  <span>정렬</span>
                  <input type="number" value={priceDraft.sort_order} onChange={(e) => setPriceDraft((prev) => ({ ...prev, sort_order: e.target.value }))} />
                </label>
                <label className="pricing-toggle">
                  <input type="checkbox" checked={priceDraft.is_active} onChange={(e) => setPriceDraft((prev) => ({ ...prev, is_active: e.target.checked }))} />
                  <span>노출</span>
                </label>
              </div>

              <div className="modal-footer modal-footer--start">
                <button type="submit" disabled={priceBusy}>{priceBusy ? '저장 중...' : '가격 저장'}</button>
                <button type="button" className="ghost" onClick={() => setPriceModalOpen(false)}>취소</button>
              </div>

              {priceMessage && <p className="muted">{priceMessage}</p>}
              {priceError && <p className="error">{priceError}</p>}
            </form>
          </div>
        </div>
      )}

      {filteredResorts.length === 0 ? (
        <p className="resorts-empty">리조트 데이터가 없습니다.</p>
      ) : (
        <div className="resorts-grid">
          {filteredResorts.map((r) => {
            const thumb = r.resort_cover_url || r.resort_photo_urls?.[0] || r.avatar_url || '';
            const amenities = Array.isArray(r.resort_amenities) ? r.resort_amenities : [];
            const photoCount = Array.isArray(r.resort_photo_urls) ? r.resort_photo_urls.length : 0;
            return (
              <article key={r.id} className="resort-card">
                <div className="resort-card-media">
                  <div className="resort-card-hero-image">
                    {thumb ? <img src={thumb} alt={r.full_name || r.username || 'resort'} /> : <div className="resort-card-empty">NO IMAGE</div>}
                  </div>
                  <div className="resort-card-overlay">
                    <div className="resort-card-overlay-inner">
                      <div className="resort-card-overlay-top">
                        <div>
                          <h3>{r.full_name || r.username || '미지정 리조트'}</h3>
                          <p>@{r.username || '-'}</p>
                        </div>
                        <span className={`badge ${r.resort_region ? 'active' : 'blocked'}`}>{r.resort_region || '미설정'}</span>
                      </div>

                      <div className="resort-card-overlay-meta">
                        <span>평점 <strong>{formatNumber(r.resort_rating_avg)}</strong></span>
                        <span>리뷰 <strong>{Number(r.resort_review_count || 0)}</strong></span>
                        <span>사진 <strong>{photoCount}</strong></span>
                      </div>

                      <div className="resort-card-overlay-text">
                        <div>
                          <span>주소</span>
                          <p>{r.resort_address || '-'}</p>
                        </div>
                        <div>
                          <span>웹사이트</span>
                          {r.website ? (
                            <a className="resort-link" href={r.website} target="_blank" rel="noreferrer">
                              {r.website.replace(/^https?:\/\//, '')}
                            </a>
                          ) : (
                            <p className="muted">-</p>
                          )}
                        </div>
                      </div>

                      <div className="resort-card-overlay-amenities">
                        {amenities.length ? amenities.slice(0, 4).map((amenity) => {
                          const amenityMeta = getAmenityMeta(amenity);
                          const categoryMeta = getAmenityCategoryMeta(amenityMeta?.category || 'other');
                          return (
                            <span key={amenity} className="amenity-pill" style={{ '--amenity-accent': categoryMeta.color }}>
                              <span className="amenity-pill-icon"><AmenityIcon kind={getAmenityIconKind(amenity)} /></span>
                              <span>{amenityMeta?.label || amenity}</span>
                            </span>
                          );
                        }) : <span className="muted">편의시설 미설정</span>}
                      </div>

                      <div className="resort-card-actions resort-card-actions--overlay">
                        <button type="button" className="sm ghost" onClick={() => onOpenDetail?.(r.id)}>상세보기</button>
                        <button type="button" className="sm" onClick={() => openEdit(r)}>수정</button>
                        <button type="button" className="sm danger" onClick={() => deleteResort(r)}>삭제</button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
