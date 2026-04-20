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
import { DESKTOP_NAV_IDS, MOBILE_MENU_NAV_IDS } from '../config/navigation';

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
  const { mobileBarsHidden, setMobileBarsHidden, lockMobileBars } = useMobileBarsVisibility({ disabled: showMobileMenu });
  const { signOut, profile } = useAuth();
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

  const handleNav = (page: string) => {
    lockMobileBars(420);
    setMobileBarsHidden(false);
    window.requestAnimationFrame(() => {
      onNavigate(page);
    });
  };

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

  const desktopNavItems = navItems.filter((item) => DESKTOP_NAV_IDS.includes(item.id as any));
  const mobileMenuItems = [
    ...navItems.filter((item) => MOBILE_MENU_NAV_IDS.includes(item.id as any)),
    { id: 'settings', icon: Cog6ToothIcon, label: t('settings') },
  ];

  const settingsShortcutItems = [
    { id: 'settings', icon: Cog6ToothIcon, label: t('settings'), description: '언어, 테마, 개인정보' },
    { id: 'activity', icon: ClockIcon, label: t('activity'), description: '활동과 기록 보기' },
    { id: 'saved', icon: BookmarkIcon, label: t('saved'), description: '저장한 게시물 보기' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#1b1d21] text-gray-900 dark:text-gray-100 transition-colors">
      <MobileHeader
        currentPage={currentPage}
        mobileBarsHidden={mobileBarsHidden}
        onNavigate={handleNav}
        onToggleMenu={() => setShowMobileMenu((v) => !v)}
      />

      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="메뉴 닫기"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="absolute inset-0 bg-white dark:bg-[#1b1d21] animate-mobile-menu-slide-in transition-colors flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-[#2f333a]">
              <p className="text-xs font-semibold tracking-[0.24em] text-gray-400 uppercase">Menu</p>
              <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">둘러보기</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">자주 쓰는 기능만 남기고, 나머지는 더 단순하게 정리했어.</p>
            </div>
            <div className="h-16 px-4 flex items-center justify-end border-b border-gray-300 dark:border-[#2f333a] shrink-0">
              <button
                onClick={() => setShowMobileMenu(false)}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
                aria-label="메뉴 닫기"
              >
                <Bars3Icon className="h-6 w-6 dark:text-white" />
              </button>
            </div>
            <div className="py-3 overflow-y-auto">
              <div className="px-6 pb-2 text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">Quick settings</div>
              <div className="px-4 pb-3 grid gap-2">
                {settingsShortcutItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleNav(item.id);
                        setShowMobileMenu(false);
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-[#22252a] dark:bg-[#17191d] dark:hover:bg-[#1d2026]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-[#202329] dark:text-gray-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="px-6 pb-2 pt-2 text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">More</div>
              {mobileMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleNav(item.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center space-x-4 px-6 py-4 text-base hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors ${
                      isActive ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                    }`}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isActive ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-700 dark:bg-[#262626] dark:text-gray-200'}`}>
                      <Icon className={`h-6 w-6 ${isActive ? 'fill-current' : ''}`} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span>{item.label}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{item.id === 'notifications' ? '내 활동 확인' : item.id === 'location' ? '다이빙 포인트 탐색' : item.id === 'resorts' ? '리조트 둘러보기' : '추가 메뉴'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        <aside className={`hidden xl:block fixed left-0 top-0 z-40 w-[84px] h-screen overflow-visible transition-colors ${currentPage === 'location' ? 'bg-white/60 dark:bg-[#1b1d21]/60 backdrop-blur-md' : 'bg-white dark:bg-[#1b1d21]'}`}>
          <nav className="py-6 flex flex-col h-full">
            <div className="px-4 pb-6 flex justify-center">
              <button onClick={() => onNavigate('home')} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="홈">
                <div className="w-10 h-10 rounded-xl bg-[#111827] text-white text-sm font-bold flex items-center justify-center">DG</div>
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
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
                <div className="absolute bottom-full left-[68px] mb-3 w-56 bg-white dark:bg-[#1b1d21] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2f333a] py-2 z-50 transition-colors">
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
                        <span className="text-sm">{t('lightMode')}</span>
                      </>
                    ) : (
                      <>
                        <MoonIcon className="h-5 w-5" />
                        <span className="text-sm">{t('darkMode')}</span>
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
                    <span className="text-sm">{t('reportIssue')}</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('admin');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    <ShieldCheckIcon className="h-5 w-5" />
                    <span className="text-sm">{t('admin')}</span>
                  </button>

                  <div className="border-t border-gray-200 dark:border-[#2f333a] my-2"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span className="text-sm">{t('logout')}</span>
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
        currentPage={currentPage}
        mobileBarsHidden={mobileBarsHidden}
        onNavigate={handleNav}
        profileAvatarUrl={profile?.avatar_url || undefined}
      />

      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}
    </div>
  );
}
