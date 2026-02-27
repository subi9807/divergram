import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [visibleCount, setVisibleCount] = useState(18);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    setTagFilter(initialTag || '');
    setVisibleCount(getPageSize());
  }, [initialTag]);

  const getPageSize = () => {
    if (typeof window === 'undefined') return 18;
    return window.innerWidth < 768 ? 12 : 18;
  };

  useEffect(() => {
    const onResize = () => setVisibleCount((prev) => Math.max(prev, getPageSize()));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
      .limit(500);

    if (data) {
      setPosts(data as Post[]);
    }
    setLoading(false);
  };

  const filteredPosts = useMemo(() => (
    tagFilter
      ? posts.filter((p) => String(p.caption || '').toLowerCase().includes(`#${tagFilter.toLowerCase()}`))
      : posts
  ), [posts, tagFilter]);

  const displayedPosts = filteredPosts.slice(0, visibleCount);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const scrollRoot = containerRef.current?.closest('main.overflow-y-auto') as HTMLElement | null;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      setVisibleCount((prev) => Math.min(filteredPosts.length, prev + getPageSize()));
    }, { root: scrollRoot || null, rootMargin: '300px' });

    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredPosts.length]);

  useEffect(() => {
    const scrollRoot = containerRef.current?.closest('main.overflow-y-auto') as HTMLElement | null;

    const onScrollBottom = () => {
      if (scrollRoot) {
        const total = Math.max(1, scrollRoot.scrollHeight - scrollRoot.clientHeight);
        const ratio = scrollRoot.scrollTop / total;
        if (ratio < 0.8) return;
      } else {
        const doc = document.documentElement;
        const total = Math.max(1, doc.scrollHeight - window.innerHeight);
        const ratio = window.scrollY / total;
        if (ratio < 0.8) return;
      }
      setVisibleCount((prev) => Math.min(filteredPosts.length, prev + getPageSize()));
    };

    const target: any = scrollRoot || window;
    target.addEventListener('scroll', onScrollBottom, { passive: true });
    return () => target.removeEventListener('scroll', onScrollBottom);
  }, [filteredPosts.length]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full px-2 md:px-4 py-0 md:py-8 text-gray-900 dark:text-gray-100">
      {filteredPosts.length > 0 ? (
        <>
          {tagFilter && (
            <div className="mb-3 text-sm text-gray-600 dark:text-gray-300">#{tagFilter} 검색 결과</div>
          )}
          <MasonryGrid
            items={displayedPosts.map((post) => {
              const firstMedia = post.post_media && post.post_media.length > 0
                ? post.post_media.sort((a, b) => a.order_index - b.order_index)[0]
                : null;
              const displayUrl = firstMedia?.media_url || post.image_url || post.video_url || '';
              const isVideo = firstMedia?.media_type === 'video' || (!firstMedia && !!post.video_url);
              const aspectRatio = isVideo ? 9 / 16 : 0.8;

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

          <div ref={loadMoreRef} className="h-10" />
          {displayedPosts.length < filteredPosts.length && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-2">스크롤하면 더 불러와요</p>
          )}
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
