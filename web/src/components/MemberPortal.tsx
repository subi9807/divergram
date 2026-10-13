import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarCheck,
  ChevronRight,
  CircleUserRound,
  Megaphone,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import Auth from './Auth';
import { useAuth } from '../contexts/AuthContext';
import { db, getApiBase, getToken } from '../lib/internal-db';

type PortalTab = 'home' | 'bookings' | 'notices' | 'account';

interface Booking {
  id: string;
  bookingNumber?: string;
  resortName?: string;
  resortCoverUrl?: string;
  bookingDate?: string;
  bookingEndDate?: string;
  participants?: number;
  diveType?: string;
  priceTitle?: string;
  status?: string;
}

interface Notice {
  id: string;
  title?: string;
  body?: string;
  created_at?: string;
  is_read?: boolean;
  deep_link?: string;
}

interface MemberAd {
  id: string;
  title?: string;
  note?: string;
  action_label?: string;
  target_url?: string;
}

const bookingLabels: Record<string, string> = {
  pending: '확인 중',
  confirmed: '예약 확정',
  rejected: '예약 불가',
  cancelled: '취소됨',
  completed: '이용 완료',
  no_show: '노쇼',
};

function formatDate(value?: string) {
  if (!value) return '일정 미정';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }).format(date);
}

function formatRelativeDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
}

function statusClass(status?: string) {
  if (status === 'confirmed') return 'member-status member-status-success';
  if (status === 'rejected' || status === 'cancelled' || status === 'no_show') return 'member-status member-status-muted';
  return 'member-status member-status-waiting';
}

