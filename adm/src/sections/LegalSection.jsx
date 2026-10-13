import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const POLICY_GROUPS = [
  { key: 'core', label: '핵심 약관', types: ['terms', 'privacy', 'age14_notice'] },
  { key: 'location', label: '위치·데이터', types: ['location_terms', 'location_privacy', 'data_retention', 'account_deletion', 'cookie'] },
  { key: 'content', label: '콘텐츠·커뮤니티', types: ['community', 'content_upload', 'ugc_policy', 'copyright', 'youth'] },
  { key: 'safety', label: '안전·기술', types: ['safety_disclaimer', 'medical_notice', 'ai_notice', 'external_api_notice', 'bluetooth_notice'] },
  { key: 'moderation', label: '신고·보호', types: ['report_sanction', 'illegal_content', 'report_process'] },
  { key: 'consent', label: '제공·수신 동의', types: ['privacy_third_party', 'privacy_overseas_transfer', 'marketing_consent', 'push_consent'] },
];

function toDateInput(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export default function LegalSection() {
  const [policies, setPolicies] = useState([]);
  const [selectedType, setSelectedType] = useState('terms');
  const [form, setForm] = useState(null);
  const [savedForm, setSavedForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const result = await api('/api/admin/legal/policies');
      const next = result?.policies || [];
      setPolicies(next);
      const selected = next.find((item) => item.type === selectedType) || next[0];
      if (selected) {
        const nextForm = { ...selected, effectiveFrom: toDateInput(selected.effectiveFrom) };
        setForm(nextForm);
        setSavedForm(nextForm);
      }
    } catch (loadError) {
      setError(loadError.message || '약관을 불러오지 못했습니다.');
    }
  };

  useEffect(() => { void load(); }, []);

  const selectPolicy = (type) => {
    setSelectedType(type);
    const selected = policies.find((item) => item.type === type);
    if (selected) {
      const nextForm = { ...selected, effectiveFrom: toDateInput(selected.effectiveFrom) };
      setForm(nextForm);
      setSavedForm(nextForm);
    }
    setMessage('');
    setError('');
  };
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm]);
  const groupedPolicies = useMemo(() => POLICY_GROUPS.map((group) => ({
    ...group,
    policies: group.types.map((type) => policies.find((policy) => policy.type === type)).filter(Boolean),
  })).filter((group) => group.policies.length), [policies]);

  const save = async (event) => {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await api(`/api/admin/legal/policies/${encodeURIComponent(form.type)}`, {
        method: 'PUT',
        body: {
          title: form.title,
          content: form.content,
          version: form.version,
          effectiveFrom: new Date(`${form.effectiveFrom}T00:00:00.000Z`).toISOString(),
          published: true,
        },
      });
      setMessage('게시되었습니다. 앱을 다시 빌드하지 않아도 다음 조회부터 즉시 반영됩니다.');
      await load();
    } catch (saveError) {
      setError(saveError.message || '약관 게시에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-section legal-section">
      <section className="operation-page-head">
        <div>
          <p className="section-kicker">POLICY CENTER</p>
          <h2>약관·정책 관리</h2>
          <p>게시한 정책은 앱·웹·가입 API에 별도 배포 없이 즉시 적용됩니다.</p>
        </div>
        <div className="operation-head-actions"><span>정책 <strong>{policies.length}</strong></span><span className={isDirty ? 'is-dirty' : ''}>{isDirty ? '저장하지 않은 변경' : '최신 상태'}</span><button type="button" className="ghost" onClick={load} disabled={busy}>서버에서 새로고침</button></div>
      </section>

      <section className="card legal-workspace">
      <div className="legal-policy-groups" aria-label="약관 분류">
        {groupedPolicies.map((group) => (
          <section className="legal-policy-group" key={group.key}>
            <div className="legal-policy-group-title"><strong>{group.label}</strong><span>{group.policies.length}</span></div>
            <div className="settings-menu legal-policy-tabs">
              {group.policies.map((policy) => (
                <button key={policy.type} type="button" className={selectedType === policy.type ? 'chip active' : 'chip'} onClick={() => selectPolicy(policy.type)}>
                  <span>{policy.title || policy.type}</span>
                  <small>{policy.requiredForSignup ? '가입 필수' : policy.published ? '게시됨' : '게시 전'}</small>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {form && (
        <form className="legal-editor-grid" onSubmit={save}>
          <div className="legal-editor-pane">
          <div className="panel-head"><div><strong>정책 편집</strong><p>제목, 버전, 시행일과 본문을 확인해 주세요.</p></div><span className={form.requiredForSignup ? 'badge active' : 'badge'}>{form.requiredForSignup ? '가입 필수' : '선택 또는 별도 동의'}</span></div>
          <div className="field-grid profile-grid">
            <label><span>정책 제목</span><input value={form.title || ''} onChange={(e) => setForm((value) => ({ ...value, title: e.target.value }))} /></label>
            <label><span>정책 버전</span><input value={form.version || ''} onChange={(e) => setForm((value) => ({ ...value, version: e.target.value }))} placeholder="2026.07.22" /></label>
            <label><span>시행일</span><input type="date" value={form.effectiveFrom || ''} onChange={(e) => setForm((value) => ({ ...value, effectiveFrom: e.target.value }))} /></label>
            <label><span>가입 적용</span><input value={form.enabledForSignup ? (form.requiredForSignup ? '필수 동의' : '선택 동의') : '기능 사용 시 별도 동의'} readOnly /></label>
          </div>
          <label style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <span>본문 (Markdown)</span>
            <textarea rows={18} value={form.content || ''} onChange={(e) => setForm((value) => ({ ...value, content: e.target.value }))} placeholder={'## 1. 목적\n약관 내용을 입력하세요.'} style={{ width: '100%', resize: 'vertical' }} />
          </label>
          <div className="detail-actions">
            <button type="submit" disabled={busy}>{busy ? '게시 중...' : '저장하고 즉시 게시'}</button>
            <button type="button" className="ghost" disabled={!isDirty || busy} onClick={() => setForm(savedForm ? { ...savedForm } : form)}>변경 취소</button>
          </div>
          {message && <p className="muted">{message}</p>}
          {error && <p className="error">{error}</p>}
          </div>
          <aside className="legal-preview-pane">
            <div className="legal-preview-top"><span>LIVE PREVIEW</span><strong>v{form.version || '-'}</strong></div>
            <div className="legal-preview-document"><p className="legal-preview-date">시행일 {form.effectiveFrom || '-'}</p><h3>{form.title || '정책 제목'}</h3><div className="legal-preview-content">{form.content || '정책 본문을 입력하면 이곳에서 미리 볼 수 있습니다.'}</div></div>
          </aside>
        </form>
      )}
      </section>
    </div>
  );
}
