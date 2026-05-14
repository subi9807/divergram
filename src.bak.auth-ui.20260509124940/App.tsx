import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import Auth from './components/Auth';
import AppShell from './components/AppShell';
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
import { useEdgeSwipeNav } from './hooks/useEdgeSwipeNav';
import { getModalQueryValue, getModalStateFromQuery } from './hooks/useModalState';
import { getPageFromPathname, getPathnameFromPage } from './hooks/useRouteState';
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


  const urlState = useMemo(() => {
    const modal = getModalQueryValue(modalState);

    const pathname = getPathnameFromPage(currentPage, settingsTab);

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

      if (pathname === '/__ops') {
        const ok = q.get('k') === OPS_SECRET_KEY;
        setOpsAuthorized(ok);
        setCurrentPage(ok ? 'ops' : 'home');
      } else {
        const next = getPageFromPathname(pathname, window.location.hostname);
        setCurrentPage(next.page);
        if (next.settingsTab) setSettingsTab(next.settingsTab);
      }

      setSelection({
        userId: q.get('user') || undefined,
        postId: q.get('post') || undefined,
        location: q.get('loc') || undefined,
        exploreTag: q.get('tag') || '',
      });

      setModalState(getModalStateFromQuery(q.get('modal')));
    };

    applyFromUrl();
    window.addEventListener('popstate', applyFromUrl);
    return () => window.removeEventListener('popstate', applyFromUrl);
  }, []);


  useEdgeSwipeNav({ navHistoryRef, navFutureRef, navMuteRef });

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
    if (page === 'home') {
      setCurrentPage('home');
      setSelection({ userId: undefined, postId: undefined, location: undefined, exploreTag: '' });
      setModalState({
        create: false,
        search: false,
        notifications: false,
        messages: false,
        editProfile: false,
      });
      return;
    }

    if (page === 'create') {
      setModalState((prev) => ({ ...prev, create: true }));
    } else if (page === 'search') {
      setModalState((prev) => ({ ...prev, search: true }));
    } else if (page === 'notifications' || page === 'messages') {
      setCurrentPage(page as AppPage);
      setSelection((prev) => ({ ...prev, userId: undefined, postId: undefined, location: undefined, exploreTag: '' }));
      setModalState({
        create: false,
        search: false,
        notifications: false,
        messages: false,
        editProfile: false,
      });
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
      setSelection((prev) => ({ ...prev, userId: undefined, postId: undefined, location: undefined, exploreTag: '' }));
      setModalState({
        create: false,
        search: false,
        notifications: false,
        messages: false,
        editProfile: false,
      });
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
        return <Feed key="feed-home" onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selection.postId} />;
      case 'explore':
        return <Explore onViewProfile={handleViewProfile} initialTag={selection.exploreTag} />;
      case 'resorts':
        return <Resorts onViewProfile={handleViewProfile} />;
      case 'reels':
        return <Reels onViewProfile={handleViewProfile} />;
      case 'messages':
        return <Messages />;
      case 'notifications':
        return <Notifications onViewProfile={handleViewProfile} />;
      case 'profile':
        return <Profile userId={selection.userId} onViewProfile={handleViewProfile} onEditProfile={handleEditProfile} />;
      case 'profile-saved':
        return <Profile userId={selection.userId} onViewProfile={handleViewProfile} onEditProfile={handleEditProfile} initialTab="saved" />;
      case 'location':
        return (
          <LocationMapPage
            location={selection.location || ''}
            onBack={() => setCurrentPage('home')}
          />
        );
      case 'post':
        return <Feed key={`feed-post-${selection.postId || 'none'}`} onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selection.postId} singlePostMode />;
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
        return <Feed key="feed-home" onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selection.postId} />;
    }
  };

  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={handleNavigate}
      createModal={modalState.create ? (
        <CreatePost
          onClose={() => setModalState((prev) => ({ ...prev, create: false }))}
          onPostCreated={() => {
            setModalState((prev) => ({ ...prev, create: false }));
            setCurrentPage('home');
          }}
        />
      ) : undefined}
      searchModal={modalState.search ? (
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
      ) : undefined}
      editProfileModal={modalState.editProfile ? (
        <ProfileEdit
          onClose={closeProfileEdit}
          onSaved={closeProfileEdit}
        />
      ) : undefined}
    >
      {renderPage()}
    </AppShell>
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
