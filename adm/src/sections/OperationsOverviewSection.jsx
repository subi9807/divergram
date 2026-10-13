import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export default function OperationsOverviewSection() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const load = async () => { if (inFlight.current) return; inFlight.current = true; setBusy(true); try { setData(await api('/api/admin/operations-overview')); setError(''); } catch (e) { setError(e.message || '운영 상태 조회 실패'); } finally { inFlight.current = false; setBusy(false); } };
  useEffect(() => { void load(); }, []);
  const groups = [['백그라운드 작업','jobs'],['디바이스 토큰','tokens'],['알림 전송','notifications'],['신고 처리','reports']];
  const labels = { failed: '실패', pending: '대기', running: '실행 중', completed: '완료', sent: '전송됨', queued: '전송 대기', received: '접수', resolved: '처리 완료', reviewing: '검토 중', invalid_token: '만료 토큰', product_fetch_error: '상품 조회 실패', product_unavailable: '상품 미조회', purchase_error: '구매 오류', verification_error: '검증 실패', verification_success: '검증 성공', purchase_success: '구매 응답', store_connected: '스토어 연결', store_disconnected: '스토어 미연결', config_ready: '설정 조회', screen_open: '결제 화면 진입', product_fetch_success: '상품 조회 응답', purchase_request: '구매 요청', restore_success: '복원 완료' };
  return <div className="admin-section">
    <section className="operation-page-head"><div><p className="section-kicker">SERVICE HEALTH</p><h2>운영 상태 센터</h2><p>작업 실패부터 스토어 결제 흐름까지, 확인이 필요한 상태를 모았습니다.</p></div><button type="button" onClick={load} disabled={busy}>{busy ? '확인 중…' : '상태 새로고침'}</button></section>
    {error && <p className="error" role="alert">{error}</p>}
    {data?.partial && <p className="operation-warning" role="alert">일부 항목을 조회하지 못했습니다. 빈 결과를 정상 상태로 판단하지 마세요.</p>}
    <p className="operation-updated">{data?.checkedAt ? `${new Date(data.checkedAt).toLocaleString('ko-KR')} 기준` : busy ? '운영 데이터를 확인하고 있습니다.' : '상태 확인 전'}</p>
    <div className="operation-quick-links"><a href="/jobs">실패 작업 확인 ↗</a><a href="/notification-history">알림 전달 이력 ↗</a><a href="/api-management">외부 API 설정 ↗</a><a href="/app-version">앱 버전 정책 ↗</a><a href="/support">고객 문의 ↗</a></div>
    <div className="operations-overview-grid" style={{ marginTop: 20 }}>{groups.map(([label,key]) => <section className="card operations-overview-card" key={key}><h3>{label}</h3><div>{(data?.[key] || []).map((item,index) => { const status = item.status || item.platform || item.delivery_status || 'unknown'; return <p key={index}><span>{labels[status] || status}{item.is_active != null ? ` · ${item.is_active ? '활성' : '비활성'}` : ''}</span><strong>{item.count}</strong></p>; })}{!(data?.[key] || []).length && <p><span>{data?.unavailable?.includes(key) ? '조회 실패' : !data ? '확인 중' : '기록 없음'}</span><strong>—</strong></p>}</div></section>)}</div>
    <section className="card operations-overview-card" style={{ marginTop: 20 }}><h3>인앱 결제 진단 <small className="operation-updated">최근 7일 · 이벤트 수</small></h3><p className="operation-updated">구매창 호출과 서버 검증을 구분합니다. 로그가 없다는 것은 성공이나 장애가 없다는 의미가 아닙니다.</p>
      <div className="table-wrap" style={{ overflowX: 'auto' }}><table><thead><tr><th>플랫폼</th><th>진행 단계</th><th>이벤트</th><th>마지막 확인</th></tr></thead><tbody>{(data?.iap || []).map((item, i) => <tr key={i}><td>{item.platform === 'ios' ? 'iOS' : 'Android'}</td><td>{labels[item.stage] || item.stage}</td><td>{item.count}</td><td>{item.last_seen ? new Date(item.last_seen).toLocaleString('ko-KR') : '—'}</td></tr>)}{!data?.iap?.length && <tr><td colSpan="4">{data?.unavailable?.includes('iap') ? '결제 진단 조회 실패' : '최근 기록이 없습니다. 새 빌드에서 상품 조회·구매·복원을 점검하세요.'}</td></tr>}</tbody></table></div>
    </section>
  </div>;
}
