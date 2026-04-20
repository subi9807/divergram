import { HomeIcon, MagnifyingGlassIcon, PlusCircleIcon, ChatBubbleOvalLeftEllipsisIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  PlusCircleIcon as PlusCircleIconSolid,
  ChatBubbleOvalLeftEllipsisIcon as ChatBubbleOvalLeftEllipsisIconSolid,
} from '@heroicons/react/24/solid';

interface MobileFooterNavProps {
  currentPage: string;
  mobileBarsHidden: boolean;
  onNavigate: (page: string) => void;
  profileAvatarUrl?: string;
}

export default function MobileFooterNav({ currentPage, mobileBarsHidden, onNavigate, profileAvatarUrl }: MobileFooterNavProps) {
  const items = [
    { id: 'home', icon: HomeIcon, activeIcon: HomeIconSolid, label: '홈' },
    { id: 'explore', icon: MagnifyingGlassIcon, activeIcon: MagnifyingGlassIconSolid, label: '탐색' },
    { id: 'create', icon: PlusCircleIcon, activeIcon: PlusCircleIconSolid, label: '작성' },
    { id: 'messages', icon: ChatBubbleOvalLeftEllipsisIcon, activeIcon: ChatBubbleOvalLeftEllipsisIconSolid, label: '메시지' },
    { id: 'profile', icon: UserCircleIcon, activeIcon: UserCircleIcon, label: '프로필' },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#1b1d21]/95 backdrop-blur border-t border-gray-200 dark:border-[#2f333a] z-[60] xl:hidden transition-transform duration-300 ease-out transition-colors ${mobileBarsHidden ? 'translate-y-full' : 'translate-y-0'}`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        willChange: 'transform',
      }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = isActive ? item.activeIcon : item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex min-w-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 transition-colors ${
                isActive ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="sr-only">{item.label}</span>
              {item.id === 'profile' && profileAvatarUrl ? (
                <img
                  src={profileAvatarUrl}
                  alt="profile"
                  className={`h-7 w-7 rounded-full object-cover border ${isActive ? 'border-black dark:border-white' : 'border-gray-300 dark:border-gray-500'}`}
                />
              ) : (
                <Icon className="h-7 w-7" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
