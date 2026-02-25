import { useState, useEffect } from 'react';
import { Search as SearchIcon, X, User, Image } from 'lucide-react';
import { db, Profile, Post } from '../lib/internal-db';
import MasonryGrid from './MasonryGrid';

interface SearchProps {
  onClose: () => void;
  onUserSelect: (userId: string) => void;
  onPostSelect?: (postId: string) => void;
}

interface SearchResults {
  users: Profile[];
  posts: Post[];
}

export default function Search({ onClose, onUserSelect, onPostSelect }: SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts'>('all');

  useEffect(() => {
    if (query.trim()) {
      search();
    } else {
      setResults({ users: [], posts: [] });
    }
  }, [query]);

  const search = async () => {
    setLoading(true);

    const [usersResponse, postsResponse] = await Promise.all([
      db
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10),
      db
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey(id, username, avatar_url, full_name),
          likes(id, user_id),
          comments(id),
          post_media(id, media_url, media_type, order_index)
        `)
        .or(`caption.ilike.%${query}%,location.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    setResults({
      users: usersResponse.data || [],
      posts: postsResponse.data || []
    });
    setLoading(false);
  };

  const filteredUsers = results.users;
  const filteredPosts = results.posts;
  const totalResults = filteredUsers.length + filteredPosts.length;

  const displayUsers = activeTab === 'posts' ? [] : filteredUsers;
  const displayPosts = activeTab === 'users' ? [] : filteredPosts;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 bg-white border-b border-gray-300">
          <div className="p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="hover:bg-gray-100 p-2 rounded-full"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="사용자, 게시물 검색"
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          {query && totalResults > 0 && (
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-3 text-sm font-medium ${
                  activeTab === 'all'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-500'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${
                  activeTab === 'users'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-500'
                }`}
              >
                <User className="h-4 w-4" />
                사용자
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${
                  activeTab === 'posts'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-500'
                }`}
              >
                <Image className="h-4 w-4" />
                게시물
              </button>
            </div>
          )}
        </div>

        <div className="p-4">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다
            </div>
          )}

          {!loading && displayUsers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                사용자
              </h3>
              <div className="space-y-2">
                {displayUsers.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      onUserSelect(profile.id);
                      onClose();
                    }}
                    className="flex items-center space-x-3 w-full p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5 flex-shrink-0">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 font-semibold text-lg">
                            {profile.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">{profile.username}</p>
                      {profile.full_name && (
                        <p className="text-gray-500 text-sm">{profile.full_name}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && displayPosts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Image className="h-4 w-4" />
                게시물
              </h3>
              <MasonryGrid
                items={displayPosts.map((post) => {
                  const firstMedia = post.post_media && post.post_media.length > 0
                    ? post.post_media.sort((a, b) => a.order_index - b.order_index)[0]
                    : null;
                  const displayUrl = firstMedia?.media_url || post.image_url || post.video_url || '';
                  const isVideo = firstMedia?.media_type === 'video' || (!firstMedia && !!post.video_url);
                  const aspectRatio = 0.6 + Math.random() * 0.8;

                  return {
                    id: post.id,
                    url: displayUrl,
                    isVideo,
                    likes: post.likes.length,
                    comments: post.comments.length,
                    aspectRatio,
                  };
                })}
                onItemClick={(id) => {
                  if (onPostSelect) {
                    onPostSelect(id);
                  }
                  onClose();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
