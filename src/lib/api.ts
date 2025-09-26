import axios from 'axios';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const API_BASE = process.env.DIVERGRAM_API_BASE || 'https://divergram.com';

const axiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = storage.getString('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = storage.getString('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE}/api/auth/refresh`, {
            refreshToken
          });
          
          const { token } = response.data;
          storage.set('auth_token', token);
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        storage.delete('auth_token');
        storage.delete('refresh_token');
        // TODO: Trigger logout in app
      }
    }
    
    return Promise.reject(error);
  }
);

export const apiClient = {
  // Auth
  authWithOAuth: (provider: string, accessToken: string, userInfo?: any) =>
    axiosInstance.post('/auth/oauth', { provider, accessToken, userInfo }),
  
  authWithEmail: (email: string, password: string) =>
    axiosInstance.post('/auth/login', { email, password }),
  
  refreshToken: (refreshToken: string) =>
    axiosInstance.post('/auth/refresh', { refreshToken }),
  
  // User
  getMe: () =>
    axiosInstance.get('/me').then(res => res.data),
  
  updatePushToken: (platform: string, token: string) =>
    axiosInstance.post('/users/push-token', { platform, token }),
  
  // Feed
  getFeed: (cursor: string | null = null) =>
    axiosInstance.get('/feed', { params: { cursor } }).then(res => res.data),
  
  // Logs
  getLogs: () =>
    axiosInstance.get('/logs').then(res => res.data),
  
  createLog: (data: any) =>
    axiosInstance.post('/logs', data),
  
  uploadTrack: (logId: string, trackData: any) =>
    axiosInstance.post(`/logs/${logId}/track`, trackData),
};

export default axiosInstance;