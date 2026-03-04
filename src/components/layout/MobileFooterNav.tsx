import { ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  FilmIcon as FilmIconSolid,
  PlusCircleIcon as PlusCircleIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  ChatBubbleOvalLeftEllipsisIcon as ChatBubbleOvalLeftEllipsisIconSolid,
} from '@heroicons/react/24/solid';
import { MapIcon, BellIcon } from '@heroicons/react/24/outline';

interface NavItem {
  id: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}

interface MobileFooterNavProps {
  navItems: NavItem[];
  currentPage: string;
  mobileBarsHidden: boolean;
  onNavigate: (page: string) => void;
}

export default function MobileFooterNav({ navItems, currentPage, mobileBarsHidden, onNavigate }: MobileFooterNavProps) {
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
          {[navItems[0], navItems[3], navItems[1], navItems[4], navItems[7]].map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const solidMap: Record<string, any> = {
              home: HomeIconSolid,
              reels: FilmIconSolid,
              explore: MagnifyingGlassIconSolid,
              create: PlusCircleIconSolid,
              profile: UserCircleIconSolid,
              location: MapIcon,
              notifications: BellIcon,
            };
            const ActiveIcon = solidMap[item.id] || Icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center p-2 transition-colors ${
                  isActive ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {isActive ? <ActiveIcon className="h-7 w-7" /> : <Icon className="h-7 w-7" />}
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
