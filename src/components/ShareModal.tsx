import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Link2, Code2, Check, Search, Send } from 'lucide-react';
import { db, Post } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';

interface ShareModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onCopyLink?: () => void;
  onEmbed?: () => void;
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

export default function ShareModal({ post, isOpen, onClose, onCopyLink, onEmbed }: ShareModalProps) {
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      loadFollowers();
    }
  }, [isOpen, user]);

  const loadFollowers = async () => {
    if (!user) return;

    const { data } = await db
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

  const shareTitle = useMemo(() => {
    if (post.caption?.trim()) return post.caption.trim();
    if (post.location?.trim()) return `${post.location.trim()} 게시물`;
    return post.video_url ? '릴스 공유' : '게시물 공유';
  }, [post.caption, post.location, post.video_url]);

  const shareUrl = useMemo(() => `${window.location.origin}/post?post=${post.id}`, [post.id]);
  const embedCode = useMemo(() => `<iframe src="${shareUrl}" width="540" height="720" frameborder="0" allowfullscreen loading="lazy"></iframe>`, [shareUrl]);

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage('');
      toastTimeoutRef.current = null;
    }, 1800);
  };

  const markCopied = (type: 'link' | 'embed') => {
    setCopied(type);
    window.setTimeout(() => setCopied((value) => (value === type ? null : value)), 1800);
  };

  const handleCopyLink = async () => {
    const copiedOk = await copyText(shareUrl);
    if (copiedOk) {
      onCopyLink?.();
      markCopied('link');
      showToast('링크가 복사되었어');
    } else {
      showToast('링크 복사에 실패했어');
    }
  };

  const handleCopyEmbed = async () => {
    const copiedOk = await copyText(embedCode);
    if (copiedOk) {
      onEmbed?.();
      markCopied('embed');
      showToast('퍼가기 코드가 복사되었어');
    } else {
      showToast('퍼가기 코드 복사에 실패했어');
    }
  };

  const toggleUser = (userId: string) => {
    const next = new Set(selectedUsers);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedUsers(next);
  };

  const handleSend = async () => {
    if (selectedUsers.size === 0 || !user) return;

    setSending(true);

    const messageContent = post.video_url
      ? `${post.profiles.username}님의 릴스를 공유했습니다: ${shareUrl}`
      : `${post.profiles.username}님의 게시물을 공유했습니다: ${shareUrl}`;

    for (const receiverId of selectedUsers) {
      const { data: existingParticipants } = await db
        .from('participants')
        .select('room_id, rooms!inner(id, type)')
        .eq('user_id', user.id);

      let roomId: string | null = null;

      if (existingParticipants) {
        for (const participant of existingParticipants) {
          const { data: otherUserInRoom } = await db
            .from('participants')
            .select('user_id')
            .eq('room_id', participant.room_id)
            .eq('user_id', receiverId)
            .maybeSingle();

          if (otherUserInRoom) {
            roomId = participant.room_id;
            break;
          }
        }
      }

      if (!roomId) {
        const { data: newRoom } = await db
          .from('rooms')
          .insert({ type: 'direct' })
          .select()
          .single();

        if (newRoom) {
          await db.from('participants').insert([
            { room_id: newRoom.id, user_id: user.id },
            { room_id: newRoom.id, user_id: receiverId },
          ]);
          roomId = newRoom.id;
        }
      }

      if (roomId) {
        await db.from('messages').insert({
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

  const filteredFollowers = followers.filter((follower) =>
    follower.profiles.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-90 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 dg-surface rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-between border-b border-gray-300 p-4 dark:border-[#262626]">
          <h2 className="text-lg font-semibold dark:text-white">공유하기</h2>
          <button onClick={onClose} className="hover:bg-gray-100 dark:hover:bg-gray-900 p-2 rounded-full">
            <X className="h-5 w-5 dark:text-white" />
          </button>

          {toastMessage && (
            <div className="absolute left-1/2 top-full z-20 mt-3 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white shadow-xl dark:bg-white dark:text-gray-900">
              {toastMessage}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#262626] dark:bg-[#17191d]">
            <div className="text-xs font-semibold tracking-[0.18em] text-gray-400 uppercase">Share</div>
            <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{shareTitle}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-all">{shareUrl}</div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCopyLink}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left transition hover:bg-gray-50 dark:border-[#262626] dark:bg-[#17191d] dark:hover:bg-[#1d2026]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-[#262626] dark:text-white">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">링크 복사</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">게시물 주소를 클립보드에 복사</div>
                </div>
              </div>
              {copied === 'link' && <Check className="h-5 w-5 text-green-500" />}
            </button>

            <button
              onClick={handleCopyEmbed}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left transition hover:bg-gray-50 dark:border-[#262626] dark:bg-[#17191d] dark:hover:bg-[#1d2026]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-[#262626] dark:text-white">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">퍼가기</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">iframe 코드로 외부 페이지에 삽입</div>
                </div>
              </div>
              {copied === 'embed' && <Check className="h-5 w-5 text-green-500" />}
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#262626] dark:bg-[#17191d]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">DM으로 전달</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">팔로워를 선택해서 게시물 링크를 바로 보낼 수 있어.</div>
              </div>
              {selectedUsers.size > 0 && (
                <div className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  {selectedUsers.size}명 선택됨
                </div>
              )}
            </div>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="이름 또는 아이디로 찾기"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-[#262626] dark:bg-[#121212] dark:text-white dark:focus:border-blue-500"
              />
            </div>

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {filteredFollowers.length === 0 ? (
                <div className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-[#121212] dark:text-gray-400">
                  {searchQuery ? '검색 결과가 없어.' : '전달할 수 있는 팔로워가 아직 없어.'}
                </div>
              ) : (
                filteredFollowers.map((follower) => {
                  const isSelected = selectedUsers.has(follower.follower_id);

                  return (
                    <button
                      key={follower.id}
                      onClick={() => toggleUser(follower.follower_id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-[#262626] dark:bg-[#121212] dark:hover:bg-[#1a1d22]'
                      }`}
                    >
                      <div className="h-11 w-11 overflow-hidden rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5 shrink-0">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-[#17191d]">
                          {follower.profiles.avatar_url ? (
                            <img
                              src={follower.profiles.avatar_url}
                              alt={follower.profiles.username}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                              {follower.profiles.username[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{follower.profiles.username}</div>
                        <div className="truncate text-xs text-gray-500 dark:text-gray-400">{follower.profiles.full_name || '이 계정으로 전달하기'}</div>
                      </div>

                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300 p-4 dark:border-[#262626]">
          <button
            onClick={handleSend}
            disabled={sending || selectedUsers.size === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? '전달하는 중...' : selectedUsers.size > 0 ? `선택한 ${selectedUsers.size}명에게 전달하기` : '전달할 사람을 선택하세요'}
          </button>
        </div>
      </div>
    </div>
  );

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(modalContent, modalRoot);
}
