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
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppSettings } from '../contexts/AppSettingsContext';
import ReportModal from './ReportModal';
import MobileHeader from './layout/MobileHeader';
import MobileFooterNav from './layout/MobileFooterNav';
import { useMobileBarsVisibility } from '../hooks/useMobileBarsVisibility';
import { useAppSettings } from '../contexts/AppSettingsContext';

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
  const { mobileBarsHidden, setMobileBarsHidden } = useMobileBarsVisibility({ disabled: showMobileMenu });
  const { signOut } = useAuth();
  const { t } = useAppSettings();

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

  useEffect(() => {
    if (showMobileMenu) {
      setMobileBarsHidden(false);
    }
  }, [showMobileMenu, setMobileBarsHidden]);

  const navItems = [
    { id: 'home', icon: HomeIcon, label: t('home') },
    { id: 'explore', icon: MagnifyingGlassIcon, label: t('explore') },
    { id: 'resorts', icon: BuildingStorefrontIcon, label: t('resorts') },
    { id: 'location', icon: MapIcon, label: t('location') },
    { id: 'reels', icon: FilmIcon, label: t('reels') },
    { id: 'create', icon: PlusCircleIcon, label: t('create') },
    { id: 'messages', icon: ChatBubbleOvalLeftEllipsisIcon, label: t('messages') },
    { id: 'notifications', icon: BellIcon, label: t('notifications') },
    { id: 'profile', icon: UserCircleIcon, label: t('profile') },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 transition-colors">
      <MobileHeader
        currentPage={currentPage}
        mobileBarsHidden={mobileBarsHidden}
        onNavigate={onNavigate}
        onToggleMenu={() => setShowMobileMenu((v) => !v)}
      />

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
              <div className="my-2 border-t border-gray-200 dark:border-[#262626]" />
              <button
                onClick={() => {
                  onNavigate('settings');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center space-x-4 px-6 py-4 text-base hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors ${
                  currentPage === 'settings' ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                }`}
              >
                <Cog6ToothIcon className="h-7 w-7" />
                <span>{t('settings')}</span>
              </button>
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
                  {t('more')}
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
                    <span className="text-sm">{t('settings')}</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('activity');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    <ClockIcon className="h-5 w-5" />
                    <span className="text-sm">{t('activity')}</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('saved');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    <BookmarkIcon className="h-5 w-5" />
                    <span className="text-sm">{t('saved')}</span>
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

      <MobileFooterNav
        navItems={navItems}
        currentPage={currentPage}
        mobileBarsHidden={mobileBarsHidden}
        onNavigate={onNavigate}
      />

      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}
    </div>
  );
}
