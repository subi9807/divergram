import { storage } from './storage';

const TUTORIAL_DONE_KEY = 'tutorial_done_v1';

export function hasCompletedTutorial(): boolean {
  return storage.getString(TUTORIAL_DONE_KEY) === '1';
}

export function markTutorialCompleted(): void {
  storage.set(TUTORIAL_DONE_KEY, '1');
}

