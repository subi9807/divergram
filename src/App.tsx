import { useState } from 'react';
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
  const [showProfileEdit, setShowProfileEdit] = useState(false);

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

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Feed onViewProfile={handleViewProfile} onViewLocation={handleViewLocation} selectedPostId={selectedPostId} />;
      case 'explore':
        return <Explore />;
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
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">설정</h1>
            <p className="text-gray-600">설정 페이지 준비 중입니다.</p>
          </div>
        );
      case 'activity':
        return (
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">내 활동</h1>
            <p className="text-gray-600">내 활동 페이지 준비 중입니다.</p>
          </div>
        );
      case 'report':
        return (
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">문제 신고</h1>
            <p className="text-gray-600">문제 신고 페이지 준비 중입니다.</p>
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
