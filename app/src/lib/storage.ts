import { MMKV } from 'react-native-mmkv';

type StorageLike = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

const memoryStorage = new Map<string, string>();
let activeStorage: StorageLike | null = null;

function createMemoryStorage(): StorageLike {
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

function resolveStorage(): StorageLike {
  if (activeStorage) return activeStorage;

  try {
    activeStorage = new MMKV() as unknown as StorageLike;
  } catch (error) {
    if (__DEV__) {
      console.log('MMKV unavailable, using memory fallback', error);
    }
    activeStorage = createMemoryStorage();
  }

  return activeStorage;
}

export const storage: StorageLike = {
  getString: (key) => resolveStorage().getString(key),
  set: (key, value) => resolveStorage().set(key, value),
  delete: (key) => resolveStorage().delete(key),
};
