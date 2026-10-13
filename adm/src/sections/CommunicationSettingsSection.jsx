import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const GROUPS = [['signup','회원 가입'],['event','이벤트'],['safety','안전 알림'],['moderation','운영 조치']];
const CHANNELS = [['email','이메일'],['push','푸시'],['sms','SMS']];

export default function CommunicationSettingsSection() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => { setBusy(true); try { const r = await api('/api/admin/communication-settings'); setForm(r.data); setError(''); } catch (e) { setError(e.message || '설정 조회 실패'); } finally { setBusy(false); } };
  useEffect(() => { void load(); }, []);
  const toggle = (group, channel) => setForm((current) => ({ ...current, [group]: { ...current[group], [channel]: !current[group]?.[channel] } }));
  const save = async () => { setBusy(true); setMessage(''); try { const r = await api('/api/admin/communication-settings', { method: 'PATCH', body: form }); setForm(r.data); setMessage('통신 채널 설정이 저장되었습니다.'); } catch (e) { setError(e.message || '설정 저장 실패'); } finally { setBusy(false); } };
  return <div className="admin-section"><section className="operation-page-head"><div><p className="section-kicker">COMMUNICATION POLICY</p><h2>통신·알림 기본 설정</h2><p>상황별 이메일·푸시·SMS 사용 여부를 관리합니다.</p></div><div className="operation-head-actions"><button type="button" className="ghost" onClick={load} disabled={busy}>새로고침</button><button type="button" onClick={save} disabled={busy || !form}>설정 저장</button></div></section><section className="card communication-settings-grid">{GROUPS.map(([key,label]) => <div className="communication-setting-card" key={key}><div><strong>{label}</strong><span>{key}</span></div>{CHANNELS.map(([channel,channelLabel]) => <label key={channel}><span>{channelLabel}</span><input type="checkbox" checked={Boolean(form?.[key]?.[channel])} onChange={() => toggle(key,channel)} disabled={!form || busy} /></label>)}</div>)}{message && <p className="muted">{message}</p>}{error && <p className="error">{error}</p>}</section></div>;
}
