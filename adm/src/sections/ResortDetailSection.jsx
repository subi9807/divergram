import { useMemo } from 'react';
import {
  getAmenityCategoryMeta,
  getAmenityMeta,
} from '../constants/resortAmenities';
import { RESORT_PRICE_TYPES } from '../constants/resortPricing';
import AmenityIcon from '../components/AmenityIcon';
import { getAmenityIconKind } from '../lib/amenityIconKind';

function formatNumber(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '-';
  try {
    return new Intl.NumberFormat('ko-KR').format(n);
  } catch {
    return String(Math.round(n));
  }
}

function getPriceTypeLabel(value) {
  return RESORT_PRICE_TYPES.find((item) => item.key === value)?.label || value || '기타';
}

function toList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split('\n').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export default function ResortDetailSection({
  resorts = [],
  resortPrices = [],
  selectedResortId = '',
  onBack,
  onOpenFacilities,
}) {
  const resort = useMemo(() => {
    const list = Array.isArray(resorts) ? resorts : [];
    const selectedId = String(selectedResortId || '');
    const picked = list.find((item) => String(item?.id || '') === selectedId) || null;
    if (selectedId) return picked;
    return picked || list[0] || null;
  }, [resorts, selectedResortId]);

  const prices = useMemo(() => {
    const id = String(resort?.id || selectedResortId || '');
    return (Array.isArray(resortPrices) ? resortPrices : [])
      .filter((item) => String(item?.resort_id || '') === id)
      .sort((a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0));
  }, [resort?.id, resortPrices, selectedResortId]);

  const amenities = toList(resort?.resort_amenities);
  const photos = toList(resort?.resort_photo_urls);
  const cover = resort?.resort_cover_url || photos[0] || resort?.avatar_url || '';

  if (!resort) {
    return (
      <div className="card resort-detail-card">
        <div className="resort-detail-empty">
          <h2>리조트를 찾지 못했어.</h2>
          <p>상세페이지를 볼 리조트를 먼저 선택해줘.</p>
          <button type="button" onClick={() => onBack?.()}>리조트 목록으로</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card resort-detail-card">
      <div className="resort-detail-topbar">
        <button type="button" className="ghost" onClick={() => onBack?.()}>← 목록으로</button>
        <div className="resort-detail-topbar-actions">
          <button type="button" className="ghost" onClick={() => onOpenFacilities?.()}>편의시설 수정</button>
        </div>
      </div>

      <div className="resort-detail-hero">
        <div className="resort-detail-cover">
          {cover ? <img src={cover} alt={resort.full_name || resort.username || 'resort'} /> : <div className="empty">대표 사진 없음</div>}
        </div>
        <div className="resort-detail-summary">
          <div className="resort-detail-title-row">
            <div>
              <h2>{resort.full_name || resort.username || '미지정 리조트'}</h2>
              <p>@{resort.username || '-'}</p>
            </div>
            <span className={`badge ${resort.resort_region ? 'active' : 'blocked'}`}>{resort.resort_region || '미설정'}</span>
          </div>

          <div className="resort-detail-stats">
            <div>
              <span>평점</span>
              <strong>{Number.isFinite(Number(resort.resort_rating_avg)) ? Number(resort.resort_rating_avg).toFixed(1) : '-'}</strong>
            </div>
            <div>
              <span>리뷰</span>
              <strong>{formatNumber(resort.resort_review_count)}</strong>
            </div>
            <div>
              <span>사진</span>
              <strong>{photos.length}</strong>
            </div>
            <div>
              <span>가격</span>
              <strong>{prices.length}</strong>
            </div>
          </div>

          <div className="resort-detail-meta">
            <div>
              <span>주소</span>
              <p>{resort.resort_address || '-'}</p>
            </div>
            <div>
              <span>웹사이트</span>
              {resort.website ? (
                <a href={resort.website} target="_blank" rel="noreferrer">
                  {resort.website.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <span>리조트 ID</span>
              <p>{resort.id}</p>
            </div>
          </div>

          <div className="resort-detail-actions">
            <button type="button" className="ghost" onClick={() => onOpenFacilities?.()}>편의시설 등록하러 가기</button>
          </div>
        </div>
      </div>

      <div className="resort-detail-grid">
        <section className="resort-detail-panel">
          <div className="resort-detail-panel-head">
            <h3>편의시설</h3>
            <span>{amenities.length}개</span>
          </div>
          <div className="resort-detail-tags">
            {amenities.length ? amenities.map((amenity) => {
              const amenityMeta = getAmenityMeta(amenity);
              const categoryMeta = getAmenityCategoryMeta(amenityMeta?.category || 'other');
              return (
                <span key={amenity} className="amenity-pill" style={{ '--amenity-accent': categoryMeta.color }}>
                  <span className="amenity-pill-icon"><AmenityIcon kind={getAmenityIconKind(amenity)} /></span>
                  <span>{amenityMeta?.label || amenity}</span>
                </span>
              );
            }) : <p className="muted">편의시설이 아직 없어.</p>}
          </div>
        </section>

        <section className="resort-detail-panel">
          <div className="resort-detail-panel-head">
            <h3>사진</h3>
            <span>{photos.length}장</span>
          </div>
          <div className="resort-detail-gallery">
            {photos.length ? photos.map((photo, index) => (
              <div key={`${photo}-${index}`} className="resort-detail-photo">
                <img src={photo} alt={`${resort.full_name || resort.username || 'resort'} ${index + 1}`} />
              </div>
            )) : (
              <div className="resort-detail-empty-inline">등록된 사진이 없어.</div>
            )}
          </div>
        </section>

        <section className="resort-detail-panel resort-detail-panel--wide">
          <div className="resort-detail-panel-head">
            <h3>다이빙 가격</h3>
            <span>{prices.length}개</span>
          </div>
          {prices.length ? (
            <div className="resort-detail-price-list">
              {prices.map((item) => (
                <article key={item.id} className="resort-detail-price-item">
                  <div className="resort-detail-price-main">
                    <div>
                      <strong>{item.title}</strong>
                      <p>{getPriceTypeLabel(item.price_type)} · {item.unit_label || '-'}</p>
                    </div>
                    <div className="resort-detail-price-value">
                      <strong>{item.currency || 'USD'} {formatNumber(item.amount)}</strong>
                      <span>{item.is_active ? '노출중' : '숨김'}</span>
                    </div>
                  </div>
                  {(item.duration_text || item.description || toList(item.included_items).length > 0) && (
                    <div className="resort-detail-price-extra">
                      {item.duration_text && <p>{item.duration_text}</p>}
                      {item.description && <p>{item.description}</p>}
                      {toList(item.included_items).length > 0 && <p>{toList(item.included_items).join(' · ')}</p>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="resort-detail-empty-inline">
              아직 등록된 가격이 없어. 리조트 수정에서 <strong>다이빙 가격 등록</strong> 버튼을 눌러 추가해줘.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
