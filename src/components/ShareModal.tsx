import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search } from 'lucide-react';
import { supabase, Post } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ShareModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

interface Follower {
  id: string;
  follower_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
}

export default function ShareModal({ post, isOpen, onClose }: ShareModalProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      loadFollowers();
    }
  }, [isOpen, user]);

  const loadFollowers = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('follows')
      .select(`
        id,
        follower_id,
        profiles!follows_follower_id_fkey(id, username, avatar_url, full_name)
      `)
      .eq('following_id', user.id);

    if (data) {
      setFollowers(data as unknown as Follower[]);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSend = async () => {
    if (selectedUsers.size === 0 || !user) return;

    setSending(true);

    const postUrl = `${window.location.origin}?post=${post.id}`;
    const messageContent = post.video_url
      ? `${post.profiles.username}님의 릴스를 공유했습니다: ${postUrl}`
      : `${post.profiles.username}님의 게시물을 공유했습니다: ${postUrl}`;

    for (const receiverId of selectedUsers) {
      const { data: existingParticipants } = await supabase
        .from('participants')
        .select('room_id, rooms!inner(id, type)')
        .eq('user_id', user.id);

      let roomId: string | null = null;

      if (existingParticipants) {
        for (const p of existingParticipants) {
          const { data: otherUserInRoom } = await supabase
            .from('participants')
            .select('user_id')
            .eq('room_id', p.room_id)
            .eq('user_id', receiverId)
            .maybeSingle();

          if (otherUserInRoom) {
            roomId = p.room_id;
            break;
          }
        }
      }

      if (!roomId) {
        const { data: newRoom } = await supabase
          .from('rooms')
          .insert({ type: 'direct' })
          .select()
          .single();

        if (newRoom) {
          await supabase.from('participants').insert([
            { room_id: newRoom.id, user_id: user.id },
            { room_id: newRoom.id, user_id: receiverId },
          ]);
          roomId = newRoom.id;
        }
      }

      if (roomId) {
        await supabase.from('messages').insert({
          room_id: roomId,
          sender_id: user.id,
          content: messageContent,
        });
      }
    }

    setSending(false);
    setSelectedUsers(new Set());
    onClose();
  };

  const filteredFollowers = followers.filter(follower =>
    follower.profiles.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-90 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-black rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-800">
          <h2 className="text-lg font-semibold dark:text-white">공유하기</h2>
          <button onClick={onClose} className="hover:bg-gray-100 dark:hover:bg-gray-900 p-2 rounded-full">
            <X className="h-5 w-5 dark:text-white" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-300 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 dark:text-white rounded-lg outline-none focus:bg-gray-200 dark:focus:bg-gray-800"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredFollowers.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              {searchQuery ? '검색 결과가 없습니다' : '팔로워가 없습니다'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFollowers.map((follower) => {
                const isSelected = selectedUsers.has(follower.follower_id);
                return (
                  <button
                    key={follower.id}
                    onClick={() => toggleUser(follower.follower_id)}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5 flex-shrink-0">
                      <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                        {follower.profiles.avatar_url ? (
                          <img
                            src={follower.profiles.avatar_url}
                            alt={follower.profiles.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 dark:text-gray-300 font-semibold text-lg">
                            {follower.profiles.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm dark:text-white">{follower.profiles.username}</p>
                      {follower.profiles.full_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{follower.profiles.full_name}</p>
                      )}
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedUsers.size > 0 && (
          <div className="p-4 border-t border-gray-300 dark:border-gray-800">
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {sending ? '전송 중...' : `보내기 (${selectedUsers.size})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(modalContent, modalRoot);
}
