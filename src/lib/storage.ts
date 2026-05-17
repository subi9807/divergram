import { MMKV } from 'react-native-mmkv';

type StorageLike = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

const memoryStorage = new Map<string, string>();

function createStorage(): StorageLike {
  try {
    return new MMKV();
  } catch {
    if (__DEV__) {
      console.log('MMKV unavailable, using memory fallback');
    }
    return {
      getString: (key) => memoryStorage.get(key),
      set: (key, value) => {
        memoryStorage.set(key, value);
      },
      delete: (key) => {
        memoryStorage.delete(key);
      },
    };
  }
}

export const storage = createStorage();
