import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import Pagination, { usePagination } from '../components/Pagination';

const CONFIGS = {
  devices: { title: '디바이스·푸시 토큰', description: '회원별 등록 기기와 푸시 토큰 활성 상태를 관리합니다.', endpoint: '/api/admin/device-tokens?limit=300', key: 'tokens', columns: [['platform','플랫폼'],['email','회원'],['device_id','기기 ID'],['token_masked','토큰'],['is_active','활성'],['created_at','등록일']] },
  consents: { title: '사용자 약관 동의 이력', description: '회원별 약관 버전과 동의 시점을 규제 대응 자료로 확인합니다.', endpoint: '/api/admin/user-consents?limit=300', key: 'consents', columns: [['email','회원'],['policy_type','정책'],['policy_version','버전'],['agreed','동의'],['source','경로'],['agreed_at','동의일']] },
  comments: { title: '댓글 운영', description: '댓글을 검색하고 정책 위반 항목을 삭제합니다.', endpoint: '/api/admin/comments?limit=300', key: 'comments', columns: [['content','댓글'],['username','작성자'],['post_id','게시물'],['caption','게시물 내용'],['created_at','작성일']] },
  notifications: { title: '알림 발송·수신 이력', description: '저장·발송·읽음·열림 상태와 딥링크를 확인합니다.', endpoint: '/api/admin/notifications?limit=300', key: 'notifications', columns: [['title','제목'],['email','수신자'],['type','유형'],['delivery_status','전송'],['is_read','읽음'],['deep_link','딥링크'],['created_at','생성일']] },
  chats: { title: '신고된 채팅·DM', description: '개인정보 보호를 위해 신고가 접수된 메시지만 검토합니다.', endpoint: '/api/admin/reported-chats?limit=200', key: 'chats', columns: [['reason','신고 사유'],['content','메시지'],['sender_username','작성자'],['room_id','대화방'],['report_status','상태'],['reported_at','신고일']] },
  admins: { title: '관리자 계정·권한', description: '현재 관리자 역할이 부여된 계정과 보안 상태를 확인합니다.', endpoint: '/api/admin/admin-users', key: 'admins', columns: [['email','이메일'],['username','사용자명'],['role','역할'],['email_verified','인증'],['is_blocked','차단'],['created_at','등록일']] },
  jobs: { title: '백그라운드 작업', description: '비동기 작업의 대기·완료·실패 상태와 오류를 확인합니다.', endpoint: '/api/admin/jobs?limit=300', key: 'jobs', columns: [['type','작업'],['status','상태'],['attempts','시도'],['last_error','마지막 오류'],['created_at','생성일'],['updated_at','수정일']] },
};

function display(value, key) {
  if (value === true) return '예';
  if (value === false) return '아니오';
  if (value == null || value === '') return '-';
  if (key.includes('_at')) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('ko-KR');
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export default function OperationsDataSection({ type }) {
  const config = CONFIGS[type] || CONFIGS.devices;
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true); setError('');
    try { const result = await api(config.endpoint); setRows(result?.[config.key] || []); }
    catch (e) { setError(e.message || '데이터 조회 실패'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [type]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? rows.filter((row) => config.columns.some(([key]) => display(row[key], key).toLowerCase().includes(needle))) : rows;
  }, [config.columns, query, rows]);
  const pagination = usePagination(visible, 20, `${type}:${query}`);

  const updateDevice = async (row) => {
    setBusy(true);
    try { await api(`/api/admin/device-tokens/${encodeURIComponent(row.id)}/status`, { method: 'PATCH', body: { isActive: !row.is_active } }); await load(); }
    catch (e) { setError(e.message || '상태 변경 실패'); setBusy(false); }
  };
  const deleteComment = async (row) => {
    if (!confirm('이 댓글을 삭제할까요? 삭제 작업은 감사 로그에 기록됩니다.')) return;
    setBusy(true);
    try { await api(`/api/admin/comments/${encodeURIComponent(row.id)}`, { method: 'DELETE' }); await load(); }
    catch (e) { setError(e.message || '댓글 삭제 실패'); setBusy(false); }
  };
  const dispatchJobs = async () => {
    setBusy(true);
    try { await api('/api/admin/jobs/dispatch', { method: 'POST', body: { limit: 50 } }); await load(); }
    catch (e) { setError(e.message || '작업 실행 실패'); setBusy(false); }
  };
  const exportCsv = () => {
    const lines = [config.columns.map(([,label]) => label), ...visible.map((row) => config.columns.map(([key]) => display(row[key], key)))];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `${type}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return <div className="admin-section"><section className="operation-page-head"><div><p className="section-kicker">OPERATIONS</p><h2>{config.title}</h2><p>{config.description}</p></div><div className="operation-head-actions"><span>전체 <strong>{rows.length}</strong></span><button type="button" className="ghost" onClick={load} disabled={busy}>새로고침</button><button type="button" onClick={exportCsv} disabled={!visible.length}>CSV</button>{type === 'jobs' && <button type="button" onClick={dispatchJobs} disabled={busy}>대기 작업 실행</button>}</div></section><section className="card operation-data-card"><div className="operation-toolbar"><label className="operation-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="현재 목록 검색" /></label><span className="operation-result-count">검색 결과 <strong>{visible.length}</strong>건</span></div>{error && <p className="error">{error}</p>}<div className="operation-data-table-wrap"><table className="operation-data-table"><thead><tr>{config.columns.map(([,label]) => <th key={label}>{label}</th>)}{['devices','comments'].includes(type) && <th>작업</th>}</tr></thead><tbody>{pagination.pageItems.map((row) => <tr key={row.id || row.report_id}>{config.columns.map(([key]) => <td key={key} title={display(row[key], key)}>{display(row[key], key)}</td>)}{type === 'devices' && <td><button type="button" className="sm ghost" onClick={() => updateDevice(row)} disabled={busy}>{row.is_active ? '비활성화' : '활성화'}</button></td>}{type === 'comments' && <td><button type="button" className="sm danger" onClick={() => deleteComment(row)} disabled={busy}>삭제</button></td>}</tr>)}</tbody></table>{!visible.length && <div className="operation-empty"><strong>{busy ? '불러오는 중입니다.' : '표시할 데이터가 없습니다.'}</strong></div>}</div><Pagination {...pagination} label={config.title} /></section></div>;
}
