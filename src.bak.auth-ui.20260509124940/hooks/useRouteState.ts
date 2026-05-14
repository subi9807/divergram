import type { AppPage, SettingsTab } from '../types/navigation';

export function getPathnameFromPage(currentPage: AppPage, settingsTab: SettingsTab): string {
  if (currentPage === 'explore') return '/explore';
  if (currentPage === 'resorts') return '/resorts';
  if (currentPage === 'reels') return '/reels';
  if (currentPage === 'messages') return '/messages';
  if (currentPage === 'notifications') return '/notifications';
  if (currentPage === 'profile') return '/profile';
  if (currentPage === 'profile-saved') return '/profile/saved';
  if (currentPage === 'location') return '/location';
  if (currentPage === 'post') return '/post';
  if (currentPage === 'settings') {
    if (settingsTab === 'account') return '/account';
    if (settingsTab === 'activity') return '/activity';
    return '/settings';
  }
  if (currentPage === 'report') return '/report';
  if (currentPage === 'admin') return '/admin';
  if (currentPage === 'ops') return '/__ops';
  return '/';
}

export function getPageFromPathname(pathname: string, hostname: string): { page: AppPage; settingsTab?: SettingsTab } {
  if (pathname === '/explore') return { page: 'explore' };
  if (pathname === '/resorts') return { page: 'resorts' };
  if (pathname === '/reels') return { page: 'reels' };
  if (pathname === '/messages') return { page: 'messages' };
  if (pathname === '/notifications') return { page: 'notifications' };
  if (pathname === '/profile') return { page: 'profile' };
  if (pathname === '/profile/saved') return { page: 'profile-saved' };
  if (pathname === '/location') return { page: 'location' };
  if (pathname === '/post') return { page: 'post' };
  if (pathname === '/settings') return { page: 'settings', settingsTab: 'profile' };
  if (pathname === '/activity') return { page: 'settings', settingsTab: 'activity' };
  if (pathname === '/account') return { page: 'settings', settingsTab: 'account' };
  if (pathname === '/report') return { page: 'report' };
  if (pathname === '/admin') return { page: 'admin' };
  if (hostname === 'manager.divergram.com' && pathname === '/') return { page: 'admin' };
  return { page: 'home' };
}
