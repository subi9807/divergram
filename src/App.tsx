import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Feed from './components/Feed';
import CreatePost from './components/CreatePost';
import Search from './components/Search';
import Profile from './components/Profile';
import Messages from './components/Messages';
import Explore from './components/Explore';
import Resorts from './components/Resorts';
import Reels from './components/Reels';
import Notifications from './components/Notifications';
import LocationMapPage from './components/LocationMapPage';
import ProfileEdit from './components/ProfileEdit';
import AdminConsole from './components/AdminConsole';
import SettingsPage from './components/SettingsPage';
import { db } from './lib/internal-db';

const OPS_API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://divergram.com');
const OPS_SECRET_KEY = 'm1na-ops-260301';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [exploreTag, setExploreTag] = useState('');
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'account' | 'activity'>('profile');
  const [opsAuthorized, setOpsAuthorized] = useState(false);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsInfo, setOpsInfo] = useState<{ apiOk: boolean; users: number; posts: number; reels: number; apiBase: string; ts: string } | null>(null);
  const navHistoryRef = useRef<string[]>([]);
  const navFutureRef = useRef<string[]>([]);
  const navMuteRef = useRef(false);

  const gestureRef = useRef({
    x: 0,
    y: 0,
    active: false,
    fromTop: false,
    blocked: false,
    edge: 'none' as 'left' | 'right' | 'none',
  });


  const urlState = useMemo(() => {
    const modal = showCreatePost
      ? 'create'
      : showSearch
      ? 'search'
      : showNotifications
      ? 'notifications'
      : showMessages
      ? 'messages'
      : showProfileEdit
      ? 'edit-profile'
      : '';

    let pathname = '/';
    if (currentPage === 'explore') pathname = '/explore';
    else if (currentPage === 'resorts') pathname = '/resorts';
    else if (currentPage === 'reels') pathname = '/reels';
    else if (currentPage === 'profile') pathname = '/profile';
    else if (currentPage === 'profile-saved') pathname = '/profile/saved';
    else if (currentPage === 'location') pathname = '/location';
    else if (currentPage === 'post') pathname = '/post';
    else if (currentPage === 'settings') {
      if (settingsTab === 'account') pathname = '/account';
      else if (settingsTab === 'activity') pathname = '/activity';
      else pathname = '/settings';
    }
    else if (currentPage === 'report') pathname = '/report';
    else if (currentPage === 'admin') pathname = '/admin';
    else if (currentPage === 'ops') pathname = '/__ops';

    const params = new URLSearchParams();
    if (selectedUserId) params.set('user', selectedUserId);
    if (selectedPostId) params.set('post', selectedPostId);
    if (selectedLocation) params.set('loc', selectedLocation);
    if (currentPage === 'explore' && exploreTag) params.set('tag', exploreTag);
    if (modal) params.set('modal', modal);
    if (currentPage === 'ops' && opsAuthorized) params.set('k', OPS_SECRET_KEY);

    return `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  }, [
    currentPage,
    selectedUserId,
    selectedPostId,
    selectedLocation,
    showCreatePost,
    showSearch,
    showNotifications,
    showMessages,
    showProfileEdit,
    settingsTab,
    exploreTag,
    opsAuthorized,
  ]);

  useEffect(() => {
    const applyFromUrl = () => {
      const { pathname, search } = window.location;
      const q = new URLSearchParams(search);

      if (pathname === '/explore') setCurrentPage('explore');
      else if (pathname === '/resorts') setCurrentPage('resorts');
      else if (pathname === '/reels') setCurrentPage('reels');
      else if (pathname === '/profile') setCurrentPage('profile');
      else if (pathname === '/profile/saved') setCurrentPage('profile-saved');
      else if (pathname === '/location') setCurrentPage('location');
      else if (pathname === '/post') setCurrentPage('post');
      else if (pathname === '/settings') {
        setCurrentPage('settings');
        setSettingsTab('profile');
      }
      else if (pathname === '/activity') {
        setCurrentPage('settings');
        setSettingsTab('activity');
      }
      else if (pathname === '/account') {
        setCurrentPage('settings');
        setSettingsTab('account');
      }
      else if (pathname === '/report') setCurrentPage('report');
      else if (pathname === '/admin') setCurrentPage('admin');
      else if (pathname === '/__ops') {
        const ok = q.get('k') === OPS_SECRET_KEY;
        setOpsAuthorized(ok);
        setCurrentPage(ok ? 'ops' : 'home');
      }
      else if (window.location.hostname === 'manager.divergram.com' && pathname === '/') {
        setCurrentPage('admin');
      }
      else setCurrentPage('home');

      setSelectedUserId(q.get('user') || undefined);
      setSelectedPostId(q.get('post') || undefined);
      setSelectedLocation(q.get('loc') || undefined);
      setExploreTag(q.get('tag') || '');

      const modal = q.get('modal');
      setShowCreatePost(modal === 'create');
      setShowSearch(modal === 'search');
      setShowNotifications(modal === 'notifications');
      setShowMessages(modal === 'messages');
      setShowProfileEdit(modal === 'edit-profile');
    };

    applyFromUrl();
    window.addEventListener('popstate', applyFromUrl);
    return () => window.removeEventListener('popstate', applyFromUrl);
  }, []);


  useEffect(() => {
    const isMobile = () => window.matchMedia('(max-width: 1279px)').matches;

    const playNavMotion = (dir: 'back' | 'forward') => {
      const el = document.getElementById('root');
      if (!el) return;
      el.classList.remove('dg-nav-back', 'dg-nav-forward');
      // reflow
      void el.getBoundingClientRect();
      el.classList.add(dir === 'back' ? 'dg-nav-back' : 'dg-nav-forward');
      window.setTimeout(() => el.classList.remove('dg-nav-back', 'dg-nav-forward'), 240);
    };

    const onStart = (e: TouchEvent) => {
      if (!isMobile()) return;
      const t = e.touches[0];
      if (!t) return;
      const target = e.target as HTMLElement | null;
      const blocked = !!target?.closest('input, textarea, [contenteditable="true"], [data-no-gesture="true"]');
      const edge = t.clientX <= 80 ? 'left' : (t.clientX >= window.innerWidth - 80 ? 'right' : 'none');
      gestureRef.current = {
        x: t.clientX,
        y: t.clientY,
        active: true,
        fromTop: window.scrollY <= 2,
        blocked,
        edge,
      };
    };

    const applyDragOffset = (dx: number) => {
      const el = document.getElementById('root');
      if (!el) return;
      const limited = Math.max(-26, Math.min(26, dx * 0.22));
      el.style.transform = `translateX(${limited}px)`;
      el.style.transition = 'transform 0ms';
    };

    const resetDragOffset = () => {
      const el = document.getElementById('root');
      if (!el) return;
      el.style.transition = 'transform 180ms ease-out';
      el.style.transform = 'translateX(0px)';
      window.setTimeout(() => {
        el.style.transition = '';
      }, 190);
    };

    const onMove = (e: TouchEvent) => {
      const state = gestureRef.current;
      if (!state.active || state.blocked || !isMobile()) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - state.x;
      const dy = t.clientY - state.y;
      if ((state.edge === 'left' || state.edge === 'right') && Math.abs(dx) > Math.abs(dy) * 1.1) {
        applyDragOffset(dx);
      }
    };

    const onEnd = (e: TouchEvent) => {
      const state = gestureRef.current;
      if (!state.active || state.blocked || !isMobile()) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - state.x;
      const dy = t.clientY - state.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      resetDragOffset();

      if (absX > 90 && absX > absY * 1.25) {
        if (dx > 0 && state.edge === 'left') {
          const h = navHistoryRef.current;
          if (h.length > 1) {
            const current = h.pop();
            if (current) navFutureRef.current.push(current);
            const prev = h[h.length - 1];
            if (prev) {
              playNavMotion('back');
              navMuteRef.current = true;
              window.history.pushState({}, '', prev);
              window.dispatchEvent(new PopStateEvent('popstate'));
              window.setTimeout(() => { navMuteRef.current = false; }, 60);
            }
          }
        } else if (dx < 0 && state.edge === 'right') {
          const f = navFutureRef.current;
          const next = f.pop();
          if (next) {
            playNavMotion('forward');
            navHistoryRef.current.push(next);
            navMuteRef.current = true;
            window.history.pushState({}, '', next);
            window.dispatchEvent(new PopStateEvent('popstate'));
            window.setTimeout(() => { navMuteRef.current = false; }, 60);
          }
        }
      } else if (state.fromTop && dy > 120 && absY > absX * 1.25) {
        window.location.reload();
      }

      gestureRef.current.active = false;
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onStart as any);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onEnd as any);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const nextUrl = `${window.location.origin}${urlState}`;
    if (`${window.location.origin}${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState({}, '', urlState);
    }
  }, [urlState, user]);

  useEffect(() => {
    const cur = `${window.location.pathname}${window.location.search}`;
    if (navMuteRef.current) return;
    const h = navHistoryRef.current;
    if (h[h.length - 1] !== cur) {
      h.push(cur);
      if (h.length > 80) h.shift();
      navFutureRef.current = [];
    }
  }, [urlState]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const handleNavigate = (page: string) => {
    if (page === 'create') {
      setShowCreatePost(true);
    } else if (page === 'search') {
      setShowSearch(true);
    } else if (page === 'notifications') {
      setShowNotifications(true);
    } else if (page === 'messages') {
      setShowMessages(true);
    } else if (page === 'saved') {
      setSelectedUserId(user?.id);
      setCurrentPage('profile-saved');
    } else if (page === 'settings') {
      setCurrentPage('settings');
      setSettingsTab('profile');
      setSelectedUserId(undefined);
    } else if (page === 'activity') {
      setCurrentPage('settings');
      setSettingsTab('activity');
      setSelectedUserId(undefined);
    } else if (page === 'account') {
      setCurrentPage('settings');
      setSettingsTab('account');
      setSelectedUserId(undefined);
    } else if (page === 'location' || page === 'post') {
      setCurrentPage(page);
    } else if (page === 'report') {
      setCurrentPage(page);
      setSelectedUserId(undefined);
    } else if (page === 'admin') {
      setCurrentPage('admin');
    } else {
      setCurrentPage(page);
      setSelectedUserId(undefined);
    }
  };

  const handleViewProfile = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentPage('profile');
    setShowSearch(false);
  };

  const handleViewLocation = (location: string) => {
    setSelectedLocation(location);
    setCurrentPage('location');
  };

  const handleEditProfile = () => {
    setShowProfileEdit(true);
  };

  const closeProfileEdit = () => {
    setShowProfileEdit(false);
    const url = new URL(window.location.href);
    if (url.searchParams.get('modal') === 'edit-profile') {
      url.searchParams.delete('modal');
      const next = `${url.pathname}${url.search}`;
      window.history.replaceState({}, '', next || '/');
    }
  };


  const loadOps = async () => {
    setOpsLoading(true);
    try {
      const [healthRes, usersRes, postsRes] = await Promise.all([
        fetch(`${OPS_API_BASE}/api/health`).then((r) => r.ok).catch(() => false),
        db.from('profiles').select('*'),
        db.from('posts').select('*'),
      ]);

      const posts = (postsRes as any)?.data || [];
      const reels = posts.filter((p: any) => !!p.video_url).length;
      setOpsInfo({
        apiOk: !!healthRes,
        users: ((usersRes as any)?.data || []).length,
        posts: posts.length,
        reels,
        apiBase: OPS_API_BASE,
        ts: new Date().toLocaleString(),
      });
    } finally {
      setOpsLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!user || !reportText.trim() || reportLoading) return;
    setReportLoading(true);
    await db.from('reports').insert({
      user_id: user.id,
      reason: reportText.trim(),
      status: 'open',
      created_at: new Date().toISOString(),
    });
    setReportText('');
    setReportLoading(false);
    alert('신고가 접수되었습니다.');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Feed onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selectedPostId} />;
      case 'explore':
        return <Explore onViewProfile={handleViewProfile} initialTag={exploreTag} />;
      case 'resorts':
        return <Resorts onViewProfile={handleViewProfile} />;
      case 'reels':
        return <Reels onViewProfile={handleViewProfile} />;
      case 'profile':
        return <Profile userId={selectedUserId} onViewPost={handleViewProfile} onEditProfile={handleEditProfile} />;
      case 'profile-saved':
        return <Profile userId={selectedUserId} onViewPost={handleViewProfile} onEditProfile={handleEditProfile} initialTab="saved" />;
      case 'location':
        return (
          <LocationMapPage
            location={selectedLocation || ''}
            onBack={() => setCurrentPage('home')}
          />
        );
      case 'post':
        return <Feed onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selectedPostId} singlePostMode />;
      case 'settings':
        return <SettingsPage />;
      case 'admin':
        return <AdminConsole />;
      case 'ops':
        return (
          <div className="p-6 md:p-8 max-w-3xl text-gray-900 dark:text-gray-100">
            <h1 className="text-2xl font-bold mb-4">내부 점검 패널</h1>
            <p className="text-sm text-gray-600 mb-4">이 페이지는 비공개 URL 전용이야.</p>
            <div className="rounded-lg border p-4 space-y-3">
              <button className="px-4 py-2 rounded-md bg-blue-500 text-white disabled:opacity-50" onClick={loadOps} disabled={opsLoading}>
                {opsLoading ? '점검 중...' : '상태 점검'}
              </button>
              {opsInfo && (
                <div className="text-sm space-y-1">
                  <p>API 상태: <b>{opsInfo.apiOk ? '정상' : '실패'}</b></p>
                  <p>API 주소: <code>{opsInfo.apiBase}</code></p>
                  <p>사용자 수: <b>{opsInfo.users}</b></p>
                  <p>게시물 수: <b>{opsInfo.posts}</b></p>
                  <p>릴스 수: <b>{opsInfo.reels}</b></p>
                  <p>점검 시각: {opsInfo.ts}</p>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-gray-500">접속 URL: /__ops?k={OPS_SECRET_KEY}</p>
          </div>
        );
      case 'report':
        return (
          <div className="p-6 md:p-8 max-w-3xl text-gray-900 dark:text-gray-100">
            <h1 className="text-2xl font-bold mb-6">문제 신고</h1>
            <div className="rounded-lg border p-4">
              <p className="text-gray-700 mb-3">서비스 문제를 남겨주세요.</p>
              <textarea
                className="w-full border rounded-md p-3 min-h-32"
                placeholder="예: 로그인 후 피드가 비어 보입니다."
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
              <button
                className="mt-3 px-4 py-2 rounded-md bg-blue-500 text-white disabled:opacity-50"
                onClick={handleSubmitReport}
                disabled={reportLoading || !reportText.trim()}
              >
                {reportLoading ? '제출 중...' : '제출'}
              </button>
            </div>
          </div>
        );
      default:
        return <Feed onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selectedPostId} />;
    }
  };

  return (
    <>
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        {renderPage()}
      </Layout>

      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={() => {
            setShowCreatePost(false);
            setCurrentPage('home');
          }}
        />
      )}

      {showSearch && (
        <Search
          onClose={() => setShowSearch(false)}
          onUserSelect={(userId) => {
            setSelectedUserId(userId);
            setCurrentPage('profile');
            setShowSearch(false);
          }}
          onPostSelect={(postId) => {
            setSelectedPostId(postId);
            setCurrentPage('home');
            setShowSearch(false);
          }}
        />
      )}

      {showNotifications && (
        <Notifications
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          onViewProfile={handleViewProfile}
        />
      )}

      {showMessages && (
        <Messages
          isOpen={showMessages}
          onClose={() => setShowMessages(false)}
        />
      )}

      {showProfileEdit && (
        <ProfileEdit
          onClose={closeProfileEdit}
          onSaved={closeProfileEdit}
        />
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <MainApp />
      </AppSettingsProvider>
    </AuthProvider>
  );
}

export default App;
