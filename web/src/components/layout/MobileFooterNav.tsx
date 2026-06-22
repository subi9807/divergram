import {
  BellIcon,
  BuildingStorefrontIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MapIcon,
  PlayCircleIcon,
  PlusCircleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  PlayCircleIcon as PlayCircleIconSolid,
  PlusCircleIcon as PlusCircleIconSolid,
} from '@heroicons/react/24/solid';
import { useAppSettings, type BottomNavItemId } from '../../contexts/AppSettingsContext';

interface MobileFooterNavProps {
  currentPage: string;
  mobileBarsHidden: boolean;
  onNavigate: (page: string) => void;
  profileAvatarUrl?: string;
}

const iconMap: Record<BottomNavItemId, { icon: any; activeIcon: any; label: string; isPrimary?: boolean }> = {
  home: { icon: HomeIcon, activeIcon: HomeIconSolid, label: '홈' },
  explore: { icon: MagnifyingGlassIcon, activeIcon: MagnifyingGlassIconSolid, label: '탐색' },
  create: { icon: PlusCircleIcon, activeIcon: PlusCircleIconSolid, label: '작성', isPrimary: true },
  resorts: { icon: BuildingStorefrontIcon, activeIcon: BuildingStorefrontIcon, label: '리조트' },
  location: { icon: MapIcon, activeIcon: MapIcon, label: '지도' },
  reels: { icon: PlayCircleIcon, activeIcon: PlayCircleIconSolid, label: '릴스' },
  messages: { icon: ChatBubbleOvalLeftEllipsisIcon, activeIcon: ChatBubbleOvalLeftEllipsisIcon, label: '메시지' },
  notifications: { icon: BellIcon, activeIcon: BellIcon, label: '알림' },
  profile: { icon: UserCircleIcon, activeIcon: UserCircleIcon, label: '프로필' },
};

export default function MobileFooterNav({ currentPage, mobileBarsHidden, onNavigate, profileAvatarUrl }: MobileFooterNavProps) {
  const { bottomNavItems } = useAppSettings();

  const handleNavClick = (page: string) => {
    if (page === currentPage) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(8);
    }
    onNavigate(page);
  };

  const items = bottomNavItems.map((id) => ({ id, ...iconMap[id] })).filter(Boolean);

  return (
    <div
      data-mobile-nav
      data-no-gesture="true"
      className={`fixed bottom-0 left-0 right-0 z-[60] xl:hidden transition-transform duration-300 ease-out ${mobileBarsHidden ? 'translate-y-full' : 'translate-y-0'}`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        willChange: 'transform',
      }}
    >
      <nav className="mx-auto mb-2 w-[calc(100%-14px)] max-w-sm rounded-[40px] border border-gray-200/80 bg-white/95 px-2 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-[#2a2e35] dark:bg-[#17191d]/95 dark:shadow-none">
        <div className="mx-auto flex h-14 items-center justify-around px-1">
          {items.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = isActive ? item.activeIcon : item.icon;
            const isPrimary = !!item.isPrimary;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-w-[58px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2.5 py-1.5 transition-all duration-200 touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 dark:focus-visible:ring-blue-300/60 ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                } ${isPrimary && !isActive ? 'text-gray-700 dark:text-gray-200' : ''}`}
              >
                {item.id === 'profile' && profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt="profile"
                    className={`h-[26px] w-[26px] rounded-full border object-cover ${isActive ? 'border-black dark:border-white' : 'border-gray-300 dark:border-gray-500'}`}
                  />
                ) : (
                  <Icon className={`${isPrimary ? 'h-[30px] w-[30px]' : 'h-[26px] w-[26px]'}`} />
                )}
                <span className={`text-[10px] leading-none ${isActive ? 'opacity-100' : 'opacity-85'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
