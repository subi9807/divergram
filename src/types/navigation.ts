export type AppPage =
  | 'home'
  | 'explore'
  | 'resorts'
  | 'reels'
  | 'profile'
  | 'profile-saved'
  | 'location'
  | 'post'
  | 'settings'
  | 'report'
  | 'admin'
  | 'ops';

export type SettingsTab = 'profile' | 'account' | 'activity';

export type ModalKey = 'create' | 'search' | 'notifications' | 'messages' | 'edit-profile' | null;

export interface ModalState {
  create: boolean;
  search: boolean;
  notifications: boolean;
  messages: boolean;
  editProfile: boolean;
}

export interface SelectionState {
  userId?: string;
  postId?: string;
  location?: string;
  exploreTag: string;
}
