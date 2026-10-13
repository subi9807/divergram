import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { api, API_BASE, getAdminAuthToken, setAdminAuthToken } from './lib/api';
import { loadGoogleMaps, parseCoord } from './lib/maps';
import Icon from './components/Icon';
const DashboardSection = lazy(() => import('./sections/DashboardSection'));
const MapSection = lazy(() => import('./sections/MapSection'));
const UsersSection = lazy(() => import('./sections/UsersSection'));
const ReportsSection = lazy(() => import('./sections/ReportsSection'));
const ResortsSection = lazy(() => import('./sections/ResortsSection'));
const ResortBookingsSection = lazy(() => import('./sections/ResortBookingsSection'));
const ResortPartnersSection = lazy(() => import('./sections/ResortPartnersSection'));
const ResortDetailSection = lazy(() => import('./sections/ResortDetailSection'));
const ResortFacilitiesSection = lazy(() => import('./sections/ResortFacilitiesSection'));
const FeedsSection = lazy(() => import('./sections/FeedsSection'));
const ReelsSection = lazy(() => import('./sections/ReelsSection'));
const AdsSection = lazy(() => import('./sections/AdsSection'));
const PushSection = lazy(() => import('./sections/PushSection'));
const SettingsSection = lazy(() => import('./sections/SettingsSection'));
const LogsSection = lazy(() => import('./sections/LogsSection'));
const LegalSection = lazy(() => import('./sections/LegalSection'));
const CertificationsSection = lazy(() => import('./sections/CertificationsSection'));
const OperationsDataSection = lazy(() => import('./sections/OperationsDataSection'));
const OperationsOverviewSection = lazy(() => import('./sections/OperationsOverviewSection'));
const ResortPricingSection = lazy(() => import('./sections/ResortPricingSection'));
const TablesSection = lazy(() => import('./sections/TablesSection'));
const CommunicationSettingsSection = lazy(() => import('./sections/CommunicationSettingsSection'));
const OperationalModuleSection = lazy(() => import('./sections/OperationalModuleSection'));
const WebsiteInquiriesSection = lazy(() => import('./sections/WebsiteInquiriesSection'));
const EducationApplicationsSection = lazy(() => import('./sections/EducationApplicationsSection'));
const StatisticsSection = lazy(() => import('./sections/StatisticsSection'));
const MessagingUsageSection = lazy(() => import('./sections/MessagingUsageSection'));
const SystemArchitectureSection = lazy(() => import('./sections/SystemArchitectureSection'));
const DiveGuidesSection = lazy(() => import('./sections/DiveGuidesSection'));
const ApiManagementSection = lazy(() => import('./sections/ApiManagementSection'));
const StoreSubscriptionsSection = lazy(() => import('./sections/StoreSubscriptionsSection'));
import brandLogoUrl from '../../web/public/assets/logo/divergram-logo-blue.png';

const RESORT_PRICE_STORAGE_KEY = 'dg_admin_resort_prices_v1';

