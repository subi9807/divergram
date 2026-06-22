import type { ModalState } from '../types/navigation';

export function getModalQueryValue(modalState: ModalState): string {
  if (modalState.create) return 'create';
  if (modalState.search) return 'search';
  if (modalState.editProfile) return 'edit-profile';
  return '';
}

export function getModalStateFromQuery(modal: string | null): ModalState {
  return {
    create: modal === 'create',
    search: modal === 'search',
    notifications: false,
    messages: false,
    editProfile: modal === 'edit-profile',
  };
}
