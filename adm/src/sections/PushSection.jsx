import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const EMPTY_PUSH_FORM = {
  title: 'Divergram 운영 알림',
  body: '운영 소식을 확인해 주세요.',
  targetRole: 'all',
  targetUserIds: '',
  createdAfter: '',
  createdBefore: '',
  scubaLevel: '',
  freedivingLevel: '',
  blockedState: 'all',
  scheduleEnabled: false,
  scheduleAt: '',
  dataJson: '',
};

const EMPTY_TEST_FORM = {
  token: '',
  title: 'FCM 테스트',
  body: 'Divergram push test',
  dataJson: '{"kind":"push_test"}',
};

const PUSH_TEMPLATES = [
  { key: 'notice', label: '전체 공지', title: '[운영 공지] Divergram 안내', body: '서비스 공지와 운영 안내를 확인해 주세요.', targetRole: 'all', data: { type: 'notice', channel: 'admin' } },
  { key: 'update', label: '앱 업데이트', title: '[업데이트 안내] Divergram 새 소식', body: '앱 업데이트와 변경 사항을 확인해 주세요.', targetRole: 'all', data: { type: 'update', channel: 'admin' } },
  { key: 'resort', label: '리조트 공지', title: '[리조트 안내] 예약 및 운영 공지', body: '리조트 회원 대상 운영 공지입니다.', targetRole: 'resort', data: { type: 'resort_notice', channel: 'admin' } },
  { key: 'safety', label: '안전 알림', title: '[안전 안내] 다이빙 전 체크', body: '안전 수칙과 체크리스트를 다시 확인해 주세요.', targetRole: 'all', data: { type: 'safety_notice', channel: 'admin' } },
  { key: 'event', label: '이벤트', title: '[이벤트] Divergram 소식', body: '이벤트와 프로모션 소식을 확인해 주세요.', targetRole: 'general', data: { type: 'event', channel: 'admin' } },
];

