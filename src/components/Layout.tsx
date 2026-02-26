import {
  HomeIcon,
  MagnifyingGlassIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  UserCircleIcon,
  MapIcon,
  FilmIcon,
  BellIcon,
  Bars3Icon,
  PlusCircleIcon,
  Cog6ToothIcon,
  ClockIcon,
  BookmarkIcon,
  MoonIcon,
  SunIcon,
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MapIcon as MapIconSolid,
  FilmIcon as FilmIconSolid,
  PlusCircleIcon as PlusCircleIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  ChatBubbleOvalLeftEllipsisIcon as ChatBubbleOvalLeftEllipsisIconSolid,
} from '@heroicons/react/24/solid';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReportModal from './ReportModal';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogout = async () => {
    await signOut();
    setShowMoreMenu(false);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const navItems = [
    { id: 'home', icon: HomeIcon, label: '홈' },
    { id: 'explore', icon: MapIcon, label: '탐색' },
    { id: 'reels', icon: FilmIcon, label: '릴스' },
    { id: 'create', icon: PlusCircleIcon, label: '게시물 등록' },
    { id: 'messages', icon: ChatBubbleOvalLeftEllipsisIcon, label: '메시지' },
    { id: 'notifications', icon: BellIcon, label: '알림' },
    { id: 'profile', icon: UserCircleIcon, label: '프로필' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] transition-colors">
      <header className="fixed top-0 left-0 right-0 xl:hidden bg-white dark:bg-[#121212] border-b border-gray-300 dark:border-[#262626] z-50 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <button onClick={() => onNavigate('home')} className="cursor-pointer" aria-label="Divergram 홈">
              <img
                src={isDarkMode ? '/assets/logo/divergram-logo-dark.png' : '/assets/logo/divergram-logo-light.png'}
                alt="Divergram"
                className="h-8 w-8 object-contain"
              />
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
              onClick={() => onNavigate('notifications')}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full relative transition-colors"
            >
              <BellIcon className={`h-6 w-6 dark:text-white ${currentPage === 'notifications' ? 'text-black dark:text-white' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {showMobileMenu && (
        <div className="fixed top-16 right-0 w-64 bg-white dark:bg-[#121212] border-l border-b border-gray-300 dark:border-[#262626] shadow-lg z-40 md:hidden transition-colors">
          <div className="py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors ${
                    isActive ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isActive ? 'fill-current' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex">
        <aside className={`hidden xl:block fixed left-0 top-0 w-[84px] h-screen overflow-visible transition-colors ${currentPage === 'location' ? 'bg-white/60 dark:bg-[#121212]/60 backdrop-blur-md' : 'bg-white dark:bg-[#121212]'}`}>
          <nav className="py-6 flex flex-col h-full">
            <div className="px-4 pb-6 flex justify-center">
              <button onClick={() => onNavigate('home')} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="홈">
                <img
                  src={isDarkMode ? '/assets/logo/divergram-logo-dark.png' : '/assets/logo/divergram-logo-light.png'}
                  alt="Divergram"
                  className="h-8 w-8 object-contain"
                />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`group relative w-full flex items-center justify-center px-2 py-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white transition-colors ${
                      isActive ? 'font-bold' : 'font-medium'
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${isActive ? 'text-black dark:text-white' : ''}`} />
                    <span className="pointer-events-none absolute left-[78px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#262626] text-white text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto relative px-2 mb-4" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="group relative w-full flex items-center justify-center px-2 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white transition-colors rounded-lg"
              >
                <Bars3Icon className="h-6 w-6" />
                <span className="pointer-events-none absolute left-[78px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#262626] text-white text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                  더보기
                </span>
              </button>

              {showMoreMenu && (
                <div className="absolute bottom-full left-[76px] mb-2 w-56 bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#262626] py-2 z-50 transition-colors">
                  <button
                    onClick={() => {
                      onNavigate('settings');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    <Cog6ToothIcon className="h-5 w-5" />
                    <span className="text-sm">설정</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('activity');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    <ClockIcon className="h-5 w-5" />
                    <span className="text-sm">내 활동</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('saved');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    <BookmarkIcon className="h-5 w-5" />
                    <span className="text-sm">저장됨</span>
                  </button>

                  <button
                    onClick={toggleDarkMode}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    {isDarkMode ? (
                      <>
                        <SunIcon className="h-5 w-5" />
                        <span className="text-sm">라이트 모드</span>
                      </>
                    ) : (
                      <>
                        <MoonIcon className="h-5 w-5" />
                        <span className="text-sm">다크 모드</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setShowReportModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <span className="text-sm">문제 신고</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('admin');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    <ShieldCheckIcon className="h-5 w-5" />
                    <span className="text-sm">관리자</span>
                  </button>

                  <div className="border-t border-gray-200 dark:border-[#262626] my-2"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span className="text-sm">로그아웃</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </aside>

        <main className="flex-1 pt-16 xl:pt-0 pb-20 md:pb-4 xl:ml-[84px] overflow-x-hidden">
          <div className={`w-full ${currentPage === 'location' ? '' : 'md:max-w-[630px] lg:max-w-[630px] xl:max-w-[935px] mx-auto'}`}>
            {children}
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#121212] border-t border-gray-300 dark:border-[#262626] z-50 xl:hidden transition-colors">
        <div className="flex items-center justify-around h-16">
          {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[6]].map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const solidMap: Record<string, any> = {
              home: HomeIconSolid,
              explore: MapIconSolid,
              reels: FilmIconSolid,
              create: PlusCircleIconSolid,
              profile: UserCircleIconSolid,
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

      <button
        onClick={() => onNavigate('messages')}
        className="fixed bottom-20 right-4 xl:hidden bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-1 rounded-full shadow-lg hover:shadow-xl transition-shadow z-40"
      >
        <div className="bg-white dark:bg-[#121212] rounded-full p-3 transition-colors">
          {currentPage === 'messages' ? (
            <ChatBubbleOvalLeftEllipsisIconSolid className="h-6 w-6 text-purple-600" />
          ) : (
            <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6 text-gray-700" />
          )}
        </div>
      </button>

      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}
    </div>
  );
}
