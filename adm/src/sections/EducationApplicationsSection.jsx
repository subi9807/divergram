import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const STATUS_OPTIONS = [
  ['received', '신청 접수'], ['consulting', '상담 중'], ['assigned', '배정 완료'],
  ['in_progress', '교육 진행'], ['completed', '수료'], ['cancelled', '취소'],
];

const emptyOptions = { resorts: [], instructors: [] };

export default function EducationApplicationsSection() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ status: 'received', assignedResortId: '', assignedInstructorUserId: '', adminNote: '' });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (query.trim()) params.set('q', query.trim());
      const [list, optionData] = await Promise.all([
        api(`/api/admin/education-applications?${params.toString()}`),
        api('/api/admin/education-applications/options'),
      ]);
      setRows(list.applications || []); setCounts(list.counts || []); setOptions(optionData || emptyOptions);
    } catch (e) { setError(e.message || '교육 신청 조회 실패'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [status]);

  const countMap = useMemo(() => Object.fromEntries(counts.map((item) => [item.status, Number(item.count || 0)])), [counts]);
  const openDetail = (row) => {
    setSelected(row);
    setDraft({ status: row.status || 'received', assignedResortId: row.assignedResortId || '', assignedInstructorUserId: row.assignedInstructorUserId || '', adminNote: row.adminNote || '' });
  };
  const save = async () => {
    if (!selected || saving) return;
    setSaving(true); setError('');
    try {
      await api(`/api/admin/education-applications/${encodeURIComponent(selected.id)}`, { method: 'PATCH', body: draft });
      setSelected(null); await load();
    } catch (e) { setError(e.message || '교육 신청 배정 실패'); }
    finally { setSaving(false); }
  };

  return (
    <div className="education-admin">
      <section className="education-admin-head card">
        <div><span className="education-kicker">DIVE EDUCATION OPERATIONS</span><h2>교육 신청 관리</h2><p>신청 상담부터 교육기관·강사 배정과 수료까지 관리합니다.</p></div>
        <button type="button" onClick={load} disabled={loading}>{loading ? '불러오는 중' : '새로고침'}</button>
      </section>
      <section className="education-stats">
        {STATUS_OPTIONS.map(([key, label]) => <button key={key} className={`education-stat card ${status === key ? 'active' : ''}`} onClick={() => setStatus(status === key ? '' : key)}><span>{label}</span><strong>{countMap[key] || 0}</strong></button>)}
      </section>
      <section className="education-list card">
        <div className="education-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="신청자, 이메일, 과정 검색" /><button type="button" onClick={load}>검색</button><span>총 {rows.length}건</span></div>
        {error && <p className="error">{error}</p>}
        <div className="education-table-wrap"><table><thead><tr><th>신청자</th><th>교육 과정</th><th>희망 지역·일정</th><th>현재 배정</th><th>상태</th><th>신청일</th><th /></tr></thead><tbody>
          {rows.map((row) => <tr key={row.id}><td><strong>{row.applicantName}</strong><small>{row.userEmail || row.contact}</small></td><td><strong>{row.courseTitle}</strong><small>{row.track} · {row.courseLevel}</small></td><td><span>{row.preferredRegion || '-'}</span><small>{row.preferredDate || row.preferredSchedule || '-'}</small></td><td><span>{row.assignedResortName || '미배정'}</span><small>{row.assignedInstructorName || '강사 미배정'}</small></td><td><span className={`education-status is-${row.status}`}>{STATUS_OPTIONS.find(([key]) => key === row.status)?.[1] || row.status}</span></td><td>{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(row.createdAt))}</td><td><button className="sm" type="button" onClick={() => openDetail(row)}>배정·처리</button></td></tr>)}
          {!rows.length && !loading ? <tr><td colSpan="7" className="education-empty">조건에 맞는 교육 신청이 없습니다.</td></tr> : null}
        </tbody></table></div>
      </section>

      {selected ? <div className="modal-backdrop"><section className="modal-panel education-assignment-modal">
        <header><div><span className="education-kicker">APPLICATION ASSIGNMENT</span><h3>{selected.courseTitle}</h3><p>{selected.applicantName} · {selected.contact}</p></div><button className="ghost" onClick={() => setSelected(null)}>닫기</button></header>
        <div className="education-applicant-summary"><div><span>희망 지역</span><strong>{selected.preferredRegion || '-'}</strong></div><div><span>희망 날짜</span><strong>{selected.preferredDate || selected.preferredSchedule || '-'}</strong></div><div><span>신청 계정</span><strong>{selected.userEmail || selected.username}</strong></div></div>
        <div className="education-consent-summary">
          <strong>동의 증적</strong>
          <span>{selected.privacyConsent ? '✓ 개인정보 수집·이용' : '미동의'} · {selected.thirdPartyConsent ? '✓ 제3자 제공' : '미동의'}</span>
          <small>{selected.consentedAt ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selected.consentedAt)) : '기존 신청: 동의 기록 없음'} · 문서 {selected.consentVersion || '-'}</small>
        </div>
        <div className="education-assignment-form">
          <label><span>처리 상태</span><select value={draft.status} onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}>{STATUS_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>교육기관·리조트</span><select value={draft.assignedResortId} onChange={(e) => setDraft((prev) => ({ ...prev, assignedResortId: e.target.value }))}><option value="">미배정</option>{options.resorts.map((item) => <option key={item.id} value={item.id}>{item.name} · {[item.country, item.region].filter(Boolean).join(' ')}</option>)}</select></label>
          <label><span>담당 강사</span><select value={draft.assignedInstructorUserId} onChange={(e) => setDraft((prev) => ({ ...prev, assignedInstructorUserId: e.target.value }))}><option value="">미배정</option>{options.instructors.map((item) => <option key={item.id} value={item.id}>{item.name} · @{item.username}</option>)}</select></label>
          <label className="full"><span>상담·운영 메모</span><textarea rows="5" value={draft.adminNote} onChange={(e) => setDraft((prev) => ({ ...prev, adminNote: e.target.value }))} placeholder="상담 결과, 준비물, 배정 사유를 기록하세요." /></label>
        </div>
        <footer><button className="ghost" onClick={() => setSelected(null)}>취소</button><button onClick={save} disabled={saving}>{saving ? '저장 중' : '배정 내용 저장'}</button></footer>
      </section></div> : null}
    </div>
  );
}
