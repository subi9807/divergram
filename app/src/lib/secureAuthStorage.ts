import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { storage } from './storage';

export const AUTH_TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_KEYS = [AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY] as const;
const cache = new Map<string, string>();

export async function hydrateSecureAuthStorage() {
  for (const key of TOKEN_KEYS) {
    let value = String((await SecureStore.getItemAsync(key)) || '').trim();
    if (!value) {
      value = String(storage.getString(key) || (await AsyncStorage.getItem(key)) || '').trim();
      if (value) await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    }
    if (value) cache.set(key, value);
    storage.delete(key);
    await AsyncStorage.removeItem(key);
  }
}

export function getSecureAuthValue(key: string) {
  return cache.get(key) || null;
}

export function setSecureAuthValue(key: string, value: string) {
  const normalized = String(value || '').trim();
  storage.delete(key);
  void AsyncStorage.removeItem(key);
  if (!normalized) return deleteSecureAuthValue(key);
  cache.set(key, normalized);
  void SecureStore.setItemAsync(key, normalized, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
}

export function deleteSecureAuthValue(key: string) {
  cache.delete(key);
  storage.delete(key);
  void AsyncStorage.removeItem(key);
  void SecureStore.deleteItemAsync(key);
}
