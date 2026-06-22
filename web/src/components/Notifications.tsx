import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { db } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/timeFormat';

interface NotificationsProps {
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

type NotificationFilter = 'all' | 'unread' | 'follow' | 'like' | 'comment';

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'unread', label: '읽지 않음' },
  { id: 'follow', label: '팔로우' },
  { id: 'like', label: '좋아요' },
  { id: 'comment', label: '댓글' },
];

export default function Notifications({ onViewProfile }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await db
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
      .limit(80);

    if (data) {
      const formattedNotifications = data.map((n: any) => ({
        id: n.id,
        type: n.type,
        read: n.read,
        created_at: n.created_at,
        post_id: n.post_id,
        actor: {
          id: n.profiles?.id || n.actor_id,
          username: n.profiles?.username || 'Unknown',
          avatar_url: n.profiles?.avatar_url || null,
        },
        post: n.posts ? { image_url: n.posts.image_url } : undefined,
      }));
      setNotifications(formattedNotifications);
    }
    setLoading(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') return notifications.filter((n) => !n.read);
    if (activeFilter === 'comment') return notifications.filter((n) => n.type === 'comment' || n.type === 'mention');
    return notifications.filter((n) => n.type === activeFilter);
  }, [activeFilter, notifications]);

  const markAsRead = async (notificationId: string) => {
    await db
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications((prev) => prev.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await db
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
        return '새로운 활동이 있습니다.';
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4 text-gray-900 dark:text-gray-100 md:p-6 md:pb-8">
      <div className="overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#22252a] dark:bg-[#121212] dark:shadow-none">
        <div className="border-b border-gray-200 px-5 py-5 dark:border-[#22252a]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400"><Bell className="h-4 w-4" /> Notifications</p>
              <h2 className="mt-2 text-2xl font-bold">알림</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Push 알림 전 단계로 앱 내 알림을 먼저 정리했어요.</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-black"
              >
                <CheckCheck className="h-4 w-4" /> 모두 읽음
              </button>
            )}
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((filter) => {
              const count = filter.id === 'all'
                ? notifications.length
                : filter.id === 'unread'
                  ? unreadCount
                  : filter.id === 'comment'
                    ? notifications.filter((n) => n.type === 'comment' || n.type === 'mention').length
                    : notifications.filter((n) => n.type === filter.id).length;
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-[#2f333a] dark:bg-[#17191d] dark:text-gray-300 dark:hover:bg-[#202329]'
                  }`}
                >
                  {filter.label} <span className={active ? 'text-white/80' : 'text-gray-400'}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[calc(100dvh-15rem)] overflow-y-auto md:max-h-[calc(100dvh-17rem)]">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-500">
              <Bell className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-4 font-semibold text-gray-700 dark:text-gray-200">아직 알림이 없습니다</p>
              <p className="mt-1 text-sm">팔로우, 좋아요, 댓글 활동이 생기면 여기에 표시돼요.</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-500">
              <Filter className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-4 font-semibold text-gray-700 dark:text-gray-200">이 필터에 해당하는 알림이 없어요</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-[#22252a]">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a1a] ${
                    !notification.read ? 'bg-sky-50/80 dark:bg-sky-950/20' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.type === 'follow') {
                      onViewProfile(notification.actor.id);
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                        onViewProfile(notification.actor.id);
                      }}
                      className="h-12 w-12 flex-shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5"
                    >
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                        {notification.actor.avatar_url ? (
                          <img
                            src={notification.actor.avatar_url}
                            alt={notification.actor.username}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-gray-600">
                            {notification.actor.username[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5">
                        <span className="font-semibold">{notification.actor.username}</span>
                        {getNotificationText(notification)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-xs text-gray-500">{getRelativeTime(notification.created_at)}</p>
                        {!notification.read && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">NEW</span>}
                      </div>
                    </div>

                    {notification.post && (
                      <img
                        src={notification.post.image_url}
                        alt="Post"
                        className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
                      />
                    )}

                    {!notification.read && (
                      <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"></div>
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
}
