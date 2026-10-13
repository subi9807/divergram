import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const STATUS = [['pending', '접수'], ['confirmed', '예약 확정'], ['rejected', '거절'], ['completed', '이용 완료'], ['no_show', '노쇼'], ['cancelled', '사용자 취소']];
const DEPOSIT_STATUS = [['pending', '입금 대기'], ['paid', '입금 확인'], ['waived', '예약금 없음'], ['refund_requested', '환불 요청'], ['partially_refunded', '부분 환불'], ['refunded', '환불 완료']];
const DIVE_TYPE = { fun_diving: '펀 다이빙', scuba: '스쿠버', freediving: '프리다이빙' };
const dateOnly = (value) => String(value || '').slice(0, 10);
const bookingRange = (row) => {
  const start = dateOnly(row.bookingDate);
  const end = dateOnly(row.bookingEndDate || row.bookingDate);
  return start === end ? start : `${start} - ${end}`;
};
const bookingStatusLabel = (row) => row.status === 'cancelled' && row.cancellationType === 'pre_payment'
  ? '입금 전 예약취소'
  : STATUS.find((value) => value[0] === row.status)?.[1] || row.status;
const money = (value, currency = 'USD') => `${currency} ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PAYMENT_STATUS = { pending: '대기', processing: '처리 중', succeeded: '결제 완료', failed: '실패', cancelled: '취소', refunded: '환불 완료' };

export default function ResortBookingsSection() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState([]);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState({ status: 'pending', adminNote: '', depositStatus: 'pending', paymentReference: '' });
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [paymentEnvironment, setPaymentEnvironment] = useState(null);
  const [switchingEnvironment, setSwitchingEnvironment] = useState(false);
  const [payments, setPayments] = useState([]);
  const [revenue, setRevenue] = useState({ transactionCount: 0, succeededCount: 0, pendingCount: 0, grossSales: 0, refunds: 0, netSales: 0, fees: 0, processorNet: 0, currency: 'USD' });
  const [paymentSelected, setPaymentSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (query.trim()) params.set('q', query.trim());
      const paymentParams = new URLSearchParams();
      if (query.trim()) paymentParams.set('q', query.trim());
      const [result, payment, ledger, environment] = await Promise.all([
        api(`/api/admin/resort-bookings?${params}`),
        api('/api/resort-payments/config'),
        api(`/api/admin/resort-payments?${paymentParams}`),
        api('/api/admin/resort-payments/environment'),
      ]);
      setRows(result.bookings || []);
      setCounts(result.counts || []);
      setPaymentConfig(payment);
      setPayments(ledger.payments || []);
      setRevenue(ledger.summary || {});
      setPaymentEnvironment(environment);
    } catch (loadError) {
      setError(loadError.message || '예약 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  const switchPayPalEnvironment = async (environment) => {
    if (switchingEnvironment || paymentEnvironment?.environment === environment) return;
    let acknowledgeUntested = false;
    if (environment === 'production' && !paymentEnvironment?.sandboxTestPassed) {
      acknowledgeUntested = window.confirm('Sandbox 성공 결제가 아직 없습니다. 실제 결제가 발생할 수 있는 Live 환경으로 전환할까요?');
      if (!acknowledgeUntested) return;
    }
    setSwitchingEnvironment(true);
    setError('');
    try {
      const result = await api('/api/admin/resort-payments/environment', {
        method: 'PATCH',
        body: { environment, confirmation: environment === 'production' ? 'LIVE' : '', acknowledgeUntested },
      });
      setPaymentEnvironment(result);
      await load();
    } catch (switchError) {
      const messages = {
        paypal_live_confirmation_required: 'Live 전환 확인란에 LIVE를 정확히 입력해 주세요.',
        paypal_live_credentials_missing: 'PayPal Live Client ID, Secret, Webhook ID가 모두 필요합니다.',
        paypal_sandbox_test_acknowledgement_required: 'Sandbox 미검증 상태를 확인한 뒤 다시 전환해 주세요.',
        paypal_sandbox_payments_still_open: '처리 중인 Sandbox 결제를 먼저 완료하거나 종료해 주세요.',
        paypal_sandbox_credentials_missing: 'PayPal Sandbox 자격증명이 아직 연결되지 않았습니다.',
      };
      const key = String(switchError.message || '').split(':')[0];
      setError(messages[key] || switchError.message || 'PayPal 환경 전환 실패');
    } finally {
      setSwitchingEnvironment(false);
    }
  };

  useEffect(() => { void load(); }, [status]);
  const countMap = useMemo(() => Object.fromEntries(counts.map((value) => [value.status, Number(value.count || 0)])), [counts]);
  const open = (row) => {
    setSelected(row);
    setDraft({ status: row.status, adminNote: row.adminNote || '', depositStatus: row.depositStatus || 'pending', paymentReference: row.paymentReference || '' });
  };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api(`/api/admin/resort-bookings/${encodeURIComponent(selected.id)}`, { method: 'PATCH', body: draft });
      setSelected(null);
      await load();
    } catch (saveError) {
      setError(saveError.message || '예약 처리 실패');
    } finally {
      setSaving(false);
    }
  };

  return <div className="resort-booking-admin">
    <section className="card booking-admin-head"><div><span>RESORT BOOKING OPERATIONS</span><h2>리조트 예약 관리</h2><p>예약 접수부터 확정, 거절, 이용 완료까지 관리합니다.</p></div><button onClick={load}>{loading ? '불러오는 중' : '새로고침'}</button></section>
    <section className="card booking-payment-readiness"><div><strong>예약 처리 단계</strong><span>1. 예약 접수 → 2. 예약금 결제 → 3. 리조트 검토 → 4. 예약 확정 → 5. 이용 완료</span><small>입금 대기 중 사용자가 취소한 건은 “입금 전 예약취소”로 별도 표시됩니다.</small></div></section>
    <section className={`card booking-payment-readiness ${paymentConfig?.enabled ? 'is-ready' : 'is-disabled'}`}><div><strong>예약금 결제 {paymentConfig?.enabled ? 'PayPal 연결 준비 완료' : '비활성'}</strong><span>{paymentConfig?.enabled ? '리조트 예약금은 PayPal 서버 캡처와 서명 검증된 웹훅으로만 결제 완료 처리됩니다.' : '서버에 PayPal 자격증명이 모두 설정되기 전에는 결제 버튼이 노출되지 않습니다.'}</span><small>PayPal {paymentConfig?.paypal?.enabled ? `${paymentConfig.paypal.environment} 준비` : '대기'} · 리조트 예약금 전용 외부 결제</small></div><code>{paymentConfig?.provider || 'disabled'}</code></section>
    <section className="card paypal-environment-control">
      <header><div><span>PAYPAL ENVIRONMENT</span><h3>결제 환경 전환</h3><p>비밀키는 서버에만 보관되며 이 화면에는 준비 여부만 표시됩니다.</p></div><strong className={`paypal-environment-badge is-${paymentEnvironment?.environment || 'sandbox'}`}>{paymentEnvironment?.environment === 'production' ? 'LIVE' : 'SANDBOX'}</strong></header>
      <div className="paypal-environment-grid">
        <div><span>Sandbox 자격증명</span><strong>{paymentEnvironment?.credentials?.sandbox ? '연결 완료' : '연결 필요'}</strong></div>
        <div><span>Live 자격증명</span><strong>{paymentEnvironment?.credentials?.production ? '연결 완료' : '연결 필요'}</strong></div>
        <div><span>Sandbox 성공 결제</span><strong>{paymentEnvironment?.sandboxSuccessCount || 0}건</strong></div>
        <div><span>처리 중 Sandbox 결제</span><strong>{paymentEnvironment?.sandboxOpenCount || 0}건</strong></div>
      </div>
      <div className="paypal-environment-actions">
        <span>Sandbox</span>
        <label className="paypal-mode-switch">
          <input type="checkbox" role="switch" aria-label="PayPal Sandbox Live 전환" checked={paymentEnvironment?.environment === 'production'} disabled={switchingEnvironment || !paymentEnvironment?.credentials?.sandbox || !paymentEnvironment?.credentials?.production || paymentEnvironment?.sandboxOpenCount > 0} onChange={(event) => switchPayPalEnvironment(event.target.checked ? 'production' : 'sandbox')} />
          <i />
        </label>
        <span>Live</span>
        <small>{paymentEnvironment?.sandboxTestPassed ? 'Sandbox 결제 검증 완료' : 'Sandbox 미검증 · Live 전환 시 경고 표시'}</small>
      </div>
      <small className="paypal-environment-help">Sandbox·Live 키가 모두 저장되면 스위치가 활성화됩니다. 처리 중인 Sandbox 결제가 있으면 전환이 잠기며 모든 변경은 감사 로그에 기록됩니다.</small>
    </section>
    <section className="booking-revenue-grid"><div className="card"><span>총 결제액</span><strong>{money(revenue.grossSales)}</strong><small>{revenue.succeededCount || 0}건 완료</small></div><div className="card"><span>환불</span><strong>{money(revenue.refunds)}</strong><small>웹훅 반영 기준</small></div><div className="card"><span>순매출</span><strong>{money(revenue.netSales)}</strong><small>결제액 - 환불</small></div><div className="card"><span>PG 수수료</span><strong>{money(revenue.fees)}</strong><small>PayPal 정산 내역</small></div><div className="card"><span>PG 정산액</span><strong>{money(revenue.processorNet)}</strong><small>통화 변환 전</small></div></section>
    <section className="card booking-admin-list booking-payment-ledger"><header><div><span>PAYMENT LEDGER</span><h3>예약금 매출 원장</h3><p>회원, 예약, PayPal 주문과 실제 캡처 내역을 연결해 표시합니다.</p></div><b>총 {payments.length}건</b></header><div className="booking-table-wrap"><table><thead><tr><th>거래·회원</th><th>예약·리조트</th><th>결제자</th><th>결제수단</th><th>결제액</th><th>수수료·순액</th><th>상태</th><th>처리일</th><th/></tr></thead><tbody>{payments.map((row) => <tr key={row.id}><td data-label="거래·회원"><strong>{row.providerPaymentId || row.providerOrderId || row.id}</strong><small>{row.memberUsername || row.memberEmail || `회원 ${row.userId}`}</small></td><td data-label="예약·리조트"><strong>{row.bookingNumber || row.bookingId}</strong><small>{row.resortName}</small></td><td data-label="결제자"><strong>{row.payerName || row.applicantName || '-'}</strong><small>{row.payerEmail || row.contactEmail || '-'}</small></td><td data-label="결제수단">{String(row.provider || '').toUpperCase()}<small>{row.paymentSource || row.paymentMethod}</small></td><td data-label="결제액"><strong>{money(row.grossAmount, row.currency)}</strong></td><td data-label="수수료·순액">-{money(row.feeAmount, row.currency)}<small>{money(row.netAmount, row.settlementCurrency || row.currency)}</small></td><td data-label="상태"><span className={`booking-status is-${row.status}`}>{PAYMENT_STATUS[row.status] || row.status}</span></td><td data-label="처리일">{new Date(row.processedAt || row.createdAt).toLocaleString('ko-KR')}</td><td className="booking-row-action"><button className="sm" onClick={() => setPaymentSelected(row)}>상세</button></td></tr>)}{!payments.length && !loading ? <tr><td colSpan="9">결제 내역이 없습니다.</td></tr> : null}</tbody></table></div></section>
    <section className="booking-status-grid">{STATUS.map(([key, label]) => <button key={key} className={`card ${status === key ? 'active' : ''}`} onClick={() => setStatus(status === key ? '' : key)}><span>{label}</span><strong>{countMap[key] || 0}</strong></button>)}</section>
    <section className="card booking-admin-list"><div className="booking-toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load()} placeholder="예약번호, 리조트, 신청자, 연락처 검색"/><button onClick={load}>검색</button><b>총 {rows.length}건</b></div>{error && <p className="error">{error}</p>}<div className="booking-table-wrap"><table><thead><tr><th>예약번호·리조트</th><th>예약자</th><th>예약 기간</th><th>인원·유형</th><th>상품</th><th>예약금</th><th>상태</th><th>접수일</th><th/></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td data-label="예약"><strong>{row.bookingNumber || row.id}</strong><small>{row.resortName}</small></td><td data-label="예약자"><strong>{row.applicantName}</strong><small>{row.contactPhone || row.contactEmail}</small></td><td data-label="예약 기간">{bookingRange(row)}</td><td data-label="인원·유형">{row.participants}명 · {DIVE_TYPE[row.diveType] || row.diveType}</td><td data-label="상품">{row.priceTitle || '-'}</td><td data-label="예약금"><strong>{row.depositCurrency} {Number(row.depositAmount || 0).toLocaleString()}</strong><small>{DEPOSIT_STATUS.find((value) => value[0] === row.depositStatus)?.[1] || row.depositStatus}</small></td><td data-label="상태"><span className={`booking-status is-${row.status}`}>{bookingStatusLabel(row)}</span></td><td data-label="접수일">{new Date(row.createdAt).toLocaleDateString('ko-KR')}</td><td className="booking-row-action"><button className="sm" onClick={() => open(row)}>처리</button></td></tr>)}{!rows.length && !loading ? <tr><td colSpan="9">예약 내역이 없습니다.</td></tr> : null}</tbody></table></div></section>
    {selected ? <div className="modal-backdrop"><section className="modal-panel booking-admin-modal"><header><div><h3>{selected.resortName}</h3><p>{selected.bookingNumber || selected.id} · {selected.applicantName} · {bookingRange(selected)} · {selected.participants}명</p></div><button className="ghost" onClick={() => setSelected(null)}>닫기</button></header><dl><dt>현재 상태</dt><dd>{bookingStatusLabel(selected)}</dd><dt>예약 기간</dt><dd>{bookingRange(selected)}</dd><dt>연락처</dt><dd>{selected.contactPhone || '-'} / {selected.contactEmail || '-'}</dd><dt>예약금</dt><dd>USD {Number(selected.depositAmount || 0).toLocaleString()}</dd><dt>환불 요청</dt><dd>{selected.refundRequestedAt ? `USD ${Number(selected.refundAmount || 0).toLocaleString()} · ${selected.refundReason || '사유 미입력'}` : '-'}</dd><dt>요청사항</dt><dd>{selected.note || '-'}</dd></dl><label><span>처리 상태</span><select value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value }))}>{STATUS.filter((value) => value[0] !== 'cancelled').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label><span>예약금 상태</span><select value={draft.depositStatus} onChange={(event) => setDraft((value) => ({ ...value, depositStatus: event.target.value }))}>{DEPOSIT_STATUS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><small>환불 완료 또는 부분 환불 선택 시 처리 시각이 기록됩니다.</small></label><label><span>입금·결제 참조번호</span><input value={draft.paymentReference} onChange={(event) => setDraft((value) => ({ ...value, paymentReference: event.target.value }))} placeholder="PG 거래번호"/></label><label><span>운영 메모</span><textarea rows="5" value={draft.adminNote} onChange={(event) => setDraft((value) => ({ ...value, adminNote: event.target.value }))}/></label><footer><button className="ghost" onClick={() => setSelected(null)}>취소</button><button disabled={saving} onClick={save}>{saving ? '저장 중' : '저장'}</button></footer></section></div> : null}
    {paymentSelected ? <div className="modal-backdrop"><section className="modal-panel booking-admin-modal payment-detail-modal"><header><div><span>PAYMENT DETAIL</span><h3>{paymentSelected.providerPaymentId || paymentSelected.providerOrderId}</h3><p>{paymentSelected.bookingNumber} · {paymentSelected.resortName}</p></div><button className="ghost" onClick={() => setPaymentSelected(null)}>닫기</button></header><dl><dt>회원</dt><dd>{paymentSelected.memberUsername || '-'} · {paymentSelected.memberEmail || `ID ${paymentSelected.userId}`}</dd><dt>신청자</dt><dd>{paymentSelected.applicantName || '-'} · {paymentSelected.contactEmail || paymentSelected.contactPhone || '-'}</dd><dt>PayPal 결제자</dt><dd>{paymentSelected.payerName || '-'} · {paymentSelected.payerEmail || '-'} · {paymentSelected.payerId || '-'}</dd><dt>결제수단</dt><dd>{String(paymentSelected.provider).toUpperCase()} · {paymentSelected.paymentSource || paymentSelected.paymentMethod}</dd><dt>주문 ID</dt><dd>{paymentSelected.providerOrderId || '-'}</dd><dt>캡처 ID</dt><dd>{paymentSelected.providerPaymentId || '-'}</dd><dt>결제액</dt><dd>{money(paymentSelected.grossAmount, paymentSelected.currency)}</dd><dt>수수료</dt><dd>{money(paymentSelected.feeAmount, paymentSelected.currency)}</dd><dt>정산액</dt><dd>{money(paymentSelected.netAmount, paymentSelected.settlementCurrency || paymentSelected.currency)}</dd><dt>환불액</dt><dd>{money(paymentSelected.refundedAmount, paymentSelected.currency)}</dd><dt>상태</dt><dd>{PAYMENT_STATUS[paymentSelected.status] || paymentSelected.status}</dd><dt>처리 시각</dt><dd>{new Date(paymentSelected.processedAt || paymentSelected.createdAt).toLocaleString('ko-KR')}</dd>{paymentSelected.failureCode ? <><dt>실패 사유</dt><dd>{paymentSelected.failureCode} · {paymentSelected.failureMessage}</dd></> : null}</dl><footer><button onClick={() => setPaymentSelected(null)}>확인</button></footer></section></div> : null}
  </div>;
}
