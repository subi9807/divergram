import { useEffect, useState } from 'react';
import { db, Post } from '../lib/internal-db';
import MasonryGrid from './MasonryGrid';
import PostDetail from './PostDetail';

interface ExploreProps {
  onViewProfile?: (userId: string) => void;
  initialTag?: string;
}

export default function Explore({ onViewProfile, initialTag = '' }: ExploreProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [tagFilter, setTagFilter] = useState(initialTag);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    setTagFilter(initialTag || '');
  }, [initialTag]);

  const loadPosts = async () => {
    const { data } = await db
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(id, username, avatar_url),
        likes(id),
        comments(id),
        post_media(id, media_url, media_type, order_index)
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      setPosts(data as Post[]);
    }
    setLoading(false);
  };

  const filteredPosts = tagFilter
    ? posts.filter((p) => String(p.caption || '').toLowerCase().includes(`#${tagFilter.toLowerCase()}`))
    : posts;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 md:px-4 py-0 md:py-8 text-gray-900 dark:text-gray-100">
      {filteredPosts.length > 0 ? (
        <>
          {tagFilter && (
            <div className="mb-3 text-sm text-gray-600 dark:text-gray-300">#{tagFilter} 검색 결과</div>
          )}
          <MasonryGrid
            items={filteredPosts.map((post) => {
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
              const found = filteredPosts.find((p) => p.id === id) || null;
              setSelectedPost(found);
            }}
          />
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>탐색할 게시물이 없습니다</p>
        </div>
      )}

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onViewProfile={(userId) => {
            onViewProfile?.(userId);
            setSelectedPost(null);
          }}
        />
      )}
    </div>
  );
}
