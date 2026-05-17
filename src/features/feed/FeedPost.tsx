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

  return (
    <View className="mx-4 mb-5 overflow-hidden rounded-3xl border border-surface-200 bg-white shadow-sm shadow-surface-200">
      <View className="p-4">
        <View className="flex-row items-center mb-4">
          {post.user.avatar ? (
            <Image source={{ uri: post.user.avatar }} className="mr-3 h-11 w-11 rounded-2xl" resizeMode="cover" />
          ) : (
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-brand-600">
              <Text className="font-semibold text-white">{post.user.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="font-semibold text-surface-900">{post.user.name}</Text>
            <Text className="text-sm text-surface-500">
              {formatDate(post.createdAt)}{post.location ? ` · ${post.location}` : ''}
            </Text>
          </View>
          <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border border-surface-200 bg-surface-50">
            <MoreHorizontal size={19} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <Text className="mb-4 leading-6 text-surface-800">{post.content}</Text>

        {post.image && (
          <Image 
            source={{ uri: post.image }} 
            className="w-full h-72 rounded-3xl mb-4"
            resizeMode="cover"
          />
        )}

        <View className="mb-4 flex-row flex-wrap">
          {post.location && <MetaChip icon={MapPin} text={post.location} />}
          {post.maxDepth ? <MetaChip icon={Gauge} text={`${post.maxDepth}m`} /> : null}
          {post.waterTemperature ? <MetaChip icon={Thermometer} text={`${post.waterTemperature}°C`} /> : null}
          {post.visibility ? <MetaChip icon={Waves} text={t('feed.meta.visibility', { value: post.visibility })} /> : null}
        </View>

        <View className="flex-row items-center justify-between border-t border-surface-100 pt-4">
          <View className="flex-row items-center">
            <TouchableOpacity className="mr-5 flex-row items-center">
              <Heart size={21} color="#1e293b" />
              <Text className="ml-2 font-semibold text-surface-700">{post.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="mr-5 flex-row items-center">
              <MessageCircle size={21} color="#1e293b" />
              <Text className="ml-2 font-semibold text-surface-700">{post.comments}</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Send size={21} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity>
            <Bookmark size={21} color="#1e293b" />
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
