import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from './storage';

const TUTORIAL_DONE_KEY = 'tutorial_done_v1';

export function hasCompletedTutorial(): boolean {
  return storage.getString(TUTORIAL_DONE_KEY) === '1';
}

export async function hydrateTutorialCompleted(): Promise<boolean> {
  if (hasCompletedTutorial()) return true;

  try {
    const persisted = await AsyncStorage.getItem(TUTORIAL_DONE_KEY);
    if (persisted === '1') {
      storage.set(TUTORIAL_DONE_KEY, '1');
      return true;
    }
  } catch {
    // ignore fallback lookup failures
  }

  return false;
}

export async function markTutorialCompleted(): Promise<void> {
  storage.set(TUTORIAL_DONE_KEY, '1');
  try {
    await AsyncStorage.setItem(TUTORIAL_DONE_KEY, '1');
  } catch {
    // ignore backup write failures
  }
}
