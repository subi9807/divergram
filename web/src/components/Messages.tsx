import { useEffect, useMemo, useState, useRef } from 'react';
import { Send, ArrowLeft, MessageCircle, Search, Plus } from 'lucide-react';
import { db, Room, Message, Profile } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/timeFormat';

interface RoomWithDetails extends Room {
  otherUser?: Profile;
  lastMessage?: Message;
  unreadCount?: number;
}

export default function Messages() {
  const [rooms, setRooms] = useState<RoomWithDetails[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [startingRoom, setStartingRoom] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const suggestedProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profiles
      .filter((profile) => !rooms.some((room) => room.otherUser?.id === profile.id))
      .filter((profile) => {
        if (!q) return true;
        return [profile.username, profile.full_name, profile.bio].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      })
      .slice(0, 8);
  }, [profiles, rooms, searchQuery]);

  useEffect(() => {
    if (user) {
      setError('');
      Promise.all([loadRooms(), loadProfiles()]);
    }
  }, [user]);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);

      const channel = db
        .channel(`room_${selectedRoom.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${selectedRoom.id}`,
          },
          (payload) => {
            const newMsg = (payload as any)?.new as Message | undefined;
            if (!newMsg) return;
            setMessages((prev) => [...prev, newMsg]);
            scrollToBottom();
            if (newMsg.sender_id !== user?.id) {
              markAsRead(newMsg.id);
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [selectedRoom, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadProfiles = async () => {
    if (!user) return;
    const { data } = await db
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setProfiles((data || []) as Profile[]);
  };

  const loadRooms = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: participantData } = await db
        .from('participants')
        .select('room_id, user_id')
        .eq('user_id', user.id);

      const roomIds = (participantData || []).map((p: any) => p.room_id).filter(Boolean);
      if (roomIds.length === 0) {
        setRooms([]);
        return;
      }

      const [{ data: roomRows }, { data: otherParticipants }, { data: lastMessages }] = await Promise.all([
        db.from('rooms').select('*').in('id', roomIds),
        db
          .from('participants')
          .select('room_id, user_id, profiles(id, username, avatar_url, full_name)')
          .in('room_id', roomIds)
          .neq('user_id', user.id),
        db.from('messages').select('*').in('room_id', roomIds).order('created_at', { ascending: false }),
      ]);

      const roomsWithDetails: RoomWithDetails[] = (roomRows || []).map((room: any) => {
        const otherParticipant = otherParticipants?.find((op: any) => op.room_id === room.id);
        const lastMsg = lastMessages?.find((m: any) => m.room_id === room.id);

        return {
          ...room,
          otherUser: otherParticipant?.profiles,
          lastMessage: lastMsg,
          unreadCount: (lastMessages || []).filter((m: Message) => m.room_id === room.id && m.sender_id !== user.id && !m.read_at).length,
        };
      });

      roomsWithDetails.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.created_at;
        const bTime = b.lastMessage?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setRooms(roomsWithDetails);
    } catch (e) {
      console.error('loadRooms failed', e);
      setError('메시지 목록을 불러오지 못했어요. 다시 시도해 주세요.');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    const { data } = await db
      .from('messages')
      .select('*, profiles(id, username, avatar_url)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);

      const unreadIds = data
        .filter((m: Message) => m.sender_id !== user?.id && !m.read_at)
        .map((m: Message) => m.id);

      if (unreadIds.length > 0) {
        await db
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);
        loadRooms();
      }
    }
  };

  const markAsRead = async (messageId: string) => {
    await db
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);
  };

  const startConversation = async (profile: Profile) => {
    if (!user || startingRoom) return;
    const existingRoom = rooms.find((room) => room.otherUser?.id === profile.id);
    if (existingRoom) {
      setSelectedRoom(existingRoom);
      return;
    }

    setStartingRoom(true);
    setError('');
    try {
      const { data: roomData, error: roomError } = await db.from('rooms').insert({ type: 'direct' });
      if (roomError) throw roomError;
      const room = Array.isArray(roomData) ? roomData[0] : null;
      if (!room?.id) throw new Error('room_create_failed');

      const { error: participantError } = await db.from('participants').insert([
        { room_id: room.id, user_id: user.id },
        { room_id: room.id, user_id: profile.id },
      ]);
      if (participantError) throw participantError;

      const nextRoom: RoomWithDetails = { ...room, otherUser: profile };
      setRooms((prev) => [nextRoom, ...prev]);
      setSelectedRoom(nextRoom);
      setMessages([]);
      setSearchQuery('');
    } catch (e) {
      console.error('startConversation failed', e);
      setError('대화를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setStartingRoom(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRoom || !newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');

    const tempId = `tmp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      room_id: selectedRoom.id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await db.from('messages').insert({
      room_id: selectedRoom.id,
      sender_id: user.id,
      content,
    });

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError('메시지 전송에 실패했어요. 잠시 후 다시 시도해 주세요.');
      setNewMessage(content);
      return;
    }

    const saved = Array.isArray(data) ? data[0] : null;
    if (saved) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, ...saved } : m)));
    } else {
      await loadMessages(selectedRoom.id);
    }

    setRooms((prev) =>
      prev
        .map((r) => (r.id === selectedRoom.id ? { ...r, lastMessage: { ...optimistic, id: saved?.id || tempId } } : r))
        .sort((a, b) => {
          const aTime = a.lastMessage?.created_at || a.created_at;
          const bTime = b.lastMessage?.created_at || b.created_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        })
    );
  };

  return (
    <div className="mx-auto h-[calc(100dvh-8rem)] max-w-6xl px-4 pb-24 pt-4 text-gray-900 dark:text-gray-100 md:h-[calc(100dvh-5rem)] md:p-6 xl:h-screen xl:pb-6">
      <div className="h-full overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#22252a] dark:bg-[#121212] dark:shadow-none">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-[#22252a]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Messages</p>
            <h2 className="text-xl font-bold">메시지</h2>
          </div>
          <div className="rounded-2xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <MessageCircle className="h-5 w-5" />
          </div>
        </div>

        {error && <div className="border-b border-red-100 px-4 py-2 text-sm text-red-500 dark:border-red-900/40">{error}</div>}

        {loading ? (
          <div className="flex h-full justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : (
          <div className="flex h-[calc(100%-73px)] overflow-hidden">
            <div className={`${selectedRoom ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-gray-200 dark:border-[#22252a] md:w-[360px]`}>
              <div className="border-b border-gray-100 p-4 dark:border-[#22252a]">
                <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-[#1a1d22]">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="새 대화 상대 검색"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {rooms.length === 0 && searchQuery.trim() === '' ? (
                  <div className="px-6 py-10 text-center text-gray-500">
                    <MessageCircle className="mx-auto h-11 w-11 text-gray-300" />
                    <p className="mt-4 font-semibold text-gray-700 dark:text-gray-200">아직 메시지가 없습니다</p>
                    <p className="mt-1 text-sm">아래 추천 멤버를 선택해서 첫 대화를 시작해보세요.</p>
                  </div>
                ) : (
                  rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`w-full border-b border-gray-100 p-4 flex items-center space-x-3 transition-colors hover:bg-gray-50 dark:border-[#22252a] dark:hover:bg-[#17191d] ${
                        selectedRoom?.id === room.id ? 'bg-gray-100 dark:bg-[#1c1f24]' : ''
                      }`}
                    >
                      <div className="h-14 w-14 flex-shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                          {room.otherUser?.avatar_url ? (
                            <img src={room.otherUser.avatar_url} alt={room.otherUser.username} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            <span className="text-lg font-semibold text-gray-600">{room.otherUser?.username[0]?.toUpperCase() || '?'}</span>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{room.otherUser?.username || 'Unknown'}</p>
                          {room.lastMessage && <span className="shrink-0 text-xs text-gray-400">{getRelativeTime(room.lastMessage.created_at)}</span>}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="truncate text-sm text-gray-500">{room.lastMessage?.content || '새 대화를 시작해보세요'}</p>
                          {!!room.unreadCount && <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{room.unreadCount}</span>}
                        </div>
                      </div>
                    </button>
                  ))
                )}

                {suggestedProfiles.length > 0 && (
                  <div className="border-t border-gray-100 p-4 dark:border-[#22252a]">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">새 대화 시작</p>
                    <div className="space-y-2">
                      {suggestedProfiles.map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() => startConversation(profile)}
                          disabled={startingRoom}
                          className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-3 py-3 text-left transition hover:bg-gray-100 disabled:opacity-60 dark:bg-[#17191d] dark:hover:bg-[#202329]"
                        >
                          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 p-0.5">
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                              {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.username} className="h-full w-full rounded-full object-cover" /> : <span className="font-semibold text-gray-600">{profile.username?.[0]?.toUpperCase() || '?'}</span>}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{profile.username}</p>
                            <p className="truncate text-xs text-gray-500">{profile.full_name || 'Divergram member'}</p>
                          </div>
                          <Plus className="h-4 w-4 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`${selectedRoom ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
              {selectedRoom ? (
                <>
                  <div className="flex items-center space-x-3 border-b border-gray-200 p-4 dark:border-[#22252a]">
                    <button onClick={() => setSelectedRoom(null)} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-[#262626] md:hidden">
                      <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                        {selectedRoom.otherUser?.avatar_url ? (
                          <img src={selectedRoom.otherUser.avatar_url} alt={selectedRoom.otherUser.username} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <span className="font-semibold text-gray-600">{selectedRoom.otherUser?.username[0]?.toUpperCase() || '?'}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{selectedRoom.otherUser?.username || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">Divergram message</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 p-4">
                    {messages.length === 0 && (
                      <div className="flex h-full items-center justify-center text-center text-gray-500">
                        <div>
                          <MessageCircle className="mx-auto h-10 w-10 text-gray-300" />
                          <p className="mt-3 text-sm">첫 메시지를 보내 대화를 시작하세요.</p>
                        </div>
                      </div>
                    )}
                    {messages.map((message) => {
                      const isOwn = message.sender_id === user?.id;
                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[78%] rounded-3xl px-4 py-2 ${isOwn ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900 dark:bg-[#202329] dark:text-gray-100'}`}>
                            <p className="break-words text-sm leading-5">{message.content}</p>
                            <p className={`mt-1 text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>{getRelativeTime(message.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={sendMessage} className="border-t border-gray-200 p-4 dark:border-[#22252a]">
                    <div className="flex items-center space-x-2 rounded-3xl bg-gray-100 p-2 dark:bg-[#1a1d22]">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="메시지 입력..."
                        className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-400"
                      />
                      <button type="submit" disabled={!newMessage.trim()} className="rounded-full bg-blue-500 p-2.5 text-white transition hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500">
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-center text-gray-500">
                  <div>
                    <MessageCircle className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-4 font-semibold text-gray-700 dark:text-gray-200">대화를 선택하세요</p>
                    <p className="mt-1 text-sm">왼쪽 목록에서 대화를 고르거나 새 대화를 시작할 수 있어요.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
