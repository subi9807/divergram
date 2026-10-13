import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const labels = { active: '유효', scheduled: '시작 예정', expired: '만료', cancelled: '취소', refunded: '환불', verified: '검증 완료', revoked: '철회', rejected: '거부' };
const platform = value => ({ ios: 'iOS', android: 'Android', web: 'Web', admin: '관리자 지급' }[value] || '확인 필요');
const date = value => value ? new Date(value).toLocaleString('ko-KR') : '—';

export default function StoreSubscriptionsSection() {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState({ q: '', page: 1, refresh: 0 });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    setBusy(true); setError('');
    api(`/api/admin/store-subscriptions?q=${encodeURIComponent(search.q)}&page=${search.page}`)
      .then(result => { if (id === requestId.current) setData(result); })
      .catch(() => { if (id === requestId.current) setError('구독 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'); })
      .finally(() => { if (id === requestId.current) setBusy(false); });
    return () => { requestId.current++; };
  }, [search]);
  const refresh = () => setSearch(current => ({ ...current, refresh: current.refresh + 1 }));
  return <div className="admin-section">
    <section className="operation-page-head"><div><p className="section-kicker">STORE SUBSCRIPTIONS</p><h2>인앱 구독 현황</h2><p>회원의 이용 기간과 서버 검증 이력을 확인합니다. 이 화면에서는 결제·환불을 실행하지 않습니다.</p></div><button onClick={refresh} disabled={busy}>새로고침</button></section>
    <p className="operation-warning">서버에 마지막으로 검증된 정보입니다. 스토어의 갱신·취소·환불 통보가 연결되지 않았다면 최신 상태와 다를 수 있습니다.</p>
    <div className="operation-quick-links"><a href="/operations">결제 단계별 진단 ↗</a><a href="/api-management?service=apple-iap">Apple 설정 ↗</a><a href="/api-management?service=google-iap">Google 설정 ↗</a></div>
    {error && <p role="alert" className="error">{error} <button onClick={refresh} disabled={busy}>다시 시도</button></p>}
    <p className="operation-updated">{busy ? '조회 중…' : data?.checkedAt ? `${date(data.checkedAt)} 기준 · 요약은 전체 회원 기준입니다.` : '아직 조회하지 못했습니다.'}</p>
    <div className="operations-overview-grid">{['active', 'expired', 'cancelled', 'refunded'].map(status => <section className="card operations-overview-card" key={status}><h3>{labels[status]}</h3><p><strong>{data ? (data.summary || []).find(row => row.status === status)?.count || 0 : '—'}</strong><span>구독 기록</span></p></section>)}</div>
    <section className="card" style={{ marginTop: 20, padding: 24 }}>
      <form className="subscription-search" onSubmit={event => { event.preventDefault(); setData(null); setSearch({ q: query.trim(), page: 1, refresh: search.refresh + 1 }); }}><label htmlFor="subscription-search">회원·상품 검색</label><input id="subscription-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="이메일, 회원 ID 또는 상품 ID" maxLength={200} /><button disabled={busy}>검색</button></form>
      <div className="table-wrap" style={{ overflowX: 'auto' }}><table><thead><tr><th>회원</th><th>스토어·상품</th><th>이용 상태</th><th>만료일</th><th>자동 갱신*</th><th>마지막 검증</th></tr></thead><tbody>{(data?.memberships || []).map(item => <tr key={item.id}><td>{item.email || item.username || item.user_id}</td><td>{platform(item.platform)}<br /><small>{item.store_product_id || item.plan_code}</small></td><td>{labels[item.effective_status] || item.effective_status}</td><td>{date(item.expires_at)}</td><td>{item.platform === 'ios' ? '스토어 확인 필요' : item.auto_renews ? '설정됨' : '아니요'}</td><td>{date(item.updated_at)}</td></tr>)}{!data?.memberships?.length && <tr><td colSpan="6">{busy ? '조회 중…' : error ? '조회 실패' : '검색 조건에 맞는 구독 기록이 없습니다.'}</td></tr>}</tbody></table></div>
      <p className="operation-updated">* 마지막 검증 시점의 설정입니다. iOS는 현재 거래 조회만으로 자동 갱신 여부를 확정할 수 없어 스토어 확인이 필요합니다. 유효 상태는 저장된 상태와 이용 기간을 함께 계산하며 매출 금액을 의미하지 않습니다.</p>
      <div className="subscription-pagination"><button disabled={busy || !data || data.page <= 1} onClick={() => { setData(null); setSearch(current => ({ ...current, page: current.page - 1 })); }}>이전</button><span>{data?.page || search.page} 페이지 · 50건씩</span><button disabled={busy || !data?.hasMore} onClick={() => { setData(null); setSearch(current => ({ ...current, page: current.page + 1 })); }}>다음</button></div>
    </section>
    <section className="card" style={{ marginTop: 20, padding: 24 }}><h3>최근 검증 이력 <small className="operation-updated">검색 조건 기준 · 최근 50건</small></h3><div className="table-wrap" style={{ overflowX: 'auto' }}><table><thead><tr><th>시간</th><th>회원 ID</th><th>스토어</th><th>환경</th><th>결과</th></tr></thead><tbody>{(data?.events || []).map(item => <tr key={item.id}><td>{date(item.created_at)}</td><td>{item.user_id}</td><td>{platform(item.platform)}</td><td>{item.environment || '—'}</td><td>{labels[item.status] || item.status}</td></tr>)}{!data?.events?.length && <tr><td colSpan="5">{busy ? '조회 중…' : error ? '조회 실패' : '검증 이력이 없습니다.'}</td></tr>}</tbody></table></div></section>
  </div>;
}
