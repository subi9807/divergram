import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { formatDate } from '../../lib/utils';
import { Heart, MessageCircle, Share } from 'lucide-react-native';

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
  };
}

export function FeedPost({ post }: FeedPostProps) {
  return (
    <Card className="mx-4 mb-4">
      <View className="p-4">
        <View className="flex-row items-center mb-3">
          <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
            <Text className="text-primary-600 font-semibold">
              {post.user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="font-semibold text-secondary-800">
              {post.user.name}
            </Text>
            <Text className="text-secondary-500 text-sm">
              {formatDate(post.createdAt)}
            </Text>
          </View>
        </View>

        <Text className="text-secondary-700 mb-3 leading-5">
          {post.content}
        </Text>

        {post.image && (
          <Image 
            source={{ uri: post.image }} 
            className="w-full h-48 rounded-lg mb-3"
            resizeMode="cover"
          />
        )}

        <View className="flex-row items-center justify-between pt-3 border-t border-secondary-100">
          <TouchableOpacity className="flex-row items-center">
            <Heart size={20} color="#64748b" />
            <Text className="text-secondary-600 ml-2">{post.likes}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center">
            <MessageCircle size={20} color="#64748b" />
            <Text className="text-secondary-600 ml-2">{post.comments}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity>
            <Share size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}