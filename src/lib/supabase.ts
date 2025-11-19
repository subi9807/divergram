import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  website?: string;
  created_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  order_index: number;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  video_url?: string;
  caption: string;
  created_at: string;
  profiles: Profile;
  likes: { id: string }[];
  comments: { id: string }[];
  post_media?: PostMedia[];
  dive_type?: 'scuba' | 'freediving';
  dive_date?: string;
  max_depth?: number;
  water_temperature?: number;
  dive_duration?: number;
  dive_site?: string;
  visibility?: number;
  buddy?: string;
  buddy_name?: string;
  location?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: Profile;
}

export interface Room {
  id: string;
  type: 'direct' | 'group';
  created_at: string;
}

export interface Participant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  profiles: Profile;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  profiles?: Profile;
}
