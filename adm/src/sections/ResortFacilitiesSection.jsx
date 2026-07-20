import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import {
  RESORT_AMENITIES as AMENITIES,
  getAmenityCategoryMeta,
  getAmenityMeta,
  groupAmenitiesByCategory,
} from '../constants/resortAmenities';
import AmenityIcon from '../components/AmenityIcon';
import { getAmenityIconKind } from '../lib/amenityIconKind';

function uniqueTextList(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((item) => String(item || '').trim()).filter(Boolean)));
}

function isChecked(values, key) {
  return uniqueTextList(values).includes(key);
}

export default function ResortFacilitiesSection({ resorts = [], updateResort, refreshResorts }) {
  const [selectedId, setSelectedId] = useState('');
  const [amenityQuery, setAmenityQuery] = useState('');
  const [draft, setDraft] = useState({
    resort_cover_url: '',
    resort_photo_urls: [],
    resort_amenities: [],
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  const selectedResort = useMemo(() => {
    const list = Array.isArray(resorts) ? resorts : [];
    return list.find((item) => String(item?.id || '') === String(selectedId || '')) || list[0] || null;
  }, [resorts, selectedId]);

  useEffect(() => {
    if (!selectedResort && resorts.length) {
      setSelectedId(String(resorts[0].id || ''));
    }
  }, [resorts, selectedResort]);

  useEffect(() => {
    if (!selectedResort) return;
    setDraft({
      resort_cover_url: String(selectedResort.resort_cover_url || ''),
      resort_photo_urls: uniqueTextList(selectedResort.resort_photo_urls || []),
      resort_amenities: uniqueTextList(selectedResort.resort_amenities || []),
    });
    setPhotoUrlInput('');
    setMessage('');
    setError('');
  }, [selectedResort?.id]);

  const save = async () => {
    if (!selectedResort) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await updateResort?.(selectedResort.id, {
        resort_cover_url: draft.resort_cover_url.trim(),
        resort_photo_urls: uniqueTextList(draft.resort_photo_urls),
        resort_amenities: uniqueTextList(draft.resort_amenities),
      });
      setMessage('저장했어.');
    } catch (e) {
      setError(e.message || '저장 실패');
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (!selectedResort || !file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api('/api/uploads', { method: 'POST', body: formData });
      const url = String(result?.data?.url || '').trim();
      if (!url) throw new Error('upload_failed');
      setDraft((prev) => ({
        ...prev,
        resort_photo_urls: uniqueTextList([...prev.resort_photo_urls, url]),
        resort_cover_url: prev.resort_cover_url || url,
      }));
      setMessage('사진을 업로드했어. 저장을 눌러 반영해줘.');
    } catch (e) {
      setError(e.message || '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const addPhotoUrl = () => {
    const url = photoUrlInput.trim();
    if (!url) return;
    setDraft((prev) => ({
      ...prev,
      resort_photo_urls: uniqueTextList([...prev.resort_photo_urls, url]),
      resort_cover_url: prev.resort_cover_url || url,
    }));
    setPhotoUrlInput('');
  };

  const removePhoto = (url) => {
    setDraft((prev) => {
      const next = uniqueTextList(prev.resort_photo_urls.filter((item) => item !== url));
      const nextCover = prev.resort_cover_url === url ? next[0] || '' : prev.resort_cover_url;
      return { ...prev, resort_photo_urls: next, resort_cover_url: nextCover };
    });
  };

  const toggleAmenity = (key) => {
    setDraft((prev) => {
      const current = uniqueTextList(prev.resort_amenities);
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      return { ...prev, resort_amenities: next };
    });
  };

  const amenityGroups = useMemo(() => {
    const query = String(amenityQuery || '').trim().toLowerCase();
    const groups = groupAmenitiesByCategory(AMENITIES).map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!query) return true;
        const text = `${item.label} ${item.key}`.toLowerCase();
        return text.includes(query);
      }),
    })).filter((group) => group.items.length > 0);
    return groups;
  }, [amenityQuery]);

  return (
    <div className="card resort-facilities-card">
      <div className="resort-facilities-heading">
        <div>
          <h2>리조트 사진 / 편의시설</h2>
          <p>리조트별 대표 사진과 편의시설을 따로 관리할 수 있어.</p>
        </div>
        <div className="resort-facilities-select">
          <span className="sr-only">리조트 선택</span>
          <select value={selectedId || selectedResort?.id || ''} onChange={(e) => setSelectedId(e.target.value)}>
            {(resorts || []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name || item.username} · {String(item.resort_region || '미지정')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedResort ? (
        <p className="resorts-empty">선택할 리조트가 없어.</p>
      ) : (
        <div className="resort-facilities-layout">
          <section className="resort-facilities-panel">
            <div className="resort-facilities-panel-head">
              <h3>사진</h3>
              <span className="muted">현재 {draft.resort_photo_urls.length}장</span>
            </div>

            <div className="resort-cover-preview">
              {draft.resort_cover_url ? <img src={draft.resort_cover_url} alt="대표 사진" /> : <div className="empty">대표 사진 없음</div>}
            </div>

            <div className="resort-photo-upload-row">
              <label className="file-button">
                {uploading ? '업로드 중...' : '파일 업로드'}
                <input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
              </label>
              <input
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
                placeholder="사진 URL 붙여넣기"
              />
              <button type="button" onClick={addPhotoUrl}>추가</button>
            </div>

            <div className="resort-photo-grid">
              {draft.resort_photo_urls.length === 0 ? (
                <p className="resorts-empty">등록된 사진이 없어.</p>
              ) : draft.resort_photo_urls.map((url) => (
                <div className="resort-photo-item" key={url}>
                  <img src={url} alt="리조트 사진" />
                  <button type="button" className="photo-remove" onClick={() => removePhoto(url)}>삭제</button>
                  {draft.resort_cover_url === url && <span className="photo-badge">대표</span>}
                </div>
              ))}
            </div>

            <label className="resort-cover-field">
              <span>대표 사진 URL</span>
              <input
                value={draft.resort_cover_url}
                onChange={(e) => setDraft((prev) => ({ ...prev, resort_cover_url: e.target.value }))}
                placeholder="대표 사진을 직접 지정할 수 있어"
              />
            </label>
          </section>

          <section className="resort-facilities-panel">
            <div className="resort-facilities-panel-head">
              <h3>편의시설</h3>
              <span className="muted">{draft.resort_amenities.length}개 선택됨</span>
            </div>

            <div className="resort-facilities-search">
              <input
                value={amenityQuery}
                onChange={(e) => setAmenityQuery(e.target.value)}
                placeholder="편의시설 검색"
              />
            </div>

            <div className="amenity-categories">
              {amenityGroups.map((group) => {
                const categoryMeta = getAmenityCategoryMeta(group.key);
                return (
                  <section key={group.key} className="amenity-category">
                    <div className="amenity-category-head">
                      <h4>{group.label}</h4>
                      <span>{group.items.length}개</span>
                    </div>
                    <div className="amenity-grid">
                      {group.items.map((item) => {
                        const amenityMeta = getAmenityMeta(item.key);
                        const accent = categoryMeta.color;
                        return (
                          <label
                            key={item.key}
                            className={`amenity-chip ${isChecked(draft.resort_amenities, item.key) ? 'active' : ''}`}
                            style={{ '--amenity-accent': accent }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked(draft.resort_amenities, item.key)}
                              onChange={() => toggleAmenity(item.key)}
                            />
                            <span className="amenity-chip-content">
                              <span className="amenity-chip-icon">
                                <AmenityIcon kind={getAmenityIconKind(item.key)} />
                              </span>
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
          </section>
        </div>
      )}

      <div className="resort-facilities-actions">
        <button type="button" onClick={save} disabled={!selectedResort || busy}>
          {busy ? '저장 중...' : '저장'}
        </button>
      </div>

      {message && <p className="muted">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
