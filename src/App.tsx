import { useEffect, useState } from 'react';
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
import LocationFeed from './components/LocationFeed';
import ProfileEdit from './components/ProfileEdit';
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
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [activityCounts, setActivityCounts] = useState({ likes: 0, comments: 0, saved: 0 });
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

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
    } else if (page === 'settings' || page === 'activity' || page === 'report') {
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
        return <Explore onViewProfile={handleViewProfile} />;
      case 'reels':
        return <Reels onViewProfile={handleViewProfile} />;
      case 'profile':
        return <Profile userId={selectedUserId} onViewPost={handleViewProfile} onEditProfile={handleEditProfile} />;
      case 'profile-saved':
        return <Profile userId={selectedUserId} onViewPost={handleViewProfile} onEditProfile={handleEditProfile} initialTab="saved" />;
      case 'location':
        return selectedLocation ? (
          <LocationFeed
            location={selectedLocation}
            onBack={() => setCurrentPage('home')}
            onViewProfile={handleViewProfile}
          />
        ) : <Feed onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selectedPostId} />;
      case 'settings':
        return (
          <div className="p-6 md:p-8 max-w-3xl">
            <h1 className="text-2xl font-bold mb-6">설정</h1>
            <div className="space-y-3">
              <button onClick={handleEditProfile} className="w-full text-left p-4 rounded-lg border hover:bg-gray-50">프로필 수정</button>
              <button onClick={() => setCurrentPage('activity')} className="w-full text-left p-4 rounded-lg border hover:bg-gray-50">내 활동 보기</button>
              <button onClick={() => setCurrentPage('report')} className="w-full text-left p-4 rounded-lg border hover:bg-gray-50">문제 신고</button>
              <button onClick={() => signOut()} className="w-full text-left p-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">로그아웃</button>
            </div>
          </div>
        );
      case 'activity':
        return (
          <div className="p-6 md:p-8 max-w-3xl">
            <h1 className="text-2xl font-bold mb-6">내 활동</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4"><p className="text-sm text-gray-500">좋아요</p><p className="text-2xl font-bold">{activityCounts.likes}</p></div>
              <div className="rounded-lg border p-4"><p className="text-sm text-gray-500">댓글</p><p className="text-2xl font-bold">{activityCounts.comments}</p></div>
              <div className="rounded-lg border p-4"><p className="text-sm text-gray-500">저장</p><p className="text-2xl font-bold">{activityCounts.saved}</p></div>
            </div>
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
          onClose={() => setShowProfileEdit(false)}
          onSaved={() => {
            setShowProfileEdit(false);
          }}
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
