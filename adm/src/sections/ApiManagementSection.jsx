import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { serviceHealth } from '../lib/integrationStatus';

const STATUS_LABELS = { operational: '정상', configured: '설정됨', degraded: '점검 필요', not_configured: '미설정' };
const HEALTH_DETAIL_LABELS = {
  check_unavailable: '실시간 연결 점검을 완료하지 못했습니다. 저장된 설정은 유지됩니다.',
  credentials_missing: '연동 키가 완전하지 않습니다.',
  not_configured: '연동 설정이 필요합니다.',
};

function readableHealthDetail(detail) {
  const value = String(detail || '').trim();
  return HEALTH_DETAIL_LABELS[value] || value.replaceAll('_', ' ');
}

export default function ApiManagementSection() {
  const [services, setServices] = useState([]);
  const [health, setHealth] = useState([]);
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('service') || '');
  const [draft, setDraft] = useState({ enabled: true, values: {} });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [healthError, setHealthError] = useState('');
  const [healthBusy, setHealthBusy] = useState(false);
  const [paypalEnvironment, setPaypalEnvironment] = useState(null);
  const [paypalEnvironmentBusy, setPaypalEnvironmentBusy] = useState(false);
  const savingRef = useRef(false);

  const checkHealth = useCallback(async (force = false) => {
    setHealthBusy(true);
    try { const result = await api(`/api/admin/external-integrations${force ? '?refresh=1' : ''}`); setHealth(result.integrations || []); setHealthError(''); }
    catch { setHealthError('연결 점검을 완료하지 못했습니다. 설정은 계속 편집할 수 있습니다.'); }
    finally { setHealthBusy(false); }
  }, []);

  const load = useCallback(async (force = false) => {
    setBusy(true);
    try {
      const settings = await api('/api/admin/api-settings');
      setServices(settings.services || []);
      setError('');
      setSelectedId((current) => settings.services?.some(row => row.id === current) ? current : settings.services?.[0]?.id || '');
    } catch (loadError) {
      setError(loadError.message || 'API 설정을 불러오지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(false); void checkHealth(false); }, [load, checkHealth]);
  const selected = useMemo(() => services.find((service) => service.id === selectedId) || null, [services, selectedId]);
  const selectedHealth = useMemo(() => serviceHealth(selectedId, health), [health, selectedId]);
  const dirty = Boolean(selected && (draft.enabled !== (selected.enabled !== false) || selected.fields.some(field => (draft.values[field.envName] || '') !== (field.sensitive ? '' : field.value || ''))));
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    const guard = event => {
      if (!event.target.closest?.('.side-menu button, .logout-btn, .skip-link')) return;
      if (event.target.closest('.menu-group-toggle')) return;
      if (!window.confirm('저장하지 않은 API 설정이 있습니다. 변경사항을 버리고 이동할까요?')) { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener('click', guard, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guard, true); };
  }, [dirty]);
  const selectService = id => {
    if (busy || id === selectedId) return;
    if (dirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 변경사항을 버리고 이동할까요?')) return;
    setMessage(''); setError(''); setSelectedId(id);
  };

  useEffect(() => {
    if (!selected) return;
    setDraft({ enabled: selected.enabled !== false, values: Object.fromEntries(selected.fields.map((field) => [field.envName, field.sensitive ? '' : field.value || ''])) });
  }, [selected]);

  const loadPaypalEnvironment = useCallback(async () => {
    try {
      const result = await api('/api/admin/resort-payments/environment');
      setPaypalEnvironment(result);
    } catch (loadError) {
      setError(loadError.message || 'PayPal 환경 상태를 불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    if (selectedId === 'paypal') void loadPaypalEnvironment();
  }, [selectedId, loadPaypalEnvironment]);

  const switchPaypalEnvironment = async (environment) => {
    if (paypalEnvironmentBusy || paypalEnvironment?.environment === environment) return;
    let acknowledgeUntested = false;
    if (environment === 'production' && !paypalEnvironment?.sandboxTestPassed) {
      acknowledgeUntested = window.confirm('Sandbox 성공 결제가 아직 없습니다. 실제 결제가 발생할 수 있는 Live 환경으로 전환할까요?');
      if (!acknowledgeUntested) return;
    }
    setPaypalEnvironmentBusy(true); setMessage(''); setError('');
    try {
      const result = await api('/api/admin/resort-payments/environment', {
        method: 'PATCH',
        body: { environment, confirmation: environment === 'production' ? 'LIVE' : '', acknowledgeUntested },
      });
      setPaypalEnvironment(result);
      setMessage(environment === 'production' ? 'PayPal Live 환경으로 전환했습니다.' : 'PayPal Sandbox 환경으로 전환했습니다.');
      await checkHealth(true);
    } catch (switchError) {
      const messages = {
        paypal_live_confirmation_required: 'Live 전환 확인란에 LIVE를 정확히 입력해 주세요.',
        paypal_live_credentials_missing: 'Live Client ID, Secret, Webhook ID를 먼저 저장해 주세요.',
        paypal_sandbox_test_acknowledgement_required: 'Sandbox 미검증 상태를 확인한 뒤 다시 전환해 주세요.',
        paypal_sandbox_payments_still_open: '처리 중인 Sandbox 결제를 먼저 완료하거나 종료해 주세요.',
        paypal_sandbox_credentials_missing: 'Sandbox Client ID, Secret, Webhook ID를 먼저 저장해 주세요.',
      };
      const key = String(switchError.message || '').split(':')[0];
      setError(messages[key] || switchError.message || 'PayPal 환경 전환에 실패했습니다.');
    } finally { setPaypalEnvironmentBusy(false); }
  };

  const save = async () => {
    if (!selected || savingRef.current || !dirty) return;
    savingRef.current = true;
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await api(`/api/admin/api-settings/${selected.id}`, { method: 'PATCH', body: draft });
      setServices((rows) => rows.map((row) => row.id === selected.id ? response.service : row));
      setMessage('설정을 저장했습니다. 실행 중 연결은 재초기화가 필요할 수 있으며, 앱 재빌드 항목은 EAS 환경 반영과 새 빌드가 필요합니다.');
      if (selected.id === 'paypal') await loadPaypalEnvironment();
      void checkHealth(true);
    } catch (saveError) {
      setError(saveError.message || 'API 설정 저장에 실패했습니다.');
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  };

  const copyCallback = async (callback) => {
    try {
      await navigator.clipboard.writeText(callback.url);
      setMessage(`${callback.label}을(를) 복사했습니다.`);
      setError('');
    } catch {
      setError('URL을 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.');
    }
  };

  const grouped = useMemo(() => services.reduce((result, service) => {
    (result[service.category] ||= []).push(service);
    return result;
  }, {}), [services]);

  return <div className="api-management-page">
    <section className="operation-page-head api-management-hero">
      <div><p className="section-kicker">API CONTROL CENTER</p><h2>API 관리</h2><p>외부 서비스 키, 식별자, 콜백 주소와 활성 상태를 안전하게 관리합니다.</p></div>
      <button type="button" className="ui-button ui-button--primary" onClick={() => checkHealth(true)} disabled={healthBusy}>{healthBusy ? '상태 확인 중' : '전체 상태 확인'}</button>
    </section>

    <div className="api-security-notice"><strong>보안 저장</strong><span>비밀키는 AES-256-GCM으로 암호화되며 저장 후 원문을 다시 표시하지 않습니다. 빈 비밀키는 기존 값을 유지합니다.</span></div>
    {error && <p className="error" role="alert">{error} {!services.length && <button type="button" onClick={() => load()} disabled={busy}>다시 시도</button>}</p>}
    {healthError && <p className="operation-warning" role="status">{healthError}</p>}

    <section className="api-management-layout">
      <aside className="card api-service-nav">
        {Object.entries(grouped).map(([category, rows]) => <div key={category}><h3>{category}</h3>{rows.map((service) => {
          const state = serviceHealth(service.id, health)?.status || (service.configuredCount ? 'configured' : 'not_configured');
          return <button type="button" key={service.id} disabled={busy} aria-pressed={selectedId === service.id} className={selectedId === service.id ? 'active' : ''} onClick={() => selectService(service.id)}><span><strong>{service.name}</strong><small>{service.enabled ? `${service.configuredCount}/${service.fieldCount} 설정` : '비활성화'}</small></span><i className={`api-state-dot is-${state}`} title={STATUS_LABELS[state] || state} /></button>;
        })}</div>)}
      </aside>

      <div className="card api-setting-panel">
        {selected ? <>
          <header><div><span>{selected.category}</span><h3>{selected.name}</h3><p>{selected.description}</p></div><div className={`api-live-status is-${selectedHealth?.status || 'not_configured'}`}><i />{STATUS_LABELS[selectedHealth?.status] || '상태 확인 전'}</div></header>
          {selectedHealth && <div className="api-health-detail"><span>{selectedHealth.checkType === 'live' ? '실시간 검사' : '설정 검사'}</span><strong>{readableHealthDetail(selectedHealth.detail)}</strong>{Number.isFinite(selectedHealth.latencyMs) && <small>{selectedHealth.latencyMs}ms</small>}</div>}
          {selected.callbacks?.length > 0 && <section className="api-callbacks" aria-label={`${selected.name} 콜백 URL`}>
            <div className="api-callbacks-head"><div><strong>콜백·웹훅 URL</strong><small>외부 서비스 콘솔에 아래 주소를 그대로 등록하세요.</small></div><span>{selected.callbacks.length}개</span></div>
            <div className="api-callback-list">{selected.callbacks.map((callback) => <article key={callback.id}>
              <div><span>{callback.kind}</span><strong>{callback.label}</strong></div>
              <div className="api-callback-value"><code>{callback.url}</code><button type="button" onClick={() => copyCallback(callback)}>복사</button></div>
              {callback.note && <p>{callback.note}</p>}
            </article>)}</div>
          </section>}
          {selected.id === 'paypal' && <section className="api-paypal-environment">
            <div className="api-paypal-environment-head"><div><strong>결제 환경</strong><small>Sandbox와 Live 키 저장 후 스위치로 전환합니다.</small></div><b className={`paypal-environment-badge is-${paypalEnvironment?.environment || 'sandbox'}`}>{paypalEnvironment?.environment === 'production' ? 'LIVE' : 'SANDBOX'}</b></div>
            <div className="api-paypal-readiness"><span>Sandbox 키 <b>{paypalEnvironment?.credentials?.sandbox ? '완료' : '미완료'}</b></span><span>Live 키 <b>{paypalEnvironment?.credentials?.production ? '완료' : '미완료'}</b></span><span>Sandbox 성공 <b>{paypalEnvironment?.sandboxSuccessCount || 0}건</b></span><span>처리 중 <b>{paypalEnvironment?.sandboxOpenCount || 0}건</b></span></div>
            <div className="api-paypal-actions">
              <span>Sandbox</span>
              <label className="paypal-mode-switch">
                <input type="checkbox" role="switch" aria-label="PayPal Sandbox Live 전환" checked={paypalEnvironment?.environment === 'production'} disabled={paypalEnvironmentBusy || !paypalEnvironment?.credentials?.sandbox || !paypalEnvironment?.credentials?.production || paypalEnvironment?.sandboxOpenCount > 0} onChange={(event) => switchPaypalEnvironment(event.target.checked ? 'production' : 'sandbox')} />
                <i />
              </label>
              <span>Live</span>
              <small>{paypalEnvironment?.sandboxTestPassed ? 'Sandbox 결제 검증 완료' : 'Sandbox 미검증 · Live 전환 시 경고 표시'}</small>
            </div>
          </section>}
          <label className="api-enable-row"><span><strong>서비스 활성화</strong><small>비활성화하면 서버에서 해당 서비스 키를 사용하지 않습니다.</small></span><input type="checkbox" disabled={busy} checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} /></label>
          {dirty && <p className="api-draft-notice" role="status">저장하지 않은 변경사항이 있습니다.</p>}
          <fieldset className="api-fields" disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
            {selected.fields.map((field) => <label key={field.envName}><span>{field.label}<small>{field.envName}</small></span>{field.inputType === 'textarea' ? <textarea rows="5" value={draft.values[field.envName] || ''} placeholder={field.sensitive && field.configured ? `저장됨: ${field.maskedValue}` : '값을 입력하세요'} onChange={(event) => setDraft((current) => ({ ...current, values: { ...current.values, [field.envName]: event.target.value } }))} /> : <input type={field.inputType === 'password' ? 'password' : field.inputType === 'number' ? 'number' : 'text'} value={draft.values[field.envName] || ''} placeholder={field.sensitive && field.configured ? `저장됨: ${field.maskedValue}` : '값을 입력하세요'} onChange={(event) => setDraft((current) => ({ ...current, values: { ...current.values, [field.envName]: event.target.value } }))} />}<div className="api-field-meta"><em className={`is-${field.source}`}>{field.source === 'admin' ? '관리자 저장값' : field.source === 'environment' ? '서버 환경값' : '미설정'}</em>{field.requiresBuild && <em className="requires-build">앱 재빌드 필요</em>}</div></label>)}
          </fieldset>
          <footer><div>{selected.docsUrl && <a href={selected.docsUrl} target="_blank" rel="noreferrer">공식 콘솔 열기 ↗</a>}<small>{selected.updatedAt ? `최근 수정 ${new Date(selected.updatedAt).toLocaleString('ko-KR')} · ${selected.updatedBy || '관리자'}` : '관리자 화면에서 수정한 이력이 없습니다.'}</small></div><button type="button" onClick={save} disabled={busy || !dirty}>{busy ? '저장 중' : '변경사항 저장'}</button></footer>
          {message && <p className="api-save-message" role="status">{message}</p>}
        </> : <div className="integration-empty">API 서비스를 선택하세요.</div>}
      </div>
    </section>
  </div>;
}
