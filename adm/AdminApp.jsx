import { useEffect, useMemo, useRef, useState } from 'react';
import { api, API_BASE, setAdminAuthToken } from './lib/api';
import { loadGoogleMaps, parseCoord } from './lib/maps';
import Icon from './components/Icon';
import DashboardSection from './sections/DashboardSection';
import MapSection from './sections/MapSection';
import UsersSection from './sections/UsersSection';
import ReportsSection from './sections/ReportsSection';
import ResortsSection from './sections/ResortsSection';
import FeedsSection from './sections/FeedsSection';
import ReelsSection from './sections/ReelsSection';
import AdsSection from './sections/AdsSection';
import SettingsSection from './sections/SettingsSection';
import LogsSection from './sections/LogsSection';

const ADMIN_EMAILS = new Set(
  String(import.meta.env.VITE_ADMIN_EMAILS || 'subi9807@gmail.com')
    .split(',')
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean),
);

const ADMIN_PROVIDERS = [
  { key: 'google', label: 'Google로 로그인' },
  { key: 'apple', label: 'Apple로 로그인' },
  { key: 'facebook', label: 'Facebook으로 로그인' },
];

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isAllowedAdminEmail(value) {
  return ADMIN_EMAILS.has(normalizeEmail(value));
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
  const [oauthProviders, setOauthProviders] = useState({});
  const [emailLoginEmail, setEmailLoginEmail] = useState('');
  const [emailLoginPassword, setEmailLoginPassword] = useState('');
  const [emailLoginBusy, setEmailLoginBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [resortQuery, setResortQuery] = useState('');
  const [resorts, setResorts] = useState([]);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState(() => {
    const seg = (window.location.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
    const byPath = ['dashboard', 'map', 'users', 'reports', 'resorts', 'feeds', 'reels', 'ads', 'logs', 'settings'];
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
  const [feedPage, setFeedPage] = useState(1);
  const [reelPage, setReelPage] = useState(1);
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const PAGE_SIZE = 10;
  const mapRef = useRef(null);

  const hasAdminSession = !!sessionUser?.email && isAllowedAdminEmail(sessionUser.email);
  const canAccess = hasAdminSession;
  const authModeLabel = hasAdminSession ? `세션 로그인: ${sessionUser.email}` : '로그인 대기';

  const refreshSession = async () => {
    try {
      const j = await api('/api/auth/session');
      const session = j?.session || null;
      const email = normalizeEmail(session?.user?.email || '');
      if (email && isAllowedAdminEmail(email)) {
        setSessionUser(session.user);
        setAuthError('');
      } else {
        setSessionUser(null);
      }
    } catch {
      setSessionUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const refreshProviders = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/auth/oauth/providers`, { credentials: 'include' });
      const j = await safeReadJson(r);
      setOauthProviders(j?.providers || {});
    } catch {
      setOauthProviders({});
    }
  };

  const refresh = async ({ memberRole = memberRoleFilter } = {}) => {
    if (!canAccess) return setError('SNS 또는 이메일 로그인이 필요해.');
    setLoading(true);
    setError('');
    setAuthError('');
    try {
      const settled = await Promise.allSettled([
        api('/api/admin/stats'),
        api(`/api/admin/users?q=${encodeURIComponent(query)}&role=${encodeURIComponent(memberRole || 'all')}&limit=50`),
        api('/api/admin/audit-logs?limit=20'),
        api('/api/admin/tables'),
        api('/api/admin/growth?days=14'),
        api(`/api/admin/resorts?q=${encodeURIComponent(resortQuery)}`),
        api('/api/admin/reports?limit=50'),
        api('/api/admin/certifications?limit=50'),
        api('/api/admin/map-points'),
        api('/api/admin/ads?limit=20'),
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
      if (nextErrors.length) setError(nextErrors[0]);
    } catch (e) {
      const message = e.message || '요청 실패';
      setError(message);
    } finally {
      setLoading(false);
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

  const updateResort = async (id, patch) => {
    try {
      await api(`/api/admin/resorts/${id}`, { method: 'PATCH', body: patch });
      await refreshResorts();
    } catch (e) {
      setError(e.message || '리조트 수정 실패');
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
        fetch(`${API_BASE}/api/auth/session`, { credentials: 'include' }),
        api('/api/admin/health'),
      ]);
      const sessionJson = await safeReadJson(sessionResp);
      const session = sessionJson?.session || null;
      const email = normalizeEmail(session?.user?.email || '');
      setAuthCheck({
        sessionEmail: email || '-',
        sessionRole: session?.user?.role || 'unknown',
        adminAccess: !!healthResp?.ok,
        allowedAdmin: isAllowedAdminEmail(email),
        reportCount: reports.length,
      });
    } catch (e) {
      setAuthCheck({
        sessionEmail: normalizeEmail(sessionUser?.email || '') || '-',
        sessionRole: sessionUser?.role || 'unknown',
        adminAccess: false,
        allowedAdmin: isAllowedAdminEmail(sessionUser?.email || ''),
        reportCount: reports.length,
        error: e.message || 'auth_check_failed',
      });
    }
  };

  const startSocialLogin = (provider) => {
    const target = `${window.location.origin}${window.location.pathname}`;
    window.location.assign(
      `${API_BASE}/api/auth/oauth/${provider}/start?redirect=1&mode=login&sessionDays=30&returnTo=${encodeURIComponent(target)}`,
    );
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
    setAdSlots([]);
    setAuthCheck(null);
    setError('');
    setAuthError('');
  };

  useEffect(() => {
    refreshSession();
    refreshProviders();
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
    const target = `/${section}`;
    if (window.location.pathname !== target) {
      window.history.replaceState({}, '', target);
    }
  }, [section]);

  useEffect(() => {
    const onPop = () => {
      const seg = (window.location.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
      const byPath = ['dashboard', 'map', 'users', 'reports', 'resorts', 'feeds', 'reels', 'ads', 'logs', 'settings'];
      setSection(byPath.includes(seg) ? seg : 'dashboard');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!canAccess || section !== 'dashboard') return undefined;
    const t = setInterval(() => refresh(), 5000);
    return () => clearInterval(t);
  }, [canAccess, section, query, resortQuery, hasAdminSession]);

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
        const bounds = new google.maps.LatLngBounds();
        let hasMarker = false;
        const addMarker = (pos, title) => {
          hasMarker = true;
          bounds.extend(pos);
          new google.maps.Marker({ map, position: pos, title, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 } });
        };
        const unique = Array.from(new Set((points || []).flatMap((p) => [p.location, p.dive_site]).map((v) => String(v || '').trim()).filter(Boolean)));
        for (const name of unique.slice(0, 120)) {
          const c = parseCoord(name);
          if (c) {
            addMarker(c, name);
            continue;
          }
          await new Promise((resolve) => geocoder.geocode({ address: name }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const loc = results[0].geometry.location;
              addMarker({ lat: loc.lat(), lng: loc.lng() }, name);
            }
            resolve(true);
          }));
        }
        if (hasMarker) map.fitBounds(bounds);
        else setMapError('등록된 포인트가 없습니다.');
      } catch {
        setMapError('지도 로딩 실패');
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
      return role !== 'admin' && role !== 'resort';
    }).length,
    resort: users.filter((item) => String(item?.role || '').toLowerCase() === 'resort').length,
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
      const group = role === 'admin' ? 'admin' : role === 'resort' ? 'resort' : 'general';
      return memberRoleFilter === 'all' ? true : group === memberRoleFilter;
    });
  }, [memberRoleFilter, users]);
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
    { key: 'dashboard', label: '대시보드' },
    { key: 'map', label: '포인트 지도' },
    { key: 'users', label: '사용자 관리' },
    { key: 'reports', label: '신고 관리' },
    { key: 'resorts', label: '리조트 관리' },
    { key: 'feeds', label: '피드 관리' },
    { key: 'reels', label: '릴스 관리' },
    { key: 'ads', label: '광고 운영' },
    { key: 'logs', label: '감사 로그' },
    { key: 'settings', label: '설정' },
  ];

  if (authLoading && !canAccess) {
    return (
      <div className="auth-shell">
        <div className="auth-card card">
          <div className="brand auth-brand">DG</div>
          <h1>Divergram Admin</h1>
          <p>관리자 세션을 확인하는 중이야.</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="auth-shell">
        <section className="auth-card card">
          <div className="auth-hero">
            <div className="brand auth-brand">DG</div>
            <div>
              <h1>Divergram Admin</h1>
              <p>adm.divergram.com 에서 SNS 또는 이메일로 로그인해.</p>
            </div>
          </div>

          <div className="auth-social-grid">
            {ADMIN_PROVIDERS.map((provider) => {
              const enabled = !!oauthProviders?.[provider.key]?.enabled;
              return (
                <button key={provider.key} className={`auth-social-btn ${provider.key}`} onClick={() => startSocialLogin(provider.key)} disabled={!enabled}>
                  {provider.label}{enabled ? '' : ' (미설정)'}
                </button>
              );
            })}
          </div>

          <div className="auth-divider"><span>Email 로그인</span></div>

          <form className="auth-email-form" onSubmit={startEmailLogin}>
            <label>
              <span>이메일</span>
              <input
                type="email"
                autoComplete="username"
                value={emailLoginEmail}
                onChange={(e) => setEmailLoginEmail(e.target.value)}
                placeholder="admin@divergram.com"
              />
            </label>
            <label>
              <span>비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                value={emailLoginPassword}
                onChange={(e) => setEmailLoginPassword(e.target.value)}
                placeholder="Password"
              />
            </label>
            <button type="submit" disabled={emailLoginBusy}>{emailLoginBusy ? '로그인 중...' : '이메일로 로그인'}</button>
          </form>

          {authError && <p className="error">{authError}</p>}
          <p className="auth-note">관리자 계정만 접속돼. 로그인 성공 후에는 세션이 유지돼.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand" title="Divergram Admin">DG</div>
        <nav className="side-menu">
          {menus.map((m) => (
            <button key={m.key} className={section === m.key ? 'active' : ''} onClick={() => { setSection(m.key); window.history.pushState({}, '', `/${m.key}`); }} title={m.label} aria-label={m.label}>
              <span className="menu-icon" aria-hidden><Icon kind={m.key} /></span><span className="menu-tip">{m.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="status-pill side"><span className={`dot ${stats ? 'ok' : 'bad'}`} />{stats ? '연결' : '미연결'}</div>
          <button className="logout-btn" onClick={logout} title="로그아웃">로그아웃</button>
        </div>
      </aside>

      <main className={`content section-${section} ${section === 'map' ? 'map-mode' : ''}`}>
        <div className="topbar">
          <div className="topbar-left">
            <span className="topbar-badge">{authModeLabel}</span>
            {sessionUser?.email && <span className="topbar-badge light">{sessionUser.email}</span>}
          </div>
          <button onClick={refresh} disabled={loading}>{loading ? '동기화 중...' : '동기화'}</button>
        </div>
        {error && <p className="error">{error}</p>}

        {section === 'dashboard' && <DashboardSection stats={stats} trendData={trendData} memberTypeData={memberTypeData} blockData={blockData} roleCounts={roleCounts} reportBreakdown={reportBreakdown} reports={reports} certifications={certifications} mapPoints={mapPoints} adSlots={adSlots} />}
        {section === 'map' && <MapSection mapRef={mapRef} mapError={mapError} />}
        {section === 'users' && <UsersSection users={visibleMembers} query={query} setQuery={setQuery} refresh={refresh} updateUser={updateUser} deleteUserPosts={deleteUserPosts} deleteUser={deleteUser} deleteUsersBulk={deleteUsersBulk} roleFilter={memberRoleFilter} setRoleFilter={setMemberRoleFilter} roleCounts={roleCounts} />}
        {section === 'reports' && <ReportsSection reports={reports} refresh={refresh} reportBreakdown={reportBreakdown} />}
        {section === 'resorts' && <ResortsSection resorts={resorts} resortQuery={resortQuery} setResortQuery={setResortQuery} refreshResorts={refreshResorts} updateResort={updateResort} />}
        {section === 'feeds' && <FeedsSection feedRows={feedRows} feedPageRows={feedPageRows} feedPage={feedPage} feedTotalPages={feedTotalPages} setFeedPage={setFeedPage} onDelete={deletePost} onBulkDelete={deletePostsBulk} />}
        {section === 'reels' && <ReelsSection reelRows={reelRows} reelPageRows={reelPageRows} reelPage={reelPage} reelTotalPages={reelTotalPages} setReelPage={setReelPage} getReelThumb={getReelThumb} onDelete={deletePost} onBulkDelete={deletePostsBulk} />}
        {section === 'ads' && <AdsSection adSlots={adSlots} refresh={refresh} />}
        {section === 'logs' && <LogsSection logs={logs} />}
        {section === 'settings' && <SettingsSection loading={loading} refresh={refresh} seedBulk={seedBulk} checkUserAdminAuth={checkUserAdminAuth} authCheck={authCheck} sessionUser={sessionUser} reports={reports} certifications={certifications} reportBreakdown={reportBreakdown} />}
      </main>
    </div>
  );
}