export default function MemberPortal() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [tab, setTab] = useState<PortalTab>('home');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [ads, setAds] = useState<MemberAd[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || '회원';
  const unreadCount = notices.filter((notice) => !notice.is_read).length;
  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => !['cancelled', 'rejected', 'completed', 'no_show'].includes(booking.status || '')),
    [bookings],
  );

  const loadPortalData = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const bookingResponse = await fetch(`${getApiBase()}/api/resort-bookings/me`, { headers });
      if (bookingResponse.ok) {
        const result = await bookingResponse.json();
        setBookings(Array.isArray(result.bookings) ? result.bookings : []);
      }

      const noticeResult = await db
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (noticeResult.error) throw noticeResult.error;
      setNotices(Array.isArray(noticeResult.data) ? noticeResult.data : []);

      const adResponse = await fetch(`${getApiBase()}/api/ads?placement=member_home&limit=3`);
      if (adResponse.ok) {
        const adResult = await adResponse.json();
        setAds(Array.isArray(adResult.ads) ? adResult.ads : []);
      }
    } catch {
      setError('일부 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (booking: Booking) => {
    if (!window.confirm('이 예약을 취소할까요?')) return;
    try {
      const response = await fetch(`${getApiBase()}/api/resort-bookings/${encodeURIComponent(booking.id)}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error('예약 취소에 실패했습니다.');
      setSelectedBooking(null);
      await loadPortalData();
    } catch (err: any) { setError(err.message || '예약 취소에 실패했습니다.'); }
  };

  const markNoticeRead = async (notice: Notice) => {
    if (notice.is_read) return;
    await db.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notice.id);
    setNotices((current) => current.map((item) => item.id === notice.id ? { ...item, is_read: true } : item));
  };

  useEffect(() => {
    void loadPortalData();
  }, [user?.id]);

  if (authLoading) {
    return <div className="member-loading"><RefreshCw className="animate-spin" size={22} /> 회원 정보를 확인하고 있어요.</div>;
  }

  if (!user) return <Auth />;

  const navItems: Array<{ id: PortalTab; label: string; icon: typeof CalendarCheck }> = [
    { id: 'home', label: '회원 홈', icon: CalendarCheck },
    { id: 'bookings', label: '예약 확인', icon: CalendarCheck },
    { id: 'notices', label: '공지사항', icon: Bell },
    { id: 'account', label: '내 정보', icon: CircleUserRound },
  ];

  return (
    <div className="member-portal">
      <header className="member-header">
        <a className="member-brand" href="/" aria-label="Divergram 홈">
          <span className="member-brand-mark">DG</span>
          <span><strong>Divergram</strong><small>MEMBER SPACE</small></span>
        </a>
        <div className="member-header-actions">
          <button className="member-icon-button" onClick={() => setTab('notices')} aria-label="공지사항">
            <Bell size={19} />
            {unreadCount > 0 && <span className="member-notification-dot" />}
          </button>
          <button className="member-avatar" onClick={() => setTab('account')} aria-label="내 정보">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <CircleUserRound size={21} />}
          </button>
        </div>
      </header>

      <div className="member-layout">
        <aside className="member-sidebar">
          <div className="member-sidebar-intro">
            <span className="member-eyebrow">MEMBER SPACE</span>
            <h1>안녕하세요,<br /><strong>{displayName}</strong>님</h1>
            <p>다이버그램에서 필요한 소식을 한곳에서 확인하세요.</p>
          </div>
          <nav className="member-nav" aria-label="회원 메뉴">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
                <Icon size={18} />
                <span>{label}</span>
                {id === 'notices' && unreadCount > 0 && <b>{unreadCount}</b>}
                {tab === id && <ChevronRight className="member-nav-arrow" size={16} />}
              </button>
            ))}
          </nav>
          <div className="member-sidebar-footer">
            <ShieldCheck size={17} />
            <span>안전한 회원 전용 공간</span>
          </div>
        </aside>

        <main className="member-main">
          {error && <div className="member-alert">{error}</div>}
          <div className="member-page-toolbar">
            <div>
              <span className="member-eyebrow">DIVERGRAM MEMBER</span>
              <h2>{tab === 'home' ? '오늘의 회원 홈' : navItems.find((item) => item.id === tab)?.label}</h2>
            </div>
            <button className="member-refresh" onClick={() => void loadPortalData()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 새로고침
            </button>
          </div>

          {tab === 'home' && (
            <>
              <section className="member-welcome-card">
                <div>
                  <span className="member-eyebrow">YOUR NEXT DIVE</span>
                  <h3>{upcomingBookings[0] ? `${upcomingBookings[0].resortName || '리조트'} 예약을 확인해 보세요` : '새로운 다이빙을 준비해 보세요'}</h3>
                  <p>{upcomingBookings[0] ? `${formatDate(upcomingBookings[0].bookingDate)} · ${bookingLabels[upcomingBookings[0].status || 'pending']}` : '예약 내역과 다이버그램의 새 소식을 이곳에서 확인할 수 있어요.'}</p>
                  <button className="member-primary-button" onClick={() => upcomingBookings[0] ? setTab('bookings') : window.location.assign('https://divergram.com/resorts')}>
                    {upcomingBookings[0] ? '예약 상세 보기' : '리조트 예약하기'} <ChevronRight size={16} />
                  </button>
                </div>
                <div className="member-welcome-orb"><span>DG</span></div>
              </section>

              <div className="member-stat-grid">
                <button onClick={() => setTab('bookings')}><span>진행 중인 예약</span><strong>{upcomingBookings.length}</strong><small>예약 상태 확인 <ChevronRight size={13} /></small></button>
                <button onClick={() => setTab('notices')}><span>새 공지사항</span><strong>{unreadCount}</strong><small>최근 소식 보기 <ChevronRight size={13} /></small></button>
                <div><span>회원 이메일</span><strong className="member-email-value">{user.email}</strong><small>내 정보에서 관리</small></div>
              </div>

              <div className="member-content-grid">
                <section className="member-panel">
                  <div className="member-panel-head"><div><span className="member-eyebrow">RESERVATIONS</span><h3>최근 예약</h3></div><button onClick={() => setTab('bookings')}>전체 보기</button></div>
                  {bookings.length ? bookings.slice(0, 3).map((booking) => <BookingRow key={booking.id} booking={booking} onSelect={setSelectedBooking} />) : <EmptyState icon={<CalendarCheck size={21} />} title="아직 예약 내역이 없어요" body="리조트에서 예약을 신청하면 이곳에서 확인할 수 있어요." />}
                </section>
                <section className="member-panel">
                  <div className="member-panel-head"><div><span className="member-eyebrow">NOTICE</span><h3>공지사항</h3></div><button onClick={() => setTab('notices')}>전체 보기</button></div>
                  {notices.length ? notices.slice(0, 3).map((notice) => <NoticeRow key={notice.id} notice={notice} onOpen={() => void markNoticeRead(notice)} />) : <EmptyState icon={<Megaphone size={21} />} title="새 공지가 없습니다" body="중요한 소식이 생기면 이곳에 알려드릴게요." />}
                </section>
              </div>

              <section className={`member-ad-slot ${ads.length ? 'member-ad-slot-live' : ''}`}><Megaphone size={19} /><div><strong>{ads[0]?.title || '광고·이벤트 공간'}</strong><p>{ads[0]?.note || '향후 다이빙 상품과 파트너 혜택을 이 영역에서 안내할 수 있어요.'}</p></div>{ads[0]?.target_url ? <a href={ads[0].target_url}>{ads[0].action_label || '자세히 보기'} <ChevronRight size={13} /></a> : <span>준비 중</span>}</section>
            </>
          )}

          {tab === 'bookings' && <section className="member-panel member-panel-full"><div className="member-panel-head"><div><span className="member-eyebrow">RESERVATIONS</span><h3>예약 확인</h3></div><span className="member-count">{bookings.length}건</span></div>{bookings.length ? bookings.map((booking) => <BookingRow key={booking.id} booking={booking} expanded onSelect={setSelectedBooking} onCancel={cancelBooking} />) : <EmptyState icon={<CalendarCheck size={21} />} title="예약 내역이 없어요" body="리조트 예약을 신청하면 진행 상태와 일정을 확인할 수 있습니다." />}</section>}
          {tab === 'notices' && <section className="member-panel member-panel-full"><div className="member-panel-head"><div><span className="member-eyebrow">NOTICE BOARD</span><h3>공지사항</h3></div><span className="member-count">최근 소식</span></div>{notices.length ? notices.map((notice) => <NoticeRow key={notice.id} notice={notice} expanded onOpen={() => void markNoticeRead(notice)} />) : <EmptyState icon={<Megaphone size={21} />} title="등록된 공지사항이 없어요" body="운영 소식과 이벤트를 준비하고 있습니다." />}</section>}
          {tab === 'account' && <section className="member-panel member-panel-full"><div className="member-panel-head"><div><span className="member-eyebrow">ACCOUNT</span><h3>내 정보</h3></div><Settings2 size={20} /></div><div className="member-account-card"><div className="member-account-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <CircleUserRound size={35} />}</div><div><strong>{displayName}</strong><p>{user.email}</p><span>다이버그램 회원</span></div></div><p className="member-account-help">이름, 연락처와 비밀번호는 다이버그램 계정 설정에서 관리할 수 있습니다.</p><button className="member-outline-button" onClick={() => window.location.assign('https://divergram.com/settings')}>내 정보 수정</button><button className="member-signout" onClick={() => void signOut()}>로그아웃</button></section>}
          {selectedBooking && <div className="member-modal-backdrop" role="presentation" onClick={() => setSelectedBooking(null)}><div className="member-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="member-panel-head"><div><span className="member-eyebrow">BOOKING DETAIL</span><h3>{selectedBooking.resortName || '리조트 예약'}</h3></div><button className="member-modal-close" onClick={() => setSelectedBooking(null)}>닫기</button></div><p>{selectedBooking.bookingNumber || selectedBooking.id}</p><p>{formatDate(selectedBooking.bookingDate)}{selectedBooking.bookingEndDate && selectedBooking.bookingEndDate !== selectedBooking.bookingDate ? ` - ${formatDate(selectedBooking.bookingEndDate)}` : ''}</p><p>{selectedBooking.participants || 1}명 · {bookingLabels[selectedBooking.status || 'pending'] || selectedBooking.status}</p>{selectedBooking.status === 'pending' && <button className="member-signout" onClick={() => void cancelBooking(selectedBooking)}>예약 취소</button>}</div></div>}
        </main>
      </div>
    </div>
  );
}

function BookingRow({ booking, expanded = false, onSelect, onCancel }: { booking: Booking; expanded?: boolean; onSelect?: (booking: Booking) => void; onCancel?: (booking: Booking) => void }) {
  return <article className={`member-list-row ${expanded ? 'member-list-row-expanded' : ''}`} onClick={() => onSelect?.(booking)}>
    <div className="member-list-icon"><CalendarCheck size={19} /></div>
    <div className="member-list-body"><strong>{booking.resortName || '리조트 예약'}</strong><p>{booking.priceTitle || booking.diveType || '다이빙 예약'} · {formatDate(booking.bookingDate)}{booking.bookingEndDate && booking.bookingEndDate !== booking.bookingDate ? ` - ${formatDate(booking.bookingEndDate)}` : ''}</p>{expanded && <small>{booking.bookingNumber || booking.id} · {booking.participants || 1}명</small>}</div>
    <div><span className={statusClass(booking.status)}>{bookingLabels[booking.status || 'pending'] || booking.status}</span>{expanded && booking.status === 'pending' && onCancel && <button className="member-inline-cancel" onClick={(event) => { event.stopPropagation(); void onCancel(booking); }}>취소</button>}</div>
  </article>;
}

function NoticeRow({ notice, expanded = false, onOpen }: { notice: Notice; expanded?: boolean; onOpen?: () => void }) {
  return <article className={`member-list-row ${expanded ? 'member-list-row-expanded' : ''}`} onClick={onOpen}><div className="member-list-icon member-list-icon-notice"><Megaphone size={19} /></div><div className="member-list-body"><strong>{notice.title || 'Divergram 공지사항'}</strong><p>{notice.body || '새로운 소식을 확인해 주세요.'}</p>{expanded && <small>{notice.deep_link || 'Divergram 운영팀'}</small>}</div><time>{formatRelativeDate(notice.created_at)}</time></article>;
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="member-empty"><div>{icon}</div><strong>{title}</strong><p>{body}</p></div>;
}