export default function PushSection({ reports = [], certifications = [], reportBreakdown = {} }) {
  const [pushForm, setPushForm] = useState(EMPTY_PUSH_FORM);
  const [testForm, setTestForm] = useState(EMPTY_TEST_FORM);
  const [pushBusy, setPushBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [testError, setTestError] = useState('');
  const [pushResult, setPushResult] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [pushHistory, setPushHistory] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const hasPushDataJson = pushForm.dataJson.trim().length > 0;
  const hasTestDataJson = testForm.dataJson.trim().length > 0;

  const loadPushHistory = async () => {
    try {
      const result = await api('/api/admin/push/history?limit=8');
      setPushHistory([
        ...(result?.sent || []).map((item) => ({ ...item, kind: 'sent' })),
        ...(result?.scheduled || []).map((item) => ({ ...item, kind: 'scheduled' })),
      ].slice(0, 8));
    } catch {
      setPushHistory([]);
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await api('/api/admin/push/templates?limit=20');
      setSavedTemplates(Array.isArray(result?.templates) ? result.templates : []);
    } catch {
      setSavedTemplates([]);
    }
  };

  useEffect(() => { loadPushHistory(); loadTemplates(); }, []);

  const pushPreview = useMemo(() => {
    try {
      return hasPushDataJson ? JSON.parse(pushForm.dataJson) : {};
    } catch {
      return null;
    }
  }, [hasPushDataJson, pushForm.dataJson]);

  const testPreview = useMemo(() => {
    try {
      return hasTestDataJson ? JSON.parse(testForm.dataJson) : {};
    } catch {
      return null;
    }
  }, [hasTestDataJson, testForm.dataJson]);

  const sendPush = async (event) => {
    event.preventDefault();
    setPushBusy(true);
    setPushError('');
    try {
      let payloadData = {};
      if (pushForm.dataJson.trim()) {
        payloadData = JSON.parse(pushForm.dataJson);
        if (!payloadData || typeof payloadData !== 'object' || Array.isArray(payloadData)) throw new Error('data_json_must_be_object');
      }
      const result = await api('/api/admin/push/send', {
        method: 'POST',
        body: {
          title: pushForm.title,
          body: pushForm.body,
          targetRole: pushForm.targetRole,
          targetUserIds: pushForm.targetUserIds,
          createdAfter: pushForm.createdAfter || undefined,
          createdBefore: pushForm.createdBefore || undefined,
          scubaLevel: pushForm.scubaLevel || undefined,
          freedivingLevel: pushForm.freedivingLevel || undefined,
          blockedState: pushForm.blockedState,
          scheduleAt: pushForm.scheduleEnabled ? pushForm.scheduleAt || undefined : undefined,
          data: payloadData,
        },
      });
      setPushResult(result);
      await loadPushHistory();
    } catch (error) {
      setPushError(error.message || '푸시 발송 실패');
    } finally {
      setPushBusy(false);
    }
  };

  const sendPushTest = async (event) => {
    event.preventDefault();
    setTestBusy(true);
    setTestError('');
    try {
      let payloadData = {};
      if (testForm.dataJson.trim()) {
        payloadData = JSON.parse(testForm.dataJson);
        if (!payloadData || typeof payloadData !== 'object' || Array.isArray(payloadData)) throw new Error('data_json_must_be_object');
      }
      const result = await api('/api/admin/push/test', {
        method: 'POST',
        body: {
          token: testForm.token.trim(),
          title: testForm.title,
          body: testForm.body,
          data: payloadData,
        },
      });
      setTestResult(result);
    } catch (error) {
      setTestError(error.message || '푸시 테스트 실패');
    } finally {
      setTestBusy(false);
    }
  };

  const clearPush = () => {
    setPushForm(EMPTY_PUSH_FORM);
    setPushResult(null);
    setPushError('');
  };

  const clearTest = () => {
    setTestForm(EMPTY_TEST_FORM);
    setTestResult(null);
    setTestError('');
  };

  const applyTemplate = (template) => {
    if (!template) return;
    setPushForm((prev) => ({
      ...prev,
      title: template.title || prev.title,
      body: template.body || prev.body,
      targetRole: template.targetRole || 'all',
      dataJson: template.data ? JSON.stringify(template.data, null, 2) : prev.dataJson,
    }));
  };

  const applyAllUsersBroadcast = () => {
    setPushForm((prev) => ({
      ...prev,
      targetRole: 'all',
      targetUserIds: '',
      createdAfter: '',
      createdBefore: '',
      scubaLevel: '',
      freedivingLevel: '',
      blockedState: 'all',
    }));
  };

  const applySavedTemplate = (template) => {
    if (!template) return;
    setPushForm((prev) => ({
      ...prev,
      title: template.title || prev.title,
      body: template.body || prev.body,
      targetRole: template.target_role || template.targetRole || prev.targetRole,
      dataJson: template.data_json ? JSON.stringify(template.data_json, null, 2) : (template.dataJson || ''),
    }));
  };

  const saveCurrentTemplate = () => {
    const title = pushForm.title.trim();
    const body = pushForm.body.trim();
    if (!title || !body) {
      setPushError('템플릿 저장을 위해 제목과 본문이 필요해.');
      return;
    }
    (async () => {
      try {
        await api('/api/admin/push/templates', {
          method: 'POST',
          body: { title, body, targetRole: pushForm.targetRole, data: pushForm.dataJson.trim() ? JSON.parse(pushForm.dataJson) : {}, },
        });
        await loadTemplates();
      } catch (error) {
        setPushError(error.message || '템플릿 저장 실패');
      }
    })();
  };

  const removeTemplate = async (templateId) => {
    try {
      await api(`/api/admin/push/templates/${encodeURIComponent(templateId)}`, { method: 'DELETE' });
      await loadTemplates();
    } catch (error) {
      setPushError(error.message || '템플릿 삭제 실패');
    }
  };

  const renderHistoryLabel = (item) => {
    const detail = item?.detail || item?.payload || {};
    const title = detail?.title || item?.payload?.title || '-';
    const scheduledAt = detail?.scheduledAt || item?.payload?.scheduledAt || '';
    return `${title}${scheduledAt ? ` · 예약 ${String(scheduledAt).slice(0, 16).replace('T', ' ')}` : ''}`;
  };

  return (
    <div className="card admin-settings-card">
      <div className="push-card">
        <div className="panel-head">
          <strong>푸시 발송 메뉴</strong>
          <div className="row">
            <span className="muted">전체 발송은 FCM `all_users` 토픽과 개별 토큰을 함께 사용해.</span>
            <button type="button" className="chip" onClick={applyAllUsersBroadcast}>전체 사용자 발송</button>
          </div>
        </div>
        <div className="push-template-saved" style={{ marginBottom: 16 }}>
          <div className="panel-head">
            <strong>FCM 직접 테스트</strong>
            <div className="row">
              <span className="muted">앱에서 받은 FCM registration token을 바로 붙여서 보내는 용도야.</span>
              <button type="button" className="chip" onClick={clearTest}>초기화</button>
            </div>
          </div>
          <form className="push-form" onSubmit={sendPushTest}>
            <div className="field-grid push-grid">
              <label><span>FCM 토큰</span><input value={testForm.token} onChange={(e) => setTestForm((prev) => ({ ...prev, token: e.target.value }))} placeholder="앱에서 복사한 FCM registration token" /></label>
              <label><span>제목</span><input value={testForm.title} onChange={(e) => setTestForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="테스트 제목" /></label>
            </div>
            <label className="textarea-field"><span>본문</span><textarea rows={3} value={testForm.body} onChange={(e) => setTestForm((prev) => ({ ...prev, body: e.target.value }))} placeholder="테스트 본문" /></label>
            <div className="field-grid push-grid">
              <label><span>추가 데이터 JSON</span><input value={testForm.dataJson} onChange={(e) => setTestForm((prev) => ({ ...prev, dataJson: e.target.value }))} placeholder='{"kind":"push_test"}' /></label>
              <div className="push-hint">토큰이 유효하면 바로 FCM으로 전송돼. iPhone 시뮬레이터 토큰은 테스트용 가짜 값이라 실패할 수 있어.</div>
            </div>
            <div className="preview-box push-preview">
              <span className="muted">테스트 미리보기</span>
              <div className="preview-card">
                <strong>{testForm.title || 'FCM 테스트'}</strong>
                <p>{testForm.body || 'Divergram push test'}</p>
                <div className="preview-pill-row">
                  <span className="badge active">{testForm.token.trim() ? '토큰 입력됨' : '토큰 필요'}</span>
                  <span className="badge">{!hasTestDataJson ? '추가 데이터 없음' : testPreview ? 'JSON 확인됨' : 'JSON 오류'}</span>
                </div>
                <small>{testPreview ? JSON.stringify(testPreview) : 'test payload'}</small>
              </div>
            </div>
            <div className="detail-actions">
              <button type="submit" disabled={testBusy}>{testBusy ? '전송 중...' : 'FCM 테스트 발송'}</button>
            </div>
            {testError && <p className="error">{testError}</p>}
            {testResult && (
              <div className="auth-check-box">
                <p>전송 방식: <strong>{testResult.provider || 'fcm'}</strong></p>
                <p>성공: <strong>{testResult.successCount ?? 0}개</strong></p>
                <p>실패: <strong>{testResult.failureCount ?? 0}개</strong></p>
                <p>상태: <strong>{testResult.message || '-'}</strong></p>
              </div>
            )}
          </form>
        </div>
        <div className="push-template-grid">
          {PUSH_TEMPLATES.map((template) => (
            <button key={template.key} type="button" className="push-template-card" onClick={() => applyTemplate(template)}>
              <strong>{template.label}</strong>
              <span>{template.title}</span>
              <small>{template.targetRole === 'all' ? '전체 대상' : `${template.targetRole} 대상`}</small>
            </button>
          ))}
        </div>
        <div className="push-template-saved">
          <div className="panel-head">
            <strong>저장한 템플릿</strong>
            <div className="row">
              <button type="button" className="chip" onClick={saveCurrentTemplate}>현재 내용 저장</button>
              <button type="button" className="chip" onClick={async () => {
                try {
                  await Promise.all(savedTemplates.map((template) => api(`/api/admin/push/templates/${encodeURIComponent(template.id)}`, { method: 'DELETE' })));
                  await loadTemplates();
                } catch (error) {
                  setPushError(error.message || '템플릿 전체 삭제 실패');
                }
              }} disabled={savedTemplates.length === 0}>전체 삭제</button>
            </div>
          </div>
          {savedTemplates.length === 0 ? (
            <div className="empty-box">저장된 템플릿이 없어. 자주 쓰는 문구를 저장해 두면 재사용할 수 있어.</div>
          ) : (
            <div className="push-template-saved-list">
              {savedTemplates.map((template) => (
                <div key={template.id} className="push-template-saved-item">
                  <button type="button" className="push-template-saved-main" onClick={() => applySavedTemplate(template)}>
                    <strong>{template.title}</strong>
                    <span>{template.body}</span>
                    <small>{template.target_role === 'all' ? '전체 대상' : template.target_role}</small>
                  </button>
                  <button type="button" className="chip danger" onClick={() => removeTemplate(template.id)}>삭제</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <form className="push-form" onSubmit={sendPush}>
          <div className="field-grid push-grid">
            <label><span>제목</span><input value={pushForm.title} onChange={(e) => setPushForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="운영 알림 제목" /></label>
            <label><span>대상</span>
              <select value={pushForm.targetRole} onChange={(e) => setPushForm((prev) => ({ ...prev, targetRole: e.target.value }))}>
                <option value="all">전체 회원</option>
                <option value="general">일반회원</option>
                <option value="resort">리조트회원</option>
                <option value="admin">관리자</option>
              </select>
            </label>
          </div>
          <label className="textarea-field"><span>본문</span><textarea rows={4} value={pushForm.body} onChange={(e) => setPushForm((prev) => ({ ...prev, body: e.target.value }))} placeholder="전송할 안내 문구를 입력해." /></label>
          <div className="field-grid push-grid">
            <label><span>특정 사용자 ID</span><input value={pushForm.targetUserIds} onChange={(e) => setPushForm((prev) => ({ ...prev, targetUserIds: e.target.value }))} placeholder="쉼표로 구분 (예: 12, 15, 28)" /></label>
            <label><span>추가 데이터 JSON</span><input value={pushForm.dataJson} onChange={(e) => setPushForm((prev) => ({ ...prev, dataJson: e.target.value }))} placeholder='{"type":"notice"}' /></label>
          </div>
          <div className="field-grid push-grid">
            <label><span>가입일 이후</span><input type="datetime-local" value={pushForm.createdAfter} onChange={(e) => setPushForm((prev) => ({ ...prev, createdAfter: e.target.value }))} /></label>
            <label><span>가입일 이전</span><input type="datetime-local" value={pushForm.createdBefore} onChange={(e) => setPushForm((prev) => ({ ...prev, createdBefore: e.target.value }))} /></label>
          </div>
          <div className="field-grid push-grid">
            <label><span>스쿠버 레벨(부분일치)</span><input value={pushForm.scubaLevel} onChange={(e) => setPushForm((prev) => ({ ...prev, scubaLevel: e.target.value }))} placeholder="예: 오픈워터 / advanced" /></label>
            <label><span>프리다이빙 레벨(부분일치)</span><input value={pushForm.freedivingLevel} onChange={(e) => setPushForm((prev) => ({ ...prev, freedivingLevel: e.target.value }))} placeholder="예: level 2 / 강사" /></label>
          </div>
          <div className="field-grid push-grid">
            <label><span>차단 여부</span>
              <select value={pushForm.blockedState} onChange={(e) => setPushForm((prev) => ({ ...prev, blockedState: e.target.value }))}>
                <option value="all">전체</option>
                <option value="unblocked">차단 아님</option>
                <option value="blocked">차단됨</option>
              </select>
            </label>
            <label className="switch-row push-switch"><input type="checkbox" checked={pushForm.scheduleEnabled} onChange={(e) => setPushForm((prev) => ({ ...prev, scheduleEnabled: e.target.checked }))} /><span>예약 발송</span></label>
          </div>
          {pushForm.scheduleEnabled && (
            <div className="field-grid push-grid">
              <label><span>예약 시각</span><input type="datetime-local" value={pushForm.scheduleAt} onChange={(e) => setPushForm((prev) => ({ ...prev, scheduleAt: e.target.value }))} /></label>
              <div className="push-hint">예약 시각이 현재보다 미래면 큐에 저장되고, 작업자에서 자동 발송돼.</div>
            </div>
          )}
          <div className="preview-box push-preview">
            <span className="muted">미리보기</span>
            <div className="preview-card">
              <strong>{pushForm.title || '푸시 제목'}</strong>
              <p>{pushForm.body || '푸시 본문'}</p>
              <div className="preview-pill-row">
                <span className="badge active">{pushForm.targetRole === 'all' ? '전체' : pushForm.targetRole}</span>
                <span className="badge">{pushForm.targetUserIds.trim() ? '개별 지정' : '그룹 발송'}</span>
                <span className="badge">{pushForm.scheduleEnabled ? '예약' : '즉시'}</span>
                <span className="badge">{pushForm.targetRole === 'all' && !pushForm.targetUserIds.trim() ? '토픽 all_users' : '세그먼트 필터'}</span>
                <span className="badge">{!hasPushDataJson ? '추가 데이터 없음' : pushPreview ? 'JSON 확인됨' : 'JSON 오류'}</span>
              </div>
              <small>{pushPreview ? JSON.stringify(pushPreview) : '운영 알림용 기본 payload'}</small>
            </div>
          </div>
          <div className="detail-actions">
            <button type="submit" disabled={pushBusy}>{pushBusy ? '발송 중...' : '푸시 발송'}</button>
            <button type="button" onClick={clearPush} disabled={pushBusy}>초기화</button>
          </div>
          {pushError && <p className="error">{pushError}</p>}
          {pushResult && (
            <div className="auth-check-box">
              <p>전송 방식: <strong>{pushResult.deliveryMode === 'topic' ? '토픽 발송' : '토큰 발송'}</strong></p>
              <p>대상 토큰: <strong>{pushResult.tokenCount ?? 0}개</strong></p>
              <p>성공: <strong>{pushResult.successCount ?? 0}개</strong></p>
              <p>실패: <strong>{pushResult.failureCount ?? 0}개</strong></p>
              <p>미지원 토큰: <strong>{pushResult.unsupportedCount ?? 0}개</strong></p>
              <p>상태: <strong>{pushResult.message || '-'}</strong></p>
              {pushResult.scheduled && <p>예약 시각: <strong>{String(pushResult.scheduledAt || '').replace('T', ' ')}</strong></p>}
            </div>
          )}
        </form>
      </div>
      <div className="push-history">
        <div className="panel-head">
          <strong>발송 이력</strong>
          <button type="button" className="chip" onClick={loadPushHistory}>새로고침</button>
        </div>
        {pushHistory.length === 0 ? (
          <div className="empty-box">아직 발송 이력이 없어.</div>
        ) : (
          <div className="push-history-list">
            {pushHistory.map((item) => {
              const detail = item.detail || item.payload || {};
              return (
                <div key={item.id} className="push-history-item">
                  <div className="push-history-top">
                    <strong>{renderHistoryLabel(item)}</strong>
                    <span className={`badge ${item.kind === 'scheduled' ? 'admin' : 'active'}`}>{item.kind === 'scheduled' ? '예약/대기' : '발송'}</span>
                  </div>
                  <p>
                    대상: {detail?.filters?.targetRole || detail?.targetRole || 'all'}
                    {' · '}
                    성공: {detail?.successCount ?? '-'}
                    {' · '}
                    실패: {detail?.failureCount ?? '-'}
                  </p>
                  <small>{String(item.created_at || item.updated_at || '').replace('T', ' ').slice(0, 19)}</small>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="mini-stat-row" style={{ margin: '16px 0' }}>
        <div className="mini-stat"><span>신고</span><strong>{reports.length}</strong></div>
        <div className="mini-stat"><span>검토</span><strong>{reportBreakdown.reviewing || 0}</strong></div>
        <div className="mini-stat"><span>인증</span><strong>{certifications.length}</strong></div>
        <div className="mini-stat"><span>반려</span><strong>{reportBreakdown.rejected || 0}</strong></div>
      </div>
    </div>
  );
}
