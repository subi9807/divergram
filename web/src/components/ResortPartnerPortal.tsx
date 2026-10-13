import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, CircleUserRound, DollarSign, LogOut, RefreshCw, Settings2, ShieldCheck, Trash2, UsersRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, getToken } from '../lib/internal-db';

type PartnerTab = 'overview' | 'bookings' | 'availability' | 'prices' | 'settlements' | 'staff' | 'settings';
type Resort = { id: string; full_name?: string; is_primary?: boolean; permissions?: Record<string, boolean>; resort_booking_enabled?: boolean; resort_booking_deposit_amount?: number; resort_booking_default_capacity?: number; resort_booking_min_notice_days?: number; resort_booking_timezone?: string };
type Booking = { id: string; booking_number?: string; applicant_name?: string; contact_email?: string; contact_phone?: string; booking_date?: string; booking_end_date?: string; participants?: number; status?: string; deposit_status?: string; dive_type?: string };
type Slot = { booking_date?: string; capacity?: number; reserved?: number; is_open?: boolean };
type Price = { id: string; title?: string; price_type?: string; description?: string; duration_text?: string; unit_label?: string; currency?: string; amount?: number; included_items?: string[]; is_active?: boolean };
type Settlement = { id: string; bookingNumber?: string; bookingDate?: string; applicantName?: string; provider?: string; status?: string; grossAmount?: number; feeAmount?: number; netAmount?: number; refundedAmount?: number; currency?: string };
type Manager = { user_id: string; email?: string; display_name?: string; is_primary?: boolean; permissions?: Record<string, boolean> };

const statusLabels: Record<string, string> = { pending: '접수', confirmed: '확정', rejected: '거절', cancelled: '취소', completed: '완료', no_show: '노쇼' };
const statusOptions = ['pending', 'confirmed', 'rejected', 'completed', 'no_show'];

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${getApiBase()}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options.headers || {}) } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
  return result;
}

