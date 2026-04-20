import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface MobileHeaderProps {
  currentPage: string;
  mobileBarsHidden: boolean;
  onNavigate: (page: string) => void;
  onToggleMenu: () => void;
}

export default function MobileHeader({ currentPage, mobileBarsHidden, onNavigate, onToggleMenu }: MobileHeaderProps) {
  return (
    <header className={`fixed top-0 left-0 right-0 xl:hidden bg-white dark:bg-[#1b1d21] border-b border-gray-300 dark:border-[#2f333a] z-50 transition-transform duration-300 ease-out transition-colors ${mobileBarsHidden ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <button onClick={() => onNavigate('home')} className="cursor-pointer" aria-label="Divergram 홈">
            <div className="w-10 h-10 rounded-xl bg-[#111827] text-white text-sm font-bold flex items-center justify-center">DG</div>
          </button>

          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="검색"
                onClick={() => onNavigate('search')}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#262626] dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <button
            onClick={() => onNavigate('search')}
            className="md:hidden hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
            aria-label="검색"
          >
            <MagnifyingGlassIcon className="h-6 w-6 dark:text-white" />
          </button>
          <button
            onClick={onToggleMenu}
            className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
            aria-label="전체 메뉴"
            title="전체 메뉴"
          >
            <Bars3Icon className="h-6 w-6 dark:text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
