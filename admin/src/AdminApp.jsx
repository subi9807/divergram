import { useEffect, useMemo, useRef, useState } from 'react';
import { api, API_BASE, DEFAULT_ADMIN_KEY } from './lib/api';
import { loadGoogleMaps, parseCoord } from './lib/maps';
import Icon from './components/Icon';
import DashboardSection from './sections/DashboardSection';
import MapSection from './sections/MapSection';
import UsersSection from './sections/UsersSection';
import ResortsSection from './sections/ResortsSection';
import FeedsSection from './sections/FeedsSection';
import ReelsSection from './sections/ReelsSection';
import TablesSection from './sections/TablesSection';
import LogsSection from './sections/LogsSection';
import SettingsSection from './sections/SettingsSection';

export function AdminApp() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('dg_admin_key') || DEFAULT_ADMIN_KEY || '');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [resortQuery, setResortQuery] = useState('');
  const [resorts, setResorts] = useState([]);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState(() => new URLSearchParams(window.location.search).get('section') || 'dashboard');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('app_users');
  const [tableRows, setTableRows] = useState([]);
  const [authCheck, setAuthCheck] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [feedPage, setFeedPage] = useState(1);
  const [reelPage, setReelPage] = useState(1);
  const PAGE_SIZE = 10;
  const mapRef = useRef(null);

  const refresh = async () => {
    if (!adminKey) return setError('ADMIN API KEY를 입력해줘.');
    setLoading(true); setError(''); localStorage.setItem('dg_admin_key', adminKey);
    try {
      const [s, u, l, t, g, rr] = await Promise.all([
        api('/api/admin/stats', { adminKey }),
        api(`/api/admin/users?q=${encodeURIComponent(query)}&limit=50`, { adminKey }),
        api('/api/admin/audit-logs?limit=20', { adminKey }),
        api('/api/admin/tables', { adminKey }),
        api('/api/admin/growth?days=14', { adminKey }),
        api(`/api/admin/resorts?q=${encodeURIComponent(resortQuery)}`, { adminKey }),
      ]);
      setStats(s.stats); setUsers(u.users || []); setLogs(l.logs || []); setTables(t.tables || []); setGrowth(g); setResorts(rr.resorts || []);
    } catch (e) { setError(e.message || '요청 실패'); } finally { setLoading(false); }
  };

  const refreshTableRows = async (name = selectedTable) => {
    try { const r = await api(`/api/admin/table/${name}?limit=100`, { adminKey }); setTableRows(r.rows || []); }
    catch (e) { setError(e.message || '테이블 조회 실패'); }
  };

  const updateUser = async (id, payload) => { try { await api(`/api/admin/users/${id}`, { adminKey, method: 'PATCH', body: payload }); await refresh(); } catch (e) { setError(e.message || '수정 실패'); } };
  const deleteUser = async (id) => { if (!confirm('정말 이 사용자를 삭제할까?')) return; try { await api(`/api/admin/users/${id}`, { adminKey, method: 'DELETE' }); await refresh(); } catch (e) { setError(e.message || '삭제 실패'); } };

  const refreshResorts = async () => {
    try { const r = await api(`/api/admin/resorts?q=${encodeURIComponent(resortQuery)}`, { adminKey }); setResorts(r.resorts || []); }
    catch (e) { setError(e.message || '리조트 조회 실패'); }
  };

  const updateResort = async (id, patch) => {
    try { await api(`/api/admin/resorts/${id}`, { adminKey, method: 'PATCH', body: patch }); await refreshResorts(); }
    catch (e) { setError(e.message || '리조트 수정 실패'); }
  };

  const seedBulk = async () => {
    try { setLoading(true); await api('/api/admin/seed-bulk', { adminKey, method: 'POST', body: { users: 50, posts: 300, comments: 1000, likes: 2000 } }); await api('/api/admin/migrate-normalized', { adminKey, method: 'POST' }); await refresh(); if (section === 'tables') await refreshTableRows(); }
    catch (e) { setError(e.message || '샘플 생성 실패'); } finally { setLoading(false); }
  };

  const checkUserAdminAuth = async () => {
    try {
      const [adminRes, userRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@divergram.com', password: 'Password123!' }) }),
        fetch(`${API_BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'sample1@divergram.com', password: 'Password123!' }) }),
      ]);
      setAuthCheck({ adminOk: adminRes.ok, userOk: userRes.ok });
    } catch { setAuthCheck({ adminOk: false, userOk: false }); }
  };

  useEffect(() => { if (adminKey) refresh(); }, []);
  useEffect(() => { const url = new URL(window.location.href); url.searchParams.set('section', section); window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`); }, [section]);
  useEffect(() => { if (!adminKey || section !== 'dashboard') return; const t = setInterval(() => refresh(), 5000); return () => clearInterval(t); }, [adminKey, section]);

  useEffect(() => {
    if (!adminKey || section !== 'map' || !mapRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        setMapError(''); await loadGoogleMaps(); if (cancelled || !window.google) return;
        const google = window.google;
        const map = new google.maps.Map(mapRef.current, { center: { lat: 36.5, lng: 127.8 }, zoom: 6, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
        const { points } = await api('/api/admin/map-points', { adminKey });
        const geocoder = new google.maps.Geocoder();
        const bounds = new google.maps.LatLngBounds(); let hasMarker = false;
        const addMarker = (pos, title) => { hasMarker = true; bounds.extend(pos); new google.maps.Marker({ map, position: pos, title, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 } }); };
        const unique = Array.from(new Set((points || []).flatMap((p) => [p.location, p.dive_site]).map((v) => String(v || '').trim()).filter(Boolean)));
        for (const name of unique.slice(0, 120)) {
          const c = parseCoord(name); if (c) { addMarker(c, name); continue; }
          await new Promise((resolve) => geocoder.geocode({ address: name }, (results, status) => { if (status === 'OK' && results?.[0]) { const loc = results[0].geometry.location; addMarker({ lat: loc.lat(), lng: loc.lng() }, name); } resolve(true); }));
        }
        if (hasMarker) map.fitBounds(bounds); else setMapError('등록된 포인트가 없습니다.');
      } catch { setMapError('지도 로딩 실패'); }
    })();
    return () => { cancelled = true; };
  }, [adminKey, section]);

  useEffect(() => { if (!adminKey) return; if (section !== 'feeds' && section !== 'reels') return; (async () => { try { const r = await api('/api/admin/table/app_posts?limit=500', { adminKey }); setTableRows(r.rows || []); } catch (e) { setError(e.message || '게시물 조회 실패'); } })(); }, [adminKey, section]);

  const trendData = useMemo(() => {
    const mapify = (arr) => Object.fromEntries((arr || []).map((x) => [x.day, Number(x.count || 0)]));
    const s = mapify(growth?.series?.signups), p = mapify(growth?.series?.posts), i = mapify(growth?.series?.interactions), d = mapify(growth?.series?.dauApprox);
    const days = Array.from(new Set([...Object.keys(s), ...Object.keys(p), ...Object.keys(i), ...Object.keys(d)])).sort();
    return days.map((day) => ({ day: day.slice(5), signups: s[day] || 0, posts: p[day] || 0, interactions: i[day] || 0, dau: d[day] || 0 }));
  }, [growth]);
  const memberTypeData = useMemo(() => [{ name: '일반회원', value: Number(stats?.personalUsers || 0) }, { name: '리조트회원', value: Number(stats?.resortUsers || 0) }], [stats]);
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
    { key: 'dashboard', label: '대시보드' }, { key: 'map', label: '포인트 지도' }, { key: 'users', label: '사용자 관리' }, { key: 'resorts', label: '리조트 관리' },
    { key: 'feeds', label: '피드 관리' }, { key: 'reels', label: '릴스 관리' }, { key: 'tables', label: '테이블 조회' },
    { key: 'logs', label: '감사 로그' }, { key: 'settings', label: '설정' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand" title="Divergram Admin">DG</div>
        <nav className="side-menu">
          {menus.map((m) => (
            <button key={m.key} className={section === m.key ? 'active' : ''} onClick={() => setSection(m.key)} title={m.label} aria-label={m.label}>
              <span className="menu-icon" aria-hidden><Icon kind={m.key} /></span><span className="menu-tip">{m.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="status-pill side"><span className={`dot ${stats ? 'ok' : 'bad'}`} />{stats ? '연결' : '미연결'}</div>
          <button className="logout-btn" onClick={() => { localStorage.removeItem('dg_admin_key'); setAdminKey(''); setStats(null); setUsers([]); setLogs([]); setGrowth(null); }} title="로그아웃">로그아웃</button>
        </div>
      </aside>

      <main className={`content section-${section} ${section === 'map' ? 'map-mode' : ''}`}>
        {section !== 'dashboard' && <div className="topbar"><button onClick={refresh} disabled={loading}>{loading ? '동기화 중...' : '동기화'}</button></div>}
        {section !== 'map' && error && <p className="error">{error}</p>}

        {section === 'dashboard' && <DashboardSection stats={stats} trendData={trendData} memberTypeData={memberTypeData} blockData={blockData} />}
        {section === 'map' && <MapSection mapRef={mapRef} mapError={mapError} />}
        {section === 'users' && <UsersSection users={users} query={query} setQuery={setQuery} refresh={refresh} updateUser={updateUser} deleteUser={deleteUser} />}
        {section === 'resorts' && <ResortsSection resorts={resorts} resortQuery={resortQuery} setResortQuery={setResortQuery} refreshResorts={refreshResorts} updateResort={updateResort} />}
        {section === 'feeds' && <FeedsSection feedRows={feedRows} feedPageRows={feedPageRows} feedPage={feedPage} feedTotalPages={feedTotalPages} setFeedPage={setFeedPage} />}
        {section === 'reels' && <ReelsSection reelRows={reelRows} reelPageRows={reelPageRows} reelPage={reelPage} reelTotalPages={reelTotalPages} setReelPage={setReelPage} getReelThumb={getReelThumb} />}
        {section === 'tables' && <TablesSection tables={tables} selectedTable={selectedTable} setSelectedTable={setSelectedTable} refreshTableRows={refreshTableRows} tableRows={tableRows} />}
        {section === 'logs' && <LogsSection logs={logs} />}
        {section === 'settings' && <SettingsSection adminKey={adminKey} setAdminKey={setAdminKey} loading={loading} refresh={refresh} seedBulk={seedBulk} checkUserAdminAuth={checkUserAdminAuth} authCheck={authCheck} />}
      </main>
    </div>
  );
}
