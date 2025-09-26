import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.delete(name);
  },
};

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  
  // Actions
  setUser: (user: User) => void;
  setTokens: (token: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      
      setTokens: (token, refreshToken) => set({ 
        token, 
        refreshToken,
        isAuthenticated: true 
      }),
      
      clearAuth: () => set({ 
        user: null, 
        token: null, 
        refreshToken: null, 
        isAuthenticated: false 
      }),
      
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);