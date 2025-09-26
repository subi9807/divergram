export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface DiveLog {
  id: string;
  title: string;
  location?: string;
  depth: number;
  duration: number;
  notes?: string;
  images?: string[];
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FeedPost {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  createdAt: string;
}

export interface BleDevice {
  id: string;
  name: string;
  rssi?: number;
  serviceUuids?: string[];
}

export interface DiveData {
  timestamp: number;
  depth: number;
  temperature: number;
  pressure?: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}