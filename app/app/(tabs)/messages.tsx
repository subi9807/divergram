import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, MessageCircle, Plus, Search, Send, Users, X } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { appRouteMap } from '../../src/config/sitemap';
import { useAuth } from '../../src/hooks/useAuth';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { apiClient } from '../../src/lib/api';

function formatRoomTime(value: unknown) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

export default function MessagesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const params = useLocalSearchParams<{ roomId?: string; userId?: string }>();
  const roomId = String(params.roomId || '').trim();
  const targetUserId = String(params.userId || '').trim();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);

  const palette = isDark
    ? { page: '#08111D', surface: '#0F1B2A', text: '#F8FAFC', muted: '#91A4BA', border: '#243447', soft: '#172638' }
    : { page: '#FFFFFF', surface: '#FFFFFF', text: '#0F172A', muted: '#64748B', border: '#E2E8F0', soft: '#F1F5F9' };

  const roomsQuery = useQuery({
    queryKey: ['chat-rooms', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getChatRooms(),
    refetchInterval: 7000,
  });
  const messagesQuery = useQuery({
    queryKey: ['chat-messages', roomId],
    enabled: Boolean(roomId),
    queryFn: () => apiClient.getChatMessages(roomId),
    refetchInterval: 4000,
  });
  const targetProfileQuery = useQuery({
    queryKey: ['chat-target-profile', targetUserId],
    enabled: Boolean(targetUserId),
    queryFn: () => apiClient.getProfileById(targetUserId),
  });
  const normalizedMemberSearch = memberSearch.trim().replace(/^@+/, '');
  const memberSearchQuery = useQuery({
    queryKey: ['group-member-search', normalizedMemberSearch],
    enabled: groupModalOpen && normalizedMemberSearch.length >= 2,
    queryFn: () => apiClient.searchProfiles(normalizedMemberSearch),
  });

  const selectedRoom = (roomsQuery.data || []).find((room: any) => String(room.id) === roomId);
  const isGroupRoom = selectedRoom?.type === 'group';
  const groupParticipants = Array.isArray(selectedRoom?.participants) ? selectedRoom.participants : [];
  const otherProfile = {
    id: String(selectedRoom?.other_user_id || targetUserId || ''),
    username: String(selectedRoom?.other_username || targetProfileQuery.data?.username || 'diver'),
    name: String(
      selectedRoom?.other_full_name ||
        targetProfileQuery.data?.full_name ||
        selectedRoom?.other_username ||
        targetProfileQuery.data?.username ||
        'Diver'
    ),
    avatar: String(selectedRoom?.other_avatar_url || targetProfileQuery.data?.avatar_url || ''),
  };

  useEffect(() => {
    if (!roomId || !messagesQuery.data?.length) return;
    void apiClient.markChatRoomRead(roomId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['chat-rooms', user?.id] });
    });
  }, [messagesQuery.data, queryClient, roomId, user?.id]);

  useEffect(() => {
    if (!messagesQuery.data?.length) return;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
  }, [messagesQuery.data?.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => apiClient.sendChatMessage(roomId, content),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', roomId] });
      queryClient.invalidateQueries({ queryKey: ['chat-rooms', user?.id] });
    },
  });
  const createGroupMutation = useMutation({
    mutationFn: () => apiClient.createGroupChatRoom(groupName.trim(), selectedMembers.map((member) => String(member.id))),
    onSuccess: (room) => {
      setGroupModalOpen(false);
      setGroupName('');
      setMemberSearch('');
      setSelectedMembers([]);
      queryClient.invalidateQueries({ queryKey: ['chat-rooms', user?.id] });
      if (room?.id) {
        router.push(`${appRouteMap.messages.path}?roomId=${encodeURIComponent(String(room.id))}` as never);
      }
    },
    onError: () => Alert.alert(t('messages.groupCreateFailed'), t('messages.groupCreateFailedBody')),
  });

  const visibleRooms = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return roomsQuery.data || [];
    return (roomsQuery.data || []).filter((room: any) =>
      `${room.name || ''} ${room.other_full_name || ''} ${room.other_username || ''} ${room.last_message || ''}`.toLowerCase().includes(needle)
    );
  }, [roomsQuery.data, search]);

  if (roomId) {
    const messages = messagesQuery.data || [];
    const latestOwnMessageId = [...messages]
      .reverse()
      .find((message: any) => String(message.sender_id) === String(user?.id || ''))?.id;
    return (
      <Screen tone="plain" style={{ backgroundColor: palette.page }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={[styles.chatHeader, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}>
            <TouchableOpacity
              onPress={() => router.replace(appRouteMap.messages.path as never)}
              activeOpacity={0.8}
              style={styles.headerButton}
            >
              <ChevronLeft size={28} color={palette.text} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.chatIdentity}
              onPress={() => {
                if (!isGroupRoom && otherProfile.id) {
                  router.push(`${appRouteMap.account.path}?userId=${encodeURIComponent(otherProfile.id)}` as never);
                }
              }}
            >
              {isGroupRoom ? (
                <View style={[styles.chatAvatarFallback, styles.groupAvatar]}>
                  <Users size={19} color="#FFFFFF" />
                </View>
              ) : otherProfile.avatar ? (
                <Image source={{ uri: otherProfile.avatar }} style={styles.chatAvatar} />
              ) : (
                <View style={styles.chatAvatarFallback}>
                  <Text style={styles.chatAvatarText}>{otherProfile.name.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.chatIdentityText}>
                <Text numberOfLines={1} style={[styles.chatName, { color: palette.text }]}>
                  {isGroupRoom ? String(selectedRoom?.name || t('messages.groupChat')) : otherProfile.name}
                </Text>
                <Text numberOfLines={1} style={[styles.chatHandle, { color: palette.muted }]}>
                  {isGroupRoom ? t('messages.memberCount', { count: Number(selectedRoom?.participant_count || groupParticipants.length) }) : `@${otherProfile.username}`}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.headerButton} />
          </View>

          {messagesQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#0D7CD6" />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item: any) => String(item.id)}
              contentContainerStyle={styles.messageList}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyConversation}>
                  <View style={styles.largeAvatarFallback}>
                    <Text style={styles.largeAvatarText}>{otherProfile.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.emptyConversationName, { color: palette.text }]}>{otherProfile.name}</Text>
                  <Text style={[styles.emptyConversationHint, { color: palette.muted }]}>{t('messages.startConversation')}</Text>
                </View>
              }
              renderItem={({ item }: { item: any }) => {
                const mine = String(item.sender_id) === String(user?.id || '');
                const showReadReceipt = mine && String(item.id) === String(latestOwnMessageId || '');
                const readCount = Number(item.read_count || 0);
                const recipientCount = Number(item.recipient_count || 0);
                return (
                  <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}>
                    {!mine && isGroupRoom ? (
                      <Text style={[styles.messageSender, { color: palette.muted }]}>
                        {String(item.sender_full_name || item.sender_username || 'Diver')}
                      </Text>
                    ) : null}
                    <View
                      style={[
                        styles.bubble,
                        mine
                          ? styles.bubbleMine
                          : { backgroundColor: palette.soft, borderColor: palette.border, borderWidth: StyleSheet.hairlineWidth },
                      ]}
                    >
                      <Text style={[styles.messageText, { color: mine ? '#FFFFFF' : palette.text }]}>{String(item.content || '')}</Text>
                    </View>
                    <View style={styles.messageMeta}>
                      {showReadReceipt ? (
                        <Text style={[styles.readReceipt, { color: readCount > 0 ? '#0D7CD6' : palette.muted }]}>
                          {isGroupRoom
                            ? readCount >= recipientCount && recipientCount > 0
                              ? `${t('messages.readAll')} · ${formatRoomTime(item.read_at)}`
                              : readCount > 0
                                ? t('messages.readCount', { read: readCount, total: recipientCount })
                                : t('messages.unread')
                            : item.read_at
                              ? `${t('messages.read')} · ${formatRoomTime(item.read_at)}`
                              : t('messages.unread')}
                        </Text>
                      ) : null}
                      <Text style={[styles.messageTime, { color: palette.muted }]}>{formatRoomTime(item.created_at)}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          <View style={[styles.composerWrap, { borderTopColor: palette.border, backgroundColor: palette.surface }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={2000}
              placeholder={t('messages.sendPlaceholder')}
              placeholderTextColor={palette.muted}
              style={[styles.composer, { color: palette.text, borderColor: palette.border, backgroundColor: palette.soft }]}
            />
            <TouchableOpacity
              disabled={!draft.trim() || sendMutation.isPending}
              activeOpacity={0.8}
              onPress={() => sendMutation.mutate(draft.trim())}
              style={[styles.sendButton, { opacity: draft.trim() ? 1 : 0.42 }]}
            >
              {sendMutation.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Send size={19} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  return (
    <Screen tone="plain" style={{ backgroundColor: palette.page }}>
      <View style={styles.inboxHeader}>
        <View style={styles.inboxTitleRow}>
          <Text style={[styles.inboxTitle, { color: palette.text }]}>{t('messages.title')}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setGroupModalOpen(true)}
            style={[styles.newGroupButton, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <Plus size={16} color="#0D7CD6" />
            <Text style={styles.newGroupText}>{t('messages.newGroup')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.inboxSubtitle, { color: palette.muted }]}>{t('messages.subtitle')}</Text>
        <View style={[styles.searchBox, { backgroundColor: palette.soft }]}>
          <Search size={18} color={palette.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('messages.searchPlaceholder')}
            placeholderTextColor={palette.muted}
            style={[styles.searchInput, { color: palette.text }]}
          />
        </View>
      </View>

      {roomsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0D7CD6" />
        </View>
      ) : (
        <FlatList
          data={visibleRooms}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={styles.roomList}
          ListEmptyComponent={
            <View style={styles.emptyRooms}>
              <MessageCircle size={42} color={palette.muted} />
              <Text style={[styles.emptyRoomsTitle, { color: palette.text }]}>{t('messages.emptyTitle')}</Text>
              <Text style={[styles.emptyRoomsText, { color: palette.muted }]}>{t('messages.emptyBody')}</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const group = item.type === 'group';
            const name = String(group ? item.name || t('messages.groupChat') : item.other_full_name || item.other_username || 'Diver');
            const username = String(item.other_username || 'diver');
            const avatar = String(item.other_avatar_url || '');
            const unread = Number(item.unread_count || 0);
            return (
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() =>
                  router.push(
                    `${appRouteMap.messages.path}?roomId=${encodeURIComponent(String(item.id))}&userId=${encodeURIComponent(String(item.other_user_id || ''))}` as never
                  )
                }
                style={styles.roomRow}
              >
                {group ? (
                  <View style={[styles.roomAvatarFallback, styles.groupRoomAvatar]}>
                    <Users size={24} color="#FFFFFF" />
                  </View>
                ) : avatar ? (
                  <Image source={{ uri: avatar }} style={styles.roomAvatar} />
                ) : (
                  <View style={styles.roomAvatarFallback}>
                    <Text style={styles.roomAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.roomBody}>
                  <View style={styles.roomTitleRow}>
                    <Text numberOfLines={1} style={[styles.roomName, { color: palette.text }]}>{name}</Text>
                    <Text style={[styles.roomTime, { color: palette.muted }]}>{formatRoomTime(item.last_message_at || item.created_at)}</Text>
                  </View>
                  <View style={styles.roomPreviewRow}>
                    <Text numberOfLines={1} style={[styles.roomPreview, { color: unread ? palette.text : palette.muted }]}>
                      {String(
                        item.last_message ||
                          (group
                            ? t('messages.participating', { count: Number(item.participant_count || 0) })
                            : t('messages.startWith', { username }))
                      )}
                    </Text>
                    {unread > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal transparent visible={groupModalOpen} animationType="slide" onRequestClose={() => setGroupModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setGroupModalOpen(false)}>
          <Pressable style={[styles.groupSheet, { backgroundColor: palette.surface }]} onPress={() => undefined}>
            <View style={styles.groupSheetHeader}>
              <View>
                <Text style={[styles.groupSheetTitle, { color: palette.text }]}>{t('messages.newGroupChat')}</Text>
                <Text style={[styles.groupSheetHint, { color: palette.muted }]}>{t('messages.groupHint')}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setGroupModalOpen(false)}>
                <X size={22} color={palette.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              maxLength={60}
              placeholder={t('messages.groupName')}
              placeholderTextColor={palette.muted}
              style={[styles.groupNameInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.soft }]}
            />

            {selectedMembers.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedMembers}>
                {selectedMembers.map((member) => (
                  <TouchableOpacity
                    key={String(member.id)}
                    onPress={() => setSelectedMembers((current) => current.filter((item) => String(item.id) !== String(member.id)))}
                    style={[styles.selectedMemberChip, { backgroundColor: palette.soft }]}
                  >
                    <Text numberOfLines={1} style={[styles.selectedMemberText, { color: palette.text }]}>
                      {member.full_name || member.username}
                    </Text>
                    <X size={13} color={palette.muted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            <View style={[styles.memberSearchBox, { backgroundColor: palette.soft }]}>
              <Search size={18} color={palette.muted} />
              <TextInput
                value={memberSearch}
                onChangeText={setMemberSearch}
                autoCapitalize="none"
                placeholder={t('messages.memberSearchPlaceholder')}
                placeholderTextColor={palette.muted}
                style={[styles.memberSearchInput, { color: palette.text }]}
              />
            </View>

            <FlatList
              data={(memberSearchQuery.data || []).filter(
                (member: any) => String(member.id) !== String(user?.id || '')
              )}
              keyExtractor={(item: any) => String(item.id)}
              style={styles.memberResults}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                normalizedMemberSearch.length >= 2 && !memberSearchQuery.isLoading ? (
                  <Text style={[styles.noMemberResult, { color: palette.muted }]}>{t('messages.noMembers')}</Text>
                ) : null
              }
              renderItem={({ item }: { item: any }) => {
                const selected = selectedMembers.some((member) => String(member.id) === String(item.id));
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      setSelectedMembers((current) =>
                        selected
                          ? current.filter((member) => String(member.id) !== String(item.id))
                          : current.length < 49
                            ? [...current, item]
                            : current
                      )
                    }
                    style={[styles.memberResultRow, { borderBottomColor: palette.border }]}
                  >
                    {item.avatar_url ? (
                      <Image source={{ uri: String(item.avatar_url) }} style={styles.memberAvatar} />
                    ) : (
                      <View style={styles.memberAvatarFallback}>
                        <Text style={styles.memberAvatarText}>{String(item.full_name || item.username || 'D').slice(0, 1)}</Text>
                      </View>
                    )}
                    <View style={styles.memberResultBody}>
                      <Text style={[styles.memberResultName, { color: palette.text }]}>{item.full_name || item.username}</Text>
                      <Text style={[styles.memberResultHandle, { color: palette.muted }]}>@{item.username}</Text>
                    </View>
                    <View style={[styles.memberCheck, selected && styles.memberCheckSelected, { borderColor: selected ? '#0D7CD6' : palette.border }]}>
                      {selected ? <Check size={14} color="#FFFFFF" /> : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!groupName.trim() || selectedMembers.length < 2 || createGroupMutation.isPending}
              onPress={() => createGroupMutation.mutate()}
              style={[
                styles.createGroupButton,
                { opacity: groupName.trim() && selectedMembers.length >= 2 ? 1 : 0.4 },
              ]}
            >
              {createGroupMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.createGroupButtonText}>{t('messages.createGroup', { count: selectedMembers.length + 1 })}</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inboxHeader: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  inboxTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inboxTitle: { fontSize: 28, fontWeight: '900' },
  newGroupButton: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  newGroupText: { color: '#0D7CD6', fontSize: 12, fontWeight: '800' },
  inboxSubtitle: { marginTop: 4, fontSize: 13 },
  searchBox: { height: 46, marginTop: 17, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  searchInput: { flex: 1, marginLeft: 9, fontSize: 14 },
  roomList: { paddingHorizontal: 18, paddingBottom: 30 },
  roomRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  roomAvatar: { width: 58, height: 58, borderRadius: 29 },
  roomAvatarFallback: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0F2FE' },
  groupRoomAvatar: { backgroundColor: '#0D7CD6' },
  roomAvatarText: { color: '#0D7CD6', fontSize: 20, fontWeight: '900' },
  roomBody: { flex: 1, marginLeft: 13 },
  roomTitleRow: { flexDirection: 'row', alignItems: 'center' },
  roomName: { flex: 1, fontSize: 15, fontWeight: '800' },
  roomTime: { marginLeft: 8, fontSize: 11 },
  roomPreviewRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center' },
  roomPreview: { flex: 1, fontSize: 13 },
  unreadBadge: { minWidth: 21, height: 21, marginLeft: 8, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D7CD6' },
  unreadText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  emptyRooms: { minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyRoomsTitle: { marginTop: 14, fontSize: 17, fontWeight: '800' },
  emptyRoomsText: { marginTop: 7, textAlign: 'center', fontSize: 13, lineHeight: 19 },
  chatHeader: { height: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  chatIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  chatAvatar: { width: 38, height: 38, borderRadius: 19 },
  chatAvatarFallback: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D7CD6' },
  groupAvatar: { backgroundColor: '#075EA8' },
  chatAvatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  chatIdentityText: { flex: 1, marginLeft: 10 },
  chatName: { fontSize: 14, fontWeight: '900' },
  chatHandle: { marginTop: 1, fontSize: 11 },
  messageList: { flexGrow: 1, paddingHorizontal: 14, paddingVertical: 18 },
  messageRow: { maxWidth: '82%', marginBottom: 10 },
  messageRowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageRowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { maxWidth: '100%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: '#0D7CD6', borderBottomRightRadius: 5 },
  messageSender: { marginBottom: 4, paddingHorizontal: 4, fontSize: 10, fontWeight: '700' },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageMeta: { marginTop: 3, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 6 },
  readReceipt: { fontSize: 10, fontWeight: '700' },
  messageTime: { fontSize: 9 },
  emptyConversation: { flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  largeAvatarFallback: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0F2FE' },
  largeAvatarText: { color: '#0D7CD6', fontSize: 27, fontWeight: '900' },
  emptyConversationName: { marginTop: 13, fontSize: 17, fontWeight: '900' },
  emptyConversationHint: { marginTop: 6, fontSize: 13 },
  composerWrap: { minHeight: 66, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  composer: { flex: 1, minHeight: 44, maxHeight: 110, borderWidth: 1, borderRadius: 22, paddingHorizontal: 15, paddingTop: 11, paddingBottom: 10, fontSize: 14 },
  sendButton: { width: 42, height: 42, marginLeft: 8, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D7CD6' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3, 12, 24, 0.52)' },
  groupSheet: { minHeight: '76%', maxHeight: '92%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  groupSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  groupSheetTitle: { fontSize: 22, fontWeight: '900' },
  groupSheetHint: { marginTop: 4, fontSize: 12 },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  groupNameInput: { height: 48, marginTop: 18, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontWeight: '700' },
  selectedMembers: { paddingTop: 12, paddingBottom: 2, gap: 7 },
  selectedMemberChip: { maxWidth: 150, height: 32, borderRadius: 16, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
  selectedMemberText: { maxWidth: 112, fontSize: 11, fontWeight: '700' },
  memberSearchBox: { height: 46, marginTop: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  memberSearchInput: { flex: 1, marginLeft: 8, fontSize: 13 },
  memberResults: { flexGrow: 0, marginTop: 8, maxHeight: 310 },
  noMemberResult: { paddingVertical: 28, textAlign: 'center', fontSize: 12 },
  memberResultRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  memberAvatar: { width: 42, height: 42, borderRadius: 21 },
  memberAvatarFallback: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0F2FE' },
  memberAvatarText: { color: '#0D7CD6', fontSize: 15, fontWeight: '900' },
  memberResultBody: { flex: 1, marginLeft: 11 },
  memberResultName: { fontSize: 13, fontWeight: '800' },
  memberResultHandle: { marginTop: 2, fontSize: 10 },
  memberCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  memberCheckSelected: { backgroundColor: '#0D7CD6' },
  createGroupButton: { height: 50, marginTop: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D7CD6' },
  createGroupButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
