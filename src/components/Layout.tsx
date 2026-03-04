import {
  HomeIcon,
  MagnifyingGlassIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  UserCircleIcon,
  MapIcon,
  BuildingStorefrontIcon,
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
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
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
  const lastScrollYRef = useRef(0);
  const lastTouchYRef = useRef<number | null>(null);
  const [mobileBarsHidden, setMobileBarsHidden] = useState(false);
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

  useEffect(() => {
    const hideBars = () => setMobileBarsHidden(true);
    const showBars = () => setMobileBarsHidden(false);

    const onScroll = () => {
      if (window.innerWidth >= 1280 || showMobileMenu) return;

      const currentY = window.scrollY;
      const diff = currentY - lastScrollYRef.current;

      if (currentY < 24) {
        showBars();
      } else if (diff > 6) {
        hideBars();
      } else if (diff < -6) {
        showBars();
      }

      lastScrollYRef.current = currentY;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= 1280 || showMobileMenu) return;
      lastTouchYRef.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (window.innerWidth >= 1280 || showMobileMenu) return;
      const currentY = e.touches[0]?.clientY;
      if (currentY == null || lastTouchYRef.current == null) return;

      const diff = currentY - lastTouchYRef.current;
      if (window.scrollY < 24) {
        showBars();
      } else if (diff < -4) {
        hideBars();
      } else if (diff > 4) {
        showBars();
      }

      lastTouchYRef.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [showMobileMenu]);

  const handleLogout = async () => {
    await signOut();
    setShowMoreMenu(false);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    if (showMobileMenu) {
      setMobileBarsHidden(false);
    }
  }, [showMobileMenu]);

  const navItems = [
    { id: 'home', icon: HomeIcon, label: '홈' },
    { id: 'explore', icon: MagnifyingGlassIcon, label: '탐색' },
    { id: 'resorts', icon: BuildingStorefrontIcon, label: '리조트' },
    { id: 'location', icon: MapIcon, label: '포인트 지도' },
    { id: 'reels', icon: FilmIcon, label: '릴스' },
    { id: 'create', icon: PlusCircleIcon, label: '게시물 등록' },
    { id: 'messages', icon: ChatBubbleOvalLeftEllipsisIcon, label: '메시지' },
    { id: 'notifications', icon: BellIcon, label: '알림' },
    { id: 'profile', icon: UserCircleIcon, label: '프로필' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 transition-colors">
      <header className={`fixed top-0 left-0 right-0 xl:hidden bg-white dark:bg-[#121212] border-b border-gray-300 dark:border-[#262626] z-50 transition-transform duration-300 ease-out transition-colors ${mobileBarsHidden ? '-translate-y-full' : 'translate-y-0'}`}>
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
              onClick={() => onNavigate('notifications')}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full relative transition-colors"
              aria-label="알림"
            >
              <BellIcon className={`h-6 w-6 dark:text-white ${currentPage === 'notifications' ? 'text-black dark:text-white' : ''}`} />
            </button>
            <button
              onClick={() => setShowMobileMenu((v) => !v)}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
              aria-label="전체 메뉴"
              title="전체 메뉴"
            >
              <Bars3Icon className="h-6 w-6 dark:text-white" />
            </button>
          </div>
        </div>
      </header>

      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="메뉴 닫기"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="absolute inset-0 bg-white dark:bg-[#121212] animate-mobile-menu-slide-in transition-colors">
            <div className="h-16 px-4 flex items-center justify-end border-b border-gray-300 dark:border-[#262626]">
              <button
                onClick={() => setShowMobileMenu(false)}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
                aria-label="메뉴 닫기"
              >
                <Bars3Icon className="h-6 w-6 dark:text-white" />
              </button>
            </div>
            <div className="py-3">
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
                    className={`w-full flex items-center space-x-4 px-6 py-4 text-base hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors ${
                      isActive ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                    }`}
                  >
                    <Icon className={`h-7 w-7 ${isActive ? 'fill-current' : ''}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        <aside className={`hidden xl:block fixed left-0 top-0 z-40 w-[84px] h-screen overflow-visible transition-colors ${currentPage === 'location' ? 'bg-white/60 dark:bg-[#121212]/60 backdrop-blur-md' : 'bg-white dark:bg-[#121212]'}`}>
          <nav className="py-6 flex flex-col h-full">
            <div className="px-4 pb-6 flex justify-center">
              <button onClick={() => onNavigate('home')} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="홈">
                <div className="w-10 h-10 rounded-xl bg-[#111827] text-white text-sm font-bold flex items-center justify-center">DG</div>
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
                <div className="absolute bottom-full left-[68px] mb-3 w-56 bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#262626] py-2 z-50 transition-colors">
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

        <main className={`flex-1 ${currentPage === 'reels' ? 'pt-16 pb-16 md:pb-4 xl:pt-0 xl:pb-0' : 'pt-16 xl:pt-0 pb-20 md:pb-4'} xl:ml-[84px] overflow-x-hidden`}>
          <div className={`w-full ${currentPage === 'location' || currentPage === 'reels' ? '' : 'md:max-w-[630px] lg:max-w-[630px] xl:max-w-[935px] mx-auto'}`}>
            {children}
          </div>
        </main>
      </div>

      <nav
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-[#121212] border-t border-gray-300 dark:border-[#262626] z-[60] xl:hidden transition-transform duration-300 ease-out transition-colors ${mobileBarsHidden ? 'translate-y-full' : 'translate-y-0'}`}
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
        <div className="bg-white dark:bg-[#121212] rounded-full p-3 transition-colors">
          {currentPage === 'messages' ? (
            <ChatBubbleOvalLeftEllipsisIconSolid className="h-6 w-6 text-purple-600" />
          ) : (
            <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6 text-gray-700" />
          )}
        </div>
        <div className="mt-1 text-[10px] font-semibold text-white text-center drop-shadow">메시지</div>
      </button>
      )}

      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}
    </div>
  );
}