export default function ResortPartnerPortal() {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<PartnerTab>('overview');
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [resortId, setResortId] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settlementSummary, setSettlementSummary] = useState<Record<string, number | string>>({});
  const [managers, setManagers] = useState<Manager[]>([]);
  const [editingPrice, setEditingPrice] = useState<Price | null>(null);
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedResort = useMemo(() => resorts.find((item) => item.id === resortId) || resorts[0], [resorts, resortId]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const result = await api('/api/resort-partner/me');
      const next = Array.isArray(result.resorts) ? result.resorts : [];
      setResorts(next);
      setResortId((current) => current || next[0]?.id || '');
    } catch (err: any) {
      setError(err.message || '리조트 회원사 정보를 불러오지 못했습니다.');
    } finally { setLoading(false); }
  };

  const loadResortData = async (id: string) => {
    if (!id) return;
    try {
      const results = await Promise.allSettled([
        api(`/api/resort-partner/resorts/${encodeURIComponent(id)}/bookings`),
        api(`/api/resort-partner/resorts/${encodeURIComponent(id)}/availability`),
        api(`/api/resort-partner/resorts/${encodeURIComponent(id)}/prices`),
        api(`/api/resort-partner/resorts/${encodeURIComponent(id)}/settlements`),
        api(`/api/resort-partner/resorts/${encodeURIComponent(id)}/managers`),
      ]);
      const value = (index: number) => results[index].status === 'fulfilled' ? results[index].value : {};
      const bookingResult = value(0) as any; const availabilityResult = value(1) as any; const priceResult = value(2) as any; const settlementResult = value(3) as any; const managerResult = value(4) as any;
      setBookings(Array.isArray(bookingResult.bookings) ? bookingResult.bookings : []);
      setSlots(Array.isArray(availabilityResult.availability) ? availabilityResult.availability : []);
      setPrices(Array.isArray(priceResult.prices) ? priceResult.prices : []);
      setSettlements(Array.isArray(settlementResult.payments) ? settlementResult.payments : []);
      setSettlementSummary(settlementResult.summary || {});
      setManagers(Array.isArray(managerResult.managers) ? managerResult.managers : []);
    } catch (err: any) { setError(err.message || '리조트 운영 정보를 불러오지 못했습니다.'); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { void loadResortData(selectedResort?.id || ''); }, [selectedResort?.id]);

  const updateBooking = async (booking: Booking, status: string) => {
    if (!selectedResort) return;
    setSaving(true); setError('');
    try {
      await api(`/api/resort-partner/resorts/${selectedResort.id}/bookings/${booking.id}`, { method: 'PATCH', body: JSON.stringify({ status, depositStatus: booking.deposit_status || 'pending' }) });
      await loadResortData(selectedResort.id);
    } catch (err: any) { setError(err.message || '예약 상태를 변경하지 못했습니다.'); }
    finally { setSaving(false); }
  };

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selectedResort) return;
    const form = new FormData(event.currentTarget);
    setSaving(true); setError('');
    try {
      await api(`/api/resort-partner/resorts/${selectedResort.id}/settings`, { method: 'PATCH', body: JSON.stringify({ bookingEnabled: form.get('bookingEnabled') === 'on', depositAmount: Number(form.get('depositAmount') || 0), defaultCapacity: Number(form.get('capacity') || 20), minNoticeDays: Number(form.get('noticeDays') || 0), timezone: String(form.get('timezone') || 'UTC') }) });
      await load();
    } catch (err: any) { setError(err.message || '운영 설정을 저장하지 못했습니다.'); }
    finally { setSaving(false); }
  };

  const saveSlot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selectedResort) return;
    const form = new FormData(event.currentTarget); const date = String(form.get('date') || '');
    setSaving(true); setError('');
    try { await api(`/api/resort-partner/resorts/${selectedResort.id}/availability/${date}`, { method: 'PUT', body: JSON.stringify({ capacity: Number(form.get('capacity') || 0), isOpen: form.get('isOpen') === 'on', note: String(form.get('note') || '') }) }); await loadResortData(selectedResort.id); event.currentTarget.reset(); }
    catch (err: any) { setError(err.message || '예약 가능일을 저장하지 못했습니다.'); } finally { setSaving(false); }
  };

  const savePrice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selectedResort) return;
    const form = new FormData(event.currentTarget); const includedItems = String(form.get('includedItems') || '').split('\n').map((item) => item.trim()).filter(Boolean);
    const body = { id: editingPrice?.id, title: String(form.get('title') || ''), priceType: String(form.get('priceType') || 'dive_package'), description: String(form.get('description') || ''), durationText: String(form.get('durationText') || ''), unitLabel: String(form.get('unitLabel') || ''), currency: String(form.get('currency') || 'USD'), amount: Number(form.get('amount') || 0), includedItems, isActive: form.get('isActive') === 'on' };
    setSaving(true); setError('');
    try { await api(`/api/resort-partner/resorts/${selectedResort.id}/prices`, { method: 'POST', body: JSON.stringify(body) }); setEditingPrice(null); await loadResortData(selectedResort.id); event.currentTarget.reset(); }
    catch (err: any) { setError(err.message || '가격표를 저장하지 못했습니다.'); } finally { setSaving(false); }
  };

  const deletePrice = async (price: Price) => { if (!selectedResort || !window.confirm(`${price.title || '가격표'}를 삭제할까요?`)) return; setSaving(true); try { await api(`/api/resort-partner/resorts/${selectedResort.id}/prices/${price.id}`, { method: 'DELETE' }); await loadResortData(selectedResort.id); } catch (err: any) { setError(err.message || '가격표를 삭제하지 못했습니다.'); } finally { setSaving(false); } };

  const addManager = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!selectedResort) return; const form = new FormData(event.currentTarget); setSaving(true); setInviteToken(''); try { const result = await api(`/api/resort-partner/resorts/${selectedResort.id}/managers`, { method: 'POST', body: JSON.stringify({ email: String(form.get('email') || ''), permissions: { bookings: form.get('bookings') === 'on', availability: form.get('availability') === 'on', prices: form.get('prices') === 'on', settlements: form.get('settlements') === 'on', settings: form.get('settings') === 'on', api: form.get('api') === 'on' } }) }); if (result.invitation?.token) setInviteToken(result.invitation.token); await loadResortData(selectedResort.id); event.currentTarget.reset(); } catch (err: any) { setError(err.message || '직원 계정을 추가하지 못했습니다.'); } finally { setSaving(false); } };
  const removeManager = async (manager: Manager) => { if (!selectedResort || manager.is_primary || !window.confirm(`${manager.display_name || manager.email} 계정을 제외할까요?`)) return; setSaving(true); try { await api(`/api/resort-partner/resorts/${selectedResort.id}/managers/${manager.user_id}`, { method: 'DELETE' }); await loadResortData(selectedResort.id); } catch (err: any) { setError(err.message || '직원 계정을 삭제하지 못했습니다.'); } finally { setSaving(false); } };

  const hasPermission = (permission: string) => !selectedResort || selectedResort.is_primary === true || !selectedResort.permissions || selectedResort.permissions[permission] === true;
  const navItems: Array<[PartnerTab, string, typeof CalendarCheck]> = [['overview', '운영 홈', CalendarCheck], ['bookings', '예약 관리', CalendarCheck], ['availability', '예약 가능일', CalendarCheck], ['prices', '가격표', DollarSign], ['settlements', '정산 내역', DollarSign], ['staff', '직원 권한', UsersRound], ['settings', '리조트 설정', Settings2]];
  const nav = navItems.filter(([id]) => id === 'overview' || (id === 'staff' ? hasPermission('staff') : hasPermission(id))) as Array<[PartnerTab, string, typeof CalendarCheck]>;
  useEffect(() => { if (tab !== 'overview' && !nav.some(([id]) => id === tab)) setTab('overview'); }, [tab, selectedResort?.id, selectedResort?.is_primary, JSON.stringify(selectedResort?.permissions || {})]);
  if (loading) return <div className="member-loading"><RefreshCw className="animate-spin" size={22} /> 회원사 정보를 확인하고 있어요.</div>;

  return <div className="member-portal partner-portal">
    <header className="member-header"><div className="member-brand"><span className="member-brand-mark">DG</span><span><strong>Divergram</strong><small>RESORT PARTNER</small></span></div><div className="member-header-actions"><span className="partner-account-label"><CircleUserRound size={16} /> {profile?.full_name || profile?.username || '회원사 관리자'}</span><button className="member-icon-button" onClick={() => void signOut()} aria-label="로그아웃"><LogOut size={18} /></button></div></header>
    <div className="member-layout">
      <aside className="member-sidebar"><div className="member-sidebar-intro"><span className="member-eyebrow">RESORT PARTNER</span><h1>회원사<br /><strong>운영 센터</strong></h1><p>예약과 운영 설정을 한곳에서 관리하세요.</p></div><nav className="member-nav" aria-label="회원사 메뉴">{nav.map(([id, label, Icon]) => <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><Icon size={18} /><span>{label}</span></button>)}</nav><div className="member-sidebar-footer"><ShieldCheck size={17} /><span>권한이 확인된 회원사 전용</span></div></aside>
      <main className="member-main"><div className="member-page-toolbar"><div><span className="member-eyebrow">PARTNER OPERATIONS</span><h2>{nav.find(([id]) => id === tab)?.[1]}</h2></div><div className="partner-toolbar-actions">{resorts.length > 1 && <select value={selectedResort?.id || ''} onChange={(e) => setResortId(e.target.value)}>{resorts.map((item) => <option key={item.id} value={item.id}>{item.full_name || item.id}</option>)}</select>}<button className="member-refresh" onClick={() => void load()}><RefreshCw size={16} /> 새로고침</button></div></div>
        {error && <div className="member-alert">{error}</div>}
        {!selectedResort && <section className="member-panel member-panel-full"><CheckCircle2 size={28} /><h3>연결된 리조트가 없습니다.</h3><p>관리자 승인 후 회원사 운영 기능을 사용할 수 있습니다.</p></section>}
        {selectedResort && tab === 'overview' && <><section className="member-welcome-card"><div><span className="member-eyebrow">{selectedResort.full_name || 'RESORT'}</span><h3>오늘의 운영 현황</h3><p>예약 접수와 가능일을 확인하고 운영 설정을 관리하세요.</p></div><div className="member-welcome-orb"><span>RP</span></div></section><div className="member-stat-grid"><button onClick={() => setTab('bookings')}><span>전체 예약</span><strong>{bookings.length}</strong><small>예약 관리</small></button><button onClick={() => setTab('bookings')}><span>확인 대기</span><strong>{bookings.filter((item) => item.status === 'pending').length}</strong><small>빠른 처리</small></button><button onClick={() => setTab('availability')}><span>예약 가능일</span><strong>{slots.filter((item) => item.is_open !== false).length}</strong><small>일정 관리</small></button></div></>}
        {selectedResort && tab === 'bookings' && <section className="member-panel member-panel-full"><div className="member-panel-head"><div><span className="member-eyebrow">RESERVATIONS</span><h3>예약 관리</h3></div><span className="member-count">{bookings.length}건</span></div>{bookings.length ? bookings.map((booking) => <article className="member-list-row member-list-row-expanded" key={booking.id}><div className="member-list-icon"><CalendarCheck size={19} /></div><div className="member-list-body"><strong>{booking.applicant_name || '예약자'}</strong><p>{booking.booking_number || booking.id} · {booking.booking_date || '일정 미정'} · {booking.participants || 1}명</p><small>{booking.contact_email || ''} {booking.contact_phone || ''}</small></div><div className="partner-booking-actions"><span className="member-status member-status-waiting">{statusLabels[booking.status || 'pending'] || booking.status}</span><select disabled={saving} value={booking.status || 'pending'} onChange={(e) => void updateBooking(booking, e.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div></article>) : <p className="member-account-help">아직 예약이 없습니다.</p>}</section>}
        {selectedResort && tab === 'availability' && <section className="member-panel member-panel-full"><div className="member-panel-head"><div><span className="member-eyebrow">AVAILABILITY</span><h3>예약 가능일</h3></div><span className="member-count">최근 180일</span></div><form className="partner-inline-form" onSubmit={saveSlot}><label>날짜<input name="date" type="date" required /></label><label>정원<input name="capacity" type="number" min="0" defaultValue={selectedResort.resort_booking_default_capacity || 20} required /></label><label className="partner-check"><input name="isOpen" type="checkbox" defaultChecked /> 접수 가능</label><label>메모<input name="note" placeholder="운영 메모" /></label><button className="member-primary-button" disabled={saving}>날짜 저장</button></form>{slots.length ? <div className="partner-slot-grid">{slots.slice(0, 60).map((slot) => <div key={slot.booking_date} className={slot.is_open === false ? 'partner-slot is-closed' : 'partner-slot'}><strong>{slot.booking_date}</strong><span>{slot.is_open === false ? '마감' : `${slot.reserved || 0} / ${slot.capacity || 0}`}</span><small>날짜 저장 폼에서 수정</small></div>)}</div> : <p className="member-account-help">등록된 예약 가능일이 없습니다. 위에서 첫 날짜를 추가하세요.</p>}</section>}
        {selectedResort && tab === 'prices' && <section className="member-panel member-panel-full"><div className="member-panel-head"><div><span className="member-eyebrow">PRICE MENU</span><h3>다이빙 가격표</h3></div><span className="member-count">{prices.length}개</span></div><form className="partner-price-form" onSubmit={savePrice}><div className="partner-form-grid"><label>상품명<input name="title" defaultValue={editingPrice?.title || ''} placeholder="1day 다이빙 패키지" required /></label><label>가격<input name="amount" type="number" min="0" defaultValue={editingPrice?.amount || 0} required /></label><label>통화<select name="currency" defaultValue={editingPrice?.currency || 'USD'}><option>USD</option><option>KRW</option><option>JPY</option><option>PHP</option></select></label><label>소요시간<input name="durationText" defaultValue={editingPrice?.duration_text || ''} placeholder="1일 / 2회 다이빙" /></label><label>단위<input name="unitLabel" defaultValue={editingPrice?.unit_label || ''} placeholder="1인 기준" /></label><label>상품 유형<select name="priceType" defaultValue={editingPrice?.price_type || 'dive_package'}><option value="dive_package">다이빙 패키지</option><option value="education">교육</option><option value="rental">장비 대여</option><option value="transfer">픽업/이동</option></select></label></div><label>설명<textarea name="description" defaultValue={editingPrice?.description || ''} rows={2} placeholder="포함 사항과 안내를 입력하세요." /></label><label>포함 사항<textarea name="includedItems" defaultValue={Array.isArray(editingPrice?.included_items) ? editingPrice?.included_items.join('\n') : ''} rows={3} placeholder="다이빙 장비\n보트 이동\n가이드" /></label><label className="partner-check"><input name="isActive" type="checkbox" defaultChecked={editingPrice?.is_active !== false} /> 판매 중</label><div className="partner-form-actions"><button className="member-primary-button" disabled={saving}>{editingPrice ? '가격표 수정' : '가격표 등록'}</button>{editingPrice && <button type="button" className="member-secondary-button" onClick={() => setEditingPrice(null)}>취소</button>}</div></form><div className="partner-price-grid">{prices.map((price) => <article className="partner-price-card" key={price.id}><div><span className="member-eyebrow">{price.price_type || 'dive_package'}</span><h4>{price.title}</h4><p>{price.description || '상품 설명이 없습니다.'}</p></div><strong>{price.currency || 'USD'} {Number(price.amount || 0).toLocaleString()}</strong><small>{price.duration_text || ''} {price.unit_label || ''}</small><div className="partner-row-actions"><button onClick={() => { setEditingPrice(price); setTab('prices'); }}>수정</button><button onClick={() => void deletePrice(price)}><Trash2 size={14} /> 삭제</button></div></article>)}</div></section>}
        {selectedResort && tab === 'settlements' && <section className="member-panel member-panel-full"><div className="member-panel-head"><div><span className="member-eyebrow">SETTLEMENTS</span><h3>정산 및 환불 내역</h3></div><span className="member-count">{settlements.length}건</span></div><div className="member-stat-grid"><div><span>총 매출</span><strong>{settlementSummary.grossSales || 0} USD</strong></div><div><span>환불</span><strong>{settlementSummary.refunds || 0} USD</strong></div><div><span>수수료</span><strong>{settlementSummary.fees || 0} USD</strong></div><div><span>예상 정산액</span><strong>{settlementSummary.netSales || 0} USD</strong></div></div>{settlements.length ? settlements.map((item) => <article className="member-list-row" key={item.id}><div className="member-list-icon"><DollarSign size={18} /></div><div className="member-list-body"><strong>{item.bookingNumber || item.id}</strong><p>{item.applicantName || '예약자'} · {item.bookingDate || ''}</p></div><span>{item.status || ''} · {item.grossAmount || 0} {item.currency || 'USD'}</span></article>) : <p className="member-account-help">아직 결제·정산 내역이 없습니다.</p>}</section>}
        {selectedResort && tab === 'staff' && <section className="member-panel member-panel-full"><div className="member-panel-head"><div><span className="member-eyebrow">TEAM ACCESS</span><h3>직원 계정 및 권한</h3></div><span className="member-count">{managers.length}명</span></div><p className="member-account-help">이미 가입된 회원은 바로 추가되고, 미가입 이메일은 7일 유효 초대 토큰이 발급됩니다.</p><form className="partner-inline-form partner-staff-form" onSubmit={addManager}><label>회원 이메일<input name="email" type="email" placeholder="staff@example.com" required /></label><div className="partner-permissions"><label><input name="bookings" type="checkbox" defaultChecked /> 예약</label><label><input name="availability" type="checkbox" defaultChecked /> 가능일</label><label><input name="prices" type="checkbox" /> 가격표</label><label><input name="settlements" type="checkbox" /> 정산</label><label><input name="settings" type="checkbox" /> 설정</label><label><input name="api" type="checkbox" /> API 키</label></div><button className="member-primary-button" disabled={saving}>직원 추가</button></form>{inviteToken && <div className="member-alert">미가입 직원에게 전달할 초대 토큰: <code>{inviteToken}</code></div>}{managers.map((manager) => <article className="member-list-row" key={manager.user_id}><div className="member-list-icon"><UsersRound size={18} /></div><div className="member-list-body"><strong>{manager.display_name || manager.email}</strong><p>{manager.email}</p></div><span>{manager.is_primary ? '주 관리자' : Object.entries(manager.permissions || {}).filter(([, enabled]) => enabled).map(([key]) => key).join(', ') || '권한 없음'}</span>{!manager.is_primary && <button className="member-secondary-button" onClick={() => void removeManager(manager)}>제외</button>}</article>)}</section>}
        {selectedResort && tab === 'settings' && <section className="member-panel member-panel-full"><div className="member-panel-head"><div><span className="member-eyebrow">RESORT SETTINGS</span><h3>리조트 운영 설정</h3></div><Settings2 size={20} /></div><form className="partner-settings-form" onSubmit={saveSettings}><label><input name="bookingEnabled" type="checkbox" defaultChecked={selectedResort.resort_booking_enabled} /> 예약 접수 사용</label><label>예약금(USD)<input name="depositAmount" type="number" min="0" defaultValue={selectedResort.resort_booking_deposit_amount || 0} /></label><label>기본 정원<input name="capacity" type="number" min="1" defaultValue={selectedResort.resort_booking_default_capacity || 20} /></label><label>최소 예약일수<input name="noticeDays" type="number" min="0" defaultValue={selectedResort.resort_booking_min_notice_days || 0} /></label><label>시간대<input name="timezone" defaultValue={selectedResort.resort_booking_timezone || 'UTC'} /></label><button className="member-primary-button" disabled={saving}>{saving ? '저장 중...' : '설정 저장'}</button></form></section>}
      </main>
    </div>
  </div>;
}
