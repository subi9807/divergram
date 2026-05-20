import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, useWindowDimensions, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { SvgUri } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { formatDate } from '../../lib/utils';
import { Bookmark, Building2, Gauge, Heart, MapPin, MessageCircle, MoreHorizontal, Send, Thermometer, Waves } from 'lucide-react-native';
import { appRouteMap } from '../../config/sitemap';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';

interface FeedPostProps {
  post: {
    id: string;
    user: {
      id?: string;
      name: string;
      avatar?: string;
    };
    content: string;
    image?: string;
    likes: number;
    comments: number;
    createdAt: string;
    location?: string;
    diveSite?: string;
    diveType?: string;
    gasType?: string;
    gasPercent?: number;
    resort?: string;
    maxDepth?: number;
    waterTemperature?: number;
    visibility?: number;
  };
}

export function FeedPost({ post }: FeedPostProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasRenderableImage = typeof post.image === 'string' && /^https?:\/\//.test(post.image);
  const postImageUri = hasRenderableImage ? (post.image as string) : '';
  const isSvgImage = hasRenderableImage && /\.svg(?:\?|#|$)/i.test(post.image || '');
  const imageHeight = Math.min(Math.max(screenWidth * 1.05, 300), 560);
  const diveTypeLabel = post.diveType ? t(`logsForm.diveTypes.${post.diveType}` as any, { defaultValue: post.diveType }) : '';
  const gasTypeLabel = post.gasType ? t(`logsForm.gasTypes.${post.gasType}` as any, { defaultValue: post.gasType }) : '';
  const isOwnPost = Boolean(user?.id && post.user?.id && String(user.id) === String(post.user.id));

  const openReport = () => {
    setMenuOpen(false);
    router.push(appRouteMap.report.path as never);
  };

  const openAccountInfo = () => {
    setMenuOpen(false);
    if (isOwnPost) {
      router.push(appRouteMap.account.path as never);
      return;
    }
    showToast({
      type: 'info',
      title: t('feed.menu.accountInfoPending', { defaultValue: '계정정보 상세는 곧 제공됩니다.' }),
    });
  };

  const openPost = () => {
    setMenuOpen(false);
    router.push(`${appRouteMap.post.path}?post=${encodeURIComponent(post.id)}` as never);
  };

  const sharePost = async () => {
    setMenuOpen(false);
    try {
      await Share.share({
        message: `Divergram • ${post.user.name}\nhttps://divergram.com/post/${encodeURIComponent(post.id)}`,
      });
    } catch {
      showToast({
        type: 'error',
        title: t('feed.menu.shareFailed', { defaultValue: '공유에 실패했습니다.' }),
      });
    }
  };

  const menuItems = isOwnPost
    ? [
        {
          key: 'edit',
          label: t('feed.menu.edit', { defaultValue: '수정' }),
          onPress: () => {
            setMenuOpen(false);
            showToast({
              type: 'info',
              title: t('feed.menu.editPending', { defaultValue: '편집 기능은 준비 중입니다.' }),
            });
          },
        },
        { key: 'share', label: t('feed.menu.share', { defaultValue: '공유' }), onPress: sharePost },
        { key: 'account', label: t('feed.menu.accountInfo', { defaultValue: '계정정보' }), onPress: openAccountInfo },
      ]
    : [
        { key: 'report', label: t('feed.menu.report', { defaultValue: '신고' }), onPress: openReport, tone: 'danger' as const },
        {
          key: 'favorite',
          label: t('feed.menu.addFavorite', { defaultValue: '즐겨찾기 추가' }),
          onPress: () => {
            setMenuOpen(false);
            showToast({
              type: 'success',
              title: t('feed.menu.favoriteAdded', { defaultValue: '즐겨찾기에 추가했습니다.' }),
            });
          },
        },
        { key: 'post', label: t('feed.menu.openPost', { defaultValue: '게시물로 이동' }), onPress: openPost },
        { key: 'share', label: t('feed.menu.share', { defaultValue: '공유' }), onPress: sharePost },
        { key: 'account', label: t('feed.menu.accountInfo', { defaultValue: '계정정보' }), onPress: openAccountInfo },
      ];

  return (
    <View className="relative mb-5 overflow-hidden border-y border-surface-200 bg-white">
      {menuOpen ? (
        <TouchableOpacity
          className="absolute inset-0 z-20"
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
      ) : null}
      <View className="px-4 pb-0 pt-4">
        <View className="mb-4 flex-row items-start">
          {post.user.avatar ? (
            <Image source={{ uri: post.user.avatar }} className="mr-3 h-11 w-11 rounded-2xl" resizeMode="cover" />
          ) : (
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-brand-600">
              <Text className="font-semibold text-white">{post.user.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="font-semibold text-surface-900">{post.user.name}</Text>
            <Text className="mt-0.5 text-sm text-surface-500">{formatDate(post.createdAt)}</Text>
            {post.location ? <Text className="mt-1 text-xs font-medium text-brand-700">{post.location}</Text> : null}
          </View>
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full border border-surface-200 bg-white"
            onPress={() => setMenuOpen((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={t('menu.more')}
          >
            <MoreHorizontal size={19} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <Text className="mb-4 text-[15px] leading-6 text-surface-800">{post.content}</Text>
      </View>

      {menuOpen ? (
        <View className="absolute right-4 top-14 z-30 w-44 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-lg">
          {menuItems.map((item, index) => (
            <View key={item.key}>
              <TouchableOpacity className="px-4 py-3" onPress={item.onPress} accessibilityRole="button">
                <Text className={`text-sm ${item.tone === 'danger' ? 'font-semibold text-red-600' : 'font-medium text-surface-900'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
              {index < menuItems.length - 1 ? <View className="h-px bg-surface-100" /> : null}
            </View>
          ))}
        </View>
      ) : null}

      {hasRenderableImage && (
        isSvgImage ? (
          <View className="w-full overflow-hidden bg-surface-50" style={{ height: imageHeight }}>
            <SvgUri uri={postImageUri} width="100%" height="100%" />
          </View>
        ) : (
          <ExpoImage
            source={{ uri: postImageUri }}
            style={{ height: imageHeight, width: '100%' }}
            contentFit="cover"
            transition={120}
          />
        )
      )}

      <View className="px-4 pb-4 pt-4">
        <View className="mb-3 flex-row flex-wrap">
          {post.location && <MetaChip icon={MapPin} text={post.location} />}
          {post.diveSite && post.diveSite !== post.location ? <MetaChip icon={MapPin} text={post.diveSite} /> : null}
          {post.diveType ? <MetaChip icon={Waves} text={diveTypeLabel} /> : null}
          {post.gasType ? (
            <MetaChip
              icon={Thermometer}
              text={
                post.gasType !== 'air' && post.gasPercent
                  ? t('feed.meta.gasWithPercent', { gas: gasTypeLabel, percent: post.gasPercent })
                  : gasTypeLabel
              }
            />
          ) : null}
          {post.resort ? <MetaChip icon={Building2} text={t('feed.meta.resort', { name: post.resort })} /> : null}
          {post.maxDepth ? <MetaChip icon={Gauge} text={`${post.maxDepth}m`} /> : null}
          {post.waterTemperature ? <MetaChip icon={Thermometer} text={`${post.waterTemperature}°C`} /> : null}
          {post.visibility ? <MetaChip icon={Waves} text={t('feed.meta.visibility', { value: post.visibility })} /> : null}
        </View>

        <View className="flex-row items-center justify-between border-t border-surface-100 pt-3">
          <View className="flex-row items-center">
            <TouchableOpacity className="mr-2 h-10 flex-row items-center rounded-full bg-surface-50 px-3">
              <Heart size={19} color="#1e293b" />
              <Text className="ml-2 font-semibold text-surface-700">{post.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="mr-2 h-10 flex-row items-center rounded-full bg-surface-50 px-3">
              <MessageCircle size={19} color="#1e293b" />
              <Text className="ml-2 font-semibold text-surface-700">{post.comments}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-surface-50">
              <Send size={19} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-surface-50">
            <Bookmark size={19} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function MetaChip({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <View className="mb-2 mr-2 flex-row items-center rounded-full border border-surface-200 bg-surface-50 px-3 py-2">
      <Icon size={14} color="#4d5d6b" />
      <Text className="ml-1 text-xs font-medium text-surface-700">{text}</Text>
    </View>
  );
}
