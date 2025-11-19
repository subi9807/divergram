import { useEffect, useState } from 'react';
import { supabase, Post } from '../lib/supabase';
import MasonryGrid from './MasonryGrid';

export default function Explore() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const { data } = await supabase
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 md:px-4 py-0 md:py-8">
      {posts.length > 0 ? (
        <MasonryGrid
          items={posts.map((post) => {
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
          onItemClick={(id) => console.log('Explore post clicked:', id)}
        />
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>탐색할 게시물이 없습니다</p>
        </div>
      )}
    </div>
  );
}
