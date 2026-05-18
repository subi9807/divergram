import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/utils';
import { Bookmark, Gauge, Heart, MapPin, MessageCircle, MoreHorizontal, Send, Thermometer, Waves } from 'lucide-react-native';

interface FeedPostProps {
  post: {
    id: string;
    user: {
      name: string;
      avatar?: string;
    };
    content: string;
    image?: string;
    likes: number;
    comments: number;
    createdAt: string;
    location?: string;
    maxDepth?: number;
    waterTemperature?: number;
    visibility?: number;
  };
}

export function FeedPost({ post }: FeedPostProps) {
  const { t } = useTranslation();
  const hasRenderableImage = typeof post.image === 'string' && /^https?:\/\//.test(post.image);

  return (
    <View className="mx-4 mb-5 overflow-hidden rounded-[28px] border border-surface-200 bg-white shadow-sm shadow-surface-200">
      <View className="p-4">
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
          <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border border-surface-200 bg-white">
            <MoreHorizontal size={19} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <Text className="mb-4 text-[15px] leading-6 text-surface-800">{post.content}</Text>

        {hasRenderableImage && (
          <Image
            source={{ uri: post.image }} 
            className="mb-4 h-80 w-full rounded-3xl"
            resizeMode="cover"
          />
        )}

        <View className="mb-3 flex-row flex-wrap">
          {post.location && <MetaChip icon={MapPin} text={post.location} />}
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
