import { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Feed from './components/Feed';
import CreatePost from './components/CreatePost';
import Search from './components/Search';
import Profile from './components/Profile';
import Messages from './components/Messages';
import Explore from './components/Explore';
import Reels from './components/Reels';
import Notifications from './components/Notifications';
import LocationMapPage from './components/LocationMapPage';
import ProfileEdit from './components/ProfileEdit';
import PersonalInfoEdit from './components/PersonalInfoEdit';
import AdminConsole from './components/AdminConsole';
import { db } from './lib/internal-db';

function MainApp() {
  const { user, loading, signOut } = useAuth();
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
  const [activityCounts, setActivityCounts] = useState({ likes: 0, comments: 0, saved: 0 });
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'account' | 'activity'>('profile');

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

    const params = new URLSearchParams();
    if (selectedUserId) params.set('user', selectedUserId);
    if (selectedPostId) params.set('post', selectedPostId);
    if (selectedLocation) params.set('loc', selectedLocation);
    if (currentPage === 'explore' && exploreTag) params.set('tag', exploreTag);
    if (modal) params.set('modal', modal);

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
  ]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: likes }, { data: comments }, { data: saved }] = await Promise.all([
        db.from('likes').select('*').eq('user_id', user.id),
        db.from('comments').select('*').eq('user_id', user.id),
        db.from('saved_posts').select('*').eq('user_id', user.id),
      ]);
      setActivityCounts({
        likes: likes?.length || 0,
        comments: comments?.length || 0,
        saved: saved?.length || 0,
      });
    })();
  }, [user]);

  useEffect(() => {
    const applyFromUrl = () => {
      const { pathname, search } = window.location;
      const q = new URLSearchParams(search);

      if (pathname === '/explore') setCurrentPage('explore');
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
    if (!user) return;
    const nextUrl = `${window.location.origin}${urlState}`;
    if (`${window.location.origin}${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState({}, '', urlState);
    }
  }, [urlState, user]);

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
    } else if (page === 'report' || page === 'admin') {
      setCurrentPage(page);
      setSelectedUserId(undefined);
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
      case 'reels':
        return <Reels onViewProfile={handleViewProfile} />;
      case 'profile':
        return <Profile userId={selectedUserId} onViewPost={handleViewProfile} onEditProfile={handleEditProfile} />;
      case 'profile-saved':
        return <Profile userId={selectedUserId} onViewPost={handleViewProfile} onEditProfile={handleEditProfile} initialTab="saved" />;
      case 'location':
        return selectedLocation ? (
          <LocationMapPage
            location={selectedLocation}
            onBack={() => setCurrentPage('home')}
          />
        ) : <Feed onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selectedPostId} />;
      case 'post':
        return <Feed onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selectedPostId} singlePostMode />;
      case 'settings':
        return (
          <div className="p-6 md:p-8 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">설정</h1>

            <div className="flex gap-2 mb-6 border-b">
              <button
                onClick={() => setSettingsTab('profile')}
                className={`px-4 py-2 text-sm font-semibold ${settingsTab === 'profile' ? 'border-b-2 border-black' : 'text-gray-500'}`}
              >
                프로필 수정
              </button>
              <button
                onClick={() => setSettingsTab('account')}
                className={`px-4 py-2 text-sm font-semibold ${settingsTab === 'account' ? 'border-b-2 border-black' : 'text-gray-500'}`}
              >
                개인정보 수정
              </button>
              <button
                onClick={() => setSettingsTab('activity')}
                className={`px-4 py-2 text-sm font-semibold ${settingsTab === 'activity' ? 'border-b-2 border-black' : 'text-gray-500'}`}
              >
                내 활동 보기
              </button>
            </div>

            {settingsTab === 'profile' && (
              <div className="space-y-3">
                <p className="text-gray-600">프로필 사진/이름/소개 등 공개 프로필을 수정합니다.</p>
                <button onClick={handleEditProfile} className="px-4 py-2 rounded-lg border hover:bg-gray-50">프로필 편집 열기</button>
                <button onClick={() => setCurrentPage('report')} className="w-full text-left p-4 rounded-lg border hover:bg-gray-50">문제 신고</button>
                <button onClick={() => signOut()} className="w-full text-left p-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">로그아웃</button>
              </div>
            )}

            {settingsTab === 'account' && <PersonalInfoEdit />}

            {settingsTab === 'activity' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4"><p className="text-sm text-gray-500">좋아요</p><p className="text-2xl font-bold">{activityCounts.likes}</p></div>
                <div className="rounded-lg border p-4"><p className="text-sm text-gray-500">댓글</p><p className="text-2xl font-bold">{activityCounts.comments}</p></div>
                <div className="rounded-lg border p-4"><p className="text-sm text-gray-500">저장</p><p className="text-2xl font-bold">{activityCounts.saved}</p></div>
              </div>
            )}
          </div>
        );
      case 'report':
        return (
          <div className="p-6 md:p-8 max-w-3xl">
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
      case 'admin':
        return <AdminConsole />;
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
      <MainApp />
    </AuthProvider>
  );
}

export default App;
