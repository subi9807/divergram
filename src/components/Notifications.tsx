import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/timeFormat';

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
}

interface Notification {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  post_id: string | null;
  actor: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  post?: {
    image_url: string;
  };
}

export default function Notifications({ isOpen, onClose, onViewProfile }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      loadNotifications();
    }
  }, [isOpen, user]);

  const loadNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        read,
        created_at,
        post_id,
        actor_id,
        profiles!notifications_actor_id_fkey(id, username, avatar_url),
        posts(image_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const formattedNotifications = data.map((n: any) => ({
        id: n.id,
        type: n.type,
        read: n.read,
        created_at: n.created_at,
        post_id: n.post_id,
        actor: {
          id: n.profiles.id,
          username: n.profiles.username,
          avatar_url: n.profiles.avatar_url,
        },
        post: n.posts ? { image_url: n.posts.image_url } : undefined,
      }));
      setNotifications(formattedNotifications);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications(notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'follow':
        return '님이 회원님을 팔로우하기 시작했습니다.';
      case 'like':
        return '님이 회원님의 게시물을 좋아합니다.';
      case 'comment':
        return '님이 댓글을 남겼습니다.';
      case 'mention':
        return '님이 댓글에서 회원님을 언급했습니다.';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className="text-lg font-semibold">알림</h2>
          <div className="flex items-center space-x-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-500 hover:text-blue-600 font-semibold"
              >
                모두 읽음
              </button>
            )}
            <button onClick={onClose} className="hover:bg-gray-100 p-2 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>알림이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.type === 'follow') {
                      onViewProfile(notification.actor.id);
                      onClose();
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProfile(notification.actor.id);
                        onClose();
                      }}
                      className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5 flex-shrink-0"
                    >
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        {notification.actor.avatar_url ? (
                          <img
                            src={notification.actor.avatar_url}
                            alt={notification.actor.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 font-semibold text-lg">
                            {notification.actor.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{notification.actor.username}</span>
                        {getNotificationText(notification)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getRelativeTime(notification.created_at)}
                      </p>
                    </div>

                    {notification.post && (
                      <img
                        src={notification.post.image_url}
                        alt="Post"
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                      />
                    )}

                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(modalContent, modalRoot);
}
