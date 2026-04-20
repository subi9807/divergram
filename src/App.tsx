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
import type { AppPage, ModalState, SelectionState, SettingsTab } from './types/navigation';

const OPS_API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://divergram.com');
const OPS_SECRET_KEY = 'm1na-ops-260301';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [modalState, setModalState] = useState<ModalState>({
    create: false,
    search: false,
    notifications: false,
    messages: false,
    editProfile: false,
  });
  const [selection, setSelection] = useState<SelectionState>({
    userId: undefined,
    postId: undefined,
    location: undefined,
    exploreTag: '',
  });
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
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
    const modal = modalState.create
      ? 'create'
      : modalState.search
      ? 'search'
      : modalState.notifications
      ? 'notifications'
      : modalState.messages
      ? 'messages'
      : modalState.editProfile
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
    if (selection.userId) params.set('user', selection.userId);
    if (selection.postId) params.set('post', selection.postId);
    if (selection.location) params.set('loc', selection.location);
    if (currentPage === 'explore' && selection.exploreTag) params.set('tag', selection.exploreTag);
    if (modal) params.set('modal', modal);
    if (currentPage === 'ops' && opsAuthorized) params.set('k', OPS_SECRET_KEY);

    return `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  }, [
    currentPage,
    selection.userId,
    selection.postId,
    selection.location,
    modalState.create,
    modalState.search,
    modalState.notifications,
    modalState.messages,
    modalState.editProfile,
    settingsTab,
    selection.exploreTag,
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

      setSelection({
        userId: q.get('user') || undefined,
        postId: q.get('post') || undefined,
        location: q.get('loc') || undefined,
        exploreTag: q.get('tag') || '',
      });

      const modal = q.get('modal');
      setModalState({
        create: modal === 'create',
        search: modal === 'search',
        notifications: modal === 'notifications',
        messages: modal === 'messages',
        editProfile: modal === 'edit-profile',
      });
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
      setModalState((prev) => ({ ...prev, create: true }));
    } else if (page === 'search') {
      setModalState((prev) => ({ ...prev, search: true }));
    } else if (page === 'notifications') {
      setModalState((prev) => ({ ...prev, notifications: true }));
    } else if (page === 'messages') {
      setModalState((prev) => ({ ...prev, messages: true }));
    } else if (page === 'saved') {
      setSelection((prev) => ({ ...prev, userId: user?.id }));
      setCurrentPage('profile-saved');
    } else if (page === 'settings') {
      setCurrentPage('settings');
      setSettingsTab('profile');
      setSelection((prev) => ({ ...prev, userId: undefined }));
    } else if (page === 'activity') {
      setCurrentPage('settings');
      setSettingsTab('activity');
      setSelection((prev) => ({ ...prev, userId: undefined }));
    } else if (page === 'account') {
      setCurrentPage('settings');
      setSettingsTab('account');
      setSelection((prev) => ({ ...prev, userId: undefined }));
    } else if (page === 'location' || page === 'post') {
      setCurrentPage(page as AppPage);
    } else if (page === 'report') {
      setCurrentPage('report');
      setSelection((prev) => ({ ...prev, userId: undefined }));
    } else if (page === 'admin') {
      setCurrentPage('admin');
    } else {
      setCurrentPage(page as AppPage);
      setSelection((prev) => ({ ...prev, userId: undefined }));
    }
  };

  const handleViewProfile = (userId: string) => {
    setSelection((prev) => ({ ...prev, userId }));
    setCurrentPage('profile');
    setModalState((prev) => ({ ...prev, search: false }));
  };

  const handleViewLocation = (location: string) => {
    setSelection((prev) => ({ ...prev, location }));
    setCurrentPage('location');
  };

  const handleEditProfile = () => {
    setModalState((prev) => ({ ...prev, editProfile: true }));
  };

  const closeProfileEdit = () => {
    setModalState((prev) => ({ ...prev, editProfile: false }));
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
        return <Feed onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selection.postId} />;
      case 'explore':
        return <Explore onViewProfile={handleViewProfile} initialTag={selection.exploreTag} />;
      case 'resorts':
        return <Resorts onViewProfile={handleViewProfile} />;
      case 'reels':
        return <Reels onViewProfile={handleViewProfile} />;
      case 'profile':
        return <Profile userId={selection.userId} onViewPost={handleViewProfile} onEditProfile={handleEditProfile} />;
      case 'profile-saved':
        return <Profile userId={selection.userId} onViewPost={handleViewProfile} onEditProfile={handleEditProfile} initialTab="saved" />;
      case 'location':
        return (
          <LocationMapPage
            location={selection.location || ''}
            onBack={() => setCurrentPage('home')}
          />
        );
      case 'post':
        return <Feed onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selection.postId} singlePostMode />;
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
        return <Feed onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selection.postId} />;
    }
  };

  return (
    <>
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        {renderPage()}
      </Layout>

      {modalState.create && (
        <CreatePost
          onClose={() => setModalState((prev) => ({ ...prev, create: false }))}
          onPostCreated={() => {
            setModalState((prev) => ({ ...prev, create: false }));
            setCurrentPage('home');
          }}
        />
      )}

      {modalState.search && (
        <Search
          onClose={() => setModalState((prev) => ({ ...prev, search: false }))}
          onUserSelect={(userId) => {
            setSelection((prev) => ({ ...prev, userId }));
            setCurrentPage('profile');
            setModalState((prev) => ({ ...prev, search: false }));
          }}
          onPostSelect={(postId) => {
            setSelection((prev) => ({ ...prev, postId }));
            setCurrentPage('home');
            setModalState((prev) => ({ ...prev, search: false }));
          }}
        />
      )}

      {modalState.notifications && (
        <Notifications
          isOpen={modalState.notifications}
          onClose={() => setModalState((prev) => ({ ...prev, notifications: false }))}
          onViewProfile={handleViewProfile}
        />
      )}

      {modalState.messages && (
        <Messages
          isOpen={modalState.messages}
          onClose={() => setModalState((prev) => ({ ...prev, messages: false }))}
        />
      )}

      {modalState.editProfile && (
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