function readStoredResortPrices() {
  try {
    const raw = localStorage.getItem(RESORT_PRICE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredResortPrices(items) {
  try {
    localStorage.setItem(RESORT_PRICE_STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  } catch {
    // ignore
  }
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function safeReadJson(response) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const text = await response.text();
  if (!text) return {};
  if (contentType.includes('application/json')) return JSON.parse(text);
  if (text.trim().startsWith('<')) throw new Error(`unexpected_html_response: ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
  return JSON.parse(text);
}

export function AdminApp() {
  const [sessionUser, setSessionUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [emailLoginEmail, setEmailLoginEmail] = useState('');
  const [emailLoginPassword, setEmailLoginPassword] = useState('');
  const [emailLoginBusy, setEmailLoginBusy] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const refreshInFlight = useRef(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openMenuGroups, setOpenMenuGroups] = useState(() => new Set());
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [resortQuery, setResortQuery] = useState('');
  const [resorts, setResorts] = useState([]);
  const [resortPrices, setResortPrices] = useState([]);
  const [selectedResortId, setSelectedResortId] = useState(() => new URLSearchParams(window.location.search).get('resort') || '');
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState(() => {
    const seg = (window.location.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
    const byPath = ['dashboard', 'statistics', 'map', 'users', 'resort-members', 'admin-members', 'certifications', 'devices', 'consents', 'comments', 'reported-chats', 'notification-history', 'communication', 'messaging-usage', 'api-management', 'admin-access', 'operations', 'architecture', 'pricing', 'education-applications', 'jobs', 'data', 'dive-logs', 'dive-guides', 'media', 'stamps', 'app-version', 'support', 'partnership-inquiries', 'analytics', 'donations', 'engagement', 'reports', 'resorts', 'resort-imports', 'resort-detail', 'facilities', 'feeds', 'reels', 'ads', 'push', 'legal', 'logs', 'settings'];
    if (seg === 'resort-bookings' || seg === 'resort-partners' || seg === 'subscriptions') return seg;
    if (byPath.includes(seg)) return seg;
    const legacy = new URLSearchParams(window.location.search).get('section') || '';
    return byPath.includes(String(legacy)) ? String(legacy) : 'dashboard';
  });
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('app_users');
  const [tableRows, setTableRows] = useState([]);
  const [authCheck, setAuthCheck] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [reports, setReports] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [mapPoints, setMapPoints] = useState([]);
  const [adSlots, setAdSlots] = useState([]);
  const [externalIntegrations, setExternalIntegrations] = useState(null);
  const [externalIntegrationsLoading, setExternalIntegrationsLoading] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [reelPage, setReelPage] = useState(1);
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [currentKstTime, setCurrentKstTime] = useState(() => new Date());
  const [connectionInfo, setConnectionInfo] = useState({ ip: '-', countryCode: '--' });
  const PAGE_SIZE = 10;
  const mapRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentKstTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const kstParts = Object.fromEntries(new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(currentKstTime).map((part) => [part.type, part.value]));
  const kstDateTime = `${kstParts.year}년 ${kstParts.month}월 ${kstParts.day}일 ${kstParts.hour}:${kstParts.minute}:${kstParts.second}`;

  const hasAdminSession = !!sessionUser?.email;
  const canAccess = hasAdminSession;
  useEffect(() => {
    if (!canAccess) return;
    let active = true;
    api('/api/admin/connection-info').then((result) => {
      if (active) setConnectionInfo({ ip: result?.ip || '-', countryCode: result?.countryCode || '--' });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [canAccess]);
  const refreshSession = async () => {
    try {
      const j = await api('/api/auth/session');
      const session = j?.session || null;
      const email = normalizeEmail(session?.user?.email || '');
      const access = email ? await api('/api/admin/health') : null;
      if (email && access?.ok) {
        setSessionUser({ ...(session.user || {}), ...(session.profile || {}) });
        setAuthError('');
      } else {
        setSessionUser(null);
        if (email) setAuthError('이 계정에는 관리자 권한이 없습니다.');
      }
    } catch (error) {
      setSessionUser(null);
      setAuthError(error.message || '관리자 인증을 확인하지 못했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  const refresh = async ({ memberRole = memberRoleFilter } = {}) => {
    if (!canAccess) return setError('이메일 로그인이 필요해.');
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setLoading(true);
    setError('');
    setAuthError('');
    try {
      const settled = await Promise.allSettled([
        api('/api/admin/stats'),
        api(`/api/admin/users?q=${encodeURIComponent(query)}&role=${encodeURIComponent(section === 'resort-members' ? 'resort' : section === 'admin-members' ? 'admin' : section === 'users' ? 'general' : (memberRole || 'all'))}&limit=50`),
        api('/api/admin/audit-logs?limit=20'),
        api('/api/admin/tables'),
        api('/api/admin/growth?days=14'),
        api(`/api/admin/resorts?q=${encodeURIComponent(resortQuery)}`),
        api('/api/admin/reports?limit=50'),
        api('/api/admin/certifications?limit=50'),
        api('/api/admin/map-points'),
        api('/api/admin/ads?limit=20'),
        api('/api/admin/external-integrations'),
      ]);
      const nextErrors = [];
      const applyResult = (index, setter, pick = (value) => value) => {
        const item = settled[index];
        if (item?.status === 'fulfilled') {
          setter(pick(item.value));
        } else if (item?.reason?.message) {
          nextErrors.push(item.reason.message);
        }
      };

      applyResult(0, (value) => setStats(value?.stats || null));
      applyResult(1, (value) => setUsers(value?.users || []));
      applyResult(2, (value) => setLogs(value?.logs || []));
      applyResult(3, (value) => setTables(value?.tables || []));
      applyResult(4, (value) => setGrowth(value || null));
      applyResult(5, (value) => setResorts(value?.resorts || []));
      applyResult(6, (value) => setReports(value?.reports || []));
      applyResult(7, (value) => setCertifications(value?.certifications || []));
      applyResult(8, (value) => setMapPoints(value?.points || []));
      applyResult(9, (value) => setAdSlots(value?.ads || []));
      applyResult(10, (value) => setExternalIntegrations(value || null));
      if (nextErrors.length) setError(nextErrors[0]);
    } catch (e) {
      const message = e.message || '요청 실패';
      setError(message);
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
    }
  };

  const refreshExternalIntegrations = async () => {
    setExternalIntegrationsLoading(true);
    try {
      const value = await api('/api/admin/external-integrations?refresh=1');
      setExternalIntegrations(value || null);
    } catch (e) {
      setError(e.message || '외부 API 상태 조회 실패');
    } finally {
      setExternalIntegrationsLoading(false);
    }
  };

  const refreshTableRows = async (name = selectedTable) => {
    try {
      const r = await api(`/api/admin/table/${name}?limit=100`);
      setTableRows(r.rows || []);
    } catch (e) {
      setError(e.message || '테이블 조회 실패');
    }
  };

  const updateUser = async (id, payload) => {
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: payload });
      await refresh();
    } catch (e) {
      setError(e.message || '수정 실패');
      throw e;
    }
  };

  const sendPasswordResetEmail = async (user) => {
    const targetId = String(user?.id || '').trim();
    if (!targetId) return;
    if (!window.confirm(`${user?.email || '이 회원'} 계정으로 비밀번호 재설정 메일을 보낼까요?`)) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(targetId)}/password-reset-email`, { method: 'POST' });
      window.alert('비밀번호 재설정 메일을 전송했습니다. 링크는 30분 동안 한 번만 사용할 수 있습니다.');
    } catch (e) {
      setError(e.message || '비밀번호 재설정 메일 전송 실패');
      throw e;
    }
  };

  const deleteUserPosts = async (id) => {
    const targetId = String(id || '').trim();
    if (!targetId) return;
    if (!window.confirm('이 회원의 게시물만 모두 삭제할까?')) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(targetId)}/posts`, {
        method: 'DELETE',
      });
      await refresh({ memberRole: memberRoleFilter });
      await refreshTableRows('app_posts');
    } catch (e) {
      setError(e.message || '회원 게시물 삭제 실패');
    }
  };

  const deleteUser = async (id) => {
    const targetId = String(id || '').trim();
    if (!targetId) return;
    if (!window.confirm('이 회원을 삭제할까? 회원과 게시물이 모두 삭제돼.')) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      await refresh({ memberRole: memberRoleFilter });
      await refreshTableRows('app_users');
    } catch (e) {
      setError(e.message || '회원 삭제 실패');
    }
  };

  const refreshResorts = async () => {
    try {
      const r = await api(`/api/admin/resorts?q=${encodeURIComponent(resortQuery)}`);
      setResorts(r.resorts || []);
    } catch (e) {
      setError(e.message || '리조트 조회 실패');
    }
  };

  const refreshResortPrices = async () => {
    try {
      const result = await api('/api/admin/resort-prices?limit=500');
      setResortPrices(result?.prices || []);
    } catch (e) {
      setError(e.message || '리조트 가격 조회 실패');
    }
  };

  const saveResortPrice = async (payload) => {
    const id = String(payload?.id || `price_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).trim();
    const nextItem = {
      ...payload,
      id,
      resort_id: String(payload?.resort_id || '').trim(),
      price_type: String(payload?.price_type || 'dive_package').trim(),
      title: String(payload?.title || '').trim(),
      image_url: String(payload?.image_url || '').trim(),
      amount: Number(payload?.amount || 0),
      currency: String(payload?.currency || 'USD').trim().toUpperCase(),
      duration_text: String(payload?.duration_text || '').trim(),
      description: String(payload?.description || '').trim(),
      included_items: Array.isArray(payload?.included_items) ? payload.included_items : [],
      unit_label: String(payload?.unit_label || '').trim(),
      sort_order: Number(payload?.sort_order || 0),
      is_active: !!payload?.is_active,
      updated_at: new Date().toISOString(),
    };
    const result = await api('/api/admin/resort-prices', { method: 'POST', body: nextItem });
    await refreshResortPrices();
    return result?.price || nextItem;
  };

  const deleteResortPrice = async (id) => {
    const targetId = String(id || '').trim();
    if (!targetId) return;
    await api(`/api/admin/resort-prices/${encodeURIComponent(targetId)}`, { method: 'DELETE' });
    await refreshResortPrices();
  };

  const updateResort = async (id, patch) => {
    setError('');
    try {
      const result = await api(`/api/admin/resorts/${id}`, { method: 'PATCH', body: patch });
      await refreshResorts();
      setError('');
      return result?.resort;
    } catch (e) {
      setError(e.message || '리조트 수정 실패');
      throw e;
    }
  };

  const createResort = async (payload) => {
    try {
      await api('/api/admin/resorts', { method: 'POST', body: payload });
      await refreshResorts();
    } catch (e) {
      setError(e.message || '리조트 등록 실패');
      throw e;
    }
  };

  const removeResort = async (id) => {
    try {
      await api(`/api/admin/resorts/${id}`, { method: 'DELETE' });
      await refreshResorts();
    } catch (e) {
      setError(e.message || '리조트 삭제 실패');
      throw e;
    }
  };

  const deletePost = async (postId) => {
    const targetId = String(postId || '').trim();
    if (!targetId) return;
    if (!window.confirm('정말 이 게시물을 삭제할까?')) return;
    try {
      await api(`/api/admin/posts/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      await refresh({ memberRole: memberRoleFilter });
      await refreshTableRows('app_posts');
    } catch (e) {
      setError(e.message || '게시물 삭제 실패');
    }
  };

  const deletePostsBulk = async (postIds = []) => {
    const ids = Array.from(new Set((Array.isArray(postIds) ? postIds : [postIds]).map((value) => String(value || '').trim()).filter(Boolean)));
    if (!ids.length) return;
    if (!window.confirm(`선택한 게시물 ${ids.length}개를 삭제할까?`)) return;
    try {
      for (const id of ids) {
        await api(`/api/admin/posts/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      }
      await refresh({ memberRole: memberRoleFilter });
      await refreshTableRows('app_posts');
    } catch (e) {
      setError(e.message || '게시물 삭제 실패');
    }
  };

  const deleteUsersBulk = async (userIds = []) => {
    const ids = Array.from(new Set((Array.isArray(userIds) ? userIds : [userIds]).map((value) => String(value || '').trim()).filter(Boolean)));
    if (!ids.length) return;
    if (!window.confirm(`선택한 회원 ${ids.length}명을 삭제할까? 회원과 게시물이 모두 삭제돼.`)) return;
    try {
      for (const id of ids) {
        await api(`/api/admin/users/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      }
      await refresh({ memberRole: memberRoleFilter });
      await refreshTableRows('app_users');
    } catch (e) {
      setError(e.message || '회원 삭제 실패');
    }
  };

  const seedBulk = async () => {
    try {
      setLoading(true);
      await api('/api/admin/seed-bulk', { method: 'POST', body: { users: 50, posts: 300, comments: 1000, likes: 2000 } });
      await api('/api/admin/migrate-normalized', { method: 'POST' });
      await refresh();
    } catch (e) {
      setError(e.message || '샘플 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const checkUserAdminAuth = async () => {
    try {
      const [sessionResp, healthResp] = await Promise.all([
        api('/api/auth/session'),
        api('/api/admin/health'),
      ]);
      const sessionJson = sessionResp;
      const session = sessionJson?.session || null;
      const email = normalizeEmail(session?.user?.email || '');
      setAuthCheck({
        sessionEmail: email || '-',
        sessionRole: session?.user?.role || 'unknown',
        adminAccess: !!healthResp?.ok,
        allowedAdmin: !!healthResp?.ok,
        reportCount: reports.length,
      });
    } catch (e) {
      setAuthCheck({
        sessionEmail: normalizeEmail(sessionUser?.email || '') || '-',
        sessionRole: sessionUser?.role || 'unknown',
        adminAccess: false,
        allowedAdmin: false,
        reportCount: reports.length,
        error: e.message || 'auth_check_failed',
      });
    }
  };

  const startEmailLogin = async (event) => {
    event.preventDefault();
    setEmailLoginBusy(true);
    setAuthError('');
    try {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailLoginEmail,
          password: emailLoginPassword,
          accountScope: 'admin',
          sessionDays: 30,
        }),
      });
      const j = await safeReadJson(r);
      if (!r.ok) throw new Error(j?.error || 'email_login_failed');
      setAdminAuthToken(j?.token || '');
      setEmailLoginPassword('');
      await refreshSession();
    } catch (e) {
      setAuthError(e.message || 'email_login_failed');
    } finally {
      setEmailLoginBusy(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // 무시
    }
    setAdminAuthToken('');
    setSessionUser(null);
    setStats(null);
    setUsers([]);
    setLogs([]);
    setGrowth(null);
    setReports([]);
    setCertifications([]);
    setMapPoints([]);
    setResortPrices([]);
    setAdSlots([]);
    setAuthCheck(null);
    setError('');
    setAuthError('');
  };

  useEffect(() => {
    refreshSession();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthToken = url.searchParams.get('oauthToken') || url.searchParams.get('token') || '';
    if (!oauthToken) return;
    setAdminAuthToken(oauthToken);
    url.searchParams.delete('oauthToken');
    url.searchParams.delete('token');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    refreshSession();
  }, []);

  useEffect(() => {
    if (canAccess) refresh();
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess || !['users', 'resort-members', 'admin-members'].includes(section)) return;
    refresh({ memberRole: section === 'resort-members' ? 'resort' : section === 'admin-members' ? 'admin' : 'general' });
  }, [canAccess, section]);

  useEffect(() => {
    if (section === 'resort-detail') {
      const target = `/resort-detail${selectedResortId ? `?resort=${encodeURIComponent(selectedResortId)}` : ''}`;
      if (`${window.location.pathname}${window.location.search}` !== target) {
        window.history.replaceState({}, '', target);
      }
      return;
    }
    const target = `/${section}`;
    if (window.location.pathname !== target) {
      window.history.replaceState({}, '', target);
    }
  }, [section, selectedResortId]);

  useEffect(() => {
    const onPop = () => {
      const seg = (window.location.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
      const byPath = ['dashboard', 'statistics', 'map', 'users', 'resort-members', 'admin-members', 'certifications', 'devices', 'consents', 'comments', 'reported-chats', 'notification-history', 'communication', 'messaging-usage', 'api-management', 'admin-access', 'operations', 'architecture', 'pricing', 'education-applications', 'jobs', 'data', 'dive-logs', 'dive-guides', 'media', 'stamps', 'app-version', 'support', 'partnership-inquiries', 'analytics', 'donations', 'engagement', 'reports', 'resorts', 'resort-imports', 'resort-detail', 'facilities', 'feeds', 'reels', 'ads', 'push', 'legal', 'logs', 'settings'];
      const nextSection = seg === 'resort-bookings' || seg === 'resort-partners' || seg === 'subscriptions' || byPath.includes(seg) ? seg : 'dashboard';
      setSection(nextSection);
      const nextSelectedResortId = nextSection === 'resort-detail'
        ? new URLSearchParams(window.location.search).get('resort') || ''
        : '';
      setSelectedResortId(nextSelectedResortId);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!canAccess || section !== 'dashboard') return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60_000);
    return () => clearInterval(t);
  }, [canAccess, section, query, resortQuery, hasAdminSession]);

  useEffect(() => {
    if (!canAccess) return;
    if (section === 'resorts' || section === 'resort-detail') setError('');
  }, [canAccess, section]);

  useEffect(() => {
    if (!canAccess || !['resorts', 'resort-imports', 'resort-detail', 'pricing'].includes(section)) return undefined;
    refreshResortPrices();
    return undefined;
  }, [canAccess, section]);

  useEffect(() => {
    if (!canAccess || section !== 'map' || !mapRef.current) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setMapError('');
        await loadGoogleMaps();
        if (cancelled || !window.google) return;
        const google = window.google;
        const map = new google.maps.Map(mapRef.current, { center: { lat: 36.5, lng: 127.8 }, zoom: 6, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
        const { points } = await api('/api/admin/map-points');
        const geocoder = new google.maps.Geocoder();
        const infoWindow = new google.maps.InfoWindow();
        const bounds = new google.maps.LatLngBounds();
        let hasMarker = false;
        const resolveMediaUrl = (value) => {
          const url = String(value || '').trim();
          if (!url) return '';
          if (/^https?:\/\//i.test(url)) return url;
          return `${String(API_BASE || '').replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
        };
        const openPointInfo = (marker, point) => {
          const content = document.createElement('article');
          content.className = 'map-point-popup';
          const thumbnail = resolveMediaUrl(point.thumbnail_url || point.image_url);
          if (thumbnail) {
            const image = document.createElement('img');
            image.src = thumbnail;
            image.alt = `${point.title || '다이빙 포인트'} 대표 사진`;
            image.loading = 'lazy';
            image.onerror = () => image.remove();
            content.appendChild(image);
          } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'map-point-popup-empty';
            placeholder.textContent = '등록된 사진 없음';
            content.appendChild(placeholder);
          }
          const body = document.createElement('div');
          body.className = 'map-point-popup-body';
          const kicker = document.createElement('span');
          kicker.textContent = 'DIVE POINT';
          const title = document.createElement('strong');
          title.textContent = point.title || '이름 없는 다이빙 포인트';
          const location = document.createElement('p');
          location.textContent = point.location || '위치 정보 없음';
          const count = document.createElement('small');
          count.textContent = `등록 게시물 ${Number(point.postCount || 1).toLocaleString('ko-KR')}개`;
          body.append(kicker, title, location, count);
          content.appendChild(body);
          infoWindow.setContent(content);
          infoWindow.open({ map, anchor: marker });
        };
        const addMarker = (pos, point) => {
          hasMarker = true;
          bounds.extend(pos);
          const marker = new google.maps.Marker({ map, position: pos, title: point.title, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#0f9f91', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 } });
          marker.addListener('click', () => openPointInfo(marker, point));
        };
        const grouped = new Map();
        for (const point of points || []) {
          const lat = Number(point.location_lat);
          const lng = Number(point.location_lng);
          const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
          const location = String(point.location || '').trim();
          const site = String(point.dive_site || '').trim();
          const key = hasCoords ? `${lat.toFixed(5)},${lng.toFixed(5)}` : (site || location).toLowerCase();
          if (!key) continue;
          const current = grouped.get(key);
          if (current) {
            current.postCount += 1;
            if (!current.thumbnail_url && point.thumbnail_url) current.thumbnail_url = point.thumbnail_url;
          } else {
            grouped.set(key, { ...point, lat: hasCoords ? lat : null, lng: hasCoords ? lng : null, title: site || location, location: location || site, postCount: 1 });
          }
        }
        for (const point of Array.from(grouped.values()).slice(0, 120)) {
          if (point.lat != null && point.lng != null) {
            addMarker({ lat: point.lat, lng: point.lng }, point);
            continue;
          }
          const name = point.location || point.title;
          const c = parseCoord(name);
          if (c) {
            addMarker(c, point);
            continue;
          }
          await new Promise((resolve) => geocoder.geocode({ address: name }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const loc = results[0].geometry.location;
              addMarker({ lat: loc.lat(), lng: loc.lng() }, point);
            }
            resolve(true);
          }));
        }
        if (hasMarker) map.fitBounds(bounds);
        else setMapError('등록된 포인트가 없습니다.');
      } catch (e) {
        const code = String(e?.message || e || 'unknown_error');
        if (code === 'google_maps_api_key_missing' || code === 'Google Maps API key missing') {
          setMapError('구글 지도 API 키가 없어.');
        } else if (code === 'google_maps_auth_failed') {
          setMapError('구글 지도 인증이 실패했어. API 키 제한을 확인해줘.');
        } else if (code === 'google_maps_load_timeout') {
          setMapError('구글 지도 스크립트가 시간 내에 로딩되지 않았어.');
        } else if (code === 'google_maps_load_failed') {
          setMapError('구글 지도 스크립트 로딩 실패');
        } else {
          setMapError(`지도 로딩 실패: ${code}`);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [canAccess, section]);

  useEffect(() => {
    if (!canAccess) return;
    if (section !== 'feeds' && section !== 'reels') return;
    (async () => {
      try {
        const r = await api('/api/admin/table/app_posts?limit=500');
        setTableRows(r.rows || []);
      } catch (e) {
        setError(e.message || '게시물 조회 실패');
      }
    })();
  }, [canAccess, section]);

  useEffect(() => {
    if (!canAccess) return;
    if (section !== 'tables') return;
    refreshTableRows(selectedTable);
  }, [section, selectedTable, canAccess]);

  const trendData = useMemo(() => {
    const mapify = (arr) => Object.fromEntries((arr || []).map((x) => [x.day, Number(x.count || 0)]));
    const s = mapify(growth?.series?.signups), p = mapify(growth?.series?.posts), i = mapify(growth?.series?.interactions), d = mapify(growth?.series?.dauApprox);
    const days = Array.from(new Set([...Object.keys(s), ...Object.keys(p), ...Object.keys(i), ...Object.keys(d)])).sort();
    return days.map((day) => ({ day: day.slice(5), signups: s[day] || 0, posts: p[day] || 0, interactions: i[day] || 0, dau: d[day] || 0 }));
  }, [growth]);
  const memberTypeData = useMemo(() => [{ name: '일반회원', value: Number(stats?.personalUsers || 0) }, { name: '리조트회원', value: Number(stats?.resortUsers || 0) }], [stats]);
  const roleCounts = useMemo(() => ({
    all: users.length,
    general: users.filter((item) => {
      const role = String(item?.role || '').toLowerCase();
      const accountType = String(item?.account_type || '').toLowerCase();
      return role !== 'admin' && role !== 'resort' && accountType !== 'resort';
    }).length,
    resort: users.filter((item) => String(item?.account_type || item?.role || '').toLowerCase() === 'resort').length,
    admin: users.filter((item) => String(item?.role || '').toLowerCase() === 'admin').length,
  }), [users]);
  const reportBreakdown = useMemo(() => {
    const counts = { received: 0, reviewing: 0, resolved: 0, rejected: 0, open: 0 };
    for (const item of reports || []) {
      const status = String(item?.status || '').toLowerCase();
      if (status in counts) counts[status] += 1;
      else counts.open += 1;
    }
    return counts;
  }, [reports]);
  const visibleMembers = useMemo(() => {
    return (users || []).filter((item) => {
      const role = String(item?.role || '').toLowerCase();
      const accountType = String(item?.account_type || '').toLowerCase();
      const group = role === 'admin' ? 'admin' : accountType === 'resort' || role === 'resort' ? 'resort' : 'general';
      const effectiveRoleFilter = section === 'resort-members' ? 'resort' : section === 'admin-members' ? 'admin' : section === 'users' ? 'general' : memberRoleFilter;
      return effectiveRoleFilter === 'all' ? true : group === effectiveRoleFilter;
    });
  }, [memberRoleFilter, section, users]);
  const feedRows = useMemo(() => (tableRows || []).filter((r) => !r.video_url), [tableRows]);
  const reelRows = useMemo(() => (tableRows || []).filter((r) => !!r.video_url), [tableRows]);
  const getReelThumb = (row) => {
    const v = String(row?.video_url || '');
    const m = v.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (m?.[1]) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
    return row?.image_url || '';
  };
  const feedTotalPages = Math.max(1, Math.ceil(feedRows.length / PAGE_SIZE));
  const reelTotalPages = Math.max(1, Math.ceil(reelRows.length / PAGE_SIZE));
  const feedPageRows = useMemo(() => feedRows.slice((feedPage - 1) * PAGE_SIZE, (feedPage - 1) * PAGE_SIZE + PAGE_SIZE), [feedRows, feedPage]);
  const reelPageRows = useMemo(() => reelRows.slice((reelPage - 1) * PAGE_SIZE, (reelPage - 1) * PAGE_SIZE + PAGE_SIZE), [reelRows, reelPage]);
  useEffect(() => { if (feedPage > feedTotalPages) setFeedPage(feedTotalPages); }, [feedPage, feedTotalPages]);
  useEffect(() => { if (reelPage > reelTotalPages) setReelPage(reelTotalPages); }, [reelPage, reelTotalPages]);
  const blockData = useMemo(() => { const blocked = Number(stats?.blockedUsers || 0), usersCount = Number(stats?.users || 0); return [{ name: '정상', value: Math.max(0, usersCount - blocked) }, { name: '차단', value: blocked }]; }, [stats]);

  const menus = [
    { key: 'dashboard', label: '운영 대시보드', description: '핵심 지표와 처리 현황', group: 'home' },
    { key: 'statistics', label: '통계·실시간', description: '서비스 지표와 현재 접속자', group: 'home' },
    { key: 'users', label: '일반 회원', description: '일반 계정·상태 관리', group: 'members' },
    { key: 'resort-members', label: '리조트 회원', description: '리조트 계정과 담당자 관리', group: 'members' },
    { key: 'admin-members', label: '관리자 회원', description: '관리자 계정과 접근 권한 관리', group: 'members' },
    { key: 'certifications', label: '라이선스 인증', description: '자격 증빙 검토와 승인', group: 'members' },
    { key: 'devices', label: '디바이스 관리', description: '푸시 토큰과 등록 기기', group: 'members' },
    { key: 'consents', label: '동의 이력', description: '약관 버전과 동의 증빙', group: 'members' },
    { key: 'reports', label: '신고·안전 관리', description: '신고 접수와 조치 기록', group: 'safety' },
    { key: 'feeds', label: '피드 관리', description: '게시물 검수와 삭제', group: 'safety' },
    { key: 'reels', label: '릴스 관리', description: '영상 콘텐츠 운영', group: 'safety' },
    { key: 'map', label: '포인트 지도', description: '다이빙 포인트 현황', group: 'safety' },
    { key: 'dive-guides', label: '다이빙 가이드', description: '공식 정보 작성과 발행', group: 'safety' },
    { key: 'comments', label: '댓글 관리', description: '댓글 검색과 정책 위반 조치', group: 'safety' },
    { key: 'reported-chats', label: '신고 채팅', description: '신고된 대화만 안전 검토', group: 'safety' },
    { key: 'resorts', label: '리조트 관리', description: '파트너 정보와 상품', group: 'business' },
    { key: 'resort-partners', label: '리조트 파트너', description: '입점 서류 심사와 담당자 연결', group: 'business' },
    { key: 'resort-bookings', label: '리조트 예약', description: '예약 접수와 확정 관리', group: 'business' },
    { key: 'pricing', label: '리조트 가격', description: '서버 기반 가격 상품 관리', group: 'business' },
    { key: 'education-applications', label: '교육 신청 관리', description: '상담·교육기관·강사 배정', group: 'business' },
    { key: 'ads', label: '광고 운영', description: '광고 슬롯과 노출 관리', group: 'business' },
    { key: 'subscriptions', label: '인앱 구독', description: '회원 이용 기간과 스토어 검증 이력', group: 'business' },
    { key: 'push', label: '푸시 알림', description: '회원·그룹 메시지 발송', group: 'communication' },
    { key: 'notification-history', label: '알림 이력', description: '전송·읽음·딥링크 확인', group: 'communication' },
    { key: 'communication', label: '통신 설정', description: '상황별 발송 채널 설정', group: 'communication' },
    { key: 'messaging-usage', label: '메시지 사용량', description: 'SMS·이메일 비용과 사용량', group: 'communication' },
    { key: 'legal', label: '약관·정책', description: '가입 정책 실시간 게시', group: 'communication' },
    { key: 'logs', label: '감사 로그', description: '관리자 변경 이력', group: 'system' },
    { key: 'api-management', label: 'API 관리', description: '외부 서비스 키와 연결 설정', group: 'system' },
    { key: 'operations', label: '운영 상태', description: '장애·실패·대기 상태 점검', group: 'system' },
    { key: 'architecture', label: '시스템 아키텍처', description: '서버·데이터·외부 연동 구성', group: 'system' },
    { key: 'jobs', label: '작업 관리', description: '백그라운드 작업 실행', group: 'system' },
    { key: 'admin-access', label: '관리자 권한', description: '관리자 계정 보안 현황', group: 'system' },
    { key: 'data', label: '데이터 조회', description: '운영 DB 읽기 전용 조회', group: 'system' },
    { key: 'settings', label: '관리자 정보', description: '계정과 보안 설정', group: 'system' },
    { key: 'dive-logs', label: '다이빙 로그', description: '기록 수치와 운영 검토', group: 'extended' },
    { key: 'media', label: '미디어 저장소', description: '파일·소유자·URL 점검', group: 'extended' },
    { key: 'stamps', label: '스템프·업적', description: '정의와 지급 기록 확인', group: 'extended' },
    { key: 'app-version', label: '앱 버전 정책', description: '최소 버전과 업데이트', group: 'extended' },
    { key: 'support', label: '고객지원 문의', description: '웹사이트 고객지원 접수와 처리', group: 'communication' },
    { key: 'partnership-inquiries', label: '제휴 문의', description: '글로벌 다이빙 제휴 제안 관리', group: 'business' },
    { key: 'analytics', label: '운영 분석', description: '30일 활동 추이', group: 'extended' },
    { key: 'donations', label: '후원·결제', description: 'PayPal 거래 참조 기록', group: 'extended' },
    { key: 'engagement', label: '관계·좋아요', description: '집중 활동과 어뷰징 점검', group: 'extended' },
  ];

  const menuGroups = [
    { key: 'home', label: '운영 홈', eyebrow: 'Overview', icon: 'home' },
    { key: 'members', label: '회원 운영', eyebrow: 'Members', icon: 'members' },
    { key: 'safety', label: '콘텐츠·안전', eyebrow: 'Trust & Safety', icon: 'safety' },
    { key: 'business', label: '파트너·수익', eyebrow: 'Business', icon: 'business' },
    { key: 'communication', label: '고객 커뮤니케이션', eyebrow: 'Engagement', icon: 'communication' },
    { key: 'system', label: '시스템 관리', eyebrow: 'System', icon: 'system' },
    { key: 'extended', label: '확장 운영', eyebrow: 'Extended', icon: 'extended' },
  ];
  const activeMenu = menus.find((item) => item.key === section)
    || (section === 'resort-detail' || section === 'facilities' || section === 'resort-imports' ? menus.find((item) => item.key === 'resorts') : menus[0]);
  useEffect(() => {
    if (!activeMenu?.group) return;
    setOpenMenuGroups((current) => current.size === 1 && current.has(activeMenu.group)
      ? current
      : new Set([activeMenu.group]));
  }, [activeMenu?.group]);
  const navigateSection = (key, params = {}) => {
    setSection(key);
    setMenuSearch('');
    setMobileNavOpen(false);
    const search = new URLSearchParams(params).toString();
    window.history.pushState({}, '', `/${key}${search ? `?${search}` : ''}`);
  };
  const toggleMenuGroup = (key) => {
    setOpenMenuGroups((current) => current.has(key) ? current : new Set([key]));
  };
  const menuBadge = (key) => {
    if (key === 'reports') return Number(reportBreakdown?.received || 0) + Number(reportBreakdown?.reviewing || 0);
    if (key === 'certifications') return (certifications || []).filter((item) => ['reviewing', 'unregistered'].includes(String(item?.status || '').toLowerCase())).length;
    return 0;
  };

  const openResortDetail = (resortId) => {
    const id = String(resortId || '').trim();
    if (!id) return;
    setError('');
    setSelectedResortId(id);
    setSection('resort-detail');
    window.history.pushState({}, '', `/resort-detail?resort=${encodeURIComponent(id)}`);
  };

  const closeResortDetail = () => {
    setError('');
    setSelectedResortId('');
    setSection('resorts');
    window.history.pushState({}, '', '/resorts');
  };

  if (authLoading && !canAccess) {
    return (
      <div className="auth-shell auth-shell--loading">
        <div className="auth-loading-card">
          <img className="brand-logo" src={brandLogoUrl} alt="Divergram" />
          <div className="auth-loader" aria-hidden><span /><span /><span /></div>
          <strong>운영 콘솔을 준비하고 있습니다</strong>
          <p>관리자 권한과 서비스 상태를 안전하게 확인하는 중입니다.</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="auth-shell">
        <section className="auth-stage">
          <div className="auth-story">
            <div className="auth-story-noise" aria-hidden />
            <div className="auth-story-brand">
              <img className="brand-logo" src={brandLogoUrl} alt="" />
              <div><strong>DIVERGRAM</strong><span>OPERATIONS</span></div>
            </div>
            <div className="auth-story-copy">
              <p className="auth-eyebrow">DIVE · CONNECT · OPERATE</p>
              <h1>바다와 커뮤니티를<br />한눈에 운영하세요.</h1>
              <p>회원, 콘텐츠, 리조트, 광고와 알림까지 Divergram의 모든 운영 흐름을 하나의 콘솔에서 관리합니다.</p>
            </div>
            <div className="auth-story-status">
              <span><i /> API Gateway</span>
              <span><i /> Secure Session</span>
              <span>SEOUL · KST</span>
            </div>
          </div>
          <div className="auth-panel">
            <div className="auth-panel-inner">
              <div className="auth-panel-heading">
                <span className="auth-console-tag">ADMIN CONSOLE</span>
                <h2>관리자 로그인</h2>
                <p>승인된 관리자 계정으로 접속해 주세요.</p>
              </div>

              <form className="auth-email-form" onSubmit={startEmailLogin}>
                <label>
                  <span>관리자 이메일</span>
                  <input
                    type="email"
                    autoComplete="username"
                    value={emailLoginEmail}
                    onChange={(e) => setEmailLoginEmail(e.target.value)}
                    placeholder="admin@divergram.com"
                    required
                  />
                </label>
                <label>
                  <span>비밀번호</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={emailLoginPassword}
                    onChange={(e) => setEmailLoginPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    required
                  />
                </label>
                <button className="auth-submit" type="submit" disabled={emailLoginBusy}>
                  {emailLoginBusy ? '인증 중...' : '운영 콘솔 입장'}
                  {!emailLoginBusy && <span aria-hidden>→</span>}
                </button>
              </form>

              {authError && <p className="error auth-error">로그인 정보를 확인해 주세요. <small>{authError}</small></p>}
              <p className="auth-note"><span aria-hidden>◆</span> 모든 관리자 접속과 변경 이력은 안전하게 기록됩니다.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#admin-content">본문으로 바로가기</a>
      {mobileNavOpen && <button className="nav-scrim" aria-label="메뉴 닫기" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'is-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <div className="sidebar-brand" title="Divergram Admin">
          <img className="brand-logo" src={brandLogoUrl} alt="Divergram" />
          <div><strong>DIVERGRAM</strong><span>OPERATIONS</span></div>
          <button className="sidebar-collapse-btn" type="button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'} title={sidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'}><span className={`sidebar-collapse-glyph ${sidebarCollapsed ? 'is-collapsed' : ''}`} aria-hidden /></button>
          <button className="mobile-nav-close" type="button" onClick={() => setMobileNavOpen(false)} aria-label="관리 메뉴 닫기">×</button>
        </div>
        <label className="nav-search"><input type="search" aria-label="관리 메뉴 검색" placeholder="메뉴 검색…" value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setMenuSearch(''); }} /></label>
        <nav className="side-menu" aria-label="관리자 메뉴">
          {menuGroups.filter((group) => menus.some((item) => item.group === group.key && `${item.label} ${item.description} ${group.label}`.toLowerCase().includes(menuSearch.trim().toLowerCase()))).map((group) => (
            <div className={`menu-group ${menuSearch.trim() || openMenuGroups.has(group.key) ? 'is-open' : ''}`} key={group.key}>
              <button className="menu-group-toggle" data-menu-depth="1" type="button" onClick={() => { if (sidebarCollapsed) setSidebarCollapsed(false); toggleMenuGroup(group.key); }} aria-expanded={openMenuGroups.has(group.key)}>
                <span className="menu-group-heading"><span className="menu-group-icon" aria-hidden><Icon kind={group.icon} /></span><span><small>{group.eyebrow}</small><strong>{group.label}</strong></span></span>
                <i aria-hidden>⌄</i>
              </button>
              <div className="menu-group-items">
                {menus.filter((item) => item.group === group.key && (!sidebarCollapsed || activeMenu?.key === item.key) && `${item.label} ${item.description} ${group.label}`.toLowerCase().includes(menuSearch.trim().toLowerCase())).map((m) => (
                  <button key={m.key} data-menu-depth="2" aria-current={activeMenu?.key === m.key ? 'page' : undefined} className={activeMenu?.key === m.key ? 'active' : ''} onClick={() => navigateSection(m.key)} title={m.description}>
                    <span className="menu-icon" aria-hidden><Icon kind={m.key === 'settings' ? 'profile' : m.key} /></span>
                    <span className="menu-label"><strong>{m.label}</strong><small>{m.description}</small></span>
                    {menuBadge(m.key) > 0 && <span className="menu-count">{menuBadge(m.key)}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <span className="sidebar-avatar">{String(sessionUser?.name || sessionUser?.email || 'A').slice(0, 1).toUpperCase()}</span>
            <div><strong>{sessionUser?.name || 'Administrator'}</strong><span>{sessionUser?.email}</span></div>
          </div>
          <button className="logout-btn" onClick={logout} title="로그아웃"><span>로그아웃</span><span aria-hidden>↗</span></button>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="topbar-title">
            <button className="mobile-menu-btn" onClick={() => setMobileNavOpen(true)} aria-label="관리 메뉴 열기">☰</button>
            <div><span>Divergram / {menuGroups.find((group) => group.key === activeMenu?.group)?.label || '운영 홈'}</span><h1>{activeMenu?.label || '운영 대시보드'}</h1><p>{activeMenu?.description || 'Divergram 운영 현황을 관리합니다.'}</p></div>
          </div>
          <div className="topbar-actions">
            <button className="topbar-refresh" type="button" onClick={() => refresh()} disabled={loading}>{loading ? '동기화 중' : '데이터 새로고침'}</button>
            <div className={`system-beacon ${stats && !error ? 'is-online' : 'is-offline'}`}><i />{error ? '일부 조회 실패' : stats ? '관리 API 연결됨' : '연결 확인 중'}</div>
            <div className="topbar-time"><span>IP {connectionInfo.ip} · {connectionInfo.countryCode}</span><strong>{kstDateTime} KST</strong></div>
          </div>
        </header>

        <main id="admin-content" tabIndex={-1} className={`content section-${section} ${section === 'map' ? 'map-mode' : ''}`}>
          <Suspense fallback={<div className="card" role="status" style={{ padding: 28 }}>화면을 준비하고 있습니다…</div>}>
          {error && <p className="error" role="alert">{error}</p>}

        {section === 'dashboard' && <DashboardSection stats={stats} trendData={trendData} memberTypeData={memberTypeData} blockData={blockData} roleCounts={roleCounts} reportBreakdown={reportBreakdown} reports={reports} certifications={certifications} mapPoints={mapPoints} adSlots={adSlots} externalIntegrations={externalIntegrations} externalIntegrationsLoading={externalIntegrationsLoading} onRefreshExternalIntegrations={refreshExternalIntegrations} onNavigate={navigateSection} />}
        {section === 'statistics' && <StatisticsSection />}
        {section === 'map' && <MapSection mapRef={mapRef} mapError={mapError} pointCount={mapPoints.length} />}
        {(section === 'users' || section === 'resort-members' || section === 'admin-members') && <UsersSection users={visibleMembers} query={query} setQuery={setQuery} refresh={refresh} updateUser={updateUser} sendPasswordResetEmail={sendPasswordResetEmail} deleteUserPosts={deleteUserPosts} deleteUser={deleteUser} deleteUsersBulk={deleteUsersBulk} roleFilter={section === 'resort-members' ? 'resort' : section === 'admin-members' ? 'admin' : 'general'} setRoleFilter={setMemberRoleFilter} fixedRole title={section === 'resort-members' ? '리조트 회원' : section === 'admin-members' ? '관리자 회원' : '일반 회원'} roleCounts={roleCounts} />}
        {section === 'certifications' && <CertificationsSection certifications={certifications} refresh={refresh} />}
        {section === 'devices' && <OperationsDataSection type="devices" />}
        {section === 'consents' && <OperationsDataSection type="consents" />}
        {section === 'comments' && <OperationsDataSection type="comments" />}
        {section === 'reported-chats' && <OperationsDataSection type="chats" />}
        {section === 'notification-history' && <OperationsDataSection type="notifications" />}
        {section === 'communication' && <CommunicationSettingsSection />}
        {section === 'messaging-usage' && <MessagingUsageSection />}
        {section === 'dive-logs' && <OperationalModuleSection type="dive-logs" />}
        {section === 'media' && <OperationalModuleSection type="media" />}
        {section === 'stamps' && <OperationalModuleSection type="stamps" />}
        {section === 'app-version' && <OperationalModuleSection type="versions" />}
        {section === 'support' && <WebsiteInquiriesSection kind="support" />}
        {section === 'partnership-inquiries' && <WebsiteInquiriesSection kind="partnership" />}
        {section === 'analytics' && <OperationalModuleSection type="analytics" />}
        {section === 'donations' && <OperationalModuleSection type="donations" />}
        {section === 'engagement' && <OperationalModuleSection type="engagement" />}
        {section === 'admin-access' && <OperationsDataSection type="admins" />}
        {section === 'operations' && <OperationsOverviewSection />}
        {section === 'architecture' && <SystemArchitectureSection />}
        {section === 'api-management' && <ApiManagementSection />}
        {section === 'subscriptions' && <StoreSubscriptionsSection />}
        {section === 'jobs' && <OperationsDataSection type="jobs" />}
        {section === 'data' && <TablesSection tables={tables} selectedTable={selectedTable} setSelectedTable={setSelectedTable} refreshTableRows={refreshTableRows} tableRows={tableRows} />}
        {section === 'reports' && <ReportsSection reports={reports} refresh={refresh} reportBreakdown={reportBreakdown} />}
        {(section === 'resorts' || section === 'resort-imports') && <ResortsSection users={users} resorts={resorts} resortPrices={resortPrices} resortQuery={resortQuery} setResortQuery={setResortQuery} refreshResorts={refreshResorts} updateResort={updateResort} createResort={createResort} removeResort={removeResort} saveResortPrice={saveResortPrice} />}
        {section === 'pricing' && <ResortPricingSection resorts={resorts} resortPrices={resortPrices} refreshResortPrices={refreshResortPrices} />}
        {section === 'resort-bookings' && <ResortBookingsSection />}
        {section === 'resort-partners' && <ResortPartnersSection />}
        {section === 'education-applications' && <EducationApplicationsSection />}
        {section === 'resort-detail' && <ResortDetailSection resorts={resorts} resortPrices={resortPrices} selectedResortId={selectedResortId} onBack={closeResortDetail} onOpenFacilities={() => setSection('facilities')} />}
        {section === 'facilities' && <ResortFacilitiesSection resorts={resorts} updateResort={updateResort} refreshResorts={refreshResorts} />}
        {section === 'feeds' && <FeedsSection feedRows={feedRows} feedPageRows={feedPageRows} feedPage={feedPage} feedTotalPages={feedTotalPages} setFeedPage={setFeedPage} onDelete={deletePost} onBulkDelete={deletePostsBulk} />}
        {section === 'dive-guides' && <DiveGuidesSection />}
        {section === 'reels' && <ReelsSection reelRows={reelRows} reelPageRows={reelPageRows} reelPage={reelPage} reelTotalPages={reelTotalPages} setReelPage={setReelPage} getReelThumb={getReelThumb} onDelete={deletePost} onBulkDelete={deletePostsBulk} />}
        {section === 'ads' && <AdsSection adSlots={adSlots} refresh={refresh} />}
        {section === 'push' && <PushSection reports={reports} certifications={certifications} reportBreakdown={reportBreakdown} />}
        {section === 'legal' && <LegalSection />}
        {section === 'logs' && <LogsSection logs={logs} />}
          {section === 'settings' && <SettingsSection refresh={refresh} refreshSession={refreshSession} sessionUser={sessionUser} reports={reports} certifications={certifications} reportBreakdown={reportBreakdown} />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
