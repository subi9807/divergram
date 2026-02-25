import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, ArrowLeft, X } from 'lucide-react';
import { db, Room, Message, Profile } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/timeFormat';

interface MessagesProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoomWithDetails extends Room {
  otherUser?: Profile;
  lastMessage?: Message;
  unreadCount?: number;
}

export default function Messages({ isOpen, onClose }: MessagesProps) {
  const [rooms, setRooms] = useState<RoomWithDetails[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      loadRooms();
    }
  }, [isOpen, user]);

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
            const newMsg = payload.new as Message;
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

  const loadRooms = async () => {
    if (!user) return;

    const { data: participantData } = await db
      .from('participants')
      .select('room_id, rooms(id, type, created_at)')
      .eq('user_id', user.id);

    if (!participantData) {
      setLoading(false);
      return;
    }

    const roomIds = participantData.map((p: any) => p.rooms.id);

    const { data: otherParticipants } = await db
      .from('participants')
      .select('room_id, user_id, profiles(id, username, avatar_url, full_name)')
      .in('room_id', roomIds)
      .neq('user_id', user.id);

    const { data: lastMessages } = await db
      .from('messages')
      .select('*')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false });

    const roomsWithDetails: RoomWithDetails[] = participantData.map((p: any) => {
      const room = p.rooms;
      const otherParticipant = otherParticipants?.find((op: any) => op.room_id === room.id);
      const lastMsg = lastMessages?.find((m: any) => m.room_id === room.id);

      return {
        ...room,
        otherUser: otherParticipant?.profiles,
        lastMessage: lastMsg,
      };
    });

    roomsWithDetails.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.created_at;
      const bTime = b.lastMessage?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setRooms(roomsWithDetails);
    setLoading(false);
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
      }
    }
  };

  const markAsRead = async (messageId: string) => {
    await db
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRoom || !newMessage.trim()) return;

    await db.from('messages').insert({
      room_id: selectedRoom.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    setNewMessage('');
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className="text-xl font-semibold">메시지</h2>
          <button onClick={onClose} className="hover:bg-gray-100 p-2 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className={`${selectedRoom ? 'hidden md:block' : 'block'} w-full md:w-1/3 border-r border-gray-300 flex flex-col overflow-hidden`}>
              <div className="flex-1 overflow-y-auto">
                {rooms.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>메시지가 없습니다</p>
                  </div>
                ) : (
                  rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 border-b border-gray-100 ${
                        selectedRoom?.id === room.id ? 'bg-gray-100' : ''
                      }`}
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5 flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          {room.otherUser?.avatar_url ? (
                            <img
                              src={room.otherUser.avatar_url}
                              alt={room.otherUser.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-600 font-semibold text-lg">
                              {room.otherUser?.username[0].toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {room.otherUser?.username || 'Unknown'}
                        </p>
                        {room.lastMessage && (
                          <p className="text-gray-500 text-sm truncate">
                            {room.lastMessage.content}
                          </p>
                        )}
                      </div>
                      {room.lastMessage && (
                        <span className="text-xs text-gray-400">
                          {getRelativeTime(room.lastMessage.created_at)}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className={`${selectedRoom ? 'block' : 'hidden md:block'} flex-1 flex flex-col`}>
              {selectedRoom ? (
                <>
                  <div className="p-4 border-b border-gray-300 flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedRoom(null)}
                      className="md:hidden hover:bg-gray-100 p-2 rounded-full"
                    >
                      <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        {selectedRoom.otherUser?.avatar_url ? (
                          <img
                            src={selectedRoom.otherUser.avatar_url}
                            alt={selectedRoom.otherUser.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 font-semibold">
                            {selectedRoom.otherUser?.username[0].toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {selectedRoom.otherUser?.username || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-3xl ${
                              isOwn
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            <p className="text-sm break-words">{message.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={sendMessage} className="p-4 border-t border-gray-300">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="메시지 입력..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2 text-blue-500 hover:text-blue-600 disabled:text-gray-400"
                      >
                        <Send className="h-6 w-6" />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>대화를 선택하세요</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(modalContent, modalRoot);
}
