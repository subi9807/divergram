import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { loadGoogleMaps } from '../lib/maps';
import Pagination from '../components/Pagination';
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
import Button from '../components/Button';
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

const CERTIFICATION_PRESETS = ['PADI 5 Star Dive Resort', 'PADI 5 Star IDC', 'SSI Diamond Center', 'SSI Instructor Training Center', 'NAUI Dream Resort', 'SDI/TDI Training Facility'];
const DIVING_COUNTRIES = [['Australia','AU'],['Bahamas','BS'],['Belize','BZ'],['Brazil','BR'],['Chile','CL'],['China','CN'],['Croatia','HR'],['Ecuador','EC'],['Egypt','EG'],['Fiji','FJ'],['France','FR'],['Greece','GR'],['Guam','GU'],['India','IN'],['Indonesia','ID'],['Italy','IT'],['Japan','JP'],['Malaysia','MY'],['Maldives','MV'],['Malta','MT'],['Mexico','MX'],['Micronesia','FM'],['New Zealand','NZ'],['Palau','PW'],['Philippines','PH'],['Portugal','PT'],['Singapore','SG'],['South Africa','ZA'],['South Korea','KR'],['Spain','ES'],['Sri Lanka','LK'],['Taiwan','TW'],['Thailand','TH'],['Turkey','TR'],['United Arab Emirates','AE'],['United Kingdom','GB'],['United States','US'],['Vietnam','VN']];

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
  users = [],
  resorts,
  resortQuery,
  setResortQuery,
  refreshResorts,
  updateResort,
  createResort,
  removeResort,
  saveResortPrice,
  resortPrices = [],
}) {
  const [countryFilter, setCountryFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorTab, setEditorTab] = useState('basic');
  const [imageUploadBusy, setImageUploadBusy] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState('');
  const [editorError, setEditorError] = useState('');
  const [amenityModalOpen, setAmenityModalOpen] = useState(false);
  const [amenityQuery, setAmenityQuery] = useState('');
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceBusy, setPriceBusy] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [priceMessage, setPriceMessage] = useState('');
  const [priceDraft, setPriceDraft] = useState(emptyPriceDraft(''));
  const [importRows, setImportRows] = useState([]);
  const [importTotal, setImportTotal] = useState(0);
  const [importFacets, setImportFacets] = useState({ sources: [], countries: [] });
  const [importPage, setImportPage] = useState(1);
  const [importPageSize, setImportPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [photoFilter, setPhotoFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [amenityFilter, setAmenityFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('0');
  const [importError, setImportError] = useState('');
  const [importBusy, setImportBusy] = useState('');
  const [selectedImportIds, setSelectedImportIds] = useState(() => new Set());
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedImport, setSelectedImport] = useState(null);
  const [detailTab, setDetailTab] = useState('intro');
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [resortManagers, setResortManagers] = useState([]);
  const [managerUserId, setManagerUserId] = useState('');
  const [managerBusy, setManagerBusy] = useState(false);
  const [managerError, setManagerError] = useState('');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [externalImageOpen, setExternalImageOpen] = useState(false);
  const mapPickerRef = useRef(null);
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
    import_id: '',
    country: '',
    country_code: '',
    city: '',
    phones_text: '',
    emails_text: '',
    certifications_text: '',
    source_url: '',
    instagram_url: '',
    facebook_url: '',
    youtube_url: '',
    tiktok_url: '',
    image_rights_status: 'owner_provided',
    resort_booking_enabled: false,
    resort_booking_deposit_amount: 50,
    resort_booking_deposit_currency: 'USD',
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

  const editorCountries = useMemo(() => {
    const values = new Map(DIVING_COUNTRIES);
    for (const item of importRows) {
      const name = String(item.country || '').trim();
      if (name) values.set(name, String(item.country_code || '').trim().toUpperCase());
    }
    if (draft.country) values.set(draft.country, draft.country_code);
    return Array.from(values, ([name, code]) => ({ name, code })).sort((a, b) => a.name.localeCompare(b.name));
  }, [draft.country, draft.country_code, importRows]);

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
    setEditorTab('basic');
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
      import_id: '', country: '', country_code: '', city: '', phones_text: '', emails_text: '', certifications_text: '', source_url: '', instagram_url: '', facebook_url: '', youtube_url: '', tiktok_url: '', image_rights_status: 'owner_provided', resort_booking_enabled: false, resort_booking_deposit_amount: 50, resort_booking_deposit_currency: 'USD',
    });
    setEditorOpen(true);
  };

  const openEdit = (item) => {
    setEditorTab('basic');
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
      import_id: '',
      country: String(item?.resort_country || ''),
      country_code: String(item?.resort_country_code || ''),
      city: String(item?.resort_city || ''),
      phones_text: (item?.resort_phones || []).join('\n'),
      emails_text: (item?.resort_emails || []).join('\n'),
      certifications_text: (item?.resort_certifications || []).join('\n'),
      source_url: String(item?.resort_source_url || ''),
      instagram_url: String(item?.resort_instagram_url || ''),
      facebook_url: String(item?.resort_facebook_url || ''),
      youtube_url: String(item?.resort_youtube_url || ''),
      tiktok_url: String(item?.resort_tiktok_url || ''),
      image_rights_status: 'owner_provided',
      resort_booking_enabled: item?.resort_booking_enabled === true,
      resort_booking_deposit_amount: Number(item?.resort_booking_deposit_amount || 0),
      resort_booking_deposit_currency: String(item?.resort_booking_deposit_currency || 'USD'),
    });
    setEditorOpen(true);
  };

  const openUnifiedEdit = (item) => {
    setEditorTab('basic');
    const operating = (resorts || []).find((resort) => String(resort.id) === String(item.approved_resort_id));
    if (operating) {
      openEdit(operating);
      return;
    }
    setEditorMode('import');
    setEditorError('');
    setDraft({
      id: '', username: '', full_name: String(item.name || ''), avatar_url: '', resort_cover_url: String(item.source_image_urls?.[0] || ''),
      resort_photo_urls: item.source_image_urls || [], resort_amenities: [], website: String(item.source_url || ''),
      resort_region: String(item.region || ''), resort_address: String(item.address || ''), resort_lat: item.latitude ?? '', resort_lng: item.longitude ?? '',
      resort_rating_avg: '', resort_review_count: '', bio: '', import_id: String(item.id), country: String(item.country || ''),
      country_code: String(item.country_code || ''), city: String(item.city || ''), phones_text: (item.phones || []).join('\n'),
      emails_text: (item.emails || []).join('\n'), certifications_text: (item.certifications || []).join('\n'), source_url: String(item.source_url || ''),
      instagram_url: String(item.instagram_url || ''), facebook_url: String(item.facebook_url || ''), youtube_url: String(item.youtube_url || ''), tiktok_url: String(item.tiktok_url || ''),
      image_rights_status: String(item.image_rights_status || 'unverified'),
      resort_booking_enabled: false,
      resort_booking_deposit_amount: 0,
      resort_booking_deposit_currency: 'USD',
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

  const uploadResortImages = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => String(file.type || '').startsWith('image/'));
    event.target.value = '';
    if (!files.length) return;
    if (files.length > 20) {
      setEditorError('이미지는 한 번에 최대 20장까지 업로드할 수 있습니다.');
      return;
    }
    setImageUploadBusy(true);
    setEditorError('');
    try {
      setImageUploadProgress(`${files.length}장`);
      const form = new FormData();
      files.forEach((file) => form.append('files',file));
      const result = await api('/api/admin/resort-images', { method: 'POST', body: form });
      const uploaded = (result?.images || []).map((item) => String(item?.url || '').trim()).filter(Boolean);
      setDraft((current) => {
        const photos = uniqueTextList([...(current.resort_photo_urls || []), ...uploaded]);
        return {
          ...current,
          resort_photo_urls: photos,
          resort_cover_url: current.resort_cover_url || photos[0] || '',
          avatar_url: current.avatar_url || photos[0] || '',
          image_rights_status: 'owner_provided',
        };
      });
    } catch (error) {
      setEditorError(error?.message || '이미지 업로드 실패');
    } finally {
      setImageUploadBusy(false);
      setImageUploadProgress('');
    }
  };

  const removeDraftImage = (url) => {
    setDraft((current) => {
      const photos = (current.resort_photo_urls || []).filter((item) => item !== url);
      return {
        ...current,
        resort_photo_urls: photos,
        resort_cover_url: current.resort_cover_url === url ? (photos[0] || '') : current.resort_cover_url,
        avatar_url: current.avatar_url === url ? (photos[0] || '') : current.avatar_url,
      };
    });
  };

  const moveDraftImage = (index, direction) => {
    setDraft((current) => {
      const photos = [...(current.resort_photo_urls || [])];
      const target = index + direction;
      if (target < 0 || target >= photos.length) return current;
      [photos[index], photos[target]] = [photos[target], photos[index]];
      return { ...current, resort_photo_urls: photos };
    });
  };

  const setDraftCover = (url) => setDraft((current) => ({ ...current, resort_cover_url: url, avatar_url: current.avatar_url || url }));

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
    setEditorTab('prices');
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
    setEditorTab('prices');
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
    event?.preventDefault?.();
    setEditorBusy(true);
    setEditorError('');
    try {
      const payload = {
        id: draft.id.trim(),
        username: draft.username.trim() || draft.full_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `resort_${Date.now()}`,
        full_name: draft.full_name.trim(),
        avatar_url: draft.avatar_url.trim(),
        resort_cover_url: draft.resort_cover_url.trim(),
        website: draft.website.trim(),
        resort_region: draft.resort_region.trim(),
        resort_address: draft.resort_address.trim(),
        resort_lat: draft.resort_lat === '' ? '' : Number(draft.resort_lat),
        resort_lng: draft.resort_lng === '' ? '' : Number(draft.resort_lng),
        resort_photo_urls: uniqueTextList(draft.resort_photo_urls),
        resort_amenities: uniqueTextList(draft.resort_amenities),
        bio: draft.bio.trim(),
        resort_country: draft.country.trim(),
        resort_country_code: draft.country_code.trim(),
        resort_city: draft.city.trim(),
        resort_phones: toLines(draft.phones_text),
        resort_emails: toLines(draft.emails_text),
        resort_certifications: toLines(draft.certifications_text),
        resort_source_url: draft.source_url.trim(),
        resort_instagram_url: draft.instagram_url.trim(),
        resort_facebook_url: draft.facebook_url.trim(),
        resort_youtube_url: draft.youtube_url.trim(),
        resort_tiktok_url: draft.tiktok_url.trim(),
        resort_booking_enabled: draft.resort_booking_enabled === true,
        resort_booking_deposit_amount: Math.max(0, Number(draft.resort_booking_deposit_amount || 0)),
        resort_booking_deposit_currency: 'USD',
      };
      if (editorMode === 'import') {
        await api(`/api/admin/resort-imports/${draft.import_id}`, { method: 'PATCH', body: {
          name: payload.full_name, address: payload.resort_address, region: payload.resort_region, country: payload.resort_country,
          country_code: payload.resort_country_code, city: payload.resort_city, latitude: payload.resort_lat, longitude: payload.resort_lng,
          phones: payload.resort_phones, emails: payload.resort_emails, certifications: payload.resort_certifications,
          source_url: payload.resort_source_url || payload.website, source_image_urls: payload.resort_photo_urls,
          website_url: payload.website, instagram_url: payload.resort_instagram_url, facebook_url: payload.resort_facebook_url,
          youtube_url: payload.resort_youtube_url, tiktok_url: payload.resort_tiktok_url,
          image_rights_status: draft.image_rights_status,
        } });
        await loadImports();
      } else if (editorMode === 'edit') {
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

  const deleteUnifiedResort = async (item) => {
    if (!window.confirm(`리조트 "${item?.name || item?.id}" 및 연결된 운영 정보를 삭제할까요?`)) return;
    try {
      setImportBusy(`${item.id}:delete`);
      await api(`/api/admin/resort-imports/${item.id}`, { method: 'DELETE' });
      setSelectedImport(null);
      await loadImports();
      await refreshResorts?.();
    } catch (error) {
      setImportError(error?.message || '리조트 삭제 실패');
    } finally {
      setImportBusy('');
    }
  };

  const loadImports = async () => {
    try {
      setImportError('');
      const params = new URLSearchParams({
        status: statusFilter, page: String(importPage), limit: String(importPageSize), q: String(resortQuery || ''),
        country: countryFilter, source: sourceFilter, photo: photoFilter, price: priceFilter,
        amenities: amenityFilter, min_rating: ratingFilter,
      });
      const result = await api(`/api/admin/resort-imports?${params.toString()}`);
      setImportRows(result.items || []);
      setImportTotal(Number(result.total || 0));
      setImportFacets(result.facets || { sources: [], countries: [] });
    } catch (error) {
      setImportError(error?.message || '수집 리조트 조회 실패');
    }
  };

  const refreshCurrentView = async () => {
    if (importBusy) return;
    setImportBusy('refresh');
    setBulkMessage('현재 조건으로 데이터를 새로고침하고 있습니다.');
    try {
      await Promise.all([loadImports(), Promise.resolve(refreshResorts?.()).catch(() => undefined)]);
      setBulkMessage('현재 조건의 데이터를 새로고침했습니다.');
    } finally {
      setImportBusy('');
    }
  };

  useEffect(() => { void loadImports(); }, [importPage, importPageSize, statusFilter, countryFilter, sourceFilter, photoFilter, priceFilter, amenityFilter, ratingFilter]);

  const reviewImport = async (item, action) => {
    try {
      setImportBusy(`${item.id}:${action}`);
      setImportError('');
      if (action === 'approve') await api(`/api/admin/resort-imports/${item.id}/approve`, { method: 'POST' });
      else if (action === 'images') await api(`/api/admin/resort-imports/${item.id}/discover-images`, { method: 'POST' });
      else await api(`/api/admin/resort-imports/${item.id}`, { method: 'PATCH', body: { status: action } });
      await loadImports();
      await refreshResorts?.();
    } catch (error) {
      setImportError(error?.message || '검수 처리 실패');
    } finally {
      setImportBusy('');
    }
  };

  const discoverCurrentPageImages = async () => {
    const targets = importRows.filter((item) => !(item.source_image_urls || []).length);
    if (!targets.length) return;
    try {
      setImportBusy('page:images');
      setImportError('');
      for (const item of targets) {
        await api(`/api/admin/resort-imports/${item.id}/discover-images`, { method: 'POST' });
      }
      await loadImports();
    } catch (error) {
      setImportError(error?.message || '현재 페이지 사진 확인 실패');
    } finally {
      setImportBusy('');
    }
  };

  const currentPageIds = importRows.map((item) => String(item.id));
  const allCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedImportIds.has(id));
  const toggleImportSelection = (id) => {
    const key = String(id);
    setSelectedImportIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setBulkMessage('');
  };
  const toggleCurrentPageSelection = () => {
    setSelectedImportIds((current) => {
      const next = new Set(current);
      if (allCurrentPageSelected) currentPageIds.forEach((id) => next.delete(id));
      else currentPageIds.forEach((id) => next.add(id));
      return next;
    });
    setBulkMessage('');
  };
  const runBulkAction = async (action) => {
    const ids = [...selectedImportIds];
    if (!ids.length || importBusy) return;
    const actionLabel = action === 'approve' ? '승인' : action === 'rejected' ? '비승인' : '사진 확인';
    if (action !== 'images' && !window.confirm(`선택한 ${ids.length}개 리조트를 ${actionLabel} 처리할까요?`)) return;
    setImportBusy(`bulk:${action}`);
    setImportError('');
    setBulkMessage(`${actionLabel} 처리 중 0/${ids.length}`);
    const succeeded = [];
    const failed = [];
    for (let index = 0; index < ids.length; index += 1) {
      const id = ids[index];
      try {
        if (action === 'approve') await api(`/api/admin/resort-imports/${id}/approve`, { method: 'POST' });
        else if (action === 'images') await api(`/api/admin/resort-imports/${id}/discover-images`, { method: 'POST' });
        else await api(`/api/admin/resort-imports/${id}`, { method: 'PATCH', body: { status: 'rejected' } });
        succeeded.push(id);
      } catch (error) {
        failed.push({ id, message: error?.message || '처리 실패' });
      }
      setBulkMessage(`${actionLabel} 처리 중 ${index + 1}/${ids.length}`);
    }
    setSelectedImportIds((current) => {
      const next = new Set(current);
      succeeded.forEach((id) => next.delete(id));
      return next;
    });
    setBulkMessage(`${actionLabel} 완료: 성공 ${succeeded.length}개${failed.length ? ` · 실패 ${failed.length}개` : ''}`);
    if (failed.length) setImportError(`일부 항목을 처리하지 못했습니다. ${failed.slice(0, 3).map((item) => `#${item.id} ${item.message}`).join(' / ')}`);
    await loadImports();
    if (action !== 'images') await Promise.resolve(refreshResorts?.()).catch(() => undefined);
    setImportBusy('');
  };

  const setBulkBooking = async (enabled) => {
    const resortIds = importRows.filter((row) => selectedImportIds.has(String(row.id))).map((row) => String(row.approved_resort_id || '')).filter(Boolean);
    if (!resortIds.length) { setBulkMessage('승인되어 운영 중인 리조트를 선택해 주세요.'); return; }
    setImportBusy('bulk:booking');
    try {
      await api('/api/admin/resorts/booking/bulk', { method: 'PATCH', body: { resortIds, enabled } });
      setBulkMessage(`${resortIds.length}개 리조트를 예약 ${enabled ? '가능' : '불가'}로 변경했습니다.`);
      await refreshResorts?.();
    } catch (error) { setImportError(error?.message || '예약 상태 변경 실패'); }
    finally { setImportBusy(''); }
  };

  const selectedOperating = selectedImport?.approved_resort_id
    ? (resorts || []).find((item) => String(item.id) === String(selectedImport.approved_resort_id)) || null
    : null;
  const selectedPrices = selectedOperating
    ? (resortPrices || []).filter((item) => String(item.resort_id) === String(selectedOperating.id))
    : [];
  const selectedAmenityGroups = groupAmenitiesByCategory(
    uniqueTextList(selectedOperating?.resort_amenities || []).map((key) => (
      getAmenityMeta(key) || { key, label: key, category: 'other' }
    ))
  );
  const selectedImages = uniqueTextList([
    selectedOperating?.resort_cover_url,
    ...(selectedOperating?.resort_photo_urls || []),
    ...(selectedImport?.source_image_urls || []),
    ...(selectedImport?.mirrored_image_urls || []),
  ]);

  useEffect(() => {
    setDetailTab('intro');
    setDetailImageIndex(0);
  }, [selectedImport?.id]);

  const managerTargetId = selectedOperating?.id || (editorOpen && editorMode === 'edit' ? draft.id : '');
  const loadResortManagers = async (resortId = managerTargetId) => {
    if (!resortId) {
      setResortManagers([]);
      return;
    }
    try {
      setManagerError('');
      const result = await api(`/api/admin/resorts/${encodeURIComponent(resortId)}/managers`);
      setResortManagers(result.managers || []);
    } catch (error) {
      setManagerError(error?.message || '담당자 조회 실패');
    }
  };

  useEffect(() => {
    void loadResortManagers();
  }, [managerTargetId]);

  const saveManager = async (isPrimary) => {
    if (!managerTargetId || !managerUserId) return;
    try {
      setManagerBusy(true);
      setManagerError('');
      await api(`/api/admin/resorts/${encodeURIComponent(managerTargetId)}/managers`, { method: 'POST', body: { user_id: managerUserId, is_primary: isPrimary, permissions: {} } });
      setManagerUserId('');
      await loadResortManagers(managerTargetId);
    } catch (error) {
      setManagerError(error?.message || '담당자 저장 실패');
    } finally { setManagerBusy(false); }
  };

  useEffect(() => {
    if (!mapPickerOpen || !mapPickerRef.current) return undefined;
    let disposed = false;
    let listener;
    loadGoogleMaps().then((maps) => {
      if (disposed || !mapPickerRef.current) return;
      const initial = Number.isFinite(Number(draft.resort_lat)) && Number.isFinite(Number(draft.resort_lng))
        ? { lat: Number(draft.resort_lat), lng: Number(draft.resort_lng) }
        : { lat: 12.8797, lng: 121.7740 };
      const map = new maps.Map(mapPickerRef.current, { center: initial, zoom: draft.resort_lat ? 13 : 4, mapTypeControl: false, streetViewControl: false });
      const marker = new maps.Marker({ map, position: initial, draggable: true });
      const applyPosition = (position) => setDraft((prev) => ({ ...prev, resort_lat: position.lat(), resort_lng: position.lng() }));
      listener = map.addListener('click', (event) => { marker.setPosition(event.latLng); applyPosition(event.latLng); });
      marker.addListener('dragend', (event) => applyPosition(event.latLng));
    }).catch((error) => setEditorError(error?.message || '지도 로딩 실패'));
    return () => { disposed = true; listener?.remove?.(); };
  }, [mapPickerOpen]);

  const removeManager = async (manager) => {
    if (!managerTargetId || !window.confirm(`${manager.display_name || manager.email} 담당자를 해제할까요?`)) return;
    try {
      setManagerBusy(true);
      setManagerError('');
      await api(`/api/admin/resorts/${encodeURIComponent(managerTargetId)}/managers/${encodeURIComponent(manager.user_id)}`, { method: 'DELETE' });
      await loadResortManagers(managerTargetId);
    } catch (error) {
      setManagerError(error?.message || '담당자 해제 실패');
    } finally { setManagerBusy(false); }
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
            <strong>{importTotal}</strong>
          </div>
          <button type="button" className="resorts-create-btn" onClick={openCreate}>리조트 등록</button>
        </div>
      </div>

      <div className="resorts-toolbar">
        <div className="resorts-filter-workspace">
        <div className="resorts-search-row resorts-search-row--primary">
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
              onChange={(e) => { setCountryFilter(e.target.value); setImportPage(1); }}
            >
              <option value="all">국가 전체</option>
              {(importFacets.countries || []).map((item) => (
                <option key={item.country} value={item.country}>{item.country} ({item.count})</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => { setImportPage(1); void loadImports(); refreshResorts?.(); }}>검색</button>
          <button type="button" className="ghost" disabled={!!importBusy} onClick={() => void refreshCurrentView()}>{importBusy === 'refresh' ? '새로고침 중' : '현재 상태 새로고침'}</button>
          <button type="button" className="ghost" onClick={() => { setStatusFilter('all'); setCountryFilter('all'); setSourceFilter('all'); setPhotoFilter('all'); setPriceFilter('all'); setAmenityFilter('all'); setRatingFilter('0'); setResortQuery?.(''); setImportPage(1); }}>조건 초기화</button>
        </div>
        <div className="resorts-search-row resorts-search-row--filters">
          <label><span>상태</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setImportPage(1); }}><option value="all">전체 상태</option><option value="pending">검수 대기</option><option value="approved">승인</option><option value="rejected">비승인</option></select></label>
          <label><span>출처</span><select value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setImportPage(1); }}><option value="all">전체 출처</option>{(importFacets.sources || []).map((item) => <option key={item.source} value={item.source}>{String(item.source).toUpperCase()} ({item.count})</option>)}</select></label>
          <label><span>사진</span><select value={photoFilter} onChange={(event) => { setPhotoFilter(event.target.value); setImportPage(1); }}><option value="all">전체</option><option value="yes">사진 있음</option><option value="no">사진 없음</option></select></label>
          <label><span>가격</span><select value={priceFilter} onChange={(event) => { setPriceFilter(event.target.value); setImportPage(1); }}><option value="all">전체</option><option value="yes">가격 등록</option><option value="no">가격 미등록</option></select></label>
          <label><span>편의시설</span><select value={amenityFilter} onChange={(event) => { setAmenityFilter(event.target.value); setImportPage(1); }}><option value="all">전체</option><option value="yes">시설 등록</option><option value="no">시설 미등록</option></select></label>
          <label><span>최소 별점</span><select value={ratingFilter} onChange={(event) => { setRatingFilter(event.target.value); setImportPage(1); }}><option value="0">전체</option><option value="1">1점 이상</option><option value="2">2점 이상</option><option value="3">3점 이상</option><option value="4">4점 이상</option><option value="4.5">4.5점 이상</option></select></label>
        </div>
        </div>
      </div>

      <div className={`resort-bulk-toolbar ${selectedImportIds.size ? 'is-active' : ''}`}>
        <label className="resort-bulk-select-all"><input type="checkbox" checked={allCurrentPageSelected} onChange={toggleCurrentPageSelection} /><span>현재 페이지 전체 선택</span></label>
        <strong>{selectedImportIds.size}개 선택</strong>
        <div>
          <button type="button" className="primary" disabled={!selectedImportIds.size || !!importBusy} onClick={() => void runBulkAction('approve')}>{importBusy === 'bulk:approve' ? '승인 처리 중' : '선택 승인'}</button>
          <button type="button" className="danger" disabled={!selectedImportIds.size || !!importBusy} onClick={() => void runBulkAction('rejected')}>{importBusy === 'bulk:rejected' ? '비승인 처리 중' : '선택 비승인'}</button>
          <button type="button" className="ghost" disabled={!selectedImportIds.size || !!importBusy} onClick={() => void runBulkAction('images')}>{importBusy === 'bulk:images' ? '사진 확인 중' : '선택 사진 확인'}</button>
          <button type="button" disabled={!selectedImportIds.size || !!importBusy} onClick={() => void setBulkBooking(true)}>예약 가능</button>
          <button type="button" className="ghost" disabled={!selectedImportIds.size || !!importBusy} onClick={() => void setBulkBooking(false)}>예약 불가</button>
          {selectedImportIds.size > 0 && <button type="button" className="ghost" disabled={!!importBusy} onClick={() => setSelectedImportIds(new Set())}>선택 해제</button>}
        </div>
        {bulkMessage && <span className="resort-bulk-message">{bulkMessage}</span>}
      </div>

      <div className="resort-pagination-top">
        <Pagination page={importPage} setPage={setImportPage} pageSize={importPageSize} setPageSize={setImportPageSize} total={importTotal} totalPages={Math.max(1, Math.ceil(importTotal / importPageSize))} label="리조트" pageSizeOptions={[10, 20, 50, 100]} />
      </div>

      {editorOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeEditor}>
        <div className="modal-panel resort-editor resort-editor-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <div className="resort-editor-head">
            <div>
              <h3>{editorMode === 'create' ? '리조트 등록' : '리조트 수정'}</h3>
              <p>상세정보와 운영정보를 같은 폼에서 관리합니다.</p>
            </div>
            <button type="button" className="ghost" onClick={closeEditor}>닫기</button>
          </div>

          <nav className="resort-editor-tabs" aria-label="리조트 편집 항목">
            <button type="button" className={editorTab === 'basic' ? 'active' : ''} onClick={() => setEditorTab('basic')}><b>01</b><span>기본 정보</span><small>소개와 운영 정보</small></button>
            <button type="button" className={editorTab === 'amenities' ? 'active' : ''} disabled={editorMode === 'import'} onClick={() => setEditorTab('amenities')}><b>02</b><span>편의시설</span><small>{draft.resort_amenities.length}개 선택</small></button>
            <button type="button" className={editorTab === 'prices' ? 'active' : ''} disabled={editorMode !== 'edit' || !draft.id} onClick={openPriceModal}><b>03</b><span>다이빙 가격</span><small>{editorMode === 'edit' ? '상품과 요금' : '저장 후 등록'}</small></button>
          </nav>

          {editorTab === 'basic' && <div className="resort-editor-grid">
            <label>
              <span>리조트명</span>
              <input value={draft.full_name} onChange={(e) => setDraft((prev) => ({ ...prev, full_name: e.target.value }))} placeholder="BlueFinBali" />
            </label>
            <label>
              <span>지역</span>
              <input value={draft.resort_region} onChange={(e) => setDraft((prev) => ({ ...prev, resort_region: e.target.value }))} placeholder="Bali, Indonesia" />
            </label>
            <label><span>국가</span><select value={draft.country} onChange={(e) => { const option = editorCountries.find((item) => item.name === e.target.value); setDraft((prev) => ({ ...prev, country: e.target.value, country_code: option?.code || '' })); }}><option value="">국가를 선택하세요</option>{editorCountries.map((item) => <option key={`${item.code}-${item.name}`} value={item.name}>{item.name}{item.code ? ` (${item.code})` : ''}</option>)}</select><small>국가 코드 {draft.country_code || '-'} 자동 저장</small></label>
            <label><span>도시</span><input value={draft.city} onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))} placeholder="Cebu City" /></label>
            <label><span>전화번호</span><input value={draft.phones_text} onChange={(e) => setDraft((prev) => ({ ...prev, phones_text: e.target.value }))} placeholder="여러 번호는 쉼표 대신 줄바꿈" /></label>
            <label><span>이메일</span><input value={draft.emails_text} onChange={(e) => setDraft((prev) => ({ ...prev, emails_text: e.target.value }))} placeholder="contact@example.com" /></label>
            <label>
              <span>주소</span>
              <input value={draft.resort_address} onChange={(e) => setDraft((prev) => ({ ...prev, resort_address: e.target.value }))} placeholder="Jl. Labuan Sait..." />
            </label>
            <label>
              <span>웹사이트</span>
              <input value={draft.website} onChange={(e) => setDraft((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://..." />
            </label>
            <label><span>Instagram</span><input value={draft.instagram_url} onChange={(e) => setDraft((prev) => ({ ...prev, instagram_url: e.target.value }))} placeholder="https://instagram.com/..." /></label>
            <label><span>Facebook</span><input value={draft.facebook_url} onChange={(e) => setDraft((prev) => ({ ...prev, facebook_url: e.target.value }))} placeholder="https://facebook.com/..." /></label>
            <label><span>YouTube</span><input value={draft.youtube_url} onChange={(e) => setDraft((prev) => ({ ...prev, youtube_url: e.target.value }))} placeholder="https://youtube.com/@..." /></label>
            <label><span>TikTok</span><input value={draft.tiktok_url} onChange={(e) => setDraft((prev) => ({ ...prev, tiktok_url: e.target.value }))} placeholder="https://tiktok.com/@..." /></label>
            {editorMode === 'edit' && <label className="resort-booking-toggle"><span>예약 운영</span><select value={draft.resort_booking_enabled ? 'enabled' : 'disabled'} onChange={(e) => setDraft((prev) => ({ ...prev, resort_booking_enabled: e.target.value === 'enabled', resort_booking_deposit_amount: e.target.value === 'enabled' && Number(prev.resort_booking_deposit_amount || 0) <= 0 ? 50 : prev.resort_booking_deposit_amount }))}><option value="disabled">예약 불가</option><option value="enabled">예약 가능</option></select><small>예약 가능으로 설정하면 앱 상세 화면에 예약 버튼이 표시됩니다.</small></label>}
            {editorMode === 'edit' && draft.resort_booking_enabled && <label><span>예약금</span><input type="number" min="0" step="0.01" value={draft.resort_booking_deposit_amount} onChange={(e) => setDraft((prev) => ({ ...prev, resort_booking_deposit_amount: e.target.value }))} placeholder="50" /><small>기본 예약금은 USD 50이며 리조트별로 조정할 수 있습니다.</small></label>}
            {editorMode === 'edit' && draft.resort_booking_enabled && <label><span>예약금 통화</span><input value="USD" readOnly /><small>리조트 예약금은 USD 기준으로만 운영합니다.</small></label>}
            {editorMode === 'edit' && <section className="resort-editor-managers resort-editor-bio"><div><strong>리조트 담당자</strong><span>@로 시작하는 가입 회원을 여러 명 지정할 수 있습니다.</span></div><div className="resort-manager-add"><select value={managerUserId} onChange={(event) => setManagerUserId(event.target.value)}><option value="">@회원 검색·선택</option>{users.filter((user) => !resortManagers.some((manager) => String(manager.user_id) === String(user.id))).map((user) => <option key={user.id} value={user.id}>@{user.username || user.email?.split('@')[0]} · {user.full_name || user.email}</option>)}</select><button type="button" disabled={!managerUserId || managerBusy} onClick={() => saveManager(true)}>대표 담당자</button><button type="button" className="ghost" disabled={!managerUserId || managerBusy} onClick={() => saveManager(false)}>추가 담당자</button></div><div className="editor-manager-chips">{resortManagers.map((manager) => <span key={manager.user_id}>@{manager.username || manager.email?.split('@')[0]} <b>{manager.is_primary ? '대표' : '담당자'}</b><button type="button" onClick={() => removeManager(manager)}>×</button></span>)}</div></section>}
            <div className="resort-editor-images resort-editor-bio">
              <div className="resort-editor-images-head"><div><strong>리조트 이미지</strong><span>여러 장을 선택할 수 있으며 첫 대표 이미지는 목록 썸네일로 사용됩니다.</span></div><label className={`image-upload-button ${imageUploadBusy ? 'disabled' : ''}`}><input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple disabled={imageUploadBusy} onChange={uploadResortImages} /><span>{imageUploadBusy ? `업로드 중 ${imageUploadProgress}` : '이미지 멀티 업로드'}</span></label></div>
              <div className="resort-editor-image-grid">
                {(draft.resort_photo_urls || []).map((url, index) => (
                  <article key={`${url}-${index}`} className={draft.resort_cover_url === url ? 'is-cover' : ''}>
                    <img src={url} alt={`리조트 이미지 ${index + 1}`} />
                    <div><button type="button" onClick={() => moveDraftImage(index, -1)} disabled={index === 0}>←</button><button type="button" onClick={() => moveDraftImage(index, 1)} disabled={index === draft.resort_photo_urls.length - 1}>→</button><button type="button" onClick={() => setDraftCover(url)}>{draft.resort_cover_url === url ? '대표' : '대표 지정'}</button><button type="button" className="danger" onClick={() => removeDraftImage(url)}>삭제</button></div>
                  </article>
                ))}
                {!(draft.resort_photo_urls || []).length && <p>등록된 이미지가 없습니다.</p>}
              </div>
              <details className="external-image-fields" open={externalImageOpen} onToggle={(event) => setExternalImageOpen(event.currentTarget.open)}><summary>외부 이미지 URL 사용</summary><div><label><span>외부 이미지 URL</span><input value={draft.avatar_url} onChange={(e) => setDraft((prev) => ({ ...prev, avatar_url: e.target.value }))} placeholder="https://..." /></label><label><span>외부 대표 사진 URL</span><input value={draft.resort_cover_url} onChange={(e) => setDraft((prev) => ({ ...prev, resort_cover_url: e.target.value }))} placeholder="https://..." /></label></div></details>
            </div>
            <section className="resort-coordinate-picker resort-editor-bio"><div><strong>지도 위치</strong><span>{draft.resort_lat && draft.resort_lng ? `${Number(draft.resort_lat).toFixed(6)}, ${Number(draft.resort_lng).toFixed(6)}` : '위치를 선택하지 않았습니다.'}</span></div><Button onClick={() => setMapPickerOpen(true)}>지도에서 위치 선택</Button></section>
            <label className="resort-editor-bio">
              <span>리조트 소개</span>
              <textarea value={draft.bio} onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))} placeholder="리조트 소개와 운영 안내" />
            </label>
            <section className="resort-certification-editor resort-editor-bio"><div><strong>인증·등급</strong><span>인증 프리셋을 선택하거나 직접 입력할 수 있습니다.</span></div><div className="certification-presets">{CERTIFICATION_PRESETS.map((item) => { const selected = toLines(draft.certifications_text).includes(item); return <Button key={item} variant="chip" className={selected ? 'active' : ''} aria-pressed={selected} onClick={() => setDraft((prev) => ({ ...prev, certifications_text: uniqueTextList([...toLines(prev.certifications_text), item]).join('\n') }))}>{item}</Button>; })}</div><textarea value={draft.certifications_text} onChange={(e) => setDraft((prev) => ({ ...prev, certifications_text: e.target.value }))} placeholder="직접 입력은 한 줄에 하나씩 작성" /></section>
            <label className="resort-editor-bio"><span>정보 출처 URL</span><input value={draft.source_url} onChange={(e) => setDraft((prev) => ({ ...prev, source_url: e.target.value }))} placeholder="https://..." /></label>
          </div>}

          {editorTab === 'amenities' && <section className="resort-editor-tab-panel resort-editor-amenities">
            <div className="resort-editor-panel-head"><div><h4>편의시설</h4><p>리조트에서 제공하는 시설과 서비스를 선택하세요.</p></div><strong>{draft.resort_amenities.length}개 선택</strong></div>
            <div className="modal-actions-row">
              <input className="resort-editor-inline-search" value={amenityQuery} onChange={(e) => setAmenityQuery(e.target.value)} placeholder="편의시설 검색" />
              <div className="modal-actions-inline"><button type="button" className="ghost" onClick={selectAllAmenities}>전체 선택</button><button type="button" className="ghost" onClick={clearAmenities}>전체 해제</button></div>
            </div>
            <div className="amenity-categories amenity-categories--inline">
              {amenityGroups.map((group) => {
                const categoryMeta = getAmenityCategoryMeta(group.key);
                return <section key={group.key} className="amenity-category"><div className="amenity-category-head"><h4>{group.label}</h4><span>{group.items.length}개</span></div><div className="amenity-grid amenity-grid--modal">{group.items.map((item) => { const amenityMeta = getAmenityMeta(item.key); return <label key={item.key} className={`amenity-chip ${draft.resort_amenities.includes(item.key) ? 'active' : ''}`} style={{ '--amenity-accent': categoryMeta.color }}><input type="checkbox" checked={draft.resort_amenities.includes(item.key)} onChange={() => toggleAmenity(item.key)} /><span className="amenity-chip-content"><span className="amenity-chip-icon"><AmenityIcon kind={getAmenityIconKind(item.key)} /></span><span>{amenityMeta?.label || item.label}</span></span></label>; })}</div></section>;
              })}
            </div>
          </section>}

          {editorTab === 'prices' && <section className="resort-editor-tab-panel resort-editor-prices">
            <div className="resort-editor-panel-head"><div><h4>다이빙 가격</h4><p>상품 이름, 가격, 포함 항목을 한 화면에서 등록하세요.</p></div><strong>{resortPrices.filter((item) => String(item.resort_id) === String(draft.id)).length}개 등록</strong></div>
            <div className="pricing-template-row">{DIVING_PRICE_PRESETS.map((preset) => <button key={preset.key} type="button" className="ghost pricing-template-btn" onClick={() => applyPricePreset(preset)}>{preset.label}</button>)}</div>
            <form className="pricing-editor pricing-editor--inline" onSubmit={savePrice}>
              <div className="pricing-grid">
                <label><span>가격 종류</span><select value={priceDraft.price_type} onChange={(e) => setPriceDraft((prev) => ({ ...prev, price_type: e.target.value }))}>{RESORT_PRICE_TYPES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
                <label><span>이름</span><input value={priceDraft.title} onChange={(e) => setPriceDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="1day 다이빙 패키지" /></label>
                <label><span>가격</span><input type="number" value={priceDraft.amount} onChange={(e) => setPriceDraft((prev) => ({ ...prev, amount: e.target.value }))} placeholder="150" /></label>
                <label><span>통화</span><input value={priceDraft.currency} onChange={(e) => setPriceDraft((prev) => ({ ...prev, currency: e.target.value }))} placeholder="USD" /></label>
                <label><span>기준</span><input value={priceDraft.unit_label} onChange={(e) => setPriceDraft((prev) => ({ ...prev, unit_label: e.target.value }))} placeholder="1인 기준" /></label>
                <label><span>소요/기간</span><input value={priceDraft.duration_text} onChange={(e) => setPriceDraft((prev) => ({ ...prev, duration_text: e.target.value }))} placeholder="2회 보트 다이빙" /></label>
                <label className="pricing-grid-wide"><span>포함 항목</span><textarea value={priceDraft.included_items_text} onChange={(e) => setPriceDraft((prev) => ({ ...prev, included_items_text: e.target.value }))} placeholder={'보트 이동\n가이드 포함\n조식 포함'} /></label>
                <label className="pricing-grid-wide"><span>설명</span><textarea value={priceDraft.description} onChange={(e) => setPriceDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="추가 안내를 적어주세요." /></label>
                <label><span>정렬</span><input type="number" value={priceDraft.sort_order} onChange={(e) => setPriceDraft((prev) => ({ ...prev, sort_order: e.target.value }))} /></label>
                <label className="pricing-toggle"><input type="checkbox" checked={priceDraft.is_active} onChange={(e) => setPriceDraft((prev) => ({ ...prev, is_active: e.target.checked }))} /><span>노출</span></label>
              </div>
              <div className="resort-inline-save"><button type="submit" disabled={priceBusy}>{priceBusy ? '저장 중...' : '가격 저장'}</button></div>
              {priceMessage && <p className="muted">{priceMessage}</p>}{priceError && <p className="error">{priceError}</p>}
            </form>
          </section>}

          <div className="resort-editor-actions">
            {editorTab !== 'prices' && <button type="button" onClick={saveResort} disabled={editorBusy}>{editorBusy ? '저장 중...' : '리조트 저장'}</button>}
            <button type="button" className="ghost" onClick={closeEditor}>취소</button>
          </div>

          {editorError && <p className="error">{editorError}</p>}
        </div>
        </div>
      )}

      {editorOpen && mapPickerOpen && (
        <div className="modal-backdrop map-picker-backdrop" role="presentation" onClick={() => setMapPickerOpen(false)}>
          <section className="modal-panel resort-map-picker" role="dialog" aria-modal="true" aria-label="리조트 지도 위치 선택" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><h3>지도에서 위치 선택</h3><p>지도를 클릭하거나 마커를 끌어 정확한 위치를 지정하세요.</p></div><button type="button" className="ghost" onClick={() => setMapPickerOpen(false)}>닫기</button></div>
            <div ref={mapPickerRef} className="resort-map-picker-canvas" />
            <div className="resort-map-picker-footer"><span>{draft.resort_lat && draft.resort_lng ? `${Number(draft.resort_lat).toFixed(6)}, ${Number(draft.resort_lng).toFixed(6)}` : '위치를 선택하세요.'}</span><button type="button" onClick={() => setMapPickerOpen(false)}>이 위치 사용</button></div>
          </section>
        </div>
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

      {importError && <p className="error">{importError}</p>}
      {importRows.length === 0 ? (
        <p className="resorts-empty">리조트 데이터가 없습니다.</p>
      ) : (
        <div className="resort-compact-list">
          {importRows.map((r) => {
            const thumb = r.source_image_urls?.[0] || r.mirrored_image_urls?.[0] || '';
            const operatingResort = (resorts || []).find((item) => String(item.id) === String(r.approved_resort_id || ''));
            return <article key={`import-${r.id}`} className={`resort-compact-row ${selectedImportIds.has(String(r.id)) ? 'is-selected' : ''}`}>
              <label className="resort-row-checkbox" aria-label={`${r.name} 선택`}><input type="checkbox" checked={selectedImportIds.has(String(r.id))} onChange={() => toggleImportSelection(r.id)} /></label>
              <button type="button" className="resort-compact-thumb" onClick={() => setSelectedImport(r)}>{thumb ? <img src={thumb} alt={r.name} /> : <span>NO IMAGE</span>}</button>
              <div className="resort-compact-main"><div><h3>{r.name}</h3><span className={`badge ${r.status}`}>{r.status === 'approved' ? '승인' : r.status === 'rejected' ? '비승인' : '검수 대기'}</span></div><p>{r.address || [r.city, r.region, r.country].filter(Boolean).join(', ') || '주소 없음'}</p></div>
              <div className="resort-compact-coord"><span>좌표</span><strong>{Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}</strong></div>
              <div className="resort-compact-source"><span>출처</span><a href={r.source_url} target="_blank" rel="noreferrer">{String(r.source || '-').toUpperCase()}</a></div>
              <div className="resort-compact-operations">
                <span className={Number(r.photo_count || 0) > 0 ? 'is-ready' : 'is-empty'}>사진 <b>{Number(r.photo_count || 0)}</b></span>
                <span className={Number(r.price_count || 0) > 0 ? 'is-ready' : 'is-empty'}>가격 <b>{Number(r.price_count || 0) > 0 ? `${r.price_count}개` : '미등록'}</b></span>
                <span className={Number(r.amenity_count || 0) > 0 ? 'is-ready' : 'is-empty'}>시설 <b>{Number(r.amenity_count || 0) > 0 ? `${r.amenity_count}개` : '미등록'}</b></span>
                <span className="is-rating">★ <b>{Number(r.rating_avg || 0).toFixed(1)}</b><small>({Number(r.review_count || 0)})</small></span>
                <span className={operatingResort?.resort_booking_enabled ? 'is-ready' : 'is-empty'}>예약 <b>{operatingResort?.resort_booking_enabled ? '가능' : '불가'}</b></span>
              </div>
              <div className="resort-compact-actions">
                <button type="button" onClick={() => setSelectedImport(r)}>상세정보</button>
                <button type="button" disabled={!!importBusy} onClick={() => reviewImport(r, 'images')}>사진 확인</button>
                {operatingResort ? <button type="button" className="ghost" disabled={!!importBusy} onClick={async () => { await updateResort?.(operatingResort.id, { resort_booking_enabled: !operatingResort.resort_booking_enabled }); await refreshResorts?.(); }}>{operatingResort.resort_booking_enabled ? '예약 끄기' : '예약 켜기'}</button> : null}
                {r.status !== 'approved' && <button type="button" className="primary" disabled={!!importBusy} onClick={() => reviewImport(r, 'approve')}>승인</button>}
                {r.status !== 'rejected' && <button type="button" className="danger" disabled={!!importBusy} onClick={() => reviewImport(r, 'rejected')}>비승인</button>}
              </div>
            </article>;
          })}
        </div>
      )}
      <Pagination page={importPage} setPage={setImportPage} pageSize={importPageSize} setPageSize={setImportPageSize} total={importTotal} totalPages={Math.max(1, Math.ceil(importTotal / importPageSize))} label="리조트" pageSizeOptions={[10, 20, 50, 100]} />
      {selectedImport && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedImport(null)}>
          <section className="modal-panel resort-import-detail" role="dialog" aria-modal="true" aria-label="리조트 상세정보" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><p className="section-kicker">UNIFIED RESORT DETAIL</p><h3>{selectedOperating?.full_name || selectedImport.name}</h3><p>수집 정보와 운영 정보를 통합해서 표시합니다.</p></div><button type="button" className="ghost" onClick={() => setSelectedImport(null)}>닫기</button></div>
            <div className="resort-import-detail-hero">
              <div className="resort-detail-gallery">
                <div className="resort-import-detail-image">
                  {selectedImages.length ? <img src={selectedImages[detailImageIndex] || selectedImages[0]} alt={`${selectedImport.name} ${detailImageIndex + 1}`} /> : <span>등록된 사진이 없습니다.</span>}
                  {selectedImages.length > 1 && <><button type="button" className="gallery-arrow previous" aria-label="이전 사진" onClick={() => setDetailImageIndex((detailImageIndex - 1 + selectedImages.length) % selectedImages.length)}>‹</button><button type="button" className="gallery-arrow next" aria-label="다음 사진" onClick={() => setDetailImageIndex((detailImageIndex + 1) % selectedImages.length)}>›</button><span className="gallery-count">{detailImageIndex + 1} / {selectedImages.length}</span></>}
                </div>
                {selectedImages.length > 1 && <div className="resort-detail-thumbnails">{selectedImages.map((url, index) => <button key={url} type="button" className={index === detailImageIndex ? 'active' : ''} onClick={() => setDetailImageIndex(index)}><img src={url} alt={`${selectedImport.name} 썸네일 ${index + 1}`} /></button>)}</div>}
              </div>
              <div className="resort-import-detail-summary"><span className={`badge ${selectedImport.status}`}>{selectedImport.status === 'approved' ? '승인' : selectedImport.status === 'rejected' ? '비승인' : '검수 대기'}</span><section className="resort-manager-summary"><div className="resort-manager-title"><span>담당자 정보</span><small>대표 1명 · 추가 담당자 여러 명</small></div>{selectedOperating ? <><div className="resort-manager-list">{resortManagers.length ? resortManagers.map((manager) => <article key={manager.user_id}><div className="manager-avatar">{manager.avatar_url ? <img src={manager.avatar_url} alt="" /> : String(manager.display_name || manager.email || '?').slice(0,1).toUpperCase()}</div><div><strong>{manager.display_name || manager.email}</strong><span>{manager.email}</span></div><b>{manager.is_primary ? '대표 담당자' : '추가 담당자'}</b><button type="button" className="manager-remove" disabled={managerBusy} onClick={() => removeManager(manager)}>해제</button></article>) : <p>지정된 담당자가 없습니다.</p>}</div><div className="resort-manager-add"><select value={managerUserId} onChange={(event) => setManagerUserId(event.target.value)}><option value="">회원을 선택하세요</option>{users.filter((user) => !resortManagers.some((manager) => String(manager.user_id) === String(user.id))).map((user) => <option key={user.id} value={user.id}>{user.full_name || user.username || user.email} · {user.email}</option>)}</select><button type="button" disabled={!managerUserId || managerBusy} onClick={() => saveManager(true)}>대표 지정</button><button type="button" className="ghost" disabled={!managerUserId || managerBusy} onClick={() => saveManager(false)}>추가 담당자</button></div><p className="manager-permission-note">탭별 권한 설정을 위한 권한 데이터 구조가 준비되어 있습니다.</p>{managerError && <p className="error">{managerError}</p>}</> : <p>리조트 승인 후 담당자를 지정할 수 있습니다.</p>}</section><dl><div><dt>국가/지역</dt><dd>{[selectedOperating?.resort_country || selectedImport.country, selectedOperating?.resort_region || selectedImport.region, selectedOperating?.resort_city || selectedImport.city].filter(Boolean).join(' · ') || '-'}</dd></div><div><dt>주소</dt><dd>{selectedOperating?.resort_address || selectedImport.address || '-'}</dd></div><div><dt>전화</dt><dd>{(selectedOperating?.resort_phones || selectedImport.phones || []).join(', ') || '-'}</dd></div><div><dt>이메일</dt><dd>{(selectedOperating?.resort_emails || selectedImport.emails || []).join(', ') || '-'}</dd></div><div><dt>좌표</dt><dd>{selectedOperating?.resort_lat ?? selectedImport.latitude}, {selectedOperating?.resort_lng ?? selectedImport.longitude}</dd></div><div><dt>인증</dt><dd>{(selectedOperating?.resort_certifications || selectedImport.certifications || []).join(', ') || '-'}</dd></div><div><dt>사진 권리</dt><dd>{selectedImport.image_rights_status || 'unverified'}</dd></div>{selectedImport.source && <div><dt>출처</dt><dd>{String(selectedImport.source).toUpperCase()}{selectedImport.source_record_id ? ` · ${selectedImport.source_record_id}` : ''}</dd></div>}{(selectedOperating?.website || selectedImport.website_url || selectedImport.source_url) && <div><dt>웹사이트</dt><dd><a href={selectedOperating?.website || selectedImport.website_url || selectedImport.source_url} target="_blank" rel="noreferrer">{selectedOperating?.website || selectedImport.website_url || selectedImport.source_url} ↗</a></dd></div>}</dl><div className="resort-detail-socials">{[['Instagram',selectedOperating?.resort_instagram_url || selectedImport.instagram_url],['Facebook',selectedOperating?.resort_facebook_url || selectedImport.facebook_url],['YouTube',selectedOperating?.resort_youtube_url || selectedImport.youtube_url],['TikTok',selectedOperating?.resort_tiktok_url || selectedImport.tiktok_url]].filter(([,url]) => url).map(([label,url]) => <a key={label} href={url} target="_blank" rel="noreferrer"><span>{label}</span><strong>{url}</strong><b>↗</b></a>)}</div></div>
            </div>
            <div className="resort-detail-tabs" role="tablist" aria-label="리조트 상세 항목">{[['intro','소개','리조트 안내'],['prices','가격','상품과 요금'],['amenities','편의시설','제공 서비스'],['reviews','리뷰','평점과 후기']].map(([key,label,caption],index) => <button key={key} type="button" role="tab" aria-selected={detailTab === key} className={detailTab === key ? 'active' : ''} onClick={() => setDetailTab(key)}><i>{String(index + 1).padStart(2,'0')}</i><span><strong>{label}</strong><small>{caption}</small></span></button>)}</div>
            <section className="resort-detail-tab-panel" role="tabpanel">
              {detailTab === 'intro' && <div className="resort-detail-copy"><h4>리조트 소개</h4><p>{selectedOperating?.bio || selectedImport.raw_data?.description || '등록된 소개가 없습니다.'}</p><section className="resort-detail-certifications"><div><span>공식 인증·등급</span><small>교육 단체 및 기관 인증</small></div>{(selectedOperating?.resort_certifications || selectedImport.certifications || []).length ? <div>{(selectedOperating?.resort_certifications || selectedImport.certifications || []).map((item) => <span key={item}>{item}</span>)}</div> : <p>등록된 인증·등급이 없습니다.</p>}</section></div>}
              {detailTab === 'prices' && <div className="resort-detail-price-list">{selectedPrices.length ? selectedPrices.map((price) => <article key={price.id}><div><strong>{price.title}</strong><span>{price.duration_text || price.unit_label || ''}</span></div><b>{price.currency} {price.amount}</b><p>{price.description || (price.included_items || []).join(', ') || '추가 설명이 없습니다.'}</p></article>) : <p className="resort-detail-empty">등록된 가격 정보가 없습니다.</p>}</div>}
              {detailTab === 'amenities' && (
                selectedAmenityGroups.length ? (
                  <div className="resort-detail-amenity-groups">
                    {selectedAmenityGroups.map((group) => (
                      <section key={group.key} className="resort-detail-amenity-group" style={{ '--amenity-group-color': group.color }}>
                        <header><div><i /><strong>{group.label}</strong></div><span>{group.items.length}개</span></header>
                        <div className="resort-detail-amenities">
                          {group.items.map((item) => (
                            <span key={item.key}><AmenityIcon kind={getAmenityIconKind(item.key)} />{item.label}</span>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : <p className="resort-detail-empty">등록된 편의시설이 없습니다.</p>
              )}
              {detailTab === 'reviews' && <div className="resort-detail-review-summary"><strong>{selectedOperating ? formatNumber(selectedOperating.resort_rating_avg) : '-'}</strong><div><b>{selectedOperating ? `${Number(selectedOperating.resort_review_count || 0)}개의 리뷰` : '리뷰 정보 없음'}</b><p>개별 리뷰 데이터가 연결되면 이 영역에 최신 리뷰가 표시됩니다.</p></div></div>}
            </section>
            <details className="resort-import-raw"><summary>원본 데이터 보기</summary><pre>{JSON.stringify(selectedImport.raw_data || {}, null, 2)}</pre></details>
            <div className="modal-footer modal-footer--start"><button type="button" onClick={() => { setSelectedImport(null); openUnifiedEdit(selectedImport); }}>수정</button><button type="button" onClick={() => reviewImport(selectedImport, 'images')}>사진 후보 확인</button>{selectedImport.status !== 'approved' && <button type="button" onClick={() => reviewImport(selectedImport, 'approve')}>승인</button>}{selectedImport.status !== 'rejected' && <button type="button" className="ghost" onClick={() => reviewImport(selectedImport, 'rejected')}>비승인</button>}<button type="button" className="danger" onClick={() => deleteUnifiedResort(selectedImport)}>삭제</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
