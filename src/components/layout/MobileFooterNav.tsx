import { ChatBubbleOvalLeftEllipsisIcon, HomeIcon, FilmIcon, PlusCircleIcon, MapIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  FilmIcon as FilmIconSolid,
  PlusCircleIcon as PlusCircleIconSolid,
  MapIcon as MapIconSolid,
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
    { id: 'home', icon: HomeIcon, activeIcon: HomeIconSolid },
    { id: 'reels', icon: FilmIcon, activeIcon: FilmIconSolid },
    { id: 'create', icon: PlusCircleIcon, activeIcon: PlusCircleIconSolid },
    { id: 'location', icon: MapIcon, activeIcon: MapIconSolid },
    { id: 'profile', icon: UserCircleIcon, activeIcon: UserCircleIcon },
  ];

  return (
    <>
      <nav
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1b1d21] border-t border-gray-300 dark:border-[#2f333a] z-[60] xl:hidden transition-transform duration-300 ease-out transition-colors ${mobileBarsHidden ? 'translate-y-full' : 'translate-y-0'}`}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform',
        }}
      >
        <div className="flex items-center justify-around h-16">
          {items.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = isActive ? item.activeIcon : item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center p-2 transition-colors ${
                  isActive ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
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

      {currentPage !== 'reels' && (
        <button
          onClick={() => onNavigate('messages')}
          aria-label="메시지"
          title="메시지"
          className={`fixed bottom-20 right-4 xl:hidden bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-1 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-out z-40 ${mobileBarsHidden ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
        >
          <div className="bg-white dark:bg-[#1b1d21] rounded-full p-3 transition-colors">
            {currentPage === 'messages' ? (
              <ChatBubbleOvalLeftEllipsisIconSolid className="h-6 w-6 text-purple-600" />
            ) : (
              <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6 text-gray-700" />
            )}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-white text-center drop-shadow">메시지</div>
        </button>
      )}
    </>
  );
}
